import { TokenRow } from "./types";
import { tagNarratives } from "./narratives";

const BASE = "https://api.dexscreener.com";

/** Raw shape of a DexScreener boost entry (paid promotion = hype proxy). */
interface Boost {
  url: string;
  chainId: string;
  tokenAddress: string;
  amount?: number;
  totalAmount?: number;
  icon?: string;
  description?: string;
}

/** Raw shape of a DexScreener pair (trimmed to fields we use). */
interface Pair {
  chainId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceChange?: { h1?: number; h6?: number; h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json" },
    // Cache at the edge for 30s — fresh enough for a screener, kind to limits.
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`DexScreener ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

/** Picks the most liquid pair for a token. */
function bestPair(pairs: Pair[]): Pair | null {
  if (!pairs.length) return null;
  return pairs.reduce((best, p) =>
    (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best
  );
}

function toRow(pair: Pair, boost?: Boost): TokenRow {
  const name = pair.baseToken.name;
  const symbol = pair.baseToken.symbol;
  const description = boost?.description ?? null;
  return {
    address: pair.baseToken.address,
    chainId: pair.chainId,
    name,
    symbol,
    pairAddress: pair.pairAddress,
    priceUsd: num(pair.priceUsd),
    priceChange24h: num(pair.priceChange?.h24),
    priceChange6h: num(pair.priceChange?.h6),
    priceChange1h: num(pair.priceChange?.h1),
    volume24h: num(pair.volume?.h24),
    liquidityUsd: num(pair.liquidity?.usd),
    fdv: num(pair.fdv),
    marketCap: num(pair.marketCap),
    pairCreatedAt: num(pair.pairCreatedAt),
    boosts: boost ? num(boost.totalAmount ?? boost.amount) : null,
    description,
    imageUrl: pair.info?.imageUrl ?? boost?.icon ?? null,
    url: pair.url,
    narratives: tagNarratives(name, symbol, description),
  };
}

/** Splits an array into chunks of `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Fetches trending tokens for a chain by combining DexScreener's "top" and
 * "latest" boost feeds (paid promotions skew toward what's being marketed
 * right now), then enriches each with live pair data.
 */
export async function fetchTrendingTokens(chain: string): Promise<TokenRow[]> {
  const [top, latest] = await Promise.all([
    getJson<Boost[]>("/token-boosts/top/v1").catch(() => []),
    getJson<Boost[]>("/token-boosts/latest/v1").catch(() => []),
  ]);

  // Dedupe boosts by address, keeping the one with the higher boost amount.
  const boostByAddr = new Map<string, Boost>();
  for (const b of [...top, ...latest]) {
    if (b.chainId !== chain) continue;
    const existing = boostByAddr.get(b.tokenAddress);
    const score = (b.totalAmount ?? b.amount ?? 0);
    const existingScore = (existing?.totalAmount ?? existing?.amount ?? 0);
    if (!existing || score > existingScore) boostByAddr.set(b.tokenAddress, b);
  }

  const addresses = [...boostByAddr.keys()];
  if (!addresses.length) return [];

  // The tokens endpoint accepts up to 30 comma-separated addresses per call.
  const groups = await Promise.all(
    chunk(addresses, 30).map((group) =>
      getJson<{ pairs: Pair[] | null }>(
        `/latest/dex/tokens/${group.join(",")}`
      ).catch(() => ({ pairs: [] as Pair[] }))
    )
  );

  // Group returned pairs by token address, then pick the best pair each.
  const pairsByAddr = new Map<string, Pair[]>();
  for (const g of groups) {
    for (const p of g.pairs ?? []) {
      if (p.chainId !== chain) continue;
      const addr = p.baseToken.address;
      const list = pairsByAddr.get(addr) ?? [];
      list.push(p);
      pairsByAddr.set(addr, list);
    }
  }

  const rows: TokenRow[] = [];
  for (const addr of addresses) {
    const pair = bestPair(pairsByAddr.get(addr) ?? []);
    if (!pair) continue;
    rows.push(toRow(pair, boostByAddr.get(addr)));
  }

  // Default ranking: 24h volume desc (the clearest "something's happening" signal).
  rows.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
  return rows;
}
