/**
 * RecipesService - Biblioteca de recetas desde Supabase
 * Gestiona recetas, búsqueda, filtros desde tabla real
 * PRIORIDAD 2: Recetas
 */

import {
  getRecipesFromSupabase,
  getRecipeFromSupabase,
  searchRecipesInSupabase,
  filterRecipesInSupabase
} from './supabaseClient.js';

// Cache local de recetas
let recipesCache = [];
let currentUserEmail = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Inicializar servicio de recetas
 * @param {string} userEmail - Email del usuario autenticado
 */
export function initializeRecipesService(userEmail) {
  if (!userEmail) {
    console.warn('⚠️ Email no proporcionado para RecipesService');
    return;
  }
  
  currentUserEmail = userEmail;
  console.log('🍽️ RecipesService inicializado para:', userEmail);
  
  // Cargar recetas desde Supabase
  loadRecipesFromSupabase();
}

/**
 * Cargar recetas desde Supabase al cache local
 */
async function loadRecipesFromSupabase() {
  try {
    console.log('📥 Cargando recetas desde Supabase...');
    const recipes = await getRecipesFromSupabase();
    
    if (recipes && Array.isArray(recipes)) {
      recipesCache = recipes;
      cacheTimestamp = Date.now();
      console.log(`✅ ${recipes.length} recetas cargadas al cache`);
      localStorage.setItem('isocore_recipes_cache', JSON.stringify({
        data: recipes,
        timestamp: cacheTimestamp
      }));
    } else {
      console.warn('⚠️ No hay recetas desde Supabase, intentando cache local');
      loadRecipesFromCache();
    }
  } catch (error) {
    console.error('❌ Error cargando recetas:', error);
    loadRecipesFromCache();
  }
}

/**
 * Cargar recetas del cache local
 */
function loadRecipesFromCache() {
  try {
    const cached = localStorage.getItem('isocore_recipes_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      recipesCache = parsed.data || [];
      cacheTimestamp = parsed.timestamp || 0;
      console.log(`♻️ ${recipesCache.length} recetas cargadas desde cache local`);
    }
  } catch (error) {
    console.error('Error cargando cache local:', error);
  }
}

/**
 * Obtener todas las recetas con paginación opcional
 * @param {number} limit - Límite de recetas a retornar
 * @param {number} offset - Offset para paginación
 * @returns {Array} - Array de recetas
 */
export function getRecipes(limit = 999, offset = 0) {
  if (recipesCache.length === 0) {
    loadRecipesFromCache();
  }
  return recipesCache.slice(offset, offset + limit);
}

/**
 * Obtener una receta específica por ID
 * @param {string} recipeId - ID de la receta
 * @returns {Object|null} - Objeto de la receta o null
 */
export function getRecipe(recipeId) {
  if (!recipeId) return null;
  
  const recipe = recipesCache.find(r => r.id === recipeId);
  
  if (!recipe) {
    console.warn(`⚠️ Receta ${recipeId} no encontrada en cache`);
  }
  
  return recipe || null;
}

/**
 * Buscar recetas por término de búsqueda
 * @param {string} query - Término de búsqueda
 * @returns {Array} - Array de recetas que coinciden
 */
