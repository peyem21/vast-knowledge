import { NextRequest, NextResponse } from "next/server";
import { getSmartMoneyProvider } from "@/lib/smartmoney";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const chain = (req.nextUrl.searchParams.get("chain") ?? "solana").toLowerCase();
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const provider = getSmartMoneyProvider();
  const data = await provider.getSmartMoney(chain, address);
  return NextResponse.json(data, {
    headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
