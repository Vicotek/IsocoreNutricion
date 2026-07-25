/**
 * Security Service
 * Gestión de permisos y control de acceso
 */

import { getUserRoleFromSupabase, isUserAdminFromSupabase } from './supabaseClient.js';

const ROLE_CACHE_KEY = 'isocore_user_role_cache';
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

let roleCache = new Map(); // Map<email, {role, timestamp}>

/**
 * Obtener rol del usuario (con cache)
 * @param {string} email - Email del usuario
 * @returns {Promise<string>} - Rol del usuario ('admin' o 'user')
 */
export async function getUserRole(email) {
  if (!email) return 'user';

  // Verificar cache local
  const cached = roleCache.get(email);
  if (cached && Date.now() - cached.timestamp < ROLE_CACHE_TTL) {
    console.log(`🔐 Rol obtenido del cache: ${cached.role}`);
    return cached.role;
  }

  // Obtener de Supabase
  try {
    const role = await getUserRoleFromSupabase(email);
    const finalRole = role || 'user';
    
    // Guardar en cache
    roleCache.set(email, {
      role: finalRole,
      timestamp: Date.now()
    });

    return finalRole;
  } catch (error) {
    console.error('Error obteniendo rol:', error);
    return 'user';
  }
}

/**
 * Verificar si el usuario es administrador
 * @param {string} email - Email del usuario
 * @returns {Promise<boolean>} - true si es admin
 */
export async function isAdmin(email) {
  const role = await getUserRole(email);
  return role === 'admin';
}

/**
 * Limpiar cache de roles
 */
export function clearRoleCache() {
  roleCache.clear();
  console.log('✅ Cache de roles limpiado');
}

/**
 * Limpiar cache del usuario específico
 * @param {string} email - Email del usuario
 */
export function clearUserRoleCache(email) {
  if (email) {
    roleCache.delete(email);
    console.log(`✅ Cache de rol limpiado para: ${email}`);
  }
}

/**
 * Validar acceso a ruta/funcionalidad
 * @param {string} email - Email del usuario
 * @param {string} requiredRole - Role requerido ('admin', 'user', etc)
 * @returns {Promise<{allowed: boolean, statusCode: number, message: string}>}
 */
export async function validateAccess(email, requiredRole = 'user') {
  if (!email) {
    return {
      allowed: false,
      statusCode: 401,
      message: 'No autenticado'
    };
  }

  if (requiredRole === 'user') {
    // Cualquier usuario autenticado tiene acceso
    return {
      allowed: true,
      statusCode: 200,
      message: 'Acceso permitido'
    };
  }

  if (requiredRole === 'admin') {
    const userIsAdmin = await isAdmin(email);
    if (userIsAdmin) {
      return {
        allowed: true,
        statusCode: 200,
        message: 'Acceso permitido'
      };
    } else {
      return {
        allowed: false,
        statusCode: 403,
        message: 'Acceso denegado: requiere permisos de administrador'
      };
    }
  }

  return {
    allowed: false,
    statusCode: 403,
    message: 'Role no reconocido'
  };
}

/**
 * Mostrar modal de acceso denegado
 * @param {Object} options - Opciones del modal
 */
export function showAccessDeniedModal(options = {}) {
  const {
    title = '🔒 Acceso Denegado',
    message = 'No tienes permisos para acceder a esta función.',
    onClose = () => {}
  } = options;

  const modal = document.createElement('div');
  modal.className = 'access-denied-modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <h2>${title}</h2>
      <p>${message}</p>
      <button class="modal-close-btn">Entendido</button>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.modal-close-btn');
  const overlay = modal.querySelector('.modal-overlay');

  const cleanup = () => {
    modal.remove();
    onClose();
  };

  closeBtn.addEventListener('click', cleanup);
  overlay.addEventListener('click', cleanup);

  return modal;
}

/**
 * Redirigir a home si no tiene permisos
 */
export function redirectToHome() {
  console.log('🚪 Redirigiendo a home...');
  if (window.location.hash !== '#home') {
    window.location.hash = '#home';
  }
}
