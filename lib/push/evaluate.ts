import { collectEvents } from "../alertRules";
import { fetchTrendingTokens } from "../dexscreener";
import { TokenRow } from "../types";
import { getStore } from "./store";
import { sendPush } from "./webpush";

export interface EvaluationSummary {
  devices: number;
  chainsFetched: string[];
  pushesSent: number;
  pruned: number;
  errors: number;
}

/**
 * The heart of background alerts: load every subscribed device, fetch trending
 * tokens for the chains they care about (once per chain), evaluate each
 * device's rules, and push any new events. Persists updated cooldowns and
 * prunes dead subscriptions. Called by the cron route on a schedule.
 */
export async function runEvaluation(): Promise<EvaluationSummary> {
  const store = getStore();
  const devices = await store.all();

  const summary: EvaluationSummary = {
    devices: devices.length,
    chainsFetched: [],
    pushesSent: 0,
    pruned: 0,
    errors: 0,
  };
  if (!devices.length) return summary;

  // Fetch each needed chain exactly once and reuse across devices.
  const neededChains = new Set<string>();
  for (const d of devices) d.chains.forEach((c) => neededChains.add(c));

  const tokensByChain: Record<string, TokenRow[]> = {};
  await Promise.all(
    [...neededChains].map(async (chain) => {
      try {
        tokensByChain[chain] = await fetchTrendingTokens(chain);
        summary.chainsFetched.push(chain);
      } catch {
        tokensByChain[chain] = [];
        summary.errors++;
      }
    })
  );

  const now = Date.now();
  for (const device of devices) {
    const tokens = device.chains.flatMap((c) => tokensByChain[c] ?? []);
    const cooldowns = device.cooldowns ?? {};
    const events = collectEvents(
      device.rules,
      tokens,
      device.watchlist,
      cooldowns,
      now
    );

    if (events.length) {
      const result = await sendPush(device.subscription, { events });
      if (result.ok) summary.pushesSent++;
      if (result.expired) {
        await store.remove(device.id);
        summary.pruned++;
        continue;
      }
      if (!result.ok) summary.errors++;
    }

    // Persist cooldowns (and anything mutated) so we don't refire next tick.
    await store.upsert({ ...device, cooldowns, updatedAt: now });
  }

  return summary;
}
