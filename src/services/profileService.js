/**
 * ProfileService - Gestión completa del perfil del usuario
 * Centraliza datos personales, objetivos, plan, favoritos, historial, notificaciones
 */

import { API_URL, AUTH_HEADER, getFavoritesFromSupabase, getUserActivityFromSupabase } from './supabaseClient.js';
import { getAuthToken } from './authService.js';

// Estado del perfil
let currentProfile = null;
let currentUserEmail = null;

async function callProfileRpc(functionName, params = {}) {
  const token = getAuthToken();

  if (!token) {
    return { data: null, error: { code: '28000', message: 'Sesión no válida' } };
  }

  // Patrón de actualización silenciosa: el RPC se ejecuta con la anon key del
  // cliente pero el token real de sesión va en el cuerpo como p_sesion_token.
  // Esto permite que la SQL function valide la sesión sin exigir un token
  // de autenticación de usuario en cada request de escritura.
  try {
    const response = await fetch(`${API_URL}/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        'Authorization': `Bearer ${AUTH_HEADER.apikey}`
      },
      body: JSON.stringify({ p_sesion_token: token, ...params })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return { data: null, error: { code: response.status, message: result?.message || response.statusText } };
    }

    return { data: result, error: null };
  } catch (error) {
    console.error(`❌ Error ejecutando RPC ${functionName}:`, error);
    return { data: null, error: { code: 'unknown', message: error.message } };
  }
}

function normalizeProfileRow(row) {
  if (!row) return null;

  return {
    id: row.id || null,
    email: row.email || '',
    full_name: row.full_name || row.nombre || row.name || '',
    avatar_url: row.avatar_url || '',
    bio: row.bio || '',
    nutritional_goal: row.nutritional_goal || row.objective || 'general',
    active_plan: row.active_plan || row.plan || 'free',
    language: row.language || row.idioma || 'es',
    notifications_enabled: row.notifications_enabled ?? true,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

/**
 * Inicializar servicio de perfil
 * @param {string} userEmail - Email del usuario autenticado
 */
export function initializeProfileService(userEmail) {
  if (!userEmail) {
    console.warn('⚠️ Email no proporcionado para ProfileService');
    return;
  }
  
  currentUserEmail = userEmail;
  console.log('👤 ProfileService inicializado para:', userEmail);
  
  // Cargar perfil del usuario
  loadUserProfile();
}

/**
 * Cargar perfil del usuario desde Supabase
 */
async function loadUserProfile() {
  try {
    console.log('📥 Cargando perfil del usuario desde RPC...');

    const { data, error } = await callProfileRpc('app_get_mi_perfil');

    if (error) {
      console.warn('⚠️ Error cargando perfil desde RPC:', error);
      return createDefaultProfile();
    }

    const profileData = Array.isArray(data) ? data[0] : data;

    if (profileData) {
      currentProfile = normalizeProfileRow(profileData);
      console.log('✅ Perfil cargado:', currentProfile);
      cacheProfile();
      return currentProfile;
    }

    return createDefaultProfile();
  } catch (error) {
    console.error('❌ Error cargando perfil:', error);
    loadProfileFromCache();
  }
}

/**
 * Crear perfil por defecto
 */
async function createDefaultProfile() {
  try {
    const newProfile = normalizeProfileRow({
      email: currentUserEmail,
      full_name: '',
      avatar_url: '',
      bio: '',
      nutritional_goal: 'general',
      active_plan: 'free',
      language: 'es',
      notifications_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    currentProfile = newProfile;
    cacheProfile();
    console.log('✅ Perfil por defecto preparado en local:', currentProfile);
    return currentProfile;
  } catch (error) {
    console.error('❌ Error creando perfil:', error);
    currentProfile = normalizeProfileRow({
      email: currentUserEmail,
      full_name: '',
      avatar_url: '',
      bio: '',
      nutritional_goal: 'general',
      active_plan: 'free',
      language: 'es',
      notifications_enabled: true
    });
    cacheProfile();
  }
}

/**
 * Guardar perfil en cache local
 */
function cacheProfile() {
  if (currentProfile) {
    localStorage.setItem('isocore_profile', JSON.stringify(currentProfile));
  }
}

/**
 * Cargar perfil del cache local
 */
function loadProfileFromCache() {
  try {
    const cached = localStorage.getItem('isocore_profile');
    if (cached) {
      currentProfile = JSON.parse(cached);
      console.log('♻️ Perfil cargado desde cache local');
    }
  } catch (error) {
    console.error('Error cargando cache de perfil:', error);
  }
}

/**
 * Obtener perfil actual
 * @returns {Object} - Objeto del perfil
 */
export function getProfile() {
  return currentProfile || {};
}

/**
 * Actualizar datos personales del perfil
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<Object>} - Perfil actualizado
 */
export async function updateProfile(updates) {
  const sesionToken = getAuthToken();

  if (!sesionToken) {
    console.error('❌ Perfil no inicializado: no hay sesión activa');
    return null;
  }

  try {
    console.log('📝 Actualizando perfil via RPC...');

    const payload = {
      p_sesion_token: sesionToken,
      p_nombre: updates?.nombre ?? updates?.full_name ?? null,
      p_idioma: updates?.idioma ?? updates?.language ?? null,
      p_bio: updates?.bio ?? null,
      p_avatar_url: updates?.avatar_url ?? null,
      p_notifications_enabled: updates?.notifications_enabled ?? null
    };

    const { data, error } = await callProfileRpc('app_actualizar_mi_perfil', payload);

    if (error) {
      console.error('❌ Error actualizando perfil desde RPC:', error);
      return null;
    }

    const profileData = Array.isArray(data) ? data[0] : data;
    currentProfile = normalizeProfileRow(profileData || { ...currentProfile, ...updates });
    cacheProfile();
    console.log('✅ Perfil actualizado:', currentProfile);
    return currentProfile;
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    return null;
  }
}

/**
 * Cambiar contraseña
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<boolean>} - Éxito del cambio
 */
export async function changePassword(currentPassword, newPassword) {
  try {
    console.log('🔐 Cambiando contraseña...');
    
    // Llamar a endpoint de cambio de contraseña
    const response = await fetch(`${API_URL}/change-password`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        email: currentUserEmail
      })
    });

    if (!response.ok) {
      throw new Error('Error cambiando contraseña');
    }

    console.log('✅ Contraseña cambió exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    return false;
  }
}

/**
 * Cambiar idioma del usuario
 * @param {string} language - Código de idioma (es, en, pt)
 * @returns {Promise<Object>} - Perfil actualizado
 */
export async function updateLanguage(language) {
  if (!['es', 'en', 'pt'].includes(language)) {
    console.warn('⚠️ Idioma no soportado:', language);
    return null;
  }

  return await updateProfile({ language });
}

/**
 * Obtener favoritos del usuario
 * @returns {Promise<Array>} - Array de favoritos
 */
export async function getFavorites() {
  try {
    console.log('❤️ Obteniendo favoritos desde RPC...');
    const sesionToken = getAuthToken();
    const favorites = await getFavoritesFromSupabase(sesionToken);
    console.log(`✅ ${favorites.length} favoritos obtenidos desde RPC`);
    return favorites;
  } catch (error) {
    console.error('❌ Error obteniendo favoritos:', error);
    return [];
  }
}

/**
 * Obtener historial del usuario
 * @param {number} limit - Número de registros
 * @returns {Promise<Array>} - Array de historial
 */
export async function getHistory(limit = 20) {
  try {
    console.log('📜 Obteniendo historial desde RPC...');
    const sesionToken = getAuthToken();
    const history = await getUserActivityFromSupabase(sesionToken, limit);
    console.log(`✅ ${history.length} registros de historial obtenidos desde RPC`);
    return history;
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    return [];
  }
}

/**
 * Obtener notificaciones del usuario
 * @returns {Promise<Array>} - Array de notificaciones
 */
export async function getNotifications() {
  try {
    console.log('🔔 Obteniendo notificaciones...');
    
    const response = await fetch(
      `${API_URL}/notifications?email=eq.${encodeURIComponent(currentUserEmail)}&read=eq.false&order=created_at.desc`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      throw new Error('Error obteniendo notificaciones');
    }

    const notifications = await response.json();
    console.log(`✅ ${notifications.length} notificaciones no leídas`);
    return notifications;
  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    return [];
  }
}

/**
 * Marcar notificación como leída
 * @param {number} notificationId - ID de la notificación
 * @returns {Promise<boolean>} - Éxito de la operación
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch(
      `${API_URL}/notifications?id=eq.${notificationId}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify({ read: true })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('❌ Error marcando notificación como leída:', error);
    return false;
  }
}

/**
 * Actualizar objetivo nutricional
 * @param {string} goal - Objetivo (general, weight_loss, muscle_gain, performance)
 * @returns {Promise<Object>} - Perfil actualizado
 */
export async function updateNutritionalGoal(goal) {
  const validGoals = ['general', 'weight_loss', 'muscle_gain', 'performance'];

  if (!validGoals.includes(goal)) {
    console.warn('⚠️ Objetivo no válido:', goal);
    return null;
  }

  // El objetivo nutricional real pertenece a un plan nutricional/plan de usuario,
  // no al perfil de la tabla usuarios. La ruta de persistencia con
  // app_crear_plan_nutricional/app_actualizar_plan_nutricional no está
  // implementada en este frontend todavía, así que evitamos una llamada que
  // falle silenciamente y dejamos el estado explícitamente no persistido.
  console.warn('⚠️ Objetivo nutricional no persistido: la integración con los planes de usuario aún no está disponible.');
  return { goal, saved: false, message: 'Objetivo sin persistencia real: pendiente de integración con planes nutricionales.' };
}

/**
 * Obtener estadísticas del usuario
 * @returns {Promise<Object>} - Estadísticas
 */
export async function getUserStats() {
  try {
    const [favorites, history, notifications] = await Promise.all([
      getFavorites(),
      getHistory(999),
      getNotifications()
    ]);

    return {
      totalFavorites: favorites.length,
      totalHistory: history.length,
      unreadNotifications: notifications.length,
      lastAccess: currentProfile?.updated_at || null,
      planStatus: currentProfile?.active_plan || 'free'
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return {};
  }
}

/**
 * Habilitar/Deshabilitar notificaciones
 * @param {boolean} enabled - Estado de notificaciones
 * @returns {Promise<Object>} - Perfil actualizado
 */
export async function updateNotificationSettings(enabled) {
  return await updateProfile({ notifications_enabled: enabled });
}

/**
 * Exportar datos del usuario (GDPR)
 * @returns {Promise<Object>} - Datos del usuario
 */
export async function exportUserData() {
  try {
    console.log('📤 Exportando datos del usuario...');
    
    const [profile, favorites, history, notifications] = await Promise.all([
      Promise.resolve(currentProfile),
      getFavorites(),
      getHistory(999),
      getNotifications()
    ]);

    const userData = {
      profile,
      favorites,
      history,
      notifications,
      exportedAt: new Date().toISOString()
    };

    console.log('✅ Datos exportados');
    return userData;
  } catch (error) {
    console.error('❌ Error exportando datos:', error);
    return null;
  }
}

/**
 * Limpiar el servicio (logout)
 */
export function clearProfileService() {
  currentProfile = null;
  currentUserEmail = null;
  localStorage.removeItem('isocore_profile');
  console.log('🗑️ ProfileService limpiado');
}
