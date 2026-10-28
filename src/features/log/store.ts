import { useSyncExternalStore } from 'react';

/** Tiny module-level store with subscribe + a React hook. No dependencies. */
export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  use: () => T;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  const get = () => state;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const set = (next: T | ((prev: T) => T)) => {
    state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
    listeners.forEach((l) => l());
  };
  const use = () => useSyncExternalStore(subscribe, get, get);

  return { get, set, subscribe, use };
}
