/**
 * FavoritesService - Gestiona los favoritos del usuario
 * Permite agregar, eliminar y verificar favoritos
 * Sincroniza con Supabase en tiempo real
 */

import {
  getFavoritesFromSupabase,
  saveFavoriteToSupabase
} from './supabaseClient.js';

// Cache local de favoritos del usuario actual
let userEmail = null;
let favoritesCache = [];

/**
 * Inicializar el servicio de favoritos con el email del usuario
 * @param {string} email - Email del usuario autenticado
 */
export async function initializeFavoritesService(email) {
  if (!email) {
    console.warn('❌ Email no proporcionado para FavoritesService');
    return;
  }

  userEmail = email;
  console.log('📌 FavoritesService inicializado para:', email);

  // Cargar favoritos desde Supabase
  await loadFavoritesFromSupabase();
}

/**
 * Cargar favoritos desde Supabase al cache local
 * @returns {Promise<Array>} - Array de favoritos
 */
export async function loadFavoritesFromSupabase() {
  if (!userEmail) {
    console.warn('❌ Usuario no inicializado en FavoritesService');
    return [];
  }

  try {
    console.log('📥 Cargando favoritos desde Supabase...');
    const favorites = await getFavoritesFromSupabase(userEmail);
    
    if (favorites && Array.isArray(favorites)) {
      favoritesCache = favorites;
      console.log(`✅ ${favorites.length} favoritos cargados al cache`);
      localStorage.setItem('isocore_favorites_cache', JSON.stringify(favorites));
    }
    
    return favorites || [];
  } catch (error) {
    console.error('❌ Error cargando favoritos:', error);
    // Intentar cargar del cache local
    const cached = localStorage.getItem('isocore_favorites_cache');
    if (cached) {
      favoritesCache = JSON.parse(cached);
      return favoritesCache;
    }
    return [];
  }
}

/**
 * Agregar favorito
 * @param {string} module - Tipo de módulo ('recipe', 'resource', 'supplement', 'article')
 * @param {string} referenceId - ID único del elemento en el módulo
 * @param {string} name - Nombre del elemento
 * @param {Object} metadata - Datos adicionales del favorito
 * @returns {Promise<boolean>} - true si se agregó exitosamente
 */
export async function addFavorite(module, referenceId, name, metadata = {}) {
  if (!userEmail) {
    console.warn('❌ Usuario no inicializado');
    return false;
  }

  if (!module || !referenceId) {
    console.warn('❌ Datos incompletos para agregar favorito');
    return false;
  }

  try {
    console.log(`❤️ Agregando favorito: ${module} - ${referenceId}`);

    // Crear objeto del favorito
    const newFavorite = {
      id: Date.now(), // ID temporal
      email: userEmail,
      type: module,
      name: name,
      resource_id: referenceId,
      metadata: metadata,
      created_at: new Date().toISOString()
    };
    
    // Agregar al cache local primero (independiente de Supabase)
    favoritesCache.push(newFavorite);
    localStorage.setItem('isocore_favorites_cache', JSON.stringify(favoritesCache));
    
    // Disparar evento para actualizar UI
    dispatchFavoriteEvent('favorite-added', { module, referenceId, name });

    // Intentar guardar en Supabase (no fallar si esto falla)
    const favorite = {
      type: module,
      name: name,
      resourceId: referenceId,
      metadata: metadata
    };

    saveFavoriteToSupabase(userEmail, favorite)
      .then(saved => {
        if (saved) {
          console.log(`✅ Favorito sincronizado con Supabase`);
        } else {
          console.warn('⚠️ Favorito guardado localmente pero no en Supabase');
        }
      })
      .catch(error => {
        console.warn('⚠️ Error sincronizando con Supabase:', error);
      });
      
    return true;
  } catch (error) {
    console.error('❌ Error agregando favorito:', error);
    return false;
  }
}

/**
 * Eliminar favorito
 * @param {string} module - Tipo de módulo
 * @param {string} referenceId - ID del elemento
 * @returns {Promise<boolean>} - true si se eliminó exitosamente
 */
