import { SmartMoneyProvider } from "./provider";
import { Holder, SmartMoneyData, WhaleTrade } from "./types";

/**
 * Birdeye smart-money provider. Uses BIRDEYE_API_KEY. Response shapes differ
 * across Birdeye plan tiers, so every field read here is defensive: we probe
 * a few likely field names and skip anything malformed rather than throwing.
 * Verify the mappings against your plan's docs if numbers look off.
 */

const BASE = "https://public-api.birdeye.so";

/** Only large trades count as "whale" activity. */
const WHALE_MIN_USD = 1000;

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    const n = typeof v === "string" ? parseFloat(v) : (v as number);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

export class BirdeyeProvider implements SmartMoneyProvider {
  name = "birdeye";

  configured(): boolean {
    return !!process.env.BIRDEYE_API_KEY;
  }

  private async get(
    path: string,
    chain: string
  ): Promise<Record<string, unknown> | null> {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        "X-API-KEY": process.env.BIRDEYE_API_KEY!,
        "x-chain": chain,
        accept: "application/json",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Birdeye ${path} -> ${res.status}`);
    const json = (await res.json()) as { data?: unknown };
    return (json.data as Record<string, unknown>) ?? null;
  }

  async getSmartMoney(chain: string, token: string): Promise<SmartMoneyData> {
    const empty: SmartMoneyData = {
      configured: true,
      source: this.name,
      holders: [],
      trades: [],
      holderCount: null,
      top10Percent: null,
    };
    if (!this.configured()) return { ...empty, configured: false, source: "none" };

    try {
      const [overview, holderData, tradeData] = await Promise.all([
        this.get(`/defi/token_overview?address=${token}`, chain).catch(() => null),
        this.get(
          `/defi/v3/token/holder?address=${token}&offset=0&limit=20`,
          chain
        ).catch(() => null),
        this.get(
          `/defi/txs/token?address=${token}&offset=0&limit=50&tx_type=swap&sort_type=desc`,
          chain
        ).catch(() => null),
      ]);

      const supply =
        overview &&
        pickNum(overview, ["circulatingSupply", "supply", "totalSupply"]);
      const holderCount = overview ? pickNum(overview, ["holder", "holders"]) : null;
      const top10Percent = overview
        ? pickNum(overview, ["top10HolderPercent"])
        : null;

      const holders = parseHolders(holderData, supply);
      const trades = parseTrades(tradeData);

      return {
        ...empty,
        holders,
        trades,
        holderCount,
        top10Percent: top10Percent != null ? top10Percent * 100 : null,
      };
    } catch (err) {
      return { ...empty, error: err instanceof Error ? err.message : "fetch failed" };
    }
  }
}

function asItems(data: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!data) return [];
  const items = (data.items ?? data.tokens ?? data) as unknown;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

function parseHolders(
  data: Record<string, unknown> | null,
  supply: number | null
): Holder[] {
  const out: Holder[] = [];
  asItems(data).forEach((item, i) => {
    const owner = pickStr(item, ["owner", "wallet", "address"]);
    const amount = pickNum(item, ["ui_amount", "uiAmount", "amount"]);
    if (!owner || amount == null) return;
    out.push({
      rank: i + 1,
      owner,
      amount,
      percentage: supply && supply > 0 ? (amount / supply) * 100 : null,
    });
  });
  return out;
}

function parseTrades(data: Record<string, unknown> | null): WhaleTrade[] {
  const out: WhaleTrade[] = [];
  for (const item of asItems(data)) {
    const volumeUsd = pickNum(item, ["volumeUSD", "volumeUsd", "volume"]);
    if (volumeUsd == null || volumeUsd < WHALE_MIN_USD) continue;
    const owner = pickStr(item, ["owner", "wallet", "from", "trader"]) ?? "unknown";
    const txHash = pickStr(item, ["txHash", "tx_hash", "signature"]) ?? "";
    const sideRaw = pickStr(item, ["side", "type"]);
    const unix = pickNum(item, ["blockUnixTime", "blockTime", "time"]);
    out.push({
      side: sideRaw === "sell" ? "sell" : "buy",
      volumeUsd,
      owner,
      txHash,
      timestamp: unix ? unix * 1000 : Date.now(),
    });
  }
  return out.sort((a, b) => b.volumeUsd - a.volumeUsd).slice(0, 15);
}
