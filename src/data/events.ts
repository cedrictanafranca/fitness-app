/**
 * Minimal change notification so screens re-read after a write.
 * Repositories call `notify(table)`; `useLiveQuery` subscribes.
 */

export type Table =
  | 'profile'
  | 'foods'
  | 'recipes'
  | 'recipe_batches'
  | 'meals'
  | 'calibrations'
  | 'weight_records'
  | 'activity_records';

type Listener = (table: Table) => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify(table: Table): void {
  for (const l of listeners) l(table);
}
