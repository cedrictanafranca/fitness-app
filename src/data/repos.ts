/**
 * Repositories — the only module that talks to SQLite. Screens use these through hooks
 * in `features/*` or `useLiveQuery`. Every write notifies subscribers.
 */

import { recipeNutrition } from '@/core/nutrition/engine';
import type {
  ActivityRecord,
  DateKey,
  Food,
  Meal,
  PortionCalibration,
  Recipe,
  RecipeBatch,
  RecipeIngredient,
  UserProfile,
  WeightRecord,
} from '@/core/types';

import { resetDatabase } from './db';
import { docTable } from './doc-table';
import { notify } from './events';
import { newId, nowIso } from './ids';

// ---------- Profile ----------

export const DEFAULT_PROFILE: UserProfile = {
  id: 'me',
  heightCm: 175.3, // 5'9"
  weightKg: 67.6,
  goal: 'recomposition',
  calorieTarget: 2500,
  proteinTarget: 145,
  units: 'imperial',
  activityCreditEnabled: true,
  activityCreditPercent: 50,
  updatedAt: '',
};

const profileTable = docTable<UserProfile>('profile', () => ({}));

export const profileRepo = {
  async get(): Promise<UserProfile> {
    return (await profileTable.get('me')) ?? DEFAULT_PROFILE;
  },
  async save(patch: Partial<Omit<UserProfile, 'id'>>): Promise<UserProfile> {
    const current = await profileRepo.get();
    return profileTable.upsert({ ...current, ...patch, id: 'me', updatedAt: nowIso() });
  },
};

// ---------- Foods ----------

const foodsTable = docTable<Food>('foods', (f) => ({
  name: f.name,
  saved: f.saved ? 1 : 0,
  source_ref: f.sourceRef ?? null,
}));

export const foodsRepo = {
  get: foodsTable.get,
  remove: foodsTable.remove,
  upsert: foodsTable.upsert,

  /** Case-insensitive name search over locally stored foods. */
  async search(q: string, limit = 25): Promise<Food[]> {
    const term = q.trim();
    if (!term) return foodsTable.query('saved = 1', [], 'name COLLATE NOCASE LIMIT ' + limit);
    return foodsTable.query('name LIKE ? COLLATE NOCASE', [`%${term}%`], `saved DESC, name COLLATE NOCASE LIMIT ${limit}`);
  },

  listSaved(): Promise<Food[]> {
    return foodsTable.query('saved = 1', [], 'name COLLATE NOCASE');
  },

  /** Find by external ref (USDA fdcId / barcode) so remote lookups are cached once. */
  async bySourceRef(sourceRef: string): Promise<Food | undefined> {
    const rows = await foodsTable.query('source_ref = ?', [sourceRef]);
    return rows[0];
  },

  create(input: Omit<Food, 'id' | 'createdAt'>): Promise<Food> {
    return foodsTable.upsert({ ...input, id: newId(), createdAt: nowIso() });
  },
};

// ---------- Recipes & batches ----------

const recipesTable = docTable<Recipe>('recipes', (r) => ({ name: r.name }));
const batchesTable = docTable<RecipeBatch>('recipe_batches', (b) => ({
  recipe_id: b.recipeId,
  created_at: b.createdAt,
}));

