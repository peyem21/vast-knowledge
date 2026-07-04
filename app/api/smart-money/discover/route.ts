import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingTokens } from "@/lib/dexscreener";
import { getSmartMoneyProvider } from "@/lib/smartmoney";
import { discoverWallets, WinningToken } from "@/lib/smartmoney/discover";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How many top gainers to cross-reference holders across. */
const SAMPLE_SIZE = 8;
/** Ignore tokens with too little liquidity — thin pools make holder lists noisy. */
const MIN_LIQUIDITY_USD = 20_000;

/**
 * Discovers candidate smart-money wallets: takes the biggest 24h gainers from
 * the trending list, pulls each one's top holders (via the smart-money
 * provider), and surfaces wallets that show up as a top holder across
 * multiple winners. Requires BIRDEYE_API_KEY (or another configured provider).
 */
export async function GET(req: NextRequest) {
  const chain = (req.nextUrl.searchParams.get("chain") ?? "solana").toLowerCase();
  const provider = getSmartMoneyProvider();

  if (!provider.configured()) {
    return NextResponse.json({ configured: false, source: provider.name, candidates: [] });
  }

  const tokens = await fetchTrendingTokens(chain).catch(() => []);
  const winners = tokens
    .filter((t) => (t.liquidityUsd ?? 0) >= MIN_LIQUIDITY_USD)
    .filter((t) => (t.priceChange24h ?? 0) > 0)
    .sort((a, b) => (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0))
    .slice(0, SAMPLE_SIZE);

  if (!winners.length) {
    return NextResponse.json({ configured: true, source: provider.name, candidates: [] });
  }

  const withHolders: WinningToken[] = await Promise.all(
    winners.map(async (t) => {
      const data = await provider.getSmartMoney(chain, t.address).catch(() => null);
      return {
        tokenAddress: t.address,
        tokenSymbol: t.symbol,
        chainId: chain,
        priceChange24h: t.priceChange24h,
        holders: data?.holders ?? [],
      };
    })
  );

  const candidates = discoverWallets(withHolders, 2);
  return NextResponse.json({
    configured: true,
    source: provider.name,
    sampledTokens: winners.map((t) => t.symbol),
    candidates,
  });
}
