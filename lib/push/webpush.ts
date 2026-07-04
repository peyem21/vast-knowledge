import webpush from "web-push";
import { PushSubscriptionShape } from "./store";

/**
 * Thin wrapper around `web-push`. VAPID keys come from env:
 *   VAPID_PUBLIC_KEY   (also exposed to the client as NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 *   VAPID_PRIVATE_KEY  (secret)
 *   VAPID_SUBJECT      (mailto: or https URL identifying the sender)
 * Generate a pair with:  npm run generate:vapid
 */

let configured = false;

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured(): void {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:alerts@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface SendResult {
  ok: boolean;
  /** True when the endpoint is gone (404/410) and the record should be pruned. */
  expired: boolean;
}

export async function sendPush(
  subscription: PushSubscriptionShape,
  payload: unknown
): Promise<SendResult> {
  ensureConfigured();
  if (!configured) return { ok: false, expired: false };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, expired: false };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return { ok: false, expired: status === 404 || status === 410 };
  }
}
