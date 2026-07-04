import { SmartMoneyData } from "./types";
import { WalletTrade } from "./feed";

/** Wallet activity without the wallet identity (the route attaches that). */
export type RawWalletTrade = Omit<WalletTrade, "wallet" | "walletLabel">;

/**
 * A pluggable smart-money data source. Implementations (Birdeye today; Helius,
 * Nansen, etc. later) fetch holder and whale-trade data for a token. Keeping
 * this behind an interface means the API route and UI never depend on a
 * specific vendor.
 */
export interface SmartMoneyProvider {
  name: string;
  configured(): boolean;
  getSmartMoney(chain: string, token: string): Promise<SmartMoneyData>;
  /** Recent swaps made by a single wallet (for the smart-money feed). */
  getWalletActivity(chain: string, wallet: string): Promise<RawWalletTrade[]>;
}

/** Fallback used when no provider key is configured. */
export class NullProvider implements SmartMoneyProvider {
  name = "none";
  configured(): boolean {
    return false;
  }
  async getSmartMoney(): Promise<SmartMoneyData> {
    return {
      configured: false,
      source: this.name,
      holders: [],
      trades: [],
      holderCount: null,
      top10Percent: null,
    };
  }
  async getWalletActivity(): Promise<RawWalletTrade[]> {
    return [];
  }
}
