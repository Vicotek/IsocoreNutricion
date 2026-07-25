/**
 * SearchService - Búsqueda global en toda la plataforma
 * Busca en artículos, recetas, suplementos y recursos
 * Guarda historial de búsquedas del usuario
 */

import { saveActivityToSupabase } from './supabaseClient.js';

// Base de datos de contenido (mock - en producción vendría de Supabase/APIs)
const CONTENT_DATABASE = {
  recipes: [
    { id: 'rec_001', title: 'Ensalada de Proteína', description: 'Ensalada nutritiva con pollo y vegetales frescos', keywords: ['ensalada', 'proteína', 'pollo', 'saludable'] },
    { id: 'rec_002', title: 'Batido de Proteína', description: 'Batido post-entreno con proteína en polvo y frutas', keywords: ['batido', 'proteína', 'post-entreno', 'frutas'] },
    { id: 'rec_003', title: 'Pasta Integral', description: 'Pasta con salsa de tomate y espinaca', keywords: ['pasta', 'integral', 'tomate', 'espinaca'] },
    { id: 'rec_004', title: 'Salmon a la Mantequilla', description: 'Salmón salteado en mantequilla con limón', keywords: ['salmón', 'omega-3', 'mantequilla', 'limón'] },
    { id: 'rec_005', title: 'Tazón de Granola', description: 'Granola casera con yogur y berries', keywords: ['granola', 'yogur', 'berries', 'desayuno'] }
  ],
  supplements: [
    { id: 'sup_001', title: 'Proteína Whey', description: 'Suplemento de proteína de suero concentrado', keywords: ['proteína', 'whey', 'musculo', 'entrenamiento'] },
    { id: 'sup_002', title: 'Omega-3', description: 'Aceite de pescado con ácidos grasos esenciales', keywords: ['omega-3', 'pescado', 'corazón', 'inflamación'] },
    { id: 'sup_003', title: 'Vitamina D3', description: 'Vitamina D para la salud ósea e inmunidad', keywords: ['vitamina d', 'huesos', 'inmunidad', 'sol'] },
    { id: 'sup_004', title: 'BCAA', description: 'Aminoácidos ramificados para recuperación muscular', keywords: ['bcaa', 'aminoácidos', 'músculo', 'recuperación'] },
    { id: 'sup_005', title: 'Multivitamínico', description: 'Complejo vitamínico diario completo', keywords: ['vitaminas', 'minerales', 'completo', 'salud'] }
  ],
  resources: [
    { id: 'res_001', title: 'Guía de Nutrición Deportiva', description: 'Protocolo completo para atletas y deportistas', keywords: ['nutrición', 'deporte', 'entrenamiento', 'atletas'] },
    { id: 'res_002', title: 'Plan de Pérdida de Peso', description: 'Estrategia de 12 semanas para pérdida segura de peso', keywords: ['peso', 'pérdida', 'dieta', 'calórico'] },
    { id: 'res_003', title: 'Macronutrientes 101', description: 'Guía completa sobre carbohidratos, proteínas y grasas', keywords: ['macronutrientes', 'carbohidratos', 'proteínas', 'grasas'] },
    { id: 'res_004', title: 'Suplementos: Mitos vs Realidad', description: 'Análisis basado en evidencia de suplementos populares', keywords: ['suplementos', 'mitos', 'evidencia', 'ciencia'] },
    { id: 'res_005', title: 'Recuperación y Descanso', description: 'Estrategias para optimizar la recuperación post-entreno', keywords: ['recuperación', 'descanso', 'sueño', 'entrenamiento'] }
  ],
  articles: [
    { id: 'art_001', title: 'Cortisol y Estrés: Impacto en la Nutrición', description: 'Cómo el estrés afecta la digestión y absorción', keywords: ['cortisol', 'estrés', 'digestión', 'hormones'] },
    { id: 'art_002', title: 'Intestino Permeable: Protocolo Nutricional', description: 'Alimentos y suplementos para sanar el intestino', keywords: ['intestino', 'permeabilidad', 'digestión', 'inflamación'] },
    { id: 'art_003', title: 'Ciclo Hormonal Femenino y Nutrición', description: 'Adaptación nutricional a diferentes fases del ciclo', keywords: ['hormonas', 'ciclo', 'femenino', 'nutrición'] },
    { id: 'art_004', title: 'Hipertensión: Enfoque Nutricional', description: 'Minerales y alimentos para controlar presión arterial', keywords: ['presión', 'sodio', 'potasio', 'corazón'] },
    { id: 'art_005', title: 'Inmunidad: Vitaminas y Minerales Clave', description: 'Micronutrientes esenciales para un sistema inmune fuerte', keywords: ['inmunidad', 'vitaminas', 'zinc', 'vitamina c'] }
  ]
};

