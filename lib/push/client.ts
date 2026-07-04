"use client";

import { AlertRule } from "../alertRules";

/**
 * Browser side of background push: registers the service worker, creates a
 * PushSubscription with the VAPID public key, and syncs it (plus the user's
 * rules/watchlist/chains) to the server. All no-ops gracefully when push is
 * unsupported or unconfigured.
 */

const DEVICE_KEY = "vk:deviceId";
const PUSH_ENABLED_KEY = "vk:pushEnabled";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** True only when the client build has a VAPID public key baked in. */
export function pushConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY;
}

export function isPushEnabled(): boolean {
  return typeof window !== "undefined" &&
    window.localStorage.getItem(PUSH_ENABLED_KEY) === "1";
}

function setPushEnabled(on: boolean): void {
  window.localStorage.setItem(PUSH_ENABLED_KEY, on ? "1" : "0");
}

function getDeviceId(): string {
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

export interface PushContext {
  rules: AlertRule[];
  watchlist: string[];
  chains: string[];
}

/** Enables background push: subscribes and syncs the current context. */
export async function enablePush(ctx: PushContext): Promise<boolean> {
  if (!pushSupported() || !pushConfigured()) return false;
  const sub = await getSubscription();
  if (!sub) return false;

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: getDeviceId(), subscription: sub.toJSON(), ...ctx }),
  });
  const ok = res.ok;
  if (ok) setPushEnabled(true);
  return ok;
}

/** Pushes updated rules/watchlist/chains to the server if push is on. */
export async function syncPush(ctx: PushContext): Promise<void> {
  if (!isPushEnabled() || !pushSupported() || !pushConfigured()) return;
  const sub = await getSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: getDeviceId(), subscription: sub.toJSON(), ...ctx }),
  }).catch(() => {});
}

/** Disables background push: removes the server record and browser subscription. */
export async function disablePush(): Promise<void> {
  setPushEnabled(false);
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });
    if (pushSupported()) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
    }
  } catch {
    // best effort
  }
}
