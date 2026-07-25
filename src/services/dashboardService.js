/**
 * DashboardService - Gestiona el dashboard personalizado del usuario
 * Carga datos de Supabase y actualiza automáticamente
 */

import {
  getUserFromSupabase,
  getRecentActivityFromSupabase,
  getFavoritesFromSupabase
} from './supabaseClient.js';
import { getIcon } from '../components/icons.js';

const DASHBOARD_CACHE_KEY = 'isocore_dashboard_cache';
const ACTIVITY_UPDATE_INTERVAL = 30000; // Actualizar cada 30 segundos

let activityUpdateTimer = null;

/**
 * Carga todos los datos del dashboard
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} - Datos del dashboard
 */
export async function loadDashboard(email) {
  if (!email) {
    console.warn('⚠️ loadDashboard: Email requerido');
    return null;
  }

  try {
    console.log('📊 DashboardService: Cargando dashboard para', email);

    // Obtener datos del usuario
    const user = await getUserFromSupabase(email);
    if (!user) {
      console.warn('⚠️ Usuario no encontrado en Supabase, creando dashboard vacío');
      return getOrCreateEmptyDashboard(email);
    }

    // Obtener actividad reciente
    const recentActivity = await getRecentActivityFromSupabase(email);
    
    // Obtener favoritos/recursos guardados
    const favorites = await getFavoritesFromSupabase(email);

    // Construir objeto de dashboard
    const dashboard = {
      user: {
        name: user.nombre || user.name || 'Usuario',
        email: user.email,
        plan: user.plan || 'gratis',
        lastLogin: user.last_login || new Date().toISOString(),
        avatarUrl: user.avatar_url || null
      },
      stats: {
        totalRecipes: favorites?.filter(f => f.type === 'recipe')?.length || 0,
        totalResources: favorites?.filter(f => f.type === 'resource')?.length || 0,
        totalSupplements: favorites?.filter(f => f.type === 'supplement')?.length || 0,
        streak: calculateStreak(recentActivity) || 0
      },
      recentActivity: recentActivity || [],
      favorites: favorites || [],
      objective: extractObjective(user) || 'Optimizar nutrición y salud',
      progress: calculateProgress(recentActivity) || 0,
      cards: buildCards(recentActivity, favorites)
    };

    // Cachear datos
    saveDashboardCache(dashboard);

    console.log('✅ Dashboard cargado:', dashboard);
    return dashboard;
  } catch (error) {
    console.error('❌ Error cargando dashboard:', error);
    return getOrCreateEmptyDashboard(email);
  }
}

/**
 * Reconstruye el dashboard sin recargar la página
 * @param {string} email - Email del usuario
 */
export async function refreshDashboard(email) {
  console.log('🔄 DashboardService: Refrescando dashboard');
  const dashboard = await loadDashboard(email);
  if (dashboard) {
    updateDashboardUI(dashboard);
  }
}

/**
 * Actualiza la actividad reciente del usuario
 * @param {string} email - Email del usuario
 * @param {Object} activity - Nuevos datos de actividad
 */
export async function updateRecentActivity(email, activity) {
  if (!email || !activity) return;

  try {
    console.log('📝 Registrando actividad:', activity.type);

    // Registrar en Supabase (implementar en supabaseClient)
    // TODO: Crear función saveActivityToSupabase()

    // Refrescar dashboard local
    const dashboard = await loadDashboard(email);
    if (dashboard) {
      updateDashboardUI(dashboard);
    }
  } catch (error) {
    console.error('Error actualizando actividad:', error);
  }
}

/**
 * Construye las tarjetas del dashboard
 * @param {Array} recentActivity - Actividad reciente
 * @param {Array} favorites - Favoritos/guardados
 * @returns {Array} - Array de tarjetas
 */
