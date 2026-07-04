/**
 * Smart-money feed aggregation. Pure and testable: given recent trades from a
 * set of tracked wallets, group them by token so we can surface the key signal
 * — *how many distinct smart wallets are buying the same token right now*, and
 * their net USD flow. Conviction rises with distinct buyers, not raw volume.
 */

export interface WalletTrade {
  wallet: string;
  walletLabel?: string;
  chainId: string;
  tokenAddress: string;
  tokenSymbol: string;
  side: "buy" | "sell";
  volumeUsd: number;
  timestamp: number;
  txHash: string;
}

export interface FeedEntry {
  tokenAddress: string;
  tokenSymbol: string;
  chainId: string;
  /** Distinct wallets buying / selling this token. */
  buyers: string[];
  sellers: string[];
  buyUsd: number;
  sellUsd: number;
  netUsd: number;
  lastActivity: number;
  trades: WalletTrade[];
}

/** Groups wallet trades by token and ranks by conviction (distinct buyers). */
export function buildFeed(trades: WalletTrade[]): FeedEntry[] {
  const byToken = new Map<string, FeedEntry>();

  for (const t of trades) {
    const key = `${t.chainId}:${t.tokenAddress}`;
    let entry = byToken.get(key);
    if (!entry) {
      entry = {
        tokenAddress: t.tokenAddress,
        tokenSymbol: t.tokenSymbol,
        chainId: t.chainId,
        buyers: [],
        sellers: [],
        buyUsd: 0,
        sellUsd: 0,
        netUsd: 0,
        lastActivity: 0,
        trades: [],
      };
      byToken.set(key, entry);
    }

    entry.trades.push(t);
    entry.lastActivity = Math.max(entry.lastActivity, t.timestamp);
    if (t.side === "buy") {
      entry.buyUsd += t.volumeUsd;
      if (!entry.buyers.includes(t.wallet)) entry.buyers.push(t.wallet);
    } else {
      entry.sellUsd += t.volumeUsd;
      if (!entry.sellers.includes(t.wallet)) entry.sellers.push(t.wallet);
    }
  }

  const entries = [...byToken.values()];
  for (const e of entries) {
    e.netUsd = e.buyUsd - e.sellUsd;
    e.trades.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Rank: most distinct buyers first, then most recent activity.
  entries.sort(
    (a, b) => b.buyers.length - a.buyers.length || b.lastActivity - a.lastActivity
  );
  return entries;
}
