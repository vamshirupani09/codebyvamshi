/**
 * Tiny in-memory cache with request de-duplication.
 * Keeps shared shell data (notifications, stats, dashboard counters) from being
 * re-fetched on every client-side route change, without changing any API.
 */

interface Entry<T> {
  value?: T;
  expires: number;
  inflight?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

export const DEFAULT_TTL = 60_000;

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit) {
    if (hit.inflight) return hit.inflight;
    if (hit.value !== undefined && hit.expires > now) return hit.value;
  }

  const inflight = fetcher()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttl });
      return value;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });

  store.set(key, { expires: now + ttl, inflight });
  return inflight;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) return store.clear();
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k);
}
