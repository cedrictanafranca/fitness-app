import { useCallback, useEffect, useState } from 'react';

import { subscribe, type Table } from './events';

export interface LiveQuery<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Run an async read and re-run it whenever one of `tables` changes.
 * `query` should be stable or depend only on `deps`.
 */
export function useLiveQuery<T>(
  query: () => Promise<T>,
  tables: Table[],
  deps: unknown[] = []
): LiveQuery<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    query()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  useEffect(() => {
    return subscribe((table) => {
      if (tables.includes(table)) refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, tables.join(',')]);

  return { data, loading, error, refresh };
}
