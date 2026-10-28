import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { getDb } from './db';
import { notify, type Table } from './events';

/** Shared JSON-document helpers used by every repository. */
export function docTable<T extends { id: string }>(
  table: Table,
  /** Indexed columns to write alongside the JSON, derived from the document. */
  columns: (doc: T) => Record<string, string | number | null>
) {
  const parse = (row: { json: string } | null | undefined): T | undefined =>
    row ? (JSON.parse(row.json) as T) : undefined;

  return {
    async get(id: string): Promise<T | undefined> {
      const db = await getDb();
      return parse(await db.getFirstAsync<{ json: string }>(`SELECT json FROM ${table} WHERE id = ?`, id));
    },

    async query(where = '', params: SQLiteBindValue[] = [], orderBy = ''): Promise<T[]> {
      const db = await getDb();
      const sql = `SELECT json FROM ${table}${where ? ` WHERE ${where}` : ''}${orderBy ? ` ORDER BY ${orderBy}` : ''}`;
      const rows = await db.getAllAsync<{ json: string }>(sql, params);
      return rows.map((r) => JSON.parse(r.json) as T);
    },

    async upsert(doc: T): Promise<T> {
      const db = await getDb();
      const cols = { id: doc.id, ...columns(doc), json: JSON.stringify(doc) };
      const names = Object.keys(cols);
      const placeholders = names.map(() => '?').join(', ');
      const updates = names.filter((n) => n !== 'id').map((n) => `${n} = excluded.${n}`).join(', ');
      await db.runAsync(
        `INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
        Object.values(cols)
      );
      notify(table);
      return doc;
    },

    async remove(id: string): Promise<void> {
      const db = await getDb();
      await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
      notify(table);
    },

    async withDb<R>(fn: (db: SQLiteDatabase) => Promise<R>): Promise<R> {
      return fn(await getDb());
    },
  };
}
