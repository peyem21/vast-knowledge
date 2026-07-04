import { Holder } from "./types";

/**
 * Smart-wallet discovery. Pure and testable: given the holder lists of
 * several recent winning tokens, find wallets that show up as a top holder
 * across *multiple* winners. A single token's top holders tell you little —
 * insiders, LPs, and market makers show up on every token. A wallet that
 * repeatedly lands in the top holders of several unrelated pumps is a much
 * stronger "this trader/entity is good at picking winners" signal.
 */

export interface WinningToken {
  tokenAddress: string;
  tokenSymbol: string;
  chainId: string;
  priceChange24h: number | null;
  holders: Holder[];
}

export interface WalletCandidate {
  wallet: string;
  /** Winners this wallet appears as a top holder in. */
  hits: { tokenSymbol: string; tokenAddress: string; percentage: number | null }[];
  tokenCount: number;
  avgPercentage: number | null;
}

/**
 * Addresses that commonly appear as "top holders" but aren't trading wallets
 * (AMM pools, burn addresses, common program-owned accounts). Filtered out so
 * the candidate list isn't dominated by infrastructure. Not exhaustive —
 * intended as a light heuristic, not a guarantee.
 */
const KNOWN_NON_WALLETS = new Set<string>([
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112",
]);

function isLikelyWallet(address: string): boolean {
  if (KNOWN_NON_WALLETS.has(address)) return false;
  // Addresses ending in many zeros are typically program/PDA accounts, not EOAs.
  if (/0{6,}$/.test(address)) return false;
  return true;
}

/**
 * Cross-references holder lists across winning tokens and ranks wallets by
 * how many distinct winners they appear in, then by average holding %.
 * Only wallets appearing in at least `minHits` tokens are returned.
 */
export function discoverWallets(
  winners: WinningToken[],
  minHits = 2
): WalletCandidate[] {
  const byWallet = new Map<string, WalletCandidate>();

  for (const token of winners) {
    // Only count strong holders (top 15) so weak/dust positions don't dilute the signal.
    for (const h of token.holders.slice(0, 15)) {
      if (!isLikelyWallet(h.owner)) continue;
      let candidate = byWallet.get(h.owner);
      if (!candidate) {
        candidate = { wallet: h.owner, hits: [], tokenCount: 0, avgPercentage: null };
        byWallet.set(h.owner, candidate);
      }
      // A wallet holding the same token twice (shouldn't happen) only counts once.
      if (candidate.hits.some((x) => x.tokenAddress === token.tokenAddress)) continue;
      candidate.hits.push({
        tokenSymbol: token.tokenSymbol,
        tokenAddress: token.tokenAddress,
        percentage: h.percentage,
      });
    }
  }

  const candidates = [...byWallet.values()]
    .map((c) => {
      const pcts = c.hits.map((h) => h.percentage).filter((p): p is number => p != null);
      return {
        ...c,
        tokenCount: c.hits.length,
        avgPercentage: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
      };
    })
    .filter((c) => c.tokenCount >= minHits);

  candidates.sort(
    (a, b) => b.tokenCount - a.tokenCount || (b.avgPercentage ?? 0) - (a.avgPercentage ?? 0)
  );
  return candidates;
}
