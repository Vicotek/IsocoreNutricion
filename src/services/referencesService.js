/**
 * ReferencesService - Referencias científicas desde Supabase
 * PRIORIDAD 7: Referencias científicas - Mostrar al final de artículos
 */

import {
  getScientificReferencesFromSupabase,
  getReferencesByArticleFromSupabase,
  getReferencesByProtocolFromSupabase,
  getReferencesBySupplementFromSupabase
} from './supabaseClient.js';

let referencesCache = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

/**
 * Inicializar servicio de referencias
 */
export function initializeReferencesService() {
  console.log('📖 ReferencesService inicializado');
  loadReferencesFromSupabase();
}

/**
 * Cargar referencias desde Supabase
 */
async function loadReferencesFromSupabase() {
  try {
    console.log('📥 Cargando referencias científicas desde Supabase...');
    const references = await getScientificReferencesFromSupabase();
    
    if (references && Array.isArray(references)) {
      referencesCache = references;
      cacheTimestamp = Date.now();
      console.log(`✅ ${references.length} referencias cargadas`);
      localStorage.setItem('isocore_references_cache', JSON.stringify({
        data: references,
        timestamp: cacheTimestamp
      }));
    } else {
      loadReferencesFromCache();
    }
  } catch (error) {
    console.error('❌ Error cargando referencias:', error);
    loadReferencesFromCache();
  }
}

/**
 * Cargar referencias del cache local
 */
function loadReferencesFromCache() {
  try {
    const cached = localStorage.getItem('isocore_references_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      referencesCache = parsed.data || [];
      console.log(`♻️ ${referencesCache.length} referencias cargadas desde cache`);
    }
  } catch (error) {
    console.error('Error cargando cache:', error);
  }
}

/**
 * Obtener todas las referencias
 * @returns {Array} - Array de referencias
 */
export function getAllReferences() {
  if (referencesCache.length === 0) {
    loadReferencesFromCache();
  }
  return referencesCache;
}

/**
 * Obtener referencias de un artículo
 * @param {string} articleId - ID del artículo
 * @returns {Promise<Array>} - Array de referencias
 */