export const recipesRepo = {
  get: recipesTable.get,
  remove: recipesTable.remove,

  list(): Promise<Recipe[]> {
    return recipesTable.query('', [], 'name COLLATE NOCASE');
  },

  async searchByName(q: string): Promise<Recipe[]> {
    return recipesTable.query('name LIKE ? COLLATE NOCASE', [`%${q.trim()}%`], 'name COLLATE NOCASE');
  },

  create(input: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const now = nowIso();
    return recipesTable.upsert({ ...input, id: newId(), createdAt: now, updatedAt: now });
  },

  async update(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Promise<Recipe> {
    const current = await recipesTable.get(id);
    if (!current) throw new Error(`Recipe ${id} not found`);
    return recipesTable.upsert({ ...current, ...patch, id, updatedAt: nowIso() });
  },

  /** Batches are immutable snapshots; meals reference them so recipe edits never rewrite history. */
  listBatches(recipeId: string): Promise<RecipeBatch[]> {
    return batchesTable.query('recipe_id = ?', [recipeId], 'created_at DESC');
  },

  getBatch: batchesTable.get,

  async createBatch(input: {
    recipeId: string;
    ingredients: RecipeIngredient[];
    cookedWeightG: number;
    note?: string;
  }): Promise<RecipeBatch> {
    const n = recipeNutrition(input.ingredients, input.cookedWeightG);
    return batchesTable.upsert({
      id: newId(),
      recipeId: input.recipeId,
      note: input.note,
      ingredients: input.ingredients,
      cookedWeightG: input.cookedWeightG,
      totals: n.totals,
      per100g: n.per100g,
      createdAt: nowIso(),
    });
  },
};

// ---------- Meals ----------

const mealsTable = docTable<Meal>('meals', (m) => ({ date: m.date, timestamp: m.timestamp }));

export const mealsRepo = {
  get: mealsTable.get,
  remove: mealsTable.remove,

  listByDate(date: DateKey): Promise<Meal[]> {
    return mealsTable.query('date = ?', [date], 'timestamp ASC');
  },

  listRange(from: DateKey, to: DateKey): Promise<Meal[]> {
    return mealsTable.query('date >= ? AND date <= ?', [from, to], 'timestamp ASC');
  },

  /** Most recent meals, for "same as yesterday" and recently-eaten suggestions. */
  listRecent(limit = 20): Promise<Meal[]> {
    return mealsTable.query('', [], `timestamp DESC LIMIT ${limit}`);
  },

  create(input: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Meal> {
    const now = nowIso();
    const id = newId();
    const items = input.items.map((i) => ({ ...i, mealId: id }));
    return mealsTable.upsert({ ...input, id, items, createdAt: now, updatedAt: now });
  },

  async update(id: string, patch: Partial<Omit<Meal, 'id' | 'createdAt'>>): Promise<Meal> {
    const current = await mealsTable.get(id);
    if (!current) throw new Error(`Meal ${id} not found`);
    return mealsTable.upsert({ ...current, ...patch, id, updatedAt: nowIso() });
  },
};

// ---------- Portion calibrations ----------

const calibrationsTable = docTable<PortionCalibration>('calibrations', (c) => ({ name: c.name }));

export const calibrationsRepo = {
  get: calibrationsTable.get,
  remove: calibrationsTable.remove,

  list(): Promise<PortionCalibration[]> {
    return calibrationsTable.query('', [], 'name COLLATE NOCASE');
  },

  create(input: { name: string; grams: number; foodId?: string; foodName?: string }): Promise<PortionCalibration> {
    const now = nowIso();
    return calibrationsTable.upsert({
      id: newId(),
      name: input.name,
      foodId: input.foodId,
      foodName: input.foodName,
      grams: input.grams,
      history: [{ grams: input.grams, at: now }],
      createdAt: now,
      updatedAt: now,
    });
  },

  /** Record a new weighing; the stored grams becomes the latest sample. */
  async addSample(id: string, grams: number): Promise<PortionCalibration> {
    const current = await calibrationsTable.get(id);
    if (!current) throw new Error(`Calibration ${id} not found`);
    const now = nowIso();
    return calibrationsTable.upsert({
      ...current,
      grams,
      history: [...current.history, { grams, at: now }],
      updatedAt: now,
    });
  },
};

// ---------- Weight & activity ----------

const weightTable = docTable<WeightRecord>('weight_records', (w) => ({ date: w.date }));

export const weightRepo = {
  remove: weightTable.remove,

  list(limit = 365): Promise<WeightRecord[]> {
    return weightTable.query('', [], `date DESC LIMIT ${limit}`);
  },

  /** One record per day; logging again on the same date replaces it. */
  async logForDate(date: DateKey, weightKg: number, note?: string): Promise<WeightRecord> {
    const existing = await weightTable.query('date = ?', [date]);
    return weightTable.upsert({ id: existing[0]?.id ?? newId(), date, weightKg, note });
  },
};

const activityTable = docTable<ActivityRecord>('activity_records', (a) => ({
  date: a.date,
  timestamp: a.timestamp,
  external_id: a.externalId ?? null,
}));

export const activityRepo = {
  remove: activityTable.remove,

  listByDate(date: DateKey): Promise<ActivityRecord[]> {
    return activityTable.query('date = ?', [date], 'timestamp ASC');
  },

  /** Sum of calories burned for a day, for the dashboard's activity credit. */
  async caloriesForDate(date: DateKey): Promise<number> {
    const rows = await activityRepo.listByDate(date);
    return rows.reduce((s, r) => s + r.caloriesBurned, 0);
  },

  /** Idempotent on externalId so HealthKit re-syncs never duplicate. */
  async upsert(input: Omit<ActivityRecord, 'id'>): Promise<ActivityRecord> {
    if (input.externalId) {
      const existing = await activityTable.query('external_id = ?', [input.externalId]);
      if (existing[0]) return activityTable.upsert({ ...existing[0], ...input, id: existing[0].id });
    }
    return activityTable.upsert({ ...input, id: newId() });
  },
};

// ---------- Dev helpers ----------

/**
 * Development only: expose the repositories as `globalThis.__fuel` so QA can seed or inspect
 * the on-device database from the web preview's console (e.g. meals dated in the past, which
 * the Log flow never creates). Stripped from production builds by the `__DEV__` check.
 */
if (__DEV__) {
  (globalThis as unknown as { __fuel?: unknown }).__fuel = {
    profileRepo,
    foodsRepo,
    recipesRepo,
    mealsRepo,
    calibrationsRepo,
    weightRepo,
    activityRepo,
    resetDatabase,
    notify,
  };
}