export async function removeFavorite(module, referenceId) {
  if (!userEmail) {
    console.warn('❌ Usuario no inicializado');
    return false;
  }

  try {
    console.log(`💔 Removiendo favorito: ${module} - ${referenceId}`);

    // Buscar el favorito en el cache local
    const index = favoritesCache.findIndex(
      f => f.type === module && f.resource_id === referenceId
    );

    if (index > -1) {
      const removed = favoritesCache[index];
      
      // Eliminar del cache local primero (independiente de Supabase)
      favoritesCache.splice(index, 1);
      localStorage.setItem('isocore_favorites_cache', JSON.stringify(favoritesCache));
      
      // Disparar evento para actualizar UI
      dispatchFavoriteEvent('favorite-removed', { module, referenceId });
      
      // Intentar eliminar de Supabase (no fallar si esto falla)
      if (removed.id) {
        deleteFavoriteFromSupabase(removed.id)
          .then(deleted => {
            if (deleted) {
              console.log(`✅ Favorito eliminado de Supabase`);
            } else {
              console.warn('⚠️ Favorito eliminado localmente pero no en Supabase');
            }
          })
          .catch(error => {
            console.warn('⚠️ Error sincronizando eliminación con Supabase:', error);
          });
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error removiendo favorito:', error);
    return false;
  }
}

/**
 * Verificar si un elemento es favorito
 * @param {string} module - Tipo de módulo
 * @param {string} referenceId - ID del elemento
 * @returns {boolean} - true si es favorito
 */
export function isFavorite(module, referenceId) {
  return favoritesCache.some(
    f => f.type === module && f.resource_id === referenceId
  );
}

/**
 * Obtener todos los favoritos del usuario
 * @returns {Array} - Array de favoritos
 */
export function getFavorites() {
  return [...favoritesCache];
}

/**
 * Obtener favoritos por tipo/módulo
 * @param {string} module - Tipo de módulo ('recipe', 'resource', 'supplement')
 * @returns {Array} - Array de favoritos del módulo especificado
 */
export function getFavoritesByModule(module) {
  return favoritesCache.filter(f => f.type === module);
}

/**
 * Limpiar favoritos (logout)
 */
export function clearFavorites() {
  userEmail = null;
  favoritesCache = [];
  localStorage.removeItem('isocore_favorites_cache');
  console.log('🗑️ Favoritos limpios');
}

/**
 * Eliminar favorito de Supabase (función auxiliar)
 * @param {number} favoriteId - ID del favorito a eliminar
 * @returns {Promise<boolean>}
 */
async function deleteFavoriteFromSupabase(favoriteId) {
  if (!favoriteId) return false;

  try {
    const SUPABASE_URL = 'https://dhvouecsvhcxxzputvvq.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_jJNhVo8W8T9ejNLHrFeR5w_NP78ZPt-';
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/favorites?id=eq.${favoriteId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      console.log(`✅ Favorito eliminado de Supabase`);
      return true;
    }

    console.warn(`⚠️ Error eliminando de Supabase (${response.status})`);
    return false;
  } catch (error) {
    console.error('❌ Error eliminando favorito:', error);
    return false;
  }
}

/**
 * Disparar evento personalizado para notificar cambios en favoritos
 * @param {string} eventName - Nombre del evento
 * @param {Object} detail - Datos del evento
 */
function dispatchFavoriteEvent(eventName, detail) {
  const event = new CustomEvent(eventName, { detail });
  document.dispatchEvent(event);
  console.log(`📢 Evento disparado: ${eventName}`);
}

/**
 * Escuchar cambios en favoritos
 * @param {string} eventName - 'favorite-added' o 'favorite-removed'
 * @param {Function} callback - Función a ejecutar cuando ocurra el evento
 */
export function onFavoriteChange(eventName, callback) {
  document.addEventListener(eventName, (e) => {
    callback(e.detail);
  });
}

// Exportar función para restaurar estado al recargar página
export async function restoreFavoritesState() {
  const cached = localStorage.getItem('isocore_favorites_cache');
  if (cached) {
    try {
      favoritesCache = JSON.parse(cached);
      console.log(`♥️ Favoritos restaurados del cache local (${favoritesCache.length})`);
    } catch (error) {
      console.error('Error restaurando favoritos:', error);
    }
  }
}
