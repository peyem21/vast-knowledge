"use client";

import { TokenRow } from "./types";
import { compactUsd, pct } from "./format";

/**
 * Client-side alerting. Rules are stored in localStorage and evaluated in the
 * browser against each data refresh, so no backend is required. When a rule
 * matches, we fire a native browser notification (if permitted) and add the
 * event to an in-app feed.
 *
 * Upgrade path: move rule evaluation server-side with a cron + web-push +
 * VAPID keys so alerts fire even when no tab is open. The rule model here is
 * designed to port directly.
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

const RULES_KEY = "vk:alertRules";
const COOLDOWN_KEY = "vk:alertCooldown";
/** Don't refire the same (rule, token) more than once per this window. */
const COOLDOWN_MS = 30 * 60 * 1000;
const FRESH_MS = 24 * 60 * 60 * 1000;

// ---- Rule storage ----------------------------------------------------------

export function getRules(): AlertRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RULES_KEY);
    return raw ? (JSON.parse(raw) as AlertRule[]) : [];
  } catch {
    return [];
  }
}

function saveRules(rules: AlertRule[]): AlertRule[] {
  window.localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  return rules;
}

export function addRule(
  rule: Omit<AlertRule, "id" | "createdAt" | "enabled">
): AlertRule[] {
  const full: AlertRule = {
    ...rule,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
    enabled: true,
    createdAt: Date.now(),
  };
  return saveRules([...getRules(), full]);
}

export function removeRule(id: string): AlertRule[] {
  return saveRules(getRules().filter((r) => r.id !== id));
}

export function toggleRule(id: string): AlertRule[] {
  return saveRules(
    getRules().map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
  );
}

/** Human-readable summary of a rule for the UI and notification titles. */
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

// ---- Evaluation ------------------------------------------------------------

function getCooldowns(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(COOLDOWN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveCooldowns(map: Record<string, number>): void {
  window.localStorage.setItem(COOLDOWN_KEY, JSON.stringify(map));
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

function matches(rule: AlertRule, token: TokenRow): { hit: boolean; message: string } {
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
 * Evaluates all enabled rules against the current tokens and returns only the
 * newly-fired events (respecting a per-(rule,token) cooldown). Fresh-launch
 * alerts fire once per token ever, so they don't repeat every refresh.
 */
export function evaluateAlerts(
  tokens: TokenRow[],
  rules: AlertRule[],
  watchlist: string[]
): AlertEvent[] {
  if (typeof window === "undefined") return [];
  const now = Date.now();
  const cooldowns = getCooldowns();
  const events: AlertEvent[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const token of tokens) {
      if (!inScope(rule, token, watchlist)) continue;
      const { hit, message } = matches(rule, token);
      if (!hit) continue;

      const key = `${rule.id}:${token.address}`;
      const last = cooldowns[key] ?? 0;
      // Fresh launches fire only once ever; others respect the cooldown window.
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

  if (events.length) saveCooldowns(cooldowns);
  return events;
}

// ---- Browser notifications -------------------------------------------------

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  return Notification.requestPermission();
}

export function fireNotification(event: AlertEvent): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification("🔔 " + event.ruleLabel, {
      body: event.message,
      tag: event.ruleId + ":" + event.tokenAddress,
      icon: "/icon.svg",
    });
    n.onclick = () => {
      window.focus();
      window.location.href = `/token/${event.chainId}/${event.tokenAddress}`;
    };
  } catch {
    // Some browsers throw if constructed without a service worker; ignore.
  }
}
