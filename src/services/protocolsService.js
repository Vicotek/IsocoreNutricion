/**
 * ProtocolsService - Protocolos clínicos desde Supabase
 * PRIORIDAD 5: Protocolos - Apartado en Centro IA
 */

import {
  getProtocolsFromSupabase,
  getProtocolFromSupabase,
  searchProtocolsInSupabase,
  getProtocolsByConditionFromSupabase,
  getReferencesByProtocolFromSupabase
} from './supabaseClient.js';

let protocolsCache = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

/**
 * Inicializar servicio de protocolos
 */
export function initializeProtocolsService() {
  console.log('🔬 ProtocolsService inicializado');
  loadProtocolsFromSupabase();
}

/**
 * Cargar protocolos desde Supabase
 */
async function loadProtocolsFromSupabase() {
  try {
    console.log('📥 Cargando protocolos desde Supabase...');
    const protocols = await getProtocolsFromSupabase();
    
    if (protocols && Array.isArray(protocols)) {
      protocolsCache = protocols;
      cacheTimestamp = Date.now();
      console.log(`✅ ${protocols.length} protocolos cargados`);
      localStorage.setItem('isocore_protocols_cache', JSON.stringify({
        data: protocols,
        timestamp: cacheTimestamp
      }));
    } else {
      loadProtocolsFromCache();
    }
  } catch (error) {
    console.error('❌ Error cargando protocolos:', error);
    loadProtocolsFromCache();
  }
}

/**
 * Cargar protocolos del cache local
 */
function loadProtocolsFromCache() {
  try {
    const cached = localStorage.getItem('isocore_protocols_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      protocolsCache = parsed.data || [];
      console.log(`♻️ ${protocolsCache.length} protocolos cargados desde cache`);
    }
  } catch (error) {
    console.error('Error cargando cache:', error);
  }
}

/**
 * Obtener todos los protocolos
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @returns {Array} - Array de protocolos
 */
export function getProtocols(limit = 999, offset = 0) {
  if (protocolsCache.length === 0) {
    loadProtocolsFromCache();
  }
  return protocolsCache.slice(offset, offset + limit);
}

/**
 * Obtener un protocolo específico
 * @param {string} protocolId - ID del protocolo
 * @returns {Object|null} - Objeto del protocolo o null
 */
export function getProtocol(protocolId) {
  if (!protocolId) return null;
  
  const protocol = protocolsCache.find(p => p.id === protocolId);
  
  if (!protocol) {
    console.warn(`⚠️ Protocolo ${protocolId} no encontrado`);
  }
  
  return protocol || null;
}

/**
 * Buscar protocolos por término
 * @param {string} query - Término de búsqueda
 * @returns {Array} - Array de protocolos que coinciden
 */
export function searchProtocols(query) {
  if (!query || query.length < 2) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  
  return protocolsCache.filter(protocol =>
    (protocol.name && protocol.name.toLowerCase().includes(lowerQuery)) ||
    (protocol.description && protocol.description.toLowerCase().includes(lowerQuery)) ||
    (protocol.content && protocol.content.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Obtener protocolos por tipo/categoría
 * @param {string} type - Tipo de protocolo
 * @returns {Array} - Array de protocolos del tipo
 */
export function getProtocolsByType(type) {
  if (!type) return protocolsCache;
  
  return protocolsCache.filter(p => p.type === type);
}

/**
 * Obtener protocolos por condición
 * @param {string} conditionId - ID de la condición
 * @returns {Array} - Array de protocolos
 */
export function getProtocolsByCondition(conditionId) {
  if (!conditionId) return [];
  
  return protocolsCache.filter(p => p.condition_id === conditionId);
}

/**
 * Obtener protocolos recomendados para una condición
 * @param {string} conditionId - ID de la condición
 * @param {number} limit - Número máximo de protocolos
 * @returns {Promise<Array>} - Array de protocolos
 */
export async function getRecommendedProtocols(conditionId, limit = 5) {
  try {
    if (!conditionId) return [];

    console.log(`🔬 Obteniendo protocolos recomendados para ${conditionId}...`);
    
    const protocols = await getProtocolsByConditionFromSupabase(conditionId);
    
    if (protocols && Array.isArray(protocols)) {
      return protocols.slice(0, limit);
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo protocolos recomendados:', error);
    return [];
  }
}

/**
 * Obtener referencias de un protocolo
 * @param {string} protocolId - ID del protocolo
 * @returns {Promise<Array>} - Array de referencias
 */
export async function getProtocolReferences(protocolId) {
  try {
    if (!protocolId) return [];

    console.log(`📖 Obteniendo referencias del protocolo ${protocolId}...`);
    
    const references = await getReferencesByProtocolFromSupabase(protocolId);
    
    if (references && Array.isArray(references)) {
      return references;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias:', error);
    return [];
  }
}

/**
 * Obtener protocolos por especialidad/área
 * @param {string} specialty - Especialidad
 * @returns {Array} - Protocolos de la especialidad
 */
export function getProtocolsBySpecialty(specialty) {
  if (!specialty) return protocolsCache;
  
  return protocolsCache.filter(p => p.specialty === specialty);
}

/**
 * Obtener especialidades disponibles
 * @returns {Array} - Array de especialidades
 */
export function getAvailableSpecialties() {
  const specialties = [...new Set(protocolsCache.map(p => p.specialty).filter(Boolean))];
  return specialties.sort();
}

/**
 * Obtener protocolos destacados
 * @param {number} limit - Número máximo
 * @returns {Array} - Protocolos destacados
 */
export function getFeaturedProtocols(limit = 5) {
  return protocolsCache
    .filter(p => p.featured === true)
    .slice(0, limit);
}

/**
 * Recargar protocolos desde Supabase
 * @returns {Promise<Array>} - Protocolos actualizados
 */
export async function reloadProtocols() {
  try {
    console.log('🔄 Recargando protocolos...');
    const protocols = await getProtocolsFromSupabase();
    
    if (protocols && Array.isArray(protocols)) {
      protocolsCache = protocols;
      cacheTimestamp = Date.now();
      localStorage.setItem('isocore_protocols_cache', JSON.stringify({
        data: protocols,
        timestamp: cacheTimestamp
      }));
      console.log(`✅ ${protocols.length} protocolos recargados`);
      return protocols;
    }
    
    return protocolsCache;
  } catch (error) {
    console.error('❌ Error recargando protocolos:', error);
    return protocolsCache;
  }
}

/**
 * Limpiar el servicio
 */
export function clearProtocolsService() {
  protocolsCache = [];
  cacheTimestamp = 0;
  console.log('🗑️ ProtocolsService limpiado');
}
