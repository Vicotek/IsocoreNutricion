/**
 * NutritionalPlansService - Planes nutricionales desde Supabase
 * PRIORIDAD 4: Planes nutricionales - Conectar con "Mi Plan"
 */

import {
  getNutritionalPlansFromSupabase,
  getNutritionalPlanFromSupabase
} from './supabaseClient.js';

let plansCache = [];
let userPlanId = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

/**
 * Inicializar servicio de planes nutricionales
 * @param {string} email - Email del usuario
 */
export function initializeNutritionalPlansService(email) {
  if (!email) {
    console.warn('⚠️ Email no proporcionado para NutritionalPlansService');
    return;
  }
  
  console.log('📋 NutritionalPlansService inicializado para:', email);
  loadPlansFromSupabase();
}

/**
 * Cargar planes desde Supabase
 */
async function loadPlansFromSupabase() {
  try {
    console.log('📥 Cargando planes nutricionales desde Supabase...');
    const plans = await getNutritionalPlansFromSupabase();
    
    if (plans && Array.isArray(plans)) {
      plansCache = plans;
      cacheTimestamp = Date.now();
      console.log(`✅ ${plans.length} planes cargados`);
      localStorage.setItem('isocore_plans_cache', JSON.stringify({
        data: plans,
        timestamp: cacheTimestamp
      }));
    } else {
      loadPlansFromCache();
    }
  } catch (error) {
    console.error('❌ Error cargando planes:', error);
    loadPlansFromCache();
  }
}

/**
 * Cargar planes del cache local
 */
function loadPlansFromCache() {
  try {
    const cached = localStorage.getItem('isocore_plans_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      plansCache = parsed.data || [];
      console.log(`♻️ ${plansCache.length} planes cargados desde cache`);
    }
  } catch (error) {
    console.error('Error cargando cache:', error);
  }
}

/**
 * Obtener todos los planes nutricionales
 * @returns {Array} - Array de planes
 */
export function getNutritionalPlans() {
  if (plansCache.length === 0) {
    loadPlansFromCache();
  }
  return plansCache;
}

/**
 * Obtener un plan específico
 * @param {string} planId - ID del plan
 * @returns {Object|null} - Objeto del plan o null
 */
export function getNutritionalPlan(planId) {
  if (!planId) return null;
  
  const plan = plansCache.find(p => p.id === planId);
  
  if (!plan) {
    console.warn(`⚠️ Plan ${planId} no encontrado`);
  }
  
  return plan || null;
}

/**
 * Obtener planes por objetivo (pérdida peso, ganancia, mantenimiento, etc)
 * @param {string} objective - Objetivo nutricional
 * @returns {Array} - Array de planes
 */
export function getPlansByObjective(objective) {
  if (!objective) return plansCache;
  
  return plansCache.filter(p => p.objective === objective);
}

/**
 * Obtener planes por nivel (principiante, intermedio, avanzado)
 * @param {string} level - Nivel del plan
 * @returns {Array} - Array de planes
 */
export function getPlansByLevel(level) {
  if (!level) return plansCache;
  
  return plansCache.filter(p => p.level === level);
}

/**
 * Obtener planes recomendados por duración
 * @param {number} days - Duración en días
 * @returns {Array} - Planes similares en duración
 */
export function getPlansByDuration(days) {
  if (!days) return plansCache;
  
  return plansCache.filter(p => {
    const duration = parseInt(p.duration_days || 0);
    return Math.abs(duration - days) <= 7; // ±7 días
  });
}

/**
 * Obtener planes por tipo de dieta
 * @param {string} dietType - Tipo de dieta (balanced, low-carb, high-protein, etc)
 * @returns {Array} - Array de planes
 */
export function getPlansByDietType(dietType) {
  if (!dietType) return plansCache;
  
  return plansCache.filter(p => p.diet_type === dietType);
}

