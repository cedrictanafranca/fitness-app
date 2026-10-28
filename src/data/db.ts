/**
 * SQLite connection + migrations. Every aggregate is stored as a JSON document with a few
 * indexed columns, which keeps the repositories small and the schema flexible for the MVP.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'fitness.db';

const migrations: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS profile (id TEXT PRIMARY KEY, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS foods (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, saved INTEGER NOT NULL DEFAULT 0,
    source_ref TEXT, json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name COLLATE NOCASE);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_source_ref ON foods(source_ref) WHERE source_ref IS NOT NULL;
  CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, name TEXT NOT NULL, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS recipe_batches (
    id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL, json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_batches_recipe ON recipe_batches(recipe_id);
  CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, timestamp TEXT NOT NULL, json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
  CREATE TABLE IF NOT EXISTS calibrations (id TEXT PRIMARY KEY, name TEXT NOT NULL, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS weight_records (id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS activity_records (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, external_id TEXT UNIQUE, json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_records(date);
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  for (; version < migrations.length; version++) {
    await db.execAsync(migrations[version]);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
  return db;
}

/** Test/dev helper: drop everything. */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM activity_records; DELETE FROM weight_records; DELETE FROM calibrations;
    DELETE FROM meals; DELETE FROM recipe_batches; DELETE FROM recipes; DELETE FROM foods;
    DELETE FROM profile;
  `);
}
