/**
 * EducationalModulesService - Módulos educativos desde Supabase
 * PRIORIDAD 3: Módulos educativos reales del Centro
 */

import {
  getEducationalModulesFromSupabase,
  getEducationalModuleFromSupabase
} from './supabaseClient.js';

let modulesCache = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

/**
 * Obtener todos los módulos educativos publicados
 * @returns {Promise<Array>} - Array de módulos
 */
export async function getEducationalModules() {
  try {
    console.log('📚 Obteniendo módulos educativos...');
    
    const modules = await getEducationalModulesFromSupabase('published');
    
    if (modules && Array.isArray(modules)) {
      modulesCache = modules;
      cacheTimestamp = Date.now();
      console.log(`✅ ${modules.length} módulos cargados`);
      return modules;
    }
    
    console.warn('⚠️ No hay módulos educativos');
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo módulos:', error);
    return [];
  }
}

/**
 * Obtener un módulo educativo específico
 * @param {string} moduleId - ID del módulo
 * @returns {Promise<Object|null>} - Objeto del módulo o null
 */
export async function getEducationalModule(moduleId) {
  try {
    if (!moduleId) {
      console.warn('⚠️ moduleId no proporcionado');
      return null;
    }

    console.log(`📚 Obteniendo módulo ${moduleId}...`);
    
    const module = await getEducationalModuleFromSupabase(moduleId);
    
    if (module) {
      console.log(`✅ Módulo ${moduleId} cargado`);
      return module;
    }
    
    console.warn(`⚠️ Módulo ${moduleId} no encontrado`);
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo módulo:', error);
    return null;
  }
}

/**
 * Obtener módulos en cache local
 * @returns {Array} - Array de módulos
 */
export function getCachedModules() {
  if (modulesCache.length === 0) {
    console.log('ℹ️ Cache vacío. Cargar con getEducationalModules()');
  }
  return modulesCache;
}

/**
 * Obtener módulos ordenados por índice
 * @returns {Array} - Módulos ordenados
 */
export function getOrderedModules() {
  return [...modulesCache].sort((a, b) => {
    const orderA = a.order_index || 999;
    const orderB = b.order_index || 999;
    return orderA - orderB;
  });
}

/**
 * Obtener información de acceso a un módulo
 * @param {string} moduleId - ID del módulo
 * @param {string} userPlan - Plan del usuario (free, premium, vip)
 * @returns {Object} - Objeto con info de acceso
 */
export function getModuleAccessInfo(moduleId, userPlan = 'free') {
  const module = modulesCache.find(m => m.id === moduleId);
  
  if (!module) {
    return {
      accessible: false,
      reason: 'Módulo no encontrado',
      requiredPlan: null
    };
  }

  const requiredPlan = module.required_plan || 'free';
  const planHierarchy = { free: 0, premium: 1, vip: 2 };
  
  const userPlanLevel = planHierarchy[userPlan] || 0;
  const requiredLevel = planHierarchy[requiredPlan] || 0;

  return {
    accessible: userPlanLevel >= requiredLevel,
    reason: userPlanLevel < requiredLevel ? `Requiere plan ${requiredPlan}` : 'Acceso permitido',
    requiredPlan,
    currentPlan: userPlan,
    module: {
      id: module.id,
      title: module.title,
      description: module.description,
      icon: module.icon
    }
  };
}

/**
 * Obtener módulos accesibles para un plan específico
 * @param {string} userPlan - Plan del usuario
 * @returns {Array} - Array de módulos accesibles
 */
export function getAccessibleModules(userPlan = 'free') {
  const planHierarchy = { free: 0, premium: 1, vip: 2 };
  const userLevel = planHierarchy[userPlan] || 0;

  return modulesCache.filter(module => {
    const requiredPlan = module.required_plan || 'free';
    const requiredLevel = planHierarchy[requiredPlan] || 0;
    return userLevel >= requiredLevel;
  });
}

/**
 * Filtrar módulos por categoría
 * @param {string} category - Categoría del módulo
 * @returns {Array} - Módulos de la categoría
 */
export function getModulesByCategory(category) {
  if (!category) return modulesCache;
  
  return modulesCache.filter(m => m.category === category);
}

/**
 * Obtener categorías disponibles
 * @returns {Array} - Array de categorías únicas
 */
export function getModuleCategories() {
  const categories = [...new Set(modulesCache.map(m => m.category).filter(Boolean))];
  return categories.sort();
}

/**
 * Limpiar cache
 */
export function clearModulesCache() {
  modulesCache = [];
  cacheTimestamp = 0;
  console.log('🗑️ EducationalModulesService limpiado');
}
