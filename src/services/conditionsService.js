/**
 * ConditionsService - Condiciones y relaciones desde Supabase
 * PRIORIDAD 6: Condiciones - Relacionar artículos, protocolos y suplementos
 */

import {
  getConditionsFromSupabase,
  getConditionFromSupabase,
  getArticlesByConditionFromSupabase,
  getProtocolsByConditionFromSupabase,
  getSupplementsByConditionFromSupabase
} from './supabaseClient.js';

let conditionsCache = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

/**
 * Inicializar servicio de condiciones
 */
export function initializeConditionsService() {
  console.log('🏥 ConditionsService inicializado');
  loadConditionsFromSupabase();
}

/**
 * Cargar condiciones desde Supabase
 */
async function loadConditionsFromSupabase() {
  try {
    console.log('📥 Cargando condiciones desde Supabase...');
    const conditions = await getConditionsFromSupabase();
    
    if (conditions && Array.isArray(conditions)) {
      conditionsCache = conditions;
      cacheTimestamp = Date.now();
      console.log(`✅ ${conditions.length} condiciones cargadas`);
      localStorage.setItem('isocore_conditions_cache', JSON.stringify({
        data: conditions,
        timestamp: cacheTimestamp
      }));
    } else {
      loadConditionsFromCache();
    }
  } catch (error) {
    console.error('❌ Error cargando condiciones:', error);
    loadConditionsFromCache();
  }
}

/**
 * Cargar condiciones del cache local
 */
function loadConditionsFromCache() {
  try {
    const cached = localStorage.getItem('isocore_conditions_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      conditionsCache = parsed.data || [];
      console.log(`♻️ ${conditionsCache.length} condiciones cargadas desde cache`);
    }
  } catch (error) {
    console.error('Error cargando cache:', error);
  }
}

/**
 * Obtener todas las condiciones
 * @returns {Array} - Array de condiciones
 */
export function getConditions() {
  if (conditionsCache.length === 0) {
    loadConditionsFromCache();
  }
  return conditionsCache;
}

/**
 * Obtener una condición específica
 * @param {string} conditionId - ID de la condición
 * @returns {Object|null} - Objeto de la condición o null
 */
export function getCondition(conditionId) {
  if (!conditionId) return null;
  
  const condition = conditionsCache.find(c => c.id === conditionId);
  
  if (!condition) {
    console.warn(`⚠️ Condición ${conditionId} no encontrada`);
  }
  
  return condition || null;
}

/**
 * Buscar condición por nombre
 * @param {string} query - Término de búsqueda
 * @returns {Array} - Condiciones que coinciden
 */
export function searchConditions(query) {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  
  return conditionsCache.filter(condition =>
    (condition.name && condition.name.toLowerCase().includes(lowerQuery)) ||
    (condition.description && condition.description.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Obtener contenido relacionado a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Object>} - Objeto con artículos, protocolos y suplementos
 */
export async function getConditionContent(conditionId) {
  try {
    if (!conditionId) {
      console.warn('⚠️ conditionId no proporcionado');
      return { articles: [], protocols: [], supplements: [] };
    }

    console.log(`🏥 Obteniendo contenido para condición ${conditionId}...`);

    const [articles, protocols, supplements] = await Promise.all([
      getArticlesByConditionFromSupabase(conditionId),
      getProtocolsByConditionFromSupabase(conditionId),
      getSupplementsByConditionFromSupabase(conditionId)
    ]);

    const content = {
      articles: articles || [],
      protocols: protocols || [],
      supplements: supplements || [],
      totalResources: (articles?.length || 0) + (protocols?.length || 0) + (supplements?.length || 0)
    };

    console.log(`✅ Contenido cargado: ${content.articles.length} artículos, ${content.protocols.length} protocolos, ${content.supplements.length} suplementos`);

    return content;
  } catch (error) {
    console.error('❌ Error obteniendo contenido:', error);
    return { articles: [], protocols: [], supplements: [], totalResources: 0 };
  }
}

/**
 * Obtener artículos relacionados a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Array>} - Array de artículos
 */
export async function getConditionArticles(conditionId) {
  try {
    if (!conditionId) return [];

    console.log(`📚 Obteniendo artículos para ${conditionId}...`);
    
    const articles = await getArticlesByConditionFromSupabase(conditionId);
    
    return articles || [];
  } catch (error) {
    console.error('❌ Error obteniendo artículos:', error);
    return [];
  }
}

/**
 * Obtener protocolos relacionados a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Array>} - Array de protocolos
 */
export async function getConditionProtocols(conditionId) {
  try {
    if (!conditionId) return [];

    console.log(`🔬 Obteniendo protocolos para ${conditionId}...`);
    
    const protocols = await getProtocolsByConditionFromSupabase(conditionId);
    
    return protocols || [];
  } catch (error) {
    console.error('❌ Error obteniendo protocolos:', error);
    return [];
  }
}

/**
 * Obtener suplementos relacionados a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Array>} - Array de suplementos
 */
export async function getConditionSupplements(conditionId) {
  try {
    if (!conditionId) return [];

    console.log(`💊 Obteniendo suplementos para ${conditionId}...`);
    
    const supplements = await getSupplementsByConditionFromSupabase(conditionId);
    
    return supplements || [];
  } catch (error) {
    console.error('❌ Error obteniendo suplementos:', error);
    return [];
  }
}

/**
 * Obtener condiciones por categoría
 * @param {string} category - Categoría de la condición
 * @returns {Array} - Condiciones de la categoría
 */
export function getConditionsByCategory(category) {
  if (!category) return conditionsCache;
  
  return conditionsCache.filter(c => c.category === category);
}

/**
 * Obtener categorías disponibles
 * @returns {Array} - Array de categorías
 */
export function getAvailableCategories() {
  const categories = [...new Set(conditionsCache.map(c => c.category).filter(Boolean))];
  return categories.sort();
}

/**
 * Obtener condiciones más buscadas/comunes
 * @param {number} limit - Número máximo
 * @returns {Array} - Condiciones más comunes
 */
export function getMostCommonConditions(limit = 10) {
  return conditionsCache
    .sort((a, b) => (b.search_count || 0) - (a.search_count || 0))
    .slice(0, limit);
}

/**
 * Obtener condiciones destacadas
 * @param {number} limit - Número máximo
 * @returns {Array} - Condiciones destacadas
 */
export function getFeaturedConditions(limit = 5) {
  return conditionsCache
    .filter(c => c.featured === true)
    .slice(0, limit);
}

/**
 * Recargar condiciones desde Supabase
 * @returns {Promise<Array>} - Condiciones actualizadas
 */
export async function reloadConditions() {
  try {
    console.log('🔄 Recargando condiciones...');
    const conditions = await getConditionsFromSupabase();
    
    if (conditions && Array.isArray(conditions)) {
      conditionsCache = conditions;
      cacheTimestamp = Date.now();
      localStorage.setItem('isocore_conditions_cache', JSON.stringify({
        data: conditions,
        timestamp: cacheTimestamp
      }));
      console.log(`✅ ${conditions.length} condiciones recargadas`);
      return conditions;
    }
    
    return conditionsCache;
  } catch (error) {
    console.error('❌ Error recargando condiciones:', error);
    return conditionsCache;
  }
}

/**
 * Limpiar el servicio
 */
export function clearConditionsService() {
  conditionsCache = [];
  cacheTimestamp = 0;
  console.log('🗑️ ConditionsService limpiado');
}
