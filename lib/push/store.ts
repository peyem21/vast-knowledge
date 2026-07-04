import { promises as fs } from "fs";
import path from "path";
import { AlertRule } from "../alertRules";

/**
 * One subscribed device: its Web Push subscription plus the rules/watchlist/
 * chains needed to evaluate alerts for it server-side, and its cooldown state.
 */
export interface DeviceRecord {
  id: string;
  subscription: PushSubscriptionShape;
  rules: AlertRule[];
  watchlist: string[];
  chains: string[];
  cooldowns: Record<string, number>;
  updatedAt: number;
}

/** Minimal shape of a browser PushSubscription (as JSON). */
export interface PushSubscriptionShape {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushStore {
  upsert(record: DeviceRecord): Promise<void>;
  remove(id: string): Promise<void>;
  get(id: string): Promise<DeviceRecord | null>;
  all(): Promise<DeviceRecord[]>;
}

/**
 * File-backed store — fine for local dev and single-instance/self-hosted
 * deploys. It is NOT suitable for serverless (Vercel), where the filesystem
 * is ephemeral and read-only. To deploy there, implement `PushStore` against
 * Vercel KV, Upstash Redis, or Postgres and return it from `getStore()`.
 */
class FileStore implements PushStore {
  private file = path.join(process.cwd(), ".data", "push.json");

  private async readAll(): Promise<Record<string, DeviceRecord>> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      return JSON.parse(raw) as Record<string, DeviceRecord>;
    } catch {
      return {};
    }
  }

  private async writeAll(map: Record<string, DeviceRecord>): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(map, null, 2), "utf8");
  }

  async upsert(record: DeviceRecord): Promise<void> {
    const map = await this.readAll();
    map[record.id] = record;
    await this.writeAll(map);
  }

  async remove(id: string): Promise<void> {
    const map = await this.readAll();
    delete map[id];
    await this.writeAll(map);
  }

  async get(id: string): Promise<DeviceRecord | null> {
    const map = await this.readAll();
    return map[id] ?? null;
  }

  async all(): Promise<DeviceRecord[]> {
    const map = await this.readAll();
    return Object.values(map);
  }
}

let store: PushStore | null = null;

/**
 * Returns the process-wide push store. Swap the implementation here when you
 * move to a hosted DB — everything else (routes, cron) is written against the
 * `PushStore` interface and won't need changes.
 */
export function getStore(): PushStore {
  if (!store) store = new FileStore();
  return store;
}