export async function getArticleReferences(articleId) {
  try {
    if (!articleId) {
      console.warn('⚠️ articleId no proporcionado');
      return [];
    }

    console.log(`📖 Obteniendo referencias del artículo ${articleId}...`);
    
    const references = await getReferencesByArticleFromSupabase(articleId);
    
    if (references && Array.isArray(references)) {
      return references.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
    
    console.log('ℹ️ No hay referencias para este artículo');
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias:', error);
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
    if (!protocolId) {
      console.warn('⚠️ protocolId no proporcionado');
      return [];
    }

    console.log(`📖 Obteniendo referencias del protocolo ${protocolId}...`);
    
    const references = await getReferencesByProtocolFromSupabase(protocolId);
    
    if (references && Array.isArray(references)) {
      return references.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
    
    console.log('ℹ️ No hay referencias para este protocolo');
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias:', error);
    return [];
  }
}

/**
 * Obtener referencias de un suplemento
 * @param {string} supplementId - ID del suplemento
 * @returns {Promise<Array>} - Array de referencias
 */
export async function getSupplementReferences(supplementId) {
  try {
    if (!supplementId) {
      console.warn('⚠️ supplementId no proporcionado');
      return [];
    }

    console.log(`📖 Obteniendo referencias del suplemento ${supplementId}...`);
    
    const references = await getReferencesBySupplementFromSupabase(supplementId);
    
    if (references && Array.isArray(references)) {
      return references.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
    
    console.log('ℹ️ No hay referencias para este suplemento');
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias:', error);
    return [];
  }
}

/**
 * Formatear referencia para mostrar en UI
 * @param {Object} reference - Objeto de referencia
 * @returns {Object} - Referencia formateada
 */
export function formatReference(reference) {
  if (!reference) return null;

  const formattedRef = {
    id: reference.id,
    title: reference.title || 'Sin título',
    authors: reference.authors || '',
    year: reference.year || '',
    journal: reference.journal || '',
    volume: reference.volume || '',
    issue: reference.issue || '',
    pages: reference.pages || '',
    doi: reference.doi || '',
    url: reference.url || '',
    pubmed_id: reference.pubmed_id || '',
    abstract: reference.abstract || '',
    type: reference.reference_type || 'journal', // journal, book, website, etc
    order: reference.order_index || 0
  };

  // Construir cita APA
  let citation = '';
  
  if (formattedRef.authors) {
    citation += formattedRef.authors + ' ';
  }
  
  if (formattedRef.year) {
    citation += `(${formattedRef.year}). `;
  }
  
  if (formattedRef.title) {
    citation += formattedRef.title + '. ';
  }
  
  if (formattedRef.journal) {
    citation += `*${formattedRef.journal}*`;
    
    if (formattedRef.volume || formattedRef.issue) {
      citation += ', ';
      if (formattedRef.volume) citation += formattedRef.volume;
      if (formattedRef.issue) citation += `(${formattedRef.issue})`;
    }
    
    if (formattedRef.pages) {
      citation += `, ${formattedRef.pages}`;
    }
  }
  
  formattedRef.citation = citation.trim();

  return formattedRef;
}

/**
 * Generar lista de referencias formateada (APA)
 * @param {Array<Object>} references - Array de referencias
 * @returns {Array<Object>} - Referencias formateadas
 */
export function formatReferences(references) {
  if (!Array.isArray(references)) return [];
  
  return references
    .map(ref => formatReference(ref))
    .sort((a, b) => a.order - b.order);
}

/**
 * Generar HTML para mostrar referencias
 * @param {Array<Object>} references - Array de referencias
 * @returns {string} - HTML de referencias
 */
export function generateReferencesHTML(references) {
  if (!Array.isArray(references) || references.length === 0) {
    return '<p>No hay referencias científicas disponibles.</p>';
  }

  const formatted = formatReferences(references);
  
  let html = '<section class="references-section">';
  html += '<h3>📖 Referencias Científicas</h3>';
  html += '<ol class="references-list">';

  formatted.forEach((ref, index) => {
    html += '<li class="reference-item">';
    
    // Cita
    html += `<div class="reference-citation">${ref.citation}</div>`;
    
    // Links
    if (ref.doi || ref.pubmed_id || ref.url) {
      html += '<div class="reference-links">';
      
      if (ref.doi) {
        html += `<a href="https://doi.org/${ref.doi}" target="_blank" rel="noopener noreferrer">🔗 DOI</a>`;
      }
      
      if (ref.pubmed_id) {
        html += `<a href="https://pubmed.ncbi.nlm.nih.gov/${ref.pubmed_id}" target="_blank" rel="noopener noreferrer">📰 PubMed</a>`;
      }
      
      if (ref.url) {
        html += `<a href="${ref.url}" target="_blank" rel="noopener noreferrer">🌐 Link</a>`;
      }
      
      html += '</div>';
    }
    
    // Abstract
    if (ref.abstract) {
      html += `<details class="reference-abstract">`;
      html += `<summary>Ver resumen</summary>`;
      html += `<p>${ref.abstract}</p>`;
      html += `</details>`;
    }
    
    html += '</li>';
  });

  html += '</ol>';
  html += '</section>';

  return html;
}

/**
 * Obtener referencia por ID
 * @param {string} referenceId - ID de la referencia
 * @returns {Object|null} - Referencia o null
 */
export function getReference(referenceId) {
  if (!referenceId) return null;
  
  const reference = referencesCache.find(r => r.id === referenceId);
  
  if (!reference) {
    console.warn(`⚠️ Referencia ${referenceId} no encontrada`);
  }
  
  return reference || null;
}

/**
 * Buscar referencias por término
 * @param {string} query - Término de búsqueda
 * @returns {Array} - Referencias que coinciden
 */
export function searchReferences(query) {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  
  return referencesCache.filter(ref =>
    (ref.title && ref.title.toLowerCase().includes(lowerQuery)) ||
    (ref.authors && ref.authors.toLowerCase().includes(lowerQuery)) ||
    (ref.journal && ref.journal.toLowerCase().includes(lowerQuery)) ||
    (ref.abstract && ref.abstract.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Obtener referencias por tipo
 * @param {string} type - Tipo de referencia (journal, book, website, etc)
 * @returns {Array} - Referencias del tipo
 */
export function getReferencesByType(type) {
  if (!type) return referencesCache;
  
  return referencesCache.filter(r => r.reference_type === type);
}

/**
 * Obtener referencias por año
 * @param {number} year - Año de publicación
 * @returns {Array} - Referencias del año
 */
export function getReferencesByYear(year) {
  if (!year) return referencesCache;
  
  return referencesCache.filter(r => r.year == year);
}

/**
 * Recargar referencias desde Supabase
 * @returns {Promise<Array>} - Referencias actualizadas
 */
export async function reloadReferences() {
  try {
    console.log('🔄 Recargando referencias...');
    const references = await getScientificReferencesFromSupabase();
    
    if (references && Array.isArray(references)) {
      referencesCache = references;
      cacheTimestamp = Date.now();
      localStorage.setItem('isocore_references_cache', JSON.stringify({
        data: references,
        timestamp: cacheTimestamp
      }));
      console.log(`✅ ${references.length} referencias recargadas`);
      return references;
    }
    
    return referencesCache;
  } catch (error) {
    console.error('❌ Error recargando referencias:', error);
    return referencesCache;
  }
}

/**
 * Limpiar el servicio
 */
export function clearReferencesService() {
  referencesCache = [];
  cacheTimestamp = 0;
  console.log('🗑️ ReferencesService limpiado');
}
