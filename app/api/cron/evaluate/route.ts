import { NextRequest, NextResponse } from "next/server";
import { runEvaluation } from "@/lib/push/evaluate";
import { isPushConfigured } from "@/lib/push/webpush";

export const dynamic = "force-dynamic";
// Give the evaluation room to fetch several chains + send pushes.
export const maxDuration = 60;

/**
 * Scheduled endpoint that evaluates all stored alert rules and sends web-push
 * notifications. Protected by CRON_SECRET: callers must send either
 *   Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends this)
 * or ?secret=<CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qs = req.nextUrl.searchParams.get("secret");
    const ok = auth === `Bearer ${secret}` || qs === secret;
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push not configured (missing VAPID keys)" },
      { status: 503 }
    );
  }

  const summary = await runEvaluation();
  return NextResponse.json({ ok: true, ...summary });
}