// Cache de búsquedas recientes
let userEmail = null;
let recentSearches = [];

/**
 * Inicializar servicio de búsqueda
 * @param {string} email - Email del usuario
 */
export function initializeSearchService(email) {
  if (!email) {
    console.warn('⚠️ Email no proporcionado para SearchService');
    return;
  }

  userEmail = email;
  console.log('🔍 SearchService inicializado para:', email);
  
  // Cargar búsquedas recientes del localStorage
  loadRecentSearches();
}

/**
 * Búsqueda global en toda la plataforma
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Object>} - Resultados agrupados por categoría
 */
export async function searchAll(query) {
  if (!query || query.trim().length < 2) {
    return {
      hasResults: false,
      recipes: [],
      supplements: [],
      resources: [],
      articles: [],
      totalResults: 0
    };
  }

  try {
    console.log(`🔍 Buscando: "${query}"`);

    const normalizedQuery = query.toLowerCase().trim();
    const results = {
      recipes: searchByType(normalizedQuery, 'recipes'),
      supplements: searchByType(normalizedQuery, 'supplements'),
      resources: searchByType(normalizedQuery, 'resources'),
      articles: searchByType(normalizedQuery, 'articles'),
      hasResults: false,
      totalResults: 0
    };

    // Calcular total y flag
    const total = results.recipes.length + results.supplements.length + 
                  results.resources.length + results.articles.length;
    
    results.hasResults = total > 0;
    results.totalResults = total;

    console.log(`✅ ${total} resultado(s) encontrado(s)`);

    // Guardar búsqueda en historial
    if (results.hasResults) {
      console.log(`💾 Guardando búsqueda: "${query}" para ${userEmail}`);
      saveSearch(query);
    }

    return results;
  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    return {
      hasResults: false,
      recipes: [],
      supplements: [],
      resources: [],
      articles: [],
      totalResults: 0,
      error: error.message
    };
  }
}

/**
 * Búsqueda por categoría/tipo específico
 * @param {string} query - Término de búsqueda
 * @param {string} type - Tipo: 'recipes', 'supplements', 'resources', 'articles'
 * @returns {Array} - Resultados de ese tipo
 */
