import { NextRequest, NextResponse } from "next/server";
import { getStore, PushSubscriptionShape } from "@/lib/push/store";
import { AlertRule } from "@/lib/alertRules";

export const dynamic = "force-dynamic";

interface Body {
  deviceId?: string;
  subscription?: PushSubscriptionShape;
  rules?: AlertRule[];
  watchlist?: string[];
  chains?: string[];
}

/**
 * Registers or updates a device's push subscription and the rules/watchlist/
 * chains the server should evaluate for it. Called on enable and whenever the
 * user's rules or watchlist change while push is on.
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, subscription } = body;
  if (!deviceId || !subscription?.endpoint || !subscription.keys?.auth) {
    return NextResponse.json(
      { error: "deviceId and a valid subscription are required" },
      { status: 400 }
    );
  }

  const store = getStore();
  // Preserve cooldowns across re-syncs so updating rules doesn't refire alerts.
  const existing = await store.get(deviceId);
  await store.upsert({
    id: deviceId,
    subscription,
    rules: body.rules ?? [],
    watchlist: body.watchlist ?? [],
    chains: body.chains?.length ? body.chains : ["solana"],
    cooldowns: existing?.cooldowns ?? {},
    updatedAt: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
