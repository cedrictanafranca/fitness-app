import { calibrationsRepo, foodsRepo, recipesRepo } from '@/data/repos';
import { useLiveQuery } from '@/data/use-live-query';

export function useRecipes() {
  return useLiveQuery(() => recipesRepo.list(), ['recipes']);
}

export function useRecipe(id: string | undefined) {
  return useLiveQuery(async () => (id ? recipesRepo.get(id) : undefined), ['recipes'], [id]);
}

export function useBatches(recipeId: string | undefined) {
  return useLiveQuery(
    async () => (recipeId ? recipesRepo.listBatches(recipeId) : []),
    ['recipe_batches'],
    [recipeId]
  );
}

export function useSavedFoods() {
  return useLiveQuery(() => foodsRepo.listSaved(), ['foods']);
}

export function useCalibrations() {
  return useLiveQuery(() => calibrationsRepo.list(), ['calibrations']);
}

export function useCalibration(id: string | undefined) {
  return useLiveQuery(async () => (id ? calibrationsRepo.get(id) : undefined), ['calibrations'], [id]);
}
