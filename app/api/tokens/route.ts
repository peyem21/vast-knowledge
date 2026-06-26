import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingTokens } from "@/lib/dexscreener";
import { summarizeNarratives } from "@/lib/narrativeSummary";

const SUPPORTED = new Set(["solana", "ethereum", "base", "bsc", "arbitrum"]);

export const revalidate = 30;

export async function GET(req: NextRequest) {
  const chain = (req.nextUrl.searchParams.get("chain") ?? "solana").toLowerCase();
  if (!SUPPORTED.has(chain)) {
    return NextResponse.json(
      { error: `Unsupported chain: ${chain}` },
      { status: 400 }
    );
  }

  try {
    const tokens = await fetchTrendingTokens(chain);
    const narratives = summarizeNarratives(tokens);
    return NextResponse.json(
      { chain, tokens, narratives, generatedAt: Date.now() },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch tokens" },
      { status: 502 }
    );
  }
}
