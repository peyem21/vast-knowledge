import { TokenRow } from "./types";
import { compactUsd, pct } from "./format";

/**
 * Pure, environment-agnostic alert logic shared by the client (in-browser
 * evaluation) and the server (cron + web-push). No storage, no DOM — just
 * the rule model and the matching/evaluation functions. Keep it dependency-
 * free so it runs identically in the browser and in a serverless function.
 */

export type AlertMetric =
  | "priceChange1h"
  | "priceChange24h"
  | "volume24h"
  | "freshLaunch";

export type AlertScopeType = "watchlist" | "all" | "narrative";

export interface AlertRule {
  id: string;
  scopeType: AlertScopeType;
  narrative?: string;
  metric: AlertMetric;
  operator: "gt" | "lt";
  threshold: number;
  enabled: boolean;
  createdAt: number;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleLabel: string;
  tokenAddress: string;
  chainId: string;
  symbol: string;
  message: string;
  firedAt: number;
}

/** Don't refire the same (rule, token) more than once per this window. */
export const COOLDOWN_MS = 30 * 60 * 1000;
export const FRESH_MS = 24 * 60 * 60 * 1000;

/** Human-readable summary of a rule for UI and notification titles. */
export function describeRule(rule: AlertRule): string {
  const scope =
    rule.scopeType === "watchlist"
      ? "Watchlist"
      : rule.scopeType === "narrative"
        ? `#${rule.narrative}`
        : "Any token";
  const op = rule.operator === "gt" ? ">" : "<";
  let metric: string;
  switch (rule.metric) {
    case "priceChange1h":
      metric = `1h change ${op} ${rule.threshold}%`;
      break;
    case "priceChange24h":
      metric = `24h change ${op} ${rule.threshold}%`;
      break;
    case "volume24h":
      metric = `24h volume ${op} ${compactUsd(rule.threshold)}`;
      break;
    case "freshLaunch":
      metric = "New launch (<24h)";
      break;
  }
  return `${scope} · ${metric}`;
}

function inScope(rule: AlertRule, token: TokenRow, watchlist: string[]): boolean {
  switch (rule.scopeType) {
    case "watchlist":
      return watchlist.includes(token.address);
    case "narrative":
      return !!rule.narrative && token.narratives.includes(rule.narrative);
    case "all":
      return true;
  }
}

function matchToken(
  rule: AlertRule,
  token: TokenRow
): { hit: boolean; message: string } {
  const cmp = (v: number | null): boolean => {
    if (v == null) return false;
    return rule.operator === "gt" ? v > rule.threshold : v < rule.threshold;
  };

  switch (rule.metric) {
    case "priceChange1h":
      return {
        hit: cmp(token.priceChange1h),
        message: `${token.symbol} ${pct(token.priceChange1h)} (1h)`,
      };
    case "priceChange24h":
      return {
        hit: cmp(token.priceChange24h),
        message: `${token.symbol} ${pct(token.priceChange24h)} (24h)`,
      };
    case "volume24h":
      return {
        hit: cmp(token.volume24h),
        message: `${token.symbol} volume ${compactUsd(token.volume24h)} (24h)`,
      };
    case "freshLaunch": {
      const fresh =
        !!token.pairCreatedAt && Date.now() - token.pairCreatedAt < FRESH_MS;
      return { hit: fresh, message: `New launch: ${token.symbol}` };
    }
  }
}

/**
 * Evaluates enabled rules against tokens and returns newly-fired events,
 * mutating `cooldowns` in place (key = `ruleId:tokenAddress` → last fired ms).
 * Fresh-launch alerts fire once per token ever; others respect COOLDOWN_MS.
 * This is the single source of truth for both client and server evaluation.
 */
export function collectEvents(
  rules: AlertRule[],
  tokens: TokenRow[],
  watchlist: string[],
  cooldowns: Record<string, number>,
  now: number
): AlertEvent[] {
  const events: AlertEvent[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const token of tokens) {
      if (!inScope(rule, token, watchlist)) continue;
      const { hit, message } = matchToken(rule, token);
      if (!hit) continue;

      const key = `${rule.id}:${token.address}`;
      const last = cooldowns[key] ?? 0;
      const due =
        rule.metric === "freshLaunch" ? last === 0 : now - last >= COOLDOWN_MS;
      if (!due) continue;

      cooldowns[key] = now;
      events.push({
        id: key + ":" + now,
        ruleId: rule.id,
        ruleLabel: describeRule(rule),
        tokenAddress: token.address,
        chainId: token.chainId,
        symbol: token.symbol,
        message,
        firedAt: now,
      });
    }
  }

  return events;
}