function buildCards(recentActivity = [], favorites = []) {
  const cards = [];

  // Tarjeta 1: Continuar donde lo dejó
  const lastSession = recentActivity?.[0];
  if (lastSession) {
    cards.push({
      type: 'continue',
      title: 'Continuar donde lo dejaste',
      subtitle: lastSession.resource_name || 'Última sesión',
      iconName: 'pin',
      cta: 'Continuar',
      data: lastSession
    });
  }

  // Tarjeta 2: Última receta
  const lastRecipe = favorites?.find(f => f.type === 'recipe');
  if (lastRecipe) {
    cards.push({
      type: 'recipe',
      title: 'Última Receta',
      subtitle: lastRecipe.name || 'Nueva receta guardada',
      iconName: 'leaf',
      image: './src/assets/stock/card-receta.jpg',
      cta: 'Ver',
      data: lastRecipe
    });
  }

  // Tarjeta 3: Último recurso
  const lastResource = favorites?.find(f => f.type === 'resource');
  if (lastResource) {
    cards.push({
      type: 'resource',
      title: 'Último Recurso',
      subtitle: lastResource.name || 'Nuevo artículo',
      iconName: 'book',
      image: './src/assets/stock/card-recurso.jpg',
      cta: 'Leer',
      data: lastResource
    });
  }

  // Tarjeta 4: Último suplemento
  const lastSupplement = favorites?.find(f => f.type === 'supplement');
  if (lastSupplement) {
    cards.push({
      type: 'supplement',
      title: 'Último Suplemento',
      subtitle: lastSupplement.name || 'Suplemento guardado',
      iconName: 'droplet',
      image: './src/assets/stock/card-suplemento.jpg',
      cta: 'Analizar',
      data: lastSupplement
    });
  }

  // Tarjeta 5: Próxima recomendación
  cards.push({
    type: 'recommendation',
    title: 'Próxima Recomendación',
    subtitle: 'Basada en tu actividad',
    iconName: 'spark',
    cta: 'Explorar',
    data: null
  });

  return cards;
}

/**
 * Calcula el progreso del usuario (0-100)
 * @param {Array} recentActivity - Actividad reciente
 * @returns {number} - Porcentaje de progreso
 */
function calculateProgress(recentActivity = []) {
  if (!recentActivity || recentActivity.length === 0) return 0;
  // Basado en número de acciones realizadas (máximo 100)
  const progress = Math.min((recentActivity.length * 10), 100);
  return Math.round(progress);
}

/**
 * Calcula el streak de accesos (días consecutivos)
 * @param {Array} recentActivity - Actividad reciente
 * @returns {number} - Días de streak
 */
