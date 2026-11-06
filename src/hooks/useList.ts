import { useEffect, useState } from 'react';

import { useDataVersion } from './useDataVersion';

/**
 * A list read from the database, read again at each change of the data, with
 * its loading state and a way to try again after a failure. `read` must keep
 * the same identity between renders.
 */
export function useList<T>(read: (signal: AbortSignal) => Promise<T[]>) {
  const version = useDataVersion();
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    read(controller.signal)
      .then((list) => {
        setItems(list);
        setHasError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [read, attempt, version]);

  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    setAttempt((count) => count + 1);
  };

  return { items, isLoading, hasError, retry };
}
