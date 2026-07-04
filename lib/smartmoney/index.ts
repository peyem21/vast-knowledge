import { BirdeyeProvider } from "./birdeye";
import { NullProvider, SmartMoneyProvider } from "./provider";

/**
 * Returns the active smart-money provider: Birdeye when BIRDEYE_API_KEY is set,
 * otherwise a null provider that reports `configured: false` so the UI can show
 * a setup hint instead of erroring. Swap/extend here to add more vendors.
 */
export function getSmartMoneyProvider(): SmartMoneyProvider {
  const birdeye = new BirdeyeProvider();
  return birdeye.configured() ? birdeye : new NullProvider();
}

export type { SmartMoneyProvider } from "./provider";
