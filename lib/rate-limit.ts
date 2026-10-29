// Very small in-memory limiter (per key, per server instance). Enough to slow down
// abuse of email-sending endpoints in this project; not shared between instances.

const buckets = new Map<string, number[]>();

/** Returns true when `key` already made `max` calls during the last `windowMs`. */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}
