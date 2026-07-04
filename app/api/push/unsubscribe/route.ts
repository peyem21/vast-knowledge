import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/push/store";

export const dynamic = "force-dynamic";

/** Removes a device's server-side subscription (turns off background push). */
export async function POST(req: NextRequest) {
  let deviceId: string | undefined;
  try {
    deviceId = ((await req.json()) as { deviceId?: string }).deviceId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }
  await getStore().remove(deviceId);
  return NextResponse.json({ ok: true });
}
