import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Live evals: call the running dev server (and so the real Claude and food-database APIs).
 * They cost API credits and need `npx expo start` running with keys in .env.
 * Run with `npm run eval`. Kept apart from `npm test`, which stays offline and free.
 */
export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    include: ['evals/**/*.eval.ts'],
    environment: 'node',
    testTimeout: 300_000,
    hookTimeout: 60_000,
    // One case at a time keeps API rate limits and the report order predictable.
    fileParallelism: false,
  },
});
