"use client";

import { useEffect, useState } from "react";
import {
  AlertEvent,
  AlertMetric,
  AlertRule,
  AlertScopeType,
  describeRule,
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/alerts";

const METRICS: { key: AlertMetric; label: string; needsThreshold: boolean; unit: string }[] = [
  { key: "priceChange1h", label: "Price change 1h", needsThreshold: true, unit: "%" },
  { key: "priceChange24h", label: "Price change 24h", needsThreshold: true, unit: "%" },
  { key: "volume24h", label: "Volume 24h", needsThreshold: true, unit: "$" },
  { key: "freshLaunch", label: "New launch (<24h)", needsThreshold: false, unit: "" },
];

export default function AlertsPanel({
  open,
  onClose,
  rules,
  events,
  narratives,
  onAddRule,
  onToggleRule,
  onRemoveRule,
  push,
}: {
  open: boolean;
  onClose: () => void;
  rules: AlertRule[];
  events: AlertEvent[];
  narratives: string[];
  onAddRule: (rule: Omit<AlertRule, "id" | "createdAt" | "enabled">) => void;
  onToggleRule: (id: string) => void;
  onRemoveRule: (id: string) => void;
  push: {
    supported: boolean;
    configured: boolean;
    enabled: boolean;
    busy: boolean;
    onToggle: () => void;
  };
}) {
  const [scopeType, setScopeType] = useState<AlertScopeType>("watchlist");
  const [narrative, setNarrative] = useState(narratives[0] ?? "");
  const [metric, setMetric] = useState<AlertMetric>("priceChange1h");
  const [operator, setOperator] = useState<"gt" | "lt">("gt");
  const [threshold, setThreshold] = useState("20");
  const [perm, setPerm] = useState<ReturnType<typeof notificationPermission>>("default");

  // Read permission on the client only (avoids SSR/hydration mismatch).
  useEffect(() => {
    setPerm(notificationPermission());
  }, [open]);

  // Keep the narrative selector valid as options load in.
  useEffect(() => {
    if (narratives.length && !narratives.includes(narrative)) {
      setNarrative(narratives[0]);
    }
  }, [narratives, narrative]);

  const metricDef = METRICS.find((m) => m.key === metric)!;

  const submit = () => {
    onAddRule({
      scopeType,
      narrative: scopeType === "narrative" ? narrative : undefined,
      metric,
      operator,
      threshold: metricDef.needsThreshold ? Number(threshold) || 0 : 0,
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      {/* Drawer */}
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-bg shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">🔔 Alerts</h2>
          <button onClick={onClose} className="text-[#9aa0ad] hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Notification permission */}
          {perm !== "granted" && (
            <div className="mb-4 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
              {perm === "unsupported" ? (
                <span className="text-[#9aa0ad]">
                  Your browser doesn&apos;t support notifications — alerts will
                  still show in the feed below.
                </span>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#c9ccd6]">
                    Enable browser notifications to get pinged.
                  </span>
                  <button
                    onClick={async () => {
                      const result = await requestNotificationPermission();
                      setPerm(result);
                    }}
                    className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Enable
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Background push */}
          <div className="mb-4 rounded-xl border border-border bg-panel p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Background push</div>
                <div className="text-xs text-[#9aa0ad]">
                  Fire alerts even when the app is closed.
                </div>
              </div>
              {!push.supported ? (
                <span className="text-xs text-[#666c7a]">Unsupported</span>
              ) : !push.configured ? (
                <span className="text-xs text-[#666c7a]">Not configured</span>
              ) : (
                <button
                  onClick={push.onToggle}
                  disabled={push.busy}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                    push.enabled
                      ? "border border-border bg-bg text-[#9aa0ad] hover:text-white"
                      : "bg-accent text-white hover:bg-accent/90"
                  }`}
                >
                  {push.busy ? "…" : push.enabled ? "Turn off" : "Turn on"}
                </button>
              )}
            </div>
            {push.enabled && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-up">
                <span className="h-1.5 w-1.5 rounded-full bg-up" /> Active — syncing rules to server
              </div>
            )}
          </div>

          {/* Rule builder */}
          <div className="mb-5 rounded-xl border border-border bg-panel p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[#666c7a]">
              New alert
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-[#9aa0ad]">Scope</label>
              <div className="flex gap-2">
                <select
                  value={scopeType}
                  onChange={(e) => setScopeType(e.target.value as AlertScopeType)}
                  className="flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
                >
                  <option value="watchlist">Watchlist</option>
                  <option value="all">Any token</option>
                  <option value="narrative">Narrative</option>
                </select>
                {scopeType === "narrative" && (
                  <select
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
                  >
                    {narratives.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <label className="mt-1 text-xs text-[#9aa0ad]">Condition</label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as AlertMetric)}
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
              >
                {METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>

              {metricDef.needsThreshold && (
                <div className="flex gap-2">
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as "gt" | "lt")}
                    className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
                  >
                    <option value="gt">is above</option>
                    <option value="lt">is below</option>
                  </select>
                  <div className="flex flex-1 items-center rounded-lg border border-border bg-bg px-2">
                    {metricDef.unit === "$" && (
                      <span className="text-sm text-[#666c7a]">$</span>
                    )}
                    <input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      className="w-full bg-transparent px-1 py-1.5 text-sm outline-none"
                    />
                    {metricDef.unit === "%" && (
                      <span className="text-sm text-[#666c7a]">%</span>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={submit}
                className="mt-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
              >
                Add alert
              </button>
            </div>
          </div>

          {/* Active rules */}
          <div className="mb-5">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[#666c7a]">
              Active rules ({rules.length})
            </div>
            {rules.length === 0 ? (
              <p className="text-sm text-[#666c7a]">No alerts yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2"
                  >
                    <button
                      onClick={() => onToggleRule(r.id)}
                      title={r.enabled ? "Disable" : "Enable"}
                      className={`h-4 w-4 shrink-0 rounded-full border ${
                        r.enabled ? "border-up bg-up" : "border-[#444b59]"
                      }`}
                    />
                    <span
                      className={`flex-1 text-sm ${r.enabled ? "text-[#e6e8ee]" : "text-[#666c7a] line-through"}`}
                    >
                      {describeRule(r)}
                    </span>
                    <button
                      onClick={() => onRemoveRule(r.id)}
                      className="shrink-0 text-[#666c7a] hover:text-down"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feed */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[#666c7a]">
              Recent triggers
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-[#666c7a]">Nothing triggered yet this session.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {events.map((e) => (
                  <a
                    key={e.id}
                    href={`/token/${e.chainId}/${e.tokenAddress}`}
                    className="rounded-lg border border-border bg-panel px-3 py-2 hover:border-accent/60"
                  >
                    <div className="text-sm text-[#e6e8ee]">{e.message}</div>
                    <div className="mt-0.5 flex justify-between text-[11px] text-[#666c7a]">
                      <span>{e.ruleLabel}</span>
                      <span>{new Date(e.firedAt).toLocaleTimeString()}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
