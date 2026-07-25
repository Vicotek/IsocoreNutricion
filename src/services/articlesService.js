/**
 * ArticlesService - Biblioteca científica de artículos
 * Gestiona artículos, búsqueda, filtros y categorías desde Supabase
 */

import {
  getArticlesFromSupabase,
  getArticleFromSupabase,
  searchArticlesInSupabase,
  getArticlesByCategoryFromSupabase,
  getFeaturedArticlesFromSupabase,
  getArticlesByConditionFromSupabase,
  getReferencesByArticleFromSupabase
} from './supabaseClient.js';

// Cache local de artículos
let articlesCache = [];
let currentUserEmail = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Categorías disponibles
const CATEGORIES = [
  'Nutrición',
  'Suplementación',
  'Analíticas',
  'Salud',
  'Objetivos',
  'Alimentación',
  'Estilo de vida'
];

/**
 * Inicializar servicio de artículos
 * @param {string} userEmail - Email del usuario autenticado
 */
export function initializeArticlesService(userEmail) {
  if (!userEmail) {
    console.warn('⚠️ Email no proporcionado para ArticlesService');
    return;
  }
  
  currentUserEmail = userEmail;
  console.log('📚 ArticlesService inicializado para:', userEmail);
  
  // Cargar artículos desde Supabase
  loadArticlesFromSupabase();
}

/**
 * Cargar artículos desde Supabase al cache local
 */
async function loadArticlesFromSupabase() {
  try {
    console.log('📥 Cargando artículos desde Supabase...');
    const articles = await getArticlesFromSupabase();
    
    if (articles && Array.isArray(articles)) {
      articlesCache = articles;
      cacheTimestamp = Date.now();
      console.log(`✅ ${articles.length} artículos cargados al cache`);
      localStorage.setItem('isocore_articles_cache', JSON.stringify({
        data: articles,
        timestamp: cacheTimestamp
      }));
    } else {
      console.warn('⚠️ No hay artículos desde Supabase, intentando cache local');
      loadArticlesFromCache();
    }
  } catch (error) {
    console.error('❌ Error cargando artículos:', error);
    loadArticlesFromCache();
  }
}

/**
 * Cargar artículos del cache local
 */
function loadArticlesFromCache() {
  try {
    const cached = localStorage.getItem('isocore_articles_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      articlesCache = parsed.data || [];
      cacheTimestamp = parsed.timestamp || 0;
      console.log(`♻️ ${articlesCache.length} artículos cargados desde cache local`);
    }
  } catch (error) {
    console.error('Error cargando cache local:', error);
  }
}

/**
 * Obtener todos los artículos con paginación opcional
 * @param {number} limit - Límite de artículos a retornar
 * @param {number} offset - Offset para paginación
 * @returns {Array} - Array de artículos
 */
export function getArticles(limit = 999, offset = 0) {
  if (articlesCache.length === 0) {
    loadArticlesFromCache();
  }
  return articlesCache.slice(offset, offset + limit);
}

/**
 * Obtener un artículo específico por ID
 * @param {string} id - ID del artículo
 * @returns {Object|null} - Objeto del artículo o null
 */
export function getArticle(id) {
  return articlesCache.find(a => a.id === id) || null;
}

/**
 * Obtener artículos por categoría
 * @param {string} category - Nombre de la categoría
 * @returns {Array} - Array de artículos en la categoría
 */
export function getArticlesByCategory(category) {
  return articlesCache.filter(a => a.category === category);
}

/**
 * Buscar artículos (búsqueda local en cache)
 * @param {string} query - Término de búsqueda
 * @returns {Array} - Array de artículos que coinciden
 */
export function searchArticles(query) {
  if (!query || query.length < 2) {
    console.warn('⚠️ Búsqueda requiere al menos 2 caracteres');
    return [];
  }

  const queryLower = query.toLowerCase();
  return articlesCache.filter(article =>
    article.title.toLowerCase().includes(queryLower) ||
    article.excerpt.toLowerCase().includes(queryLower) ||
    article.content.toLowerCase().includes(queryLower) ||
    (article.tags && article.tags.some(tag => tag.toLowerCase().includes(queryLower))) ||
    article.category.toLowerCase().includes(queryLower)
  );
}

/**
 * Obtener artículos relacionados
 * @param {string} articleId - ID del artículo
 * @param {number} limit - Número de artículos relacionados
 * @returns {Array} - Array de artículos relacionados
 */
export function getRelatedArticles(articleId, limit = 3) {
  const article = getArticle(articleId);
  if (!article) return [];

  return articlesCache
    .filter(a => 
      a.id !== articleId && 
      (a.category === article.category || 
       (a.tags && article.tags && a.tags.some(tag => article.tags.includes(tag))))
    )
    .slice(0, limit);
}

/**
 * Obtener todas las categorías
 * @returns {Array} - Array de categorías
 */
export function getCategories() {
  return CATEGORIES;
}

/**
 * Obtener artículos por dificultad
 * @param {string} difficulty - Nivel de dificultad
 * @returns {Array} - Array de artículos con esa dificultad
 */
export function getArticlesByDifficulty(difficulty) {
  return articlesCache.filter(a => a.difficulty === difficulty);
}