/**
 * Obtener planes destacados/populares
 * @param {number} limit - Número máximo
 * @returns {Array} - Planes destacados
 */
export function getFeaturedPlans(limit = 5) {
  return plansCache
    .filter(p => p.featured === true)
    .slice(0, limit);
}

/**
 * Obtener planes más populares
 * @param {number} limit - Número máximo
 * @returns {Array} - Planes más usados
 */
export function getPopularPlans(limit = 5) {
  return [...plansCache]
    .sort((a, b) => (b.user_count || 0) - (a.user_count || 0))
    .slice(0, limit);
}

/**
 * Obtener planes ordenados por duración
 * @returns {Array} - Planes ordenados
 */
export function getPlansOrderedByDuration() {
  return [...plansCache].sort((a, b) => {
    const durationA = parseInt(a.duration_days || 0);
    const durationB = parseInt(b.duration_days || 0);
    return durationA - durationB;
  });
}

/**
 * Buscar planes por término
 * @param {string} query - Término de búsqueda
 * @returns {Array} - Planes que coinciden
 */
export function searchPlans(query) {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  
  return plansCache.filter(plan =>
    (plan.name && plan.name.toLowerCase().includes(lowerQuery)) ||
    (plan.description && plan.description.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Establecer plan del usuario
 * @param {string} planId - ID del plan a asignar
 */
export function setUserPlan(planId) {
  if (!planId) {
    console.warn('⚠️ planId no proporcionado');
    return;
  }
  
  const plan = getNutritionalPlan(planId);
  
  if (!plan) {
    console.error('❌ Plan no encontrado');
    return;
  }
  
  userPlanId = planId;
  localStorage.setItem('isocore_user_plan', planId);
  console.log(`✅ Plan asignado: ${plan.name}`);
}

/**
 * Obtener plan del usuario
 * @returns {Object|null} - Plan del usuario o null
 */
export function getUserPlan() {
  if (userPlanId) {
    return getNutritionalPlan(userPlanId);
  }
  
  const stored = localStorage.getItem('isocore_user_plan');
  if (stored) {
    userPlanId = stored;
    return getNutritionalPlan(stored);
  }
  
  return null;
}

/**
 * Obtener objetivos nutricionales disponibles
 * @returns {Array} - Array de objetivos únicos
 */
export function getAvailableObjectives() {
  const objectives = [...new Set(plansCache.map(p => p.objective).filter(Boolean))];
  return objectives.sort();
}

/**
 * Obtener tipos de dieta disponibles
 * @returns {Array} - Array de tipos de dieta
 */
export function getAvailableDietTypes() {
  const dietTypes = [...new Set(plansCache.map(p => p.diet_type).filter(Boolean))];
  return dietTypes.sort();
}

/**
 * Obtener niveles de dificultad disponibles
 * @returns {Array} - Array de niveles
 */
export function getAvailableLevels() {
  const levels = [...new Set(plansCache.map(p => p.level).filter(Boolean))];
  return levels.sort();
}

/**
 * Recargar planes desde Supabase
 * @returns {Promise<Array>} - Planes actualizados
 */
export async function reloadPlans() {
  try {
    console.log('🔄 Recargando planes nutricionales...');
    const plans = await getNutritionalPlansFromSupabase();
    
    if (plans && Array.isArray(plans)) {
      plansCache = plans;
      cacheTimestamp = Date.now();
      localStorage.setItem('isocore_plans_cache', JSON.stringify({
        data: plans,
        timestamp: cacheTimestamp
      }));
      console.log(`✅ ${plans.length} planes recargados`);
      return plans;
    }
    
    return plansCache;
  } catch (error) {
    console.error('❌ Error recargando planes:', error);
    return plansCache;
  }
}

/**
 * Limpiar el servicio
 */
export function clearNutritionalPlansService() {
  plansCache = [];
  userPlanId = null;
  cacheTimestamp = 0;
  console.log('🗑️ NutritionalPlansService limpiado');
}
