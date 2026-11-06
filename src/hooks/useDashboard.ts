import { useEffect, useState } from 'react';

import { getDashboard } from '../components/analytics/api';
import type { DashboardDay } from '../components/analytics/types';
import { useDataVersion } from './useDataVersion';

const NO_DAYS: DashboardDay[] = [];

/**
 * Stats of a date range for the stats page. Each range is cached, so coming
 * back to a period already seen shows it instantly; `retry` reloads after an
 * error.
 */
export function useDashboard(from: string, to: string) {
  const key = `${from}:${to}`;
  const version = useDataVersion();
  // Each period keeps the data version it was read at: an older one is still
  // shown while it is read again, so the charts do not blink.
  const [loaded, setLoaded] = useState<
    Record<string, { days: DashboardDay[]; version: number }>
  >({});
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const entry = loaded[key] as
    { days: DashboardDay[]; version: number } | undefined;
  const days = entry?.days;
  const isCached = days !== undefined;
  const isFresh = entry?.version === version;

  useEffect(() => {
    if (isFresh) return;
    const controller = new AbortController();

    getDashboard(from, to, controller.signal)
      .then((data) =>
        setLoaded((previous) => ({
          ...previous,
          [key]: { days: data, version },
        })),
      )
      .catch(() => {
        if (!controller.signal.aborted) setFailedKey(key);
      });

    return () => controller.abort();
  }, [from, to, key, isFresh, version, attempt]);

  const hasError = !isCached && failedKey === key;

  return {
    days: days ?? NO_DAYS,
    isLoading: !isCached && !hasError,
    hasError,
    retry: () => {
      setFailedKey(null);
      setAttempt((count) => count + 1);
    },
  };
}
