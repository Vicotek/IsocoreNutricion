import { getRecipes } from '../../api/recipes.js';

export async function loadRecipes() {
  return getRecipes();
}
