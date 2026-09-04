'use client';

import { useEffect, useRef } from 'react';

/**
 * Re-fetch data when user returns to the tab after it's been hidden.
 * Debounced to avoid rapid re-fetches.
 *
 * @param callback - Function to call when tab becomes visible
 * @param minIntervalMs - Minimum time between re-fetches (default: 30s)
 */
export function useFocusRefresh(
  callback: () => void,
  minIntervalMs: number = 30_000
) {
  const lastFetchRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const elapsed = Date.now() - lastFetchRef.current;
      if (elapsed < minIntervalMs) return;

      lastFetchRef.current = Date.now();
      callback();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callback, minIntervalMs]);
}
