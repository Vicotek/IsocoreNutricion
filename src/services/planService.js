import { getUserPlanFromSupabase, subscribeToUserPlan } from './supabaseClient.js';

const PLAN_STORAGE_KEY = 'isocore_plan';

// Configuración de acceso a módulos por plan
export const MODULE_ACCESS = {
  free: [
    'center',
    'plan',
    'resources'
  ],

  premium: [
    'center',
    'plan',
    'recipes',
    'supplements',
    'resources'
  ],

  vip: [
    '*' // Todos los módulos
  ]
};

// Mapeo de módulos
const MODULES = {
  center: { label: 'Centro Inteligente', tier: 'free' },
  plan: { label: 'Mi Plan', tier: 'free' },
  recipes: { label: 'Recetas', tier: 'premium' },
  supplements: { label: 'Suplementos', tier: 'premium' },
  resources: { label: 'Recursos', tier: 'free' },
  ai: { label: 'IA', tier: 'vip' },
  products: { label: 'Infoproductos', tier: 'vip' }
};

/**
 * Obtener plan actual del usuario
 * @returns {string|null} - 'free', 'premium', 'vip' o null
 */
export function getCurrentPlan() {
  return localStorage.getItem(PLAN_STORAGE_KEY) || 'free';
}

/**
 * Guardar plan en localStorage
 * @param {string} plan - Plan a guardar
 */
export function savePlan(plan) {
  if (!plan || !MODULE_ACCESS[plan]) {
    plan = 'free';
  }
  localStorage.setItem(PLAN_STORAGE_KEY, plan);
  console.log(`Plan guardado: ${plan}`);
}

/**
 * Cargar plan del usuario (desde Supabase o datos locales)
 * @param {string} userId - ID del usuario autenticado
 * @param {string} fallbackPlan - Plan por defecto si no se obtiene de Supabase
 * @returns {Promise<string>} - Plan del usuario
 */
export async function loadUserPlan(userId, fallbackPlan = 'free') {
  try {
    // Intentar obtener del Supabase
    const supabasePlan = await getUserPlanFromSupabase(userId);
    
    if (supabasePlan && MODULE_ACCESS[supabasePlan]) {
      savePlan(supabasePlan);
      return supabasePlan;
    }

    // Fallback
    savePlan(fallbackPlan);
    return fallbackPlan;
  } catch (error) {
    console.error('Error cargando plan:', error);
    savePlan(fallbackPlan);
    return fallbackPlan;
  }
}

/**
 * Verificar si un módulo está disponible para el plan actual
 * @param {string} moduleName - Nombre del módulo (ej: 'recipes', 'supplements')
 * @param {string} plan - Plan a verificar (si no se proporciona, usa el actual)
 * @returns {boolean} - true si el módulo está disponible
 */
export function isModuleAvailable(moduleName, plan = null) {
  plan = plan || getCurrentPlan();

  if (!MODULE_ACCESS[plan]) {
    return false;
  }

  const allowedModules = MODULE_ACCESS[plan];
  
  // Si el plan tiene "*", todos los módulos están disponibles
  if (allowedModules.includes('*')) {
    return true;
  }

  return allowedModules.includes(moduleName);
}

/**
 * Obtener etiqueta para módulo bloqueado
 * @param {string} moduleName - Nombre del módulo
 * @returns {string} - Etiqueta ('PREMIUM' o 'VIP')
 */
export function getModuleLockLabel(moduleName) {
  if (!MODULES[moduleName]) return 'BLOQUEADO';

  const moduleTier = MODULES[moduleName].tier;
  return moduleTier === 'vip' ? 'VIP' : 'PREMIUM';
}

/**
 * FUNCIÓN PRINCIPAL: Actualizar UI según el plan
 * Recorre todos los módulos y aplica la lógica de bloqueo/desbloqueo
 * @param {string} plan - Plan del usuario
 */
export function updateUIByPlan(plan = null) {
  plan = plan || getCurrentPlan();
  savePlan(plan);

  console.log(`🎯 Actualizando UI para plan: ${plan}`);

  // Obtener todos los módulos en la página
  const moduleElements = document.querySelectorAll('[data-module]');

  moduleElements.forEach((element) => {
    const moduleName = element.getAttribute('data-module');
    const isAvailable = isModuleAvailable(moduleName, plan);

    if (isAvailable) {
      // Módulo disponible
      element.classList.remove('module-locked');
      element.classList.add('module-unlocked');
      element.style.opacity = '1';
      element.style.cursor = 'pointer';

      // Remover iconos de bloqueo
      const lockIcon = element.querySelector('.module-lock-icon');
      if (lockIcon) lockIcon.remove();

      // Actualizar badge
      const badge = element.querySelector('.module-badge');
      if (badge) badge.textContent = 'ACTIVO';

      // Habilitar botón
      const button = element.querySelector('.module-action');
      if (button) {
        button.disabled = false;
        button.dataset.locked = 'false';
        button.textContent = 'Entrar';
      }
    } else {
      // Módulo bloqueado
      element.classList.add('module-locked');
      element.classList.remove('module-unlocked');
      element.style.opacity = '0.45';
      element.style.cursor = 'not-allowed';

      // Agregar icono de bloqueo si no existe
      if (!element.querySelector('.module-lock-icon')) {
        const lockIcon = document.createElement('div');
        lockIcon.className = 'module-lock-icon';
        lockIcon.innerHTML = '🔒';
        const moduleHeader = element.querySelector('div:first-child');
        if (moduleHeader) {
          moduleHeader.appendChild(lockIcon);
        }
      }

      // Actualizar badge
      const badge = element.querySelector('.module-badge');
      if (badge) {
        badge.textContent = getModuleLockLabel(moduleName);
      }

      // Deshabilitar botón
      const button = element.querySelector('.module-action');
      if (button) {
        button.disabled = true;
        button.dataset.locked = 'true';
        button.textContent = 'Vista previa';
      }
    }
  });

  // Emitir evento personalizado para que otros componentes reaccionen
  window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan } }));
}

/**
 * Suscribirse a cambios de plan (en tiempo real desde Supabase)
 * @param {string} userId - ID del usuario
 * @param {Function} callback - Función a ejecutar cuando cambia el plan
 */
export function subscribeToPlanChanges(userId, callback = null) {
  const subscription = subscribeToUserPlan(userId, (newPlan) => {
    console.log(`📱 Plan actualizado en tiempo real: ${newPlan}`);
    savePlan(newPlan);
    updateUIByPlan(newPlan);
    
    if (callback) {
      callback(newPlan);
    }
  });

  return subscription;
}

/**
 * Limpiar plan (al hacer logout)
 */
export function clearPlan() {
  localStorage.removeItem(PLAN_STORAGE_KEY);
  console.log('Plan limpiado (logout)');
}