function calculateStreak(recentActivity = []) {
  if (!recentActivity || recentActivity.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < recentActivity.length; i++) {
    const actDate = new Date(recentActivity[i].created_at);
    const daysDiff = Math.floor((today - actDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === i) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Extrae el objetivo del usuario de sus datos
 * @param {Object} user - Datos del usuario
 * @returns {string} - Objetivo principal
 */
function extractObjective(user) {
  if (user.objective) return user.objective;
  
  // Asignar objetivo según plan
  const objectives = {
    gratis: 'Optimizar nutrición y salud',
    premium: 'Nutrición personalizada avanzada',
    vip: 'Consultoría nutricional premium'
  };
  
  return objectives[user.plan] || 'Optimizar nutrición y salud';
}

/**
 * Cachea los datos del dashboard en localStorage
 * @param {Object} dashboard - Datos del dashboard
 */
function saveDashboardCache(dashboard) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
      ...dashboard,
      cachedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn('No se pudo cachear dashboard:', error);
  }
}

/**
 * Obtiene el cache del dashboard
 * @returns {Object|null} - Dashboard cacheado o null
 */
function getDashboardCache() {
  try {
    const cached = localStorage.getItem(DASHBOARD_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Error leyendo cache:', error);
    return null;
  }
}

/**
 * Crea un dashboard vacío con CTA
 * @param {string} email - Email del usuario
 * @returns {Object} - Dashboard vacío
 */
function getOrCreateEmptyDashboard(email) {
  return {
    user: {
      name: 'Usuario',
      email: email,
      plan: 'gratis',
      lastLogin: new Date().toISOString()
    },
    stats: {
      totalRecipes: 0,
      totalResources: 0,
      totalSupplements: 0,
      streak: 0
    },
    recentActivity: [],
    favorites: [],
    objective: 'Comienza explorando el Centro',
    progress: 0,
    cards: [{
      type: 'empty',
      title: 'Bienvenido',
      subtitle: 'Comienza explorando el Centro Inteligente',
      iconName: 'wave',
      cta: 'Empezar',
      data: null
    }],
    isEmpty: true
  };
}

/**
 * Actualiza la UI del dashboard
 * @param {Object} dashboard - Datos del dashboard
 */
export function updateDashboardUI(dashboard) {
  if (!dashboard) return;

  // Actualizar nombre
  const nameEl = document.getElementById('dashboardUserName');
  if (nameEl) nameEl.textContent = dashboard.user.name;

  // Actualizar plan
  const planEl = document.getElementById('dashboardPlan');
  if (planEl) {
    const planLabel = getPlanLabel(dashboard.user.plan);
    planEl.innerHTML = planLabel;
  }

  // Actualizar objetivo
  const objectiveEl = document.getElementById('dashboardObjective');
  if (objectiveEl) objectiveEl.textContent = dashboard.objective;

  // Actualizar progreso
  const progressEl = document.getElementById('dashboardProgress');
  if (progressEl) {
    progressEl.style.width = dashboard.progress + '%';
  }

  const progressTextEl = document.getElementById('dashboardProgressText');
  if (progressTextEl) progressTextEl.textContent = dashboard.progress + '%';

  // Actualizar tarjetas
  const cardsContainer = document.getElementById('dashboardCards');
  if (cardsContainer) {
    cardsContainer.innerHTML = dashboard.cards.map(createCardHTML).join('');
  }

  // Actualizar stats
  const statsEl = document.getElementById('dashboardStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-item">
        <span class="stat-number">${dashboard.stats.totalRecipes}</span>
        <span class="stat-label">Recetas</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${dashboard.stats.totalResources}</span>
        <span class="stat-label">Recursos</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${dashboard.stats.totalSupplements}</span>
        <span class="stat-label">Suplementos</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${dashboard.stats.streak}</span>
        <span class="stat-label">Racha</span>
      </div>
    `;
  }

  console.log('✅ UI del dashboard actualizada');
}

/**
 * Genera HTML para una tarjeta
 * @param {Object} card - Datos de la tarjeta
 * @returns {string} - HTML de la tarjeta
 */
function createCardHTML(card) {
  const media = card.image
    ? `<img src="${card.image}" alt="" class="card-image" loading="lazy" />`
    : `<div class="card-icon">${getIcon(card.iconName || 'circle', 22)}</div>`;

  return `
    <div class="dashboard-card dashboard-card-${card.type}">
      ${media}
      <div class="card-content">
        <h4 class="card-title">${card.title}</h4>
        <p class="card-subtitle">${card.subtitle}</p>
      </div>
      <button class="card-cta" data-card-type="${card.type}">${card.cta}</button>
    </div>
  `;
}

/**
 * Obtiene la etiqueta visual del plan
 * @param {string} plan - Plan del usuario
 * @returns {string} - Etiqueta para mostrar
 */
function getPlanLabel(plan) {
  const labels = {
    gratis: `${getIcon('target', 14)} FREE`,
    premium: `${getIcon('star', 14)} PREMIUM`,
    vip: `${getIcon('crown', 14)} VIP`
  };
  return labels[plan] || labels.gratis;
}

/**
 * Inicia auto-actualización del dashboard
 * @param {string} email - Email del usuario
 */
export function startDashboardAutoRefresh(email) {
  if (activityUpdateTimer) clearInterval(activityUpdateTimer);

  activityUpdateTimer = setInterval(async () => {
    try {
      await refreshDashboard(email);
    } catch (error) {
      console.error('Error en auto-refresh del dashboard:', error);
    }
  }, ACTIVITY_UPDATE_INTERVAL);

  console.log('🔄 Dashboard auto-refresh iniciado');
}

/**
 * Detiene auto-actualización del dashboard
 */
export function stopDashboardAutoRefresh() {
  if (activityUpdateTimer) {
    clearInterval(activityUpdateTimer);
    activityUpdateTimer = null;
    console.log('⏹️ Dashboard auto-refresh detenido');
  }
}

/**
 * Exporta el servicio
 */
export const DashboardService = {
  loadDashboard,
  refreshDashboard,
  updateRecentActivity,
  updateDashboardUI,
  startDashboardAutoRefresh,
  stopDashboardAutoRefresh,
  getDashboardCache
};