export function searchRecipes(query) {
  if (!query || query.length < 2) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  
  return recipesCache.filter(recipe =>
    (recipe.name && recipe.name.toLowerCase().includes(lowerQuery)) ||
    (recipe.description && recipe.description.toLowerCase().includes(lowerQuery)) ||
    (recipe.ingredients && recipe.ingredients.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Filtrar recetas por criterios avanzados
 * @param {Object} filters - Objeto con filtros
 * @returns {Array} - Array de recetas filtradas
 */
export function filterRecipes(filters = {}) {
  let result = [...recipesCache];

  // Filtrar por dificultad
  if (filters.difficulty) {
    result = result.filter(r => r.difficulty === filters.difficulty);
  }

  // Filtrar por tiempo de preparación
  if (filters.prepTime) {
    result = result.filter(r => {
      const time = parseInt(r.prep_time || 0);
      return time <= parseInt(filters.prepTime);
    });
  }

  // Filtrar por tipo de comida
  if (filters.mealType) {
    result = result.filter(r => r.meal_type === filters.mealType);
  }

  // Filtrar por número de porciones
  if (filters.servings) {
    result = result.filter(r => r.servings === parseInt(filters.servings));
  }

  // Filtrar por categoría nutricional
  if (filters.nutritionCategory) {
    result = result.filter(r => r.nutrition_category === filters.nutritionCategory);
  }

  // Filtrar por ingredientes (al menos uno debe estar presente)
  if (filters.ingredients && Array.isArray(filters.ingredients) && filters.ingredients.length > 0) {
    result = result.filter(recipe =>
      filters.ingredients.some(ingredient =>
        recipe.ingredients && recipe.ingredients.toLowerCase().includes(ingredient.toLowerCase())
      )
    );
  }

  // Búsqueda por texto
  if (filters.searchQuery) {
    const search = searchRecipes(filters.searchQuery);
    result = result.filter(r => search.some(s => s.id === r.id));
  }

  return result;
}

/**
 * Obtener recetas por tipo de comida (desayuno, almuerzo, etc)
 * @param {string} mealType - Tipo de comida
 * @returns {Array} - Array de recetas del tipo especificado
 */
export function getRecipesByMealType(mealType) {
  if (!mealType) return [];
  
  return recipesCache.filter(r => r.meal_type === mealType);
}

/**
 * Obtener recetas por dificultad
 * @param {string} difficulty - Nivel de dificultad (fácil, medio, difícil)
 * @returns {Array} - Array de recetas del nivel especificado
 */
export function getRecipesByDifficulty(difficulty) {
  if (!difficulty) return [];
  
  return recipesCache.filter(r => r.difficulty === difficulty);
}

/**
 * Obtener recetas rápidas (menos de X minutos)
 * @param {number} maxMinutes - Máximo de minutos
 * @returns {Array} - Array de recetas rápidas
 */
export function getQuickRecipes(maxMinutes = 30) {
  return recipesCache.filter(r => {
    const time = parseInt(r.prep_time || 0);
    return time <= maxMinutes;
  });
}

/**
 * Obtener recetas destacadas
 * @param {number} limit - Número máximo de recetas
 * @returns {Array} - Array de recetas destacadas
 */
export function getFeaturedRecipes(limit = 5) {
  return recipesCache
    .filter(r => r.featured === true)
    .slice(0, limit);
}

/**
 * Obtener recetas relacionadas a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Array} - Array de recetas para la condición
 */
export function getRecipesByCondition(conditionId) {
  if (!conditionId) return [];
  
  return recipesCache.filter(r => r.condition_id === conditionId);
}

/**
 * Obtener estadísticas de las recetas
 * @returns {Object} - Objeto con estadísticas
 */
export function getRecipesStats() {
  const stats = {
    totalRecipes: recipesCache.length,
    byMealType: {
      breakfast: recipesCache.filter(r => r.meal_type === 'desayuno').length,
      lunch: recipesCache.filter(r => r.meal_type === 'almuerzo').length,
      dinner: recipesCache.filter(r => r.meal_type === 'cena').length,
      snack: recipesCache.filter(r => r.meal_type === 'snack').length
    },
    byDifficulty: {
      easy: recipesCache.filter(r => r.difficulty === 'fácil').length,
      medium: recipesCache.filter(r => r.difficulty === 'medio').length,
      hard: recipesCache.filter(r => r.difficulty === 'difícil').length
    },
    averagePrepTime: 0,
    featured: recipesCache.filter(r => r.featured === true).length
  };

  // Calcular tiempo promedio de preparación
  if (stats.totalRecipes > 0) {
    const totalTime = recipesCache.reduce((sum, r) => sum + (parseInt(r.prep_time) || 0), 0);
    stats.averagePrepTime = Math.round(totalTime / stats.totalRecipes);
  }

  return stats;
}

/**
 * Recargar recetas desde Supabase
 * @returns {Promise<Array>} - Array de recetas actualizado
 */
export async function reloadRecipes() {
  try {
    console.log('🔄 Recargando recetas desde Supabase...');
    const recipes = await getRecipesFromSupabase();
    
    if (recipes && Array.isArray(recipes)) {
      recipesCache = recipes;
      cacheTimestamp = Date.now();
      localStorage.setItem('isocore_recipes_cache', JSON.stringify({
        data: recipes,
        timestamp: cacheTimestamp
      }));
      console.log(`✅ ${recipes.length} recetas recargadas`);
      return recipes;
    }
    
    console.warn('⚠️ No se pudieron cargar recetas desde Supabase');
    return recipesCache;
  } catch (error) {
    console.error('❌ Error recargando recetas:', error);
    return recipesCache;
  }
}

/**
 * Limpiar el servicio (logout)
 */
export function clearRecipesService() {
  recipesCache = [];
  currentUserEmail = null;
  cacheTimestamp = 0;
  console.log('🗑️ RecipesService limpiado');
}
