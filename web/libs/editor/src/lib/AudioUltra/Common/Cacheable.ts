export class Cacheable {
  private cache = new Map<string, any>();

  createKey(...args: any[]) {
    if (args.length === 1) {
      return args[0].toString();
    }

    return args.join(':');
  }

  clearCache() {
    this.cache.clear();
  }

  cached(key: number|string|Array<string|number>, fn: () => any) {
    const cacheKey = this.createKey(key);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = fn();

    this.cache.set(cacheKey, result);

    return result;
  }
}

