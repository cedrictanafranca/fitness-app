import { useCallback, useEffect, useState } from 'react';

import { subscribe, type Table } from './events';

export interface LiveQuery<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

interface State<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
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
  const [state, setState] = useState<State<T>>({ data: undefined, loading: true, error: null });
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setState((s) => (s.loading ? s : { ...s, loading: true }));
      try {
        const data = await query();
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e : new Error(String(e)) }));
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const tableKey = tables.join(',');
  useEffect(() => {
    return subscribe((table) => {
      if (tableKey.split(',').includes(table)) refresh();
    });
  }, [refresh, tableKey]);

  return { ...state, refresh };
}