export function searchByType(query, type = 'recipes') {
  if (!CONTENT_DATABASE[type]) {
    console.warn(`⚠️ Tipo desconocido: ${type}`);
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  return CONTENT_DATABASE[type]
    .filter(item => {
      // Buscar en título
      if (item.title.toLowerCase().includes(normalizedQuery)) return true;
      
      // Buscar en descripción
      if (item.description.toLowerCase().includes(normalizedQuery)) return true;
      
      // Buscar en keywords
      if (item.keywords && item.keywords.some(k => k.includes(normalizedQuery))) return true;
      
      return false;
    })
    .map(item => ({
      ...item,
      type: getTypeLabel(type)
    }))
    .sort((a, b) => {
      // Priorizar coincidencias en título
      const aTitleMatch = a.title.toLowerCase().includes(normalizedQuery);
      const bTitleMatch = b.title.toLowerCase().includes(normalizedQuery);
      return bTitleMatch - aTitleMatch;
    });
}

/**
 * Obtener etiqueta legible del tipo
 * @param {string} type - Tipo interno
 * @returns {string} - Etiqueta legible
 */
function getTypeLabel(type) {
  const labels = {
    recipes: '🍽️ Receta',
    supplements: '💊 Suplemento',
    resources: '📄 Recurso',
    articles: '📰 Artículo'
  };
  return labels[type] || type;
}

/**
 * Guardar búsqueda en historial
 * @param {string} query - Término de búsqueda
 */
export async function saveSearch(query) {
  if (!query || !userEmail) {
    console.warn(`⚠️ saveSearch(): query="${query}", userEmail="${userEmail}"`);
    return;
  }

  try {
    const search = {
      query: query.trim(),
      created_at: new Date().toISOString()
    };

    // Agregar al inicio del array
    recentSearches.unshift(search);

    // Mantener solo las últimas 10
    if (recentSearches.length > 10) {
      recentSearches = recentSearches.slice(0, 10);
    }

    // Guardar en localStorage
    localStorage.setItem(`isocore_searches_${userEmail}`, JSON.stringify(recentSearches));
    console.log(`✅ Búsqueda guardada en localStorage: isocore_searches_${userEmail}`);

    // Guardar en Supabase (opcional)
    try {
      await saveActivityToSupabase(userEmail, {
        type: 'search',
        resourceName: query,
        action: 'search',
        metadata: { query }
      });
    } catch (err) {
      console.warn('⚠️ Error guardando búsqueda en Supabase:', err);
    }

    console.log(`💾 Búsqueda guardada: "${query}"`);
  } catch (error) {
    console.error('❌ Error guardando búsqueda:', error);
  }
}

/**
 * Obtener búsquedas recientes del usuario
 * @returns {Array} - Array de últimas búsquedas
 */
export function getRecentSearches() {
  return [...recentSearches];
}

/**
 * Cargar búsquedas recientes del localStorage
 */
function loadRecentSearches() {
  if (!userEmail) return;

  try {
    const cached = localStorage.getItem(`isocore_searches_${userEmail}`);
    if (cached) {
      recentSearches = JSON.parse(cached);
      console.log(`✅ ${recentSearches.length} búsquedas recientes cargadas`);
    }
  } catch (error) {
    console.error('❌ Error cargando búsquedas recientes:', error);
    recentSearches = [];
  }
}

/**
 * Limpiar historial de búsquedas
 */
export function clearSearchHistory() {
  recentSearches = [];
  if (userEmail) {
    localStorage.removeItem(`isocore_searches_${userEmail}`);
  }
  console.log('🗑️ Historial de búsquedas limpios');
}

/**
 * Limpiar servicio de búsqueda (logout)
 */
export function clearSearchService() {
  userEmail = null;
  recentSearches = [];
  console.log('🗑️ SearchService limpios');
}

/**
 * Obtener sugerencias (para autocomplete)
 * @param {string} query - Término parcial
 * @returns {Array} - Array de sugerencias
 */
export function getSuggestions(query) {
  if (!query || query.length < 2) {
    // Mostrar búsquedas recientes si no hay query
    return recentSearches.slice(0, 5).map(s => ({ query: s.query, isRecent: true }));
  }

  const normalizedQuery = query.toLowerCase();
  const allItems = [
    ...CONTENT_DATABASE.recipes,
    ...CONTENT_DATABASE.supplements,
    ...CONTENT_DATABASE.resources,
    ...CONTENT_DATABASE.articles
  ];

  // Obtener títulos únicos que coincidan
  const suggestions = new Set();
  
  allItems.forEach(item => {
    if (item.title.toLowerCase().startsWith(normalizedQuery)) {
      suggestions.add(item.title);
    }
  });

  // Agregar búsquedas recientes
  recentSearches.forEach(s => {
    if (s.query.toLowerCase().startsWith(normalizedQuery)) {
      suggestions.add(s.query);
    }
  });

  return Array.from(suggestions).slice(0, 8).map(s => ({ query: s }));
}

/**
 * Restaurar estado de búsqueda al recargar
 */
export function restoreSearchState() {
  loadRecentSearches();
}