/**
 * Obtener artículos por autor
 * @param {string} author - Nombre del autor
 * @returns {Array} - Array de artículos del autor
 */
export function getArticlesByAuthor(author) {
  return articlesCache.filter(a => a.author === author);
}

/**
 * Filtrar artículos por múltiples criterios
 * @param {Object} filters - Objeto con filtros (category, difficulty, author, tags)
 * @returns {Array} - Array de artículos filtrados
 */
export function filterArticles(filters = {}) {
  let result = [...articlesCache];

  if (filters.category) {
    result = result.filter(a => a.category === filters.category);
  }

  if (filters.difficulty) {
    result = result.filter(a => a.difficulty === filters.difficulty);
  }

  if (filters.author) {
    result = result.filter(a => a.author === filters.author);
  }

  if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
    result = result.filter(a =>
      a.tags && a.tags.some(tag => filters.tags.includes(tag))
    );
  }

  if (filters.searchQuery) {
    result = searchArticles(filters.searchQuery).filter(a =>
      result.some(r => r.id === a.id)
    );
  }

  return result;
}

/**
 * Obtener estadísticas de la biblioteca
 * @returns {Object} - Objeto con estadísticas
 */
export function getLibraryStats() {
  const stats = {
    totalArticles: articlesCache.length,
    featuredArticles: articlesCache.filter(a => a.featured).length,
    categoriesCount: CATEGORIES.length,
    byCategory: {},
    byDifficulty: {
      Beginner: 0,
      Intermediate: 0,
      Advanced: 0
    },
    averageReadingTime: 0
  };

  // Contar por categoría
  CATEGORIES.forEach(cat => {
    stats.byCategory[cat] = articlesCache.filter(a => a.category === cat).length;
  });

  // Contar por dificultad
  articlesCache.forEach(a => {
    if (stats.byDifficulty[a.difficulty] !== undefined) {
      stats.byDifficulty[a.difficulty]++;
    }
  });

  // Calcular tiempo promedio de lectura
  if (articlesCache.length > 0) {
    const totalTime = articlesCache.reduce((sum, a) => sum + (a.reading_time || 0), 0);
    stats.averageReadingTime = Math.round(totalTime / articlesCache.length);
  }

  return stats;
}

/**
 * Obtener artículos por tag
 * @param {string} tag - Tag a buscar
 * @returns {Array} - Array de artículos con ese tag
 */
export function getArticlesByTag(tag) {
  return articlesCache.filter(a =>
    a.tags && a.tags.includes(tag)
  );
}

/**
 * Obtener todos los tags únicos
 * @returns {Array} - Array de tags únicos
 */
export function getAllTags() {
  const tags = new Set();
  articlesCache.forEach(a => {
    if (a.tags && Array.isArray(a.tags)) {
      a.tags.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags).sort();
}

/**
 * Ordenar artículos
 * @param {Array} articles - Array de artículos
 * @param {string} sortBy - Campo de ordenamiento ('recent', 'title', 'reading_time')
 * @param {string} order - Orden ('asc', 'desc')
 * @returns {Array} - Array ordenado
 */
export function sortArticles(articles, sortBy = 'recent', order = 'desc') {
  const sorted = [...articles];

  switch (sortBy) {
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'reading_time':
      sorted.sort((a, b) => (a.reading_time || 0) - (b.reading_time || 0));
      break;
    case 'recent':
    default:
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }

  if (order === 'asc') {
    sorted.reverse();
  }

  return sorted;
}

/**
 * Limpiar el servicio (logout)
 */
export function clearArticlesService() {
  articlesCache = [];
  currentUserEmail = null;
  cacheTimestamp = 0;
  console.log('🗑️ ArticlesService limpiado');
}

/**
 * Obtener artículos destacados (featured)
 * @param {number} limit - Número máximo de artículos
 * @returns {Promise<Array>} - Array de artículos destacados
 */
export async function getFeaturedArticles(limit = 5) {
  try {
    console.log('⭐ Obteniendo artículos destacados...');
    const featured = await getFeaturedArticlesFromSupabase(limit);
    
    if (featured && featured.length > 0) {
      console.log(`✅ ${featured.length} artículos destacados cargados`);
      return featured;
    }
    
    console.log('ℹ️ No hay artículos destacados');
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo artículos destacados:', error);
    return [];
  }
}

/**
 * Obtener referencias científicas de un artículo
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
    
    if (references && references.length > 0) {
      console.log(`✅ ${references.length} referencias obtenidas`);
      return references;
    }
    
    console.log('ℹ️ No hay referencias para este artículo');
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias:', error);
    return [];
  }
}

/**
 * Obtener artículos relacionados a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Array>} - Array de artículos
 */
export async function getArticlesByCondition(conditionId) {
  try {
    if (!conditionId) {
      console.warn('⚠️ conditionId no proporcionado');
      return [];
    }

    console.log(`📚 Obteniendo artículos para condición ${conditionId}...`);
    const articles = await getArticlesByConditionFromSupabase(conditionId);
    
    if (articles && articles.length > 0) {
      console.log(`✅ ${articles.length} artículos obtenidos`);
      return articles;
    }
    
    console.log('ℹ️ No hay artículos para esta condición');
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo artículos por condición:', error);
    return [];
  }
}
