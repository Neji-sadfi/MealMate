import Dexie, { type EntityTable } from "dexie";

// IndexedDB storage for offline mode (browser only: use from client components).
// Owner: Member 4. Reused by Members 3 (meal plan cache) and 6 (sessions offline).

/** A write made while offline, replayed against the API when the network is back. */
export type PendingAction = {
  id?: number;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  body?: unknown;
  createdAt: number;
};

/** Generic key/value cache for API responses (e.g. "shopping-list:current"). */
export type CachedEntry = {
  key: string;
  data: unknown;
  updatedAt: number;
};

export const offlineDb = new Dexie("mealmate") as Dexie & {
  pendingActions: EntityTable<PendingAction, "id">;
  cache: EntityTable<CachedEntry, "key">;
};

// Bump the version number and add a new .stores() call when the schema changes.
offlineDb.version(1).stores({
  pendingActions: "++id, createdAt",
  cache: "key, updatedAt",
});
