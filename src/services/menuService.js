/**
 * MenuService - Gestiona el menú dinámico según autenticación y plan
 * Actualiza automáticamente sin recargar la página
 */

import { getCurrentPlan } from './planService.js';

const MENU_STORAGE_KEY = 'isocore_menu_state';

/**
 * Actualiza todo el menú basado en el estado de autenticación y plan
 * @param {Object} user - Objeto de usuario { name, email, plan, loggedAt }
 * @param {string} language - Código de idioma actual
 */
export function updateMenu(user = null, language = 'es') {
  if (!user) {
    // Usuario NO autenticado
    showUnauthenticatedMenu();
  } else {
    // Usuario autenticado
    showAuthenticatedMenu(user, language);
  }
  
  saveMenuState(user);
}

/**
 * Muestra el menú para usuario NO autenticado
 * Visible: Login, Register, Language
 * Oculto: Profile, Plan, Logout
 */
function showUnauthenticatedMenu() {
  // Ocultar card de usuario autenticado
  const userCard = document.querySelector('.home-user-card');
  if (userCard) {
    userCard.classList.add('hidden');
  }

  // Ocultar botón de logout
  const logoutBtn = document.getElementById('homeLogoutButton');
  if (logoutBtn) {
    logoutBtn.classList.add('hidden');
  }

  // Mostrar formularios de login/registro
  const loginForm = document.getElementById('homeLoginForm');
  const authTabs = document.querySelector('.auth-tabs');
  
  if (loginForm) {
    loginForm.classList.remove('hidden');
  }
  if (authTabs) {
    authTabs.classList.remove('hidden');
  }

  // Mostrar intro del panel de login
  const loginIntro = document.getElementById('homeLoginPanelIntro');
  if (loginIntro) {
    loginIntro.classList.remove('hidden');
  }
}

/**
 * Muestra el menú para usuario AUTENTICADO
 * Visible: User badge, Plan badge, Modules según plan, Logout
 * Oculto: Login forms
 */
function showAuthenticatedMenu(user, language = 'es') {
  // Ocultar formularios
  const loginForm = document.getElementById('homeLoginForm');
  const registerForm = document.getElementById('homeRegisterForm');
  const recoveryForm = document.getElementById('homeRecoveryForm');
  const authTabs = document.querySelector('.auth-tabs');
  const loginIntro = document.getElementById('homeLoginPanelIntro');

  [loginForm, registerForm, recoveryForm].forEach(form => {
    if (form) form.classList.add('hidden');
  });
  
  if (authTabs) authTabs.classList.add('hidden');
  if (loginIntro) loginIntro.classList.add('hidden');

  // Mostrar card de usuario
  const userCard = document.querySelector('.home-user-card');
  if (userCard) {
    userCard.classList.remove('hidden');
    updateUserBadge(user);
  }

  // Mostrar botón de logout
  const logoutBtn = document.getElementById('homeLogoutButton');
  if (logoutBtn) {
    logoutBtn.classList.remove('hidden');
  }

  // Actualizar badge del plan
  updatePlanBadge(user.plan);
}

/**
 * Actualiza el badge del usuario con su nombre y plan
 * @param {Object} user - Objeto de usuario
 */
export function updateUserBadge(user) {
  const userLabel = document.getElementById('homeUserLabel');
  const userWelcome = document.getElementById('homeUserWelcome');

  if (userLabel && user.name) {
    userLabel.textContent = `👤 ${user.name}`;
  }

  if (userWelcome && user.plan) {
    const planLabel = getPlanLabel(user.plan);
    userWelcome.textContent = `Plan: ${planLabel}`;
  }
}

/**
 * Actualiza el badge del plan visual
 * @param {string} plan - Plan del usuario (free, premium, vip)
 */
export function updatePlanBadge(plan = 'free') {
  const statusPill = document.querySelector('.status-pill');
  
  if (statusPill) {
    const planLabel = getPlanLabel(plan);
    statusPill.textContent = planLabel;
    
    // Aplicar clases de estilo según plan
    statusPill.classList.remove('status-free', 'status-premium', 'status-vip');
    statusPill.classList.add(`status-${plan}`);
  }
}

/**
 * Obtiene la etiqueta visible del plan
 * @param {string} plan - Plan interno (free, premium, vip)
 * @returns {string} - Etiqueta para mostrar
 */
function getPlanLabel(plan) {
  const labels = {
    free: '🎯 FREE',
    premium: '⭐ PREMIUM',
    vip: '👑 VIP'
  };
  return labels[plan] || labels.free;
}

/**
 * Guarda el estado actual del menú en localStorage
 * @param {Object} user - Usuario actual o null
 */
function saveMenuState(user) {
  const state = {
    isAuthenticated: !!user,
    plan: user?.plan || 'free',
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Obtiene el estado guardado del menú
 * @returns {Object} - Estado guardado
 */
export function getMenuState() {
  const saved = localStorage.getItem(MENU_STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}

/**
 * Limpia el estado del menú (al logout)
 */
export function clearMenuState() {
  localStorage.removeItem(MENU_STORAGE_KEY);
  showUnauthenticatedMenu();
}

/**
 * Restaura el menú a partir del estado guardado
 * Útil para persistencia entre recargas
 */
export function restoreMenuState() {
  const userStr = localStorage.getItem('isocore_home_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      updateMenu(user);
    } catch (error) {
      console.error('Error restaurando estado del menú:', error);
      showUnauthenticatedMenu();
    }
  } else {
    showUnauthenticatedMenu();
  }
}

/**
 * Actualiza dinámicamente el menú tras login
 * @param {Object} user - Datos del usuario autenticado
 */
export function onLoginSuccess(user) {
  console.log('🔐 MenuService: Usuario autenticado -', user.name);
  updateMenu(user);
}

/**
 * Actualiza dinámicamente el menú tras logout
 */
export function onLogout() {
  console.log('👋 MenuService: Sesión cerrada');
  clearMenuState();
}

/**
 * Actualiza el menú cuando cambia el plan del usuario
 * @param {string} newPlan - Nuevo plan (free, premium, vip)
 */
export function onPlanChange(newPlan) {
  console.log('📊 MenuService: Plan actualizado -', newPlan);
  
  // Obtener usuario actual
  const userStr = localStorage.getItem('isocore_home_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    user.plan = newPlan;
    updateMenu(user);
  }
}

/**
 * Exporta todas las funciones públicas
 */
export const MenuService = {
  updateMenu,
  updateUserBadge,
  updatePlanBadge,
  restoreMenuState,
  getMenuState,
  clearMenuState,
  onLoginSuccess,
  onLogout,
  onPlanChange
};
