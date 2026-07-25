/**
 * ProfileService - Gestión completa del perfil del usuario
 * Centraliza datos personales, objetivos, plan, favoritos, historial, notificaciones
 */

import { API_URL, AUTH_HEADER } from './supabaseClient.js';

// Estado del perfil
let currentProfile = null;
let currentUserEmail = null;

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
    console.log('📥 Cargando perfil del usuario...');
    
    const response = await fetch(
      `${API_URL}/profiles?email=eq.${encodeURIComponent(currentUserEmail)}`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.warn('⚠️ Perfil no encontrado, creando nuevo...');
      return createDefaultProfile();
    }

    const profiles = await response.json();
    
    if (profiles.length > 0) {
      currentProfile = profiles[0];
      console.log('✅ Perfil cargado:', currentProfile);
      cacheProfile();
      return currentProfile;
    } else {
      return createDefaultProfile();
    }
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
    const newProfile = {
      email: currentUserEmail,
      full_name: '',
      avatar_url: '',
      bio: '',
      nutritional_goal: 'general', // general, weight_loss, muscle_gain, performance
      active_plan: 'free', // free, premium, vip
      language: 'es', // es, en, pt
      notifications_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const response = await fetch(`${API_URL}/profiles`, {
      method: 'POST',
      headers: AUTH_HEADER,
      body: JSON.stringify(newProfile)
    });

    if (response.ok) {
      const created = await response.json();
      currentProfile = created[0] || newProfile;
      cacheProfile();
      console.log('✅ Perfil creado:', currentProfile);
      return currentProfile;
    }
  } catch (error) {
    console.error('❌ Error creando perfil:', error);
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
  if (!currentProfile?.id) {
    console.error('❌ Perfil no inicializado');
    return null;
  }

  try {
    console.log('📝 Actualizando perfil...');
    
    const profileUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const response = await fetch(
      `${API_URL}/profiles?id=eq.${currentProfile.id}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify(profileUpdate)
      }
    );

    if (!response.ok) {
      throw new Error('Error actualizando perfil');
    }

    currentProfile = { ...currentProfile, ...profileUpdate };
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
    console.log('❤️ Obteniendo favoritos...');
    
    const response = await fetch(
      `${API_URL}/favorites?user_email=eq.${encodeURIComponent(currentUserEmail)}`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      throw new Error('Error obteniendo favoritos');
    }

    const favorites = await response.json();
    console.log(`✅ ${favorites.length} favoritos obtenidos`);
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
    console.log('📜 Obteniendo historial...');
    
    const response = await fetch(
      `${API_URL}/history?user_email=eq.${encodeURIComponent(currentUserEmail)}&order=created_at.desc&limit=${limit}`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      throw new Error('Error obteniendo historial');
    }

    const history = await response.json();
    console.log(`✅ ${history.length} registros de historial obtenidos`);
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
      `${API_URL}/notifications?user_email=eq.${encodeURIComponent(currentUserEmail)}&read=eq.false&order=created_at.desc`,
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

  return await updateProfile({ nutritional_goal: goal });
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
