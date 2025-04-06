import { useState, useCallback } from 'react';
import { withTelemetry } from '@/utils/telemetry';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxEntries?: number;
}

const DEFAULT_OPTIONS: CacheOptions = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100
};

export function useHintCache<T>(options: CacheOptions = {}) {
  const { ttl, maxEntries } = { ...DEFAULT_OPTIONS, ...options };
  const [cache] = useState(new Map<string, CacheEntry<T>>());

  const set = useCallback((key: string, data: T) => {
    if (cache.size >= (maxEntries || DEFAULT_OPTIONS.maxEntries!)) {
      // Remove oldest entry when cache is full
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }, [cache, maxEntries]);

  const get = useCallback((key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > (ttl || DEFAULT_OPTIONS.ttl!)) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }, [cache, ttl]);

  const invalidate = useCallback((key: string) => {
    cache.delete(key);
  }, [cache]);

  const clear = useCallback(() => {
    cache.clear();
  }, [cache]);

  return { get, set, invalidate, clear };
}