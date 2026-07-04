"use client";

import { TokenRow } from "./types";
import {
  AlertEvent,
  AlertRule,
  collectEvents,
  describeRule,
} from "./alertRules";

/**
 * Client-side alerting: localStorage-backed rule storage, in-browser
 * evaluation (using the shared logic in ./alertRules), and native browser
 * notifications. For alerts that fire when no tab is open, see the server
 * push pipeline in lib/push/* and app/api/push/*.
 */

// Re-export the shared model so existing imports of "@/lib/alerts" keep working.
export type {
  AlertMetric,
  AlertScopeType,
  AlertRule,
  AlertEvent,
} from "./alertRules";
export { describeRule } from "./alertRules";

const RULES_KEY = "vk:alertRules";
const COOLDOWN_KEY = "vk:alertCooldown";

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

/**
 * Evaluates rules against the current tokens in-browser and returns the
 * newly-fired events, persisting cooldowns to localStorage.
 */
export function evaluateAlerts(
  tokens: TokenRow[],
  rules: AlertRule[],
  watchlist: string[]
): AlertEvent[] {
  if (typeof window === "undefined") return [];
  const cooldowns = getCooldowns();
  const events = collectEvents(rules, tokens, watchlist, cooldowns, Date.now());
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
