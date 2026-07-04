/** A large token holder (whale) with its share of supply. */
export interface Holder {
  rank: number;
  owner: string;
  amount: number;
  /** Percentage of circulating supply, when supply is known. */
  percentage: number | null;
}

/** A recent large swap ("whale trade") on the token. */
export interface WhaleTrade {
  side: "buy" | "sell";
  volumeUsd: number;
  owner: string;
  txHash: string;
  /** Unix ms. */
  timestamp: number;
}

/** Smart-money view for a single token, returned by the API. */
export interface SmartMoneyData {
  configured: boolean;
  source: string;
  holders: Holder[];
  trades: WhaleTrade[];
  holderCount: number | null;
  top10Percent: number | null;
  /** Set when the provider is configured but the fetch failed. */
  error?: string;
}
