import type { Food } from '@/core/types';

import { createStore } from './store';

/** Hand-off from the add-food screen back to search (opens the quantity sheet for the new food). */
export const createdFoodStore = createStore<Food | null>(null);
