export type Chain = "solana" | "ethereum" | "base" | "bsc" | "arbitrum";

/** A normalized token row used throughout the UI. */
export interface TokenRow {
  /** Token mint / contract address. */
  address: string;
  chainId: string;
  name: string;
  symbol: string;
  /** Best (most liquid) pair address for charting / links. */
  pairAddress: string;
  priceUsd: number | null;
  /** Percentage price change over 24h. */
  priceChange24h: number | null;
  priceChange6h: number | null;
  priceChange1h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  fdv: number | null;
  marketCap: number | null;
  /** Unix ms of pair creation, used to flag fresh launches. */
  pairCreatedAt: number | null;
  /** How many "boosts" (paid promotion) the token has — a rough hype proxy. */
  boosts: number | null;
  description: string | null;
  imageUrl: string | null;
  url: string;
  /** Narrative tags derived from name/symbol/description. */
  narratives: string[];
}

export interface TokenLink {
  label: string;
  url: string;
}

/** Richer view of a single token for the detail page. */
export interface TokenDetail extends TokenRow {
  priceChange5m: number | null;
  volume6h: number | null;
  volume1h: number | null;
  buys24h: number | null;
  sells24h: number | null;
  dexId: string | null;
  quoteSymbol: string | null;
  websites: TokenLink[];
  socials: TokenLink[];
}

export interface NarrativeSummary {
  narrative: string;
  tokenCount: number;
  totalVolume24h: number;
  totalLiquidity: number;
  /** Liquidity-weighted average 24h price change. */
  avgPriceChange24h: number;
  topSymbols: string[];
}
