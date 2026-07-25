/**
 * Shared Header Component
 * Header reutilizable para todas las páginas internas
 * Incluye: Logo, Idioma, Plan, Perfil, Cerrar sesión
 */

import { getCurrentLanguage, getLanguageCodes } from '../services/languageService.js';
import { getCurrentPlan } from '../services/planService.js';
import { getIcon } from './icons.js';

/**
 * Renderizar header compartido
 * @param {Object} user - Usuario actual
 * @param {Array} breadcrumbs - Array de items de breadcrumb [{label: 'Inicio', action: ()=>{}}, ...]
 */
export function renderSharedHeader(user, breadcrumbs = []) {
  const container = document.createElement('div');
  container.className = 'shared-header-wrapper';
  
  const language = getCurrentLanguage();
  const languageCodes = getLanguageCodes();
  const plan = getCurrentPlan();
  
  const planLabel = {
    free: `${getIcon('bag', 14)} FREE`,
    premium: `${getIcon('star', 14)} PREMIUM`,
    vip: `${getIcon('crown', 14)} VIP`
  }[plan] || `${getIcon('bag', 14)} FREE`;

  container.innerHTML = `
    <header class="shared-header">
      <div class="header-left">
        <button class="header-back-btn" id="headerBackBtn" type="button" aria-label="Volver">
          ← ${breadcrumbs.length === 0 ? 'Centro' : 'Volver'}
        </button>
      </div>

      <div class="header-center">
        <nav class="breadcrumb-nav" aria-label="Breadcrumb">
          <a href="#home" class="breadcrumb-item">Inicio</a>
          ${breadcrumbs.map((item, idx) => `
            <span class="breadcrumb-separator">/</span>
            <${item.isActive ? 'span' : 'button'} 
              class="breadcrumb-item ${item.isActive ? 'active' : ''}"
              ${!item.isActive ? `id="breadcrumb-${idx}"` : ''}
              ${!item.isActive && item.action ? `onclick="(${item.action.toString()})()"` : ''}
            >
              ${item.label}
            </${item.isActive ? 'span' : 'button'}>
          `).join('')}
        </nav>
      </div>

      <div class="header-right">
        <div class="header-plan-cta">
          <span class="plan-badge">${planLabel}</span>
          <button class="plan-upgrade-btn" id="planUpgradeBtn" type="button" title="Actualizar plan">
            ${getIcon('chart', 16)} Actualizar plan
          </button>
        </div>

        <div class="header-profile-menu">
          <button class="header-profile-btn" id="headerProfileBtn" type="button" aria-label="Perfil" title="${user?.name || 'Perfil'}">
            ${getIcon('user', 18)}
          </button>
          <button class="header-language-btn" id="headerLanguageBtn" type="button" aria-label="Idioma">
            ${languageCodes[language] || 'ES'}
          </button>
          <button class="header-logout-btn" id="headerLogoutBtn" type="button" aria-label="Cerrar sesión" title="Cerrar sesión">
            ${getIcon('door', 18)}
          </button>
        </div>
      </div>
    </header>
  `;

  return container;
}

/**
 * Renderizar footer con botón volver
 */
export function renderSharedFooter() {
  const container = document.createElement('div');
  container.className = 'shared-footer-wrapper';
  
  container.innerHTML = `
    <footer class="shared-footer">
      <button class="footer-back-btn" id="footerBackBtn" type="button">
        ← Centro
      </button>
      <p class="footer-copyright">© 2026 ISOCORE. Todos los derechos reservados.</p>
    </footer>
  `;

  return container;
}

/**
 * Configurar event listeners del header compartido
 * @param {Function} onBack - Callback cuando se presiona volver
 * @param {Function} onProfile - Callback cuando se presiona perfil
 * @param {Function} onLogout - Callback cuando se presiona cerrar sesión
 * @param {Function} onLanguage - Callback cuando se cambia idioma
 * @param {Function} onUpgradePlan - Callback cuando se presiona actualizar plan
 */
export function attachSharedHeaderListeners(config = {}) {
  const {
    onBack,
    onProfile,
    onLogout,
    onLanguage,
    onUpgradePlan,
    onBreadcrumbClick = {}
  } = config;

  // Botón volver del header
  const backBtn = document.getElementById('headerBackBtn');
  if (backBtn && onBack) {
    backBtn.addEventListener('click', onBack);
  }

  // Botón perfil
  const profileBtn = document.getElementById('headerProfileBtn');
  if (profileBtn && onProfile) {
    profileBtn.addEventListener('click', onProfile);
  }

  // Botón cerrar sesión
  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn && onLogout) {
    logoutBtn.addEventListener('click', onLogout);
  }

  // Botón idioma
  const languageBtn = document.getElementById('headerLanguageBtn');
  if (languageBtn && onLanguage) {
    languageBtn.addEventListener('click', onLanguage);
  }

  // Botón actualizar plan
  const upgradePlanBtn = document.getElementById('planUpgradeBtn');
  if (upgradePlanBtn && onUpgradePlan) {
    upgradePlanBtn.addEventListener('click', onUpgradePlan);
  }

  // Breadcrumb clicks
  Object.keys(onBreadcrumbClick).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', onBreadcrumbClick[id]);
    }
  });

  // Botón volver del footer
  const footerBackBtn = document.getElementById('footerBackBtn');
  if (footerBackBtn && onBack) {
    footerBackBtn.addEventListener('click', onBack);
  }
}

/**
 * Actualizar badge del plan en el header
 * @param {string} plan - Plan actual ('free', 'premium', 'vip')
 */
export function updatePlanBadge(plan) {
  const planLabel = {
    free: `${getIcon('bag', 14)} FREE`,
    premium: `${getIcon('star', 14)} PREMIUM`,
    vip: `${getIcon('crown', 14)} VIP`
  }[plan] || `${getIcon('bag', 14)} FREE`;

  const badge = document.querySelector('.plan-badge');
  if (badge) {
    badge.innerHTML = planLabel;
    badge.className = `plan-badge plan-${plan}`;
  }
}
