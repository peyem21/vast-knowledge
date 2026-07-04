import { NextRequest, NextResponse } from "next/server";
import { getSmartMoneyProvider } from "@/lib/smartmoney";
import { buildFeed, FeedEntry, WalletTrade } from "@/lib/smartmoney/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  chain?: string;
  wallets?: { address: string; label?: string }[];
}

/**
 * Builds the smart-money feed: fetch each tracked wallet's recent activity,
 * tag it with the wallet, and aggregate by token (see buildFeed). The wallet
 * list is supplied by the client so the server stays stateless.
 */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const chain = (body.chain ?? "solana").toLowerCase();
  const wallets = (body.wallets ?? []).filter((w) => w.address);
  const provider = getSmartMoneyProvider();

  if (!provider.configured()) {
    return NextResponse.json({
      configured: false,
      source: provider.name,
      entries: [] as FeedEntry[],
    });
  }
  if (!wallets.length) {
    return NextResponse.json({
      configured: true,
      source: provider.name,
      entries: [] as FeedEntry[],
    });
  }

  const perWallet = await Promise.all(
    wallets.map(async (w) => {
      const raw = await provider.getWalletActivity(chain, w.address).catch(() => []);
      return raw.map(
        (t): WalletTrade => ({
          ...t,
          wallet: w.address,
          walletLabel: w.label || w.address,
        })
      );
    })
  );

  const entries = buildFeed(perWallet.flat());
  return NextResponse.json({ configured: true, source: provider.name, entries });
}
