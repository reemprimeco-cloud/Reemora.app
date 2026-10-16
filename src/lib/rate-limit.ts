/** Small in-memory sliding-window limiter for API routes.
 *
 *  It is per function instance (Vercel keeps a warm instance per region),
 *  which is enough to stop one account hammering a route, but it is not a
 *  cluster-wide guarantee: the database-level limits (chat/comment
 *  triggers, storage upload quotas) remain the hard ceiling. Keys are
 *  pruned lazily so memory stays bounded. */

type Bucket = { hits: number[]; };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  if (now - lastSweep > windowMs) {
    for (const [k, b] of buckets) {
      if (!b.hits.length || b.hits[b.hits.length - 1] < now - windowMs) buckets.delete(k);
    }
    lastSweep = now;
  }
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > now - windowMs);
  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const retryAfterSec = Math.max(1, Math.ceil((bucket.hits[0] + windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSec: 0 };
}
