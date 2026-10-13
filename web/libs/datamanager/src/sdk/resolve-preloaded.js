/**
 * Use a request that already started on the route, and fall back to a fresh
 * call when that request is missing or failed.
 * @param {Promise<any> | null | undefined} preloaded
 * @param {() => Promise<any>} fallback
 */
export async function resolvePreloaded(preloaded, fallback) {
  if (preloaded == null) return fallback();

  try {
    const value = await preloaded;
    if (value == null || value.error) return fallback();
    return value;
  } catch {
    return fallback();
  }
}
