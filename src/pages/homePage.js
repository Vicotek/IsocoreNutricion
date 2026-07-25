import { getIcon } from '../components/icons.js';
import { setAuthToken } from '../services/authService.js';
import { updateUIByPlan, savePlan, clearPlan, loadUserPlan, getCurrentPlan } from '../services/planService.js';
import {
  getUserPlanFromSupabase,
  getFeaturedArticlesFromSupabase,
  getRecipesFromSupabase,
  getProtocolsFromSupabase,
  getEducationalModulesFromSupabase
} from '../services/supabaseClient.js';
import * as SecurityService from '../services/securityService.js';
import * as StripeService from '../services/stripeService.js';
import { MenuService } from '../services/menuService.js';
import { DashboardService } from '../services/dashboardService.js';
import * as FavoritesService from '../services/favoritesService.js';
import * as SearchService from '../services/searchService.js';
import * as ArticlesService from '../services/articlesService.js';
import * as ProfileService from '../services/profileService.js';
import * as AIService from '../services/aiService.js';
import * as AdminService from '../services/adminService.js';
import * as RecipesService from '../services/recipesService.js';
import * as EducationalModulesService from '../services/educationalModulesService.js';
import * as NutritionalPlansService from '../services/nutritionalPlansService.js';
import * as ProtocolsService from '../services/protocolsService.js';
import * as ConditionsService from '../services/conditionsService.js';
import * as ReferencesService from '../services/referencesService.js';
import * as ArticlesPage from './articlesPage.js';
import * as ProfilePage from './profilePage.js';
import * as AIPage from './aiPage.js';
import * as AdminPage from './adminPage.js';
import * as DiabetesPage from './diabetesPage.js';

const STORAGE_KEY = 'isocore_home_user';
const BACKEND_BASE_URL = 'https://n8n.srv1569124.hstgr.cloud/webhook';
const LEGACY_USER_KEY = 'icf_user';
const LEGACY_TOKEN_KEY = 'icf_token';

// ── Endpoints ──────────────────────────────────────────
const API = {
  login:            `${BACKEND_BASE_URL}/login`,
  register:         `${BACKEND_BASE_URL}/registro`,
  recover:          `${BACKEND_BASE_URL}/recuperar`,
  resetPassword:    `${BACKEND_BASE_URL}/reset-password`,
  recipes:          `${BACKEND_BASE_URL}/recetas`,
  planNutricional:  `${BACKEND_BASE_URL}/plan-nutricional`,
  viPago:           `${BACKEND_BASE_URL}/pago-vip`,
  stripeConfirm:    `${BACKEND_BASE_URL}/stripe-confirm`
};
// ───────────────────────────────────────────────────────

// Enlaces del menú del header — config, no hardcodeados en el markup.
// "guest" = visible sin sesión, "auth" = visible con sesión.
const MENU_LINKS = {
  guest: [
    { label: 'Artículos', action: 'articles' },
    { label: 'Planes', action: 'plans' }
  ],
  auth: [
    { label: 'Mi Perfil', action: 'profile' },
    { label: 'Centro IA', action: 'ai' },
    { label: 'Artículos', action: 'articles' }
  ]
};

// Baseline del plan Free para la comparativa (Premium/VIP vienen de StripeService.getAvailablePlans()).
const FREE_PLAN_CONFIG = {
  id: 'free',
  name: 'Free',
  price: 0,
  currency: 'eur',
  interval: 'siempre',
  description: 'Acceso a lo esencial para empezar.',
  features: ['Centro Inteligente', 'Mi Plan', 'Recursos']
};

// Slides del carrusel hero — config, nunca hardcodeado en el componente.
// Imágenes V1 provisionales; sustituir "image" más adelante sin tocar lógica.
const heroSlides = [
  { tag: 'Plato saludable', image: './src/assets/stock/hero-plato-saludable.jpg', title: 'Nutrición basada en evidencia', subtitle: 'Planes reales, resultados medibles.', cta: 'Empieza Gratis' },
  { tag: 'Suplemento', image: './src/assets/stock/hero-suplemento.jpg', title: 'Suplementación con criterio', subtitle: 'Solo lo que tu cuerpo necesita, con respaldo científico.', cta: 'Empieza Gratis' },
  { tag: 'Ebook / Infoproducto', image: './src/assets/stock/hero-ebook.jpg', title: 'Recursos para llevar', subtitle: 'Guías y materiales descargables, siempre a mano.', cta: 'Empieza Gratis' },
  { tag: 'Personal y profesional', image: './src/assets/stock/Experta.png', title: 'Tu experta nutricional', subtitle: 'Respuestas claras, cuando las necesitas.', cta: 'Empieza Gratis' },
  { tag: 'Plan nutricional', image: './src/assets/stock/hero-plan-nutricional.jpg', title: 'Un plan hecho para ti', subtitle: 'Ajustado a tus objetivos y tu día a día.', cta: 'Empieza Gratis' }
];

// Imágenes de apoyo para las tarjetas del feed central cuando el contenido
// de Supabase no trae imagen propia — config, no embebidas en el markup.
// "receta" tiene variantes: si la receta activa es de tipo bebida/batido,
// se usa la imagen específica en su lugar.
const FEED_FALLBACK_IMAGES = {
  article: './src/assets/stock/card-articulo.jpg',
  recipe: './src/assets/stock/card-receta.jpg',
  recipeJuice: './src/assets/stock/card-receta-zumo.jpg',
  recipeSmoothie: './src/assets/stock/card-receta-smoothie.jpg',
  protocol: './src/assets/stock/card-protocolo.jpg',
  resource: './src/assets/stock/card-recurso.jpg',
  supplement: './src/assets/stock/card-suplemento.jpg'
};

function resolveFeedImage(item, type) {
  if (item?.image) return item.image;
  if (type === 'recipe') {
    const haystack = `${item?.category || ''} ${item?.meal_type || ''} ${(item?.tags || []).join(' ')}`.toLowerCase();
    if (haystack.includes('zumo') || haystack.includes('juice')) return FEED_FALLBACK_IMAGES.recipeJuice;
    if (haystack.includes('batido') || haystack.includes('smoothie')) return FEED_FALLBACK_IMAGES.recipeSmoothie;
  }
  return FEED_FALLBACK_IMAGES[type] || null;
}

const LANGUAGE_KEY = 'isocore_home_language';
const supportedLanguages = ['es', 'en', 'ca'];
const languageCodes = {
  es: 'ES',
  en: 'EN',
  ca: 'CA'
};
const languageNames = {
  es: 'Español',
  en: 'English',
  ca: 'Català'
};

const translations = {
  es: {
    brandTag: 'ISOCORE',
    brandSubtitle: 'NUTRICIÓN',
    headerLogoText: 'ISOCORE',
    headerLogoUrl: './src/assets/isocore-logo.png',
    headerLogoAlt: 'IsoCore logo',
    headerCompanyModuleA: 'Nutrición',
    headerCompanyModuleB: 'Suplementos',
    productLabel: 'NUTRICIÓN',
    languageLabel: 'ES',
    headerEyebrow: 'Editor de decisiones',
    title: 'Tu espacio de nutrición con evidencia, protocolos y seguimiento.',
    copy: 'Accede a fichas de suplementos, planes personalizados y materiales de referencia para aplicar en cada caso.',
    features: [
      {
        icon: 'brain',
        title: 'Centro Inteligente',
        description: 'Consulta protocolos clínicos y respuestas directas sin ruido ni entradas largas.'
      },
      {
        icon: 'clipboard-check',
        title: 'Mi Plan',
        description: 'Visualiza objetivos nutricionales y ajustes semanales con foco en resultados reales.'
      },
      {
        icon: 'lock',
        title: 'Módulos bloqueados',
        description: 'Desbloquea funciones con progreso claro y muestra qué parte del producto está disponible.'
      }
    ],
    summaryLabel: 'Versión actual',
    summaryTitle: 'Home de producto operativo.',
    summaryText: 'Interfaz construida para uso real: ingreso persistente, navegación clara y coherencia visual del sistema IsoCore.',
    footerEmailTitle: 'Correo electrónico',
    footerEmailValue: 'isocorefood@gmail.com',
    footerPhoneTitle: 'Teléfono',
    footerPhoneValue: '+34 603 000 845',
    footerAboutTitle: 'Sobre IsoCore',
    footerAboutText: 'Soluciones de nutrición práctica con enfoque clínico y premium.',
    footerPolicyTitle: 'Políticas',
    footerPolicyLink: 'Ver documento',
    footerPolicyUrl: '#',
    footerBottomText: '© 2026 ISOCORE. Todos los derechos reservados.',
    quickLoginButton: 'Iniciar sesión',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: '••••••••',
    loginAuthFailed: 'Email o contraseña incorrectos.',
    loginConnectionError: 'Error de conexión. Inténtalo de nuevo.',
    registerSuccess: 'Cuenta creada. Inicia sesión para continuar.',
    passwordMismatch: 'Las contraseñas no coinciden.',
    passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
    recoverSuccess: 'Revisa tu email para restablecer tu contraseña.',
    linkForgot: '¿Olvidaste tu contraseña?',
    linkBackLogin: '← Volver al login',
    recoverDesc: 'Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.',
    summaryPointA: 'Igualdad',
    summaryPointB: 'Identidad',
    summaryPointC: 'Consistencia',
    loginHeading: 'Inicia sesión en ISOCORE.',
    loginIntro: 'Ingresa para acceder a tus protocolos, casos y recomendaciones nutricionales.',
    nameLabel: 'Nombre',
    emailLabel: 'Correo',
    emailPlaceholder: 'usuario@ejemplo.com',
    loginButton: 'Entrar',
    sessionActive: 'Sesión activa',
    welcomeGreeting: 'Bienvenido de nuevo,',
    modulesTitle: 'Módulos',
    modulesCopy: 'Los módulos se presentan aquí como parte del producto. La navegación es clara y el acceso se desbloquea de forma controlada.',
    centerTitle: 'Centro Inteligente',
    centerDesc: 'Consulta protocolos clínicos y respuestas directas sin ruido ni entradas largas.',
    planTitle: 'Mi Plan',
    planDesc: 'Visualiza objetivos nutricionales y ajustes semanales con foco en resultados reales.',
    recipesTitle: 'Recetas',
    recipesDesc: 'Descubre recetas nutricionales personalizadas según tus necesidades.',
    resourceTitle: 'Recursos',
    resourceDesc: 'Explora artículos, guías y protocolos cuidadosamente seleccionados.',
    supplementTitle: 'Suplementos',
    supplementDesc: 'Analiza suplementos con evidencia, contexto y recomendaciones clínicas.',
    aiTitle: 'IA',
    aiDesc: 'Asistente inteligente para consultas nutricionales avanzadas.',
    productsTitle: 'Infoproductos',
    productsDesc: 'Accede a recursos premium y herramientas exclusivas.',
    lockedBadge: 'BLOQUEADO',
    previewButton: 'Vista previa',
    logoutButton: 'Cerrar sesión',
    lockNotice: 'Selecciona un módulo para ver más.',
    lockedAction: 'Este módulo está bloqueado. Completa la experiencia inicial para desbloquearlo.',
    loginSuccess: 'Has iniciado sesión. Tu acceso permanece activo en esta pantalla.',
    logoutNotice: 'Has cerrado sesión. Puedes iniciar sesión de nuevo en cualquier momento.',
    loginValidation: 'Completa el nombre y el correo para iniciar sesión.',
    recoverValidation: 'Por favor, ingresa tu correo electrónico.',
    languageDropdownLabel: 'Elige idioma'
  },
  en: {
    brandTag: 'ISOCORE',
    brandSubtitle: 'NUTRITION',
    headerLogoText: 'ISOCORE',
    headerLogoUrl: './src/assets/isocore-logo.png',
    headerLogoAlt: 'IsoCore logo',
    headerCompanyModuleA: 'Nutrition',
    headerCompanyModuleB: 'Supplements',
    productLabel: 'NUTRITION',
    languageLabel: 'EN',
    headerEyebrow: 'Decision editor',
    title: 'Your nutrition workspace with evidence, protocols and follow-up.',
    copy: 'Access supplement profiles, personalized plans and reference material for practical use.',
    features: [
      {
        icon: 'brain',
        title: 'Smart Center',
        description: 'Consult clinical protocols and direct answers without noise or long introductions.'
      },
      {
        icon: 'clipboard-check',
        title: 'My Plan',
        description: 'View nutritional objectives and weekly adjustments focused on real results.'
      },
      {
        icon: 'lock',
        title: 'Locked modules',
        description: 'Unlock features with clear progress and understand which product areas are available.'
      }
    ],
    summaryLabel: 'Current version',
    summaryTitle: 'Operational product home.',
    summaryText: 'Interface built for real use: persistent login, clear navigation and IsoCore visual coherence.',
    footerEmailTitle: 'Email',
    footerEmailValue: 'contact@isocore.com',
    footerPhoneTitle: 'Phone',
    footerPhoneValue: '+34 600 000 000',
    footerAboutTitle: 'About IsoCore',
    footerAboutText: 'Practical nutrition solutions with clinical and premium focus.',
    footerPolicyTitle: 'Policies',
    footerPolicyLink: 'View document',
    footerPolicyUrl: '#',
    footerBottomText: '© 2026 ISOCORE. All rights reserved.',
    quickLoginButton: 'Enter',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    loginAuthFailed: 'Email or password is incorrect.',
    loginConnectionError: 'Connection error. Please try again.',
    registerSuccess: 'Account created. Login to continue.',
    passwordMismatch: 'Passwords do not match.',
    passwordTooShort: 'Password must be at least 8 characters.',
    recoverSuccess: 'Check your email to reset your password.',
    linkForgot: 'Forgot your password?',
    linkBackLogin: '← Back to login',
    recoverDesc: 'Enter your email and we will send you a password reset link.',
    summaryPointA: 'Equality',
    summaryPointB: 'Identity',
    summaryPointC: 'Consistency',
    loginHeading: 'Sign in to ISOCORE.',
    loginIntro: 'Log in to access your protocols, cases and nutritional recommendations.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    emailPlaceholder: 'user@example.com',
    loginButton: 'Enter',
    sessionActive: 'Active session',
    welcomeGreeting: 'Welcome back,',
    modulesTitle: 'Modules',
    modulesCopy: 'Modules are presented here as part of the product. Navigation is clear and access unlocks in a controlled way.',
    centerTitle: 'Smart Center',
    centerDesc: 'Consult clinical protocols and direct answers without noise or long entries.',
    planTitle: 'My Plan',
    planDesc: 'View nutritional objectives and weekly adjustments with a focus on real results.',
    recipesTitle: 'Recipes',
    recipesDesc: 'Discover personalized nutritional recipes tailored to your needs.',
    resourceTitle: 'Resources',
    resourceDesc: 'Explore selected articles, guides and protocols.',
    supplementTitle: 'Supplements',
    supplementDesc: 'Analyze supplements with evidence, context and clinical recommendations.',
    aiTitle: 'AI',
    aiDesc: 'Intelligent assistant for advanced nutritional queries.',
    productsTitle: 'Infoproducts',
    productsDesc: 'Access premium resources and exclusive tools.',
    lockedBadge: 'LOCKED',
    previewButton: 'Preview',
    logoutButton: 'Sign out',
    lockNotice: 'Select a module to see more.',
    lockedAction: 'This module is locked. Complete the initial experience to unlock it.',
    loginSuccess: 'You are signed in. Your access remains active on this screen.',
    logoutNotice: 'You have signed out. You can log in again at any time.',
    loginValidation: 'Complete name and email to sign in.',    recoverValidation: 'Please enter your email address.',    languageDropdownLabel: 'Choose language'
  },
  ca: {
    brandTag: 'ISOCORE',
    brandSubtitle: 'NUTRICIÓ',
    headerLogoText: 'ISOCORE',
    headerLogoUrl: './src/assets/isocore-logo.png',
    headerLogoAlt: 'IsoCore logo',
    headerCompanyModuleA: 'Nutrició',
    headerCompanyModuleB: 'Suplements',
    productLabel: 'NUTRICIÓ',
    languageLabel: 'CA',
    headerEyebrow: 'Editor de decisions',
    title: 'El teu espai de nutrició amb evidència, protocols i seguiment.',
    copy: 'Accedeix a fitxes de suplements, plans personalitzats i materials de referència per aplicar en cada cas.',
    features: [
      {
        icon: 'brain',
        title: 'Centre intel·ligent',
        description: 'Consulta protocols clínics i respostes directes sense soroll ni introduccions llargues.'
      },
      {
        icon: 'clipboard-check',
        title: 'El meu Pla',
        description: 'Visualitza objectius nutricionals i ajustos setmanals amb focus en resultats reals.'
      },
      {
        icon: 'lock',
        title: 'Mòduls bloquejats',
        description: 'Desbloca funcions amb progrés clar i mostra quina part del producte està disponible.'
      }
    ],
    summaryLabel: 'Versió actual',
    summaryTitle: 'Home de producte operatiu.',
    summaryText: 'Interfície construïda per a ús real: accés permanent, navegació clara i coherència visual del sistema IsoCore.',
    footerEmailTitle: 'Correu electrònic',
    footerEmailValue: 'contacte@isocore.com',
    footerPhoneTitle: 'Telèfon',
    footerPhoneValue: '+34 600 000 000',
    footerAboutTitle: 'Sobre IsoCore',
    footerAboutText: 'Solucions de nutrició pràctica amb enfoc clínic i premium.',
    footerPolicyTitle: 'Polítiques',
    footerPolicyLink: 'Veure document',
    footerPolicyUrl: '#',
    footerBottomText: '© 2026 ISOCORE. Tots els drets reservats.',
    quickLoginButton: 'Entrar',
    passwordLabel: 'Contrasenya',
    passwordPlaceholder: '••••••••',
    loginAuthFailed: 'Email o contrasenya incorrectes.',
    loginConnectionError: 'Error de connexió. Intenta-ho de nou.',
    registerSuccess: 'Compte creada. Inicia sessió per continuar.',
    passwordMismatch: 'Les contrasenyes no coincideixen.',
    passwordTooShort: 'La contrasenya ha de tenir almenys 8 caràcters.',
    recoverSuccess: 'Revisa el teu email per restablir la contrasenya.',
    linkForgot: 'Has oblidat la contrasenya?',
    linkBackLogin: '← Tornar al login',
    recoverDesc: 'Introdueix el teu email i t’enviarem un enllaç per restablir la contrasenya.',
    summaryPointA: 'Igualtat',
    summaryPointB: 'Identitat',
    summaryPointC: 'Consistència',
    loginHeading: 'Inicia sessió a ISOCORE.',
    loginIntro: 'Accedeix per entrar als teus protocols, casos i recomanacions nutricionals.',
    nameLabel: 'Nom',
    emailLabel: 'Correu',
    emailPlaceholder: 'usuari@exemple.com',
    loginButton: 'Entrar',
    sessionActive: 'Sessió activa',
    welcomeGreeting: 'Benvingut de nou,',
    modulesTitle: 'Mòduls',
    modulesCopy: 'Els mòduls es presenten aquí com a part del producte. La navegació és clara i l’accés es desbloqueja de forma controlada.',
    centerTitle: 'Centre Intel·ligent',
    centerDesc: 'Consulta protocols clínics i respostes directes sense soroll ni entrades llargues.',
    planTitle: 'El Meu Pla',
    planDesc: 'Visualitza objectius nutricionals i ajustos setmanals amb enfocament en resultats reals.',
    recipesTitle: 'Receptes',
    recipesDesc: 'Descobreix receptes nutricionals personalitzades segons les teves necessitats.',
    resourceTitle: 'Recursos',
    resourceDesc: 'Explora articles, guies i protocols seleccionats.',
    supplementTitle: 'Suplements',
    supplementDesc: 'Analitza suplements amb evidència, context i recomanacions clíniques.',
    aiTitle: 'IA',
    aiDesc: 'Assistent intel·ligent per a consultes nutricionals avançades.',
    productsTitle: 'Infoproductes',
    productsDesc: 'Accedeix a recursos premium i eines exclusives.',
    lockedBadge: 'BLOQUEJAT',
    previewButton: 'Previsualitza',
    logoutButton: 'Tanca sessió',
    lockNotice: 'Selecciona un mòdul per veure més.',
    lockedAction: 'Aquest mòdul està bloquejat. Completa l’experiència inicial per desbloquejar-lo.',
    loginSuccess: 'Has iniciat sessió. El teu accés roman actiu en aquesta pantalla.',
    logoutNotice: 'Has tancat sessió. Pots iniciar sessió de nou en qualsevol moment.',
    loginValidation: 'Completa el nom i el correu per iniciar sessió.',    recoverValidation: 'Si us plau, introdueix el teu correu electrònic.',    languageDropdownLabel: 'Tria idioma'
  }
};

function getCurrentLanguage() {
  const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
  return supportedLanguages.includes(storedLanguage) ? storedLanguage : 'es';
}

function setCurrentLanguage(language) {
  const selectedLanguage = supportedLanguages.includes(language) ? language : 'es';
  window.localStorage.setItem(LANGUAGE_KEY, selectedLanguage);
}

function getTranslation() {
  return translations[getCurrentLanguage()] || translations.es;
}

function getNextLanguage(current) {
  const currentIndex = supportedLanguages.indexOf(current);
  return supportedLanguages[(currentIndex + 1) % supportedLanguages.length];
}

function updateLanguageToggle(language) {
  const toggle = document.getElementById('languageToggle');
  if (!toggle) return;
  toggle.textContent = languageCodes[language] || language.toUpperCase();
  toggle.setAttribute(
    'aria-label',
    `Change language to ${languageNames[getNextLanguage(language)] || 'next'}`
  );
}


function renderModuleCards(t) {
  const moduleGrid = document.querySelector('.module-grid');
  if (!moduleGrid) return;
  moduleGrid.innerHTML = `
      ${createModuleCard(t.centerTitle, t.centerDesc, 'center', false, t)}
      ${createModuleCard(t.planTitle, t.planDesc, 'plan', false, t)}
      ${createModuleCard(t.recipesTitle, t.recipesDesc, 'recipes', true, t)}
      ${createModuleCard(t.supplementTitle, t.supplementDesc, 'supplements', true, t)}
      ${createModuleCard(t.resourceTitle, t.resourceDesc, 'resources', false, t)}
      ${createModuleCard(t.aiTitle, t.aiDesc, 'ai', true, t)}
      ${createModuleCard(t.productsTitle, t.productsDesc, 'products', true, t)}
    `;
  
  // Aplicar estilos de plan
  updateUIByPlan();
}

function updateTexts(t) {
  document.documentElement.lang = getCurrentLanguage();

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (!key || t[key] === undefined) return;
    element.textContent = t[key];
  });

  document.querySelectorAll('[data-placeholder-i18n]').forEach((element) => {
    const key = element.dataset.placeholderI18n;
    if (!key || t[key] === undefined) return;
    element.placeholder = t[key];
  });

  renderModuleCards(t);

  const persistedUser = getStoredUser();
  renderLoginState(persistedUser, t);
}

/**
 * Header compacto compartido por Landing y Dashboard.
 * Único contenido: Logo, Menú, Buscar (reutilizado), Idioma, Entrar/Usuario.
 */
function renderHeaderHTML(t, language, user) {
  const menuItems = user ? MENU_LINKS.auth : MENU_LINKS.guest;
  const authSlot = user
    ? `<button type="button" class="header-user-btn" id="homeLogoutButton" title="Cerrar sesión">${getIcon('logout', 16)} ${escapeHtml((user.name || '').split(' ')[0] || 'Cuenta')}</button>`
    : `<button type="button" class="header-login-btn" id="headerLoginBtn">${t.loginButton || 'Entrar'}</button>`;

  return `
    <div class="home-header-wrap">
    <header class="home-header">
      <button type="button" class="header-block header-logo" id="headerLogoBtn" title="Ir al inicio" aria-label="Ir al inicio">
        ${t.headerLogoUrl ? `<img src="${t.headerLogoUrl}" alt="${t.headerLogoAlt}" class="header-logo-image" />` : `<span class="header-logo-text" data-i18n="headerLogoText">${t.headerLogoText}</span>`}
      </button>

      <div class="header-block header-menu">
        <button type="button" class="menu-toggle" id="menuToggle" aria-haspopup="true" aria-expanded="false">Menú ▾</button>
        <div class="menu-dropdown" id="menuDropdown">
          ${menuItems.map(item => `<button type="button" class="menu-link" data-menu-action="${item.action}">${escapeHtml(item.label)}</button>`).join('')}
        </div>
      </div>

      <div class="header-block header-search">
        <div class="search-container">
          <div class="search-input-wrapper">
            <span class="search-icon">${getIcon('search', 16)}</span>
            <input
              id="searchInput"
              type="text"
              placeholder="Buscar artículos, recetas, suplementos, recursos..."
              autocomplete="off"
            />
            <button class="search-clear-btn" id="searchClearBtn" type="button" title="Limpiar búsqueda">${getIcon('close', 14)}</button>
          </div>
          <div class="search-results-dropdown" id="searchResultsDropdown"></div>
        </div>
      </div>

      <div class="header-block header-actions">
        <button id="languageToggle" class="language-toggle" type="button" aria-live="polite">${languageCodes[language]}</button>
        ${authSlot}
      </div>
    </header>
    </div>
  `;
}

/**
 * Carrusel hero de la columna izquierda (Landing) — config-driven vía heroSlides.
 * Fade automático cada 7s. Respeta prefers-reduced-motion.
 */
function renderHeroCarouselHTML() {
  return `
    <div class="hero-carousel" id="heroCarousel">
      ${heroSlides.map((slide, i) => `
        <div class="hero-slide ${i === 0 ? 'on' : ''}">
          ${slide.image ? `<img src="${escapeHtml(slide.image)}" alt="" class="hero-slide-image" />` : ''}
          <div class="hero-slide-overlay">
            <span class="hero-slide-tag">${escapeHtml(slide.tag)}</span>
            <h2 class="hero-slide-title">${escapeHtml(slide.title)}</h2>
            <p class="hero-slide-subtitle">${escapeHtml(slide.subtitle)}</p>
            <button type="button" class="hero-slide-cta" data-hero-cta="${i}">${escapeHtml(slide.cta)}</button>
          </div>
        </div>
      `).join('')}
      <div class="hero-dots">
        ${heroSlides.map((_, i) => `<span class="${i === 0 ? 'on' : ''}" data-dot="${i}" role="button" tabindex="0" aria-label="Ir a la diapositiva ${i + 1}"></span>`).join('')}
      </div>
    </div>
  `;
}

function initHeroCarousel() {
  const root = document.getElementById('heroCarousel');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.hero-slide'));
  const dots = Array.from(root.querySelectorAll('.hero-dots span'));
  if (slides.length <= 1) return;

  root.querySelectorAll('[data-hero-cta]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const authTab = document.querySelector('.auth-tab[data-tab="registro"]');
      authTab?.click();
      document.getElementById('homeRegisterName')?.focus();
    });
  });

  let index = 0;

  function goToSlide(i) {
    index = i;
    slides.forEach((slide, s) => slide.classList.toggle('on', s === index));
    dots.forEach((dot, d) => dot.classList.toggle('on', d === index));
  }

  function startAutoRotate() {
    window.clearInterval(initHeroCarousel.timerId);
    initHeroCarousel.timerId = window.setInterval(() => {
      goToSlide((index + 1) % slides.length);
    }, 7000);
  }

  dots.forEach((dot, i) => {
    const jumpToDot = () => {
      goToSlide(i);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) startAutoRotate();
    };
    dot.addEventListener('click', jumpToDot);
    dot.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        jumpToDot();
      }
    });
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  startAutoRotate();
}

const ICON_ALIASES = {
  brain: 'brain', centro: 'brain', center: 'brain',
  'clipboard-check': 'clipboard', plan: 'clipboard',
  lock: 'lock', módulos: 'lock', locked: 'lock', bloqueado: 'lock',
  article: 'book', recipe: 'leaf', protocol: 'flask', resource: 'clipboard',
  recipes: 'leaf', supplements: 'droplet', resources: 'book', ai: 'robot', products: 'bag'
};

function getIconSVG(iconName, size = 24) {
  const key = (iconName || '').toLowerCase();
  const name = ICON_ALIASES[key] || Object.keys(ICON_ALIASES).find((k) => key.includes(k)) && ICON_ALIASES[Object.keys(ICON_ALIASES).find((k) => key.includes(k))];
  return getIcon(name || 'circle', size);
}

function createModuleCard(title, description, moduleName = '', locked = true, t) {
  const isFav = FavoritesService.isFavorite('module', moduleName);
  
  return `
    <article class="module-card ${locked ? 'module-locked' : ''}" data-module="${moduleName}">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <h4>${title}</h4>
          <p>${description}</p>
        </div>
        <button class="favorite-btn ${isFav ? 'active' : ''}" data-favorite-id="${moduleName}"
                onclick="window.homePage_toggleFavModule(event, '${moduleName}', '${title}')"
                title="Agregar a favoritos" type="button">
          ${getIcon('heart', 16)}
        </button>
      </div>
      <div class="module-footer">
        <span class="module-badge">${locked ? t.lockedBadge : 'ACTIVO'}</span>
        <button type="button" class="secondary-button module-action" data-locked="${locked}">${locked ? t.previewButton : 'Entrar'}</button>
      </div>
    </article>
  `;
}

// Función global para toggle de favorito en módulos
window.homePage_toggleFavModule = async (event, moduleId, moduleName) => {
  event.stopPropagation();
  await toggleFavorite('module', moduleId, moduleName);
};

// ═════════════════════════════════════════════════════════════════════════
// 📰 FEED DINÁMICO — Columna central (contenido real desde Supabase)
// Estructura modular: añadir un nuevo tipo de contenido = añadir una entrada
// en FEED_SECTIONS + una función fetchFeatured<Tipo>(), sin tocar el resto.
// ═════════════════════════════════════════════════════════════════════════

/**
 * Tarjeta destacada del Programa de Nutrición para Diabéticos — el
 * producto insignia. A diferencia de FEED_SECTIONS, no depende de
 * is_featured en Supabase: es una promoción estática, siempre visible,
 * siempre primera. Mismo componente de tarjeta que el resto del feed,
 * con tratamiento resaltado (badge en --accent en vez del gris habitual).
 */
function createDiabetesCardHTML() {
  return `
    <article class="feed-card feed-card-highlight" data-feed-section="diabetes">
      <div class="feed-card-media">
        <div class="feed-card-image feed-card-image-placeholder">${getIcon('droplet', 26)}</div>
      </div>
      <div class="feed-card-body">
        <span class="feed-card-badge feed-card-badge-highlight">Nutrición para diabéticos</span>
        <h3 class="feed-card-title">Un plan hecho para tu diabetes</h3>
        <p class="feed-card-summary">Plan nutricional personalizado, generado con evidencia y revisado por una experta antes de llegar a ti.</p>
        <button type="button" class="feed-card-cta feed-card-cta-highlight" data-feed-view="diabetes">Ver más</button>
      </div>
    </article>
  `;
}

const FEED_SECTIONS = [
  { type: 'article', label: 'Artículo destacado', fetch: fetchFeaturedArticle },
  { type: 'recipe', label: 'Receta destacada', fetch: fetchFeaturedRecipe },
  { type: 'protocol', label: 'Protocolo destacado', fetch: fetchFeaturedProtocol },
  { type: 'resource', label: 'Recurso destacado', fetch: fetchFeaturedResource }
];

const TIER_RANK = { free: 0, premium: 1, vip: 2 };

function canAccessTier(tier) {
  const plan = getCurrentPlan();
  const tierRank = TIER_RANK[tier] ?? 0;
  const planRank = TIER_RANK[plan] ?? 0;
  return tierRank <= planRank;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function truncateText(value, maxLength = 140) {
  const text = String(value ?? '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

async function fetchFeaturedArticle() {
  try {
    const articles = await getFeaturedArticlesFromSupabase(1);
    const article = articles && articles[0];
    return article ? { ...article, tier: 'free' } : null;
  } catch (error) {
    console.error('Feed: error obteniendo artículo destacado', error);
    return null;
  }
}

async function fetchFeaturedRecipe() {
  try {
    const recipes = await getRecipesFromSupabase(60);
    // Selección 100% editorial vía "destacada" en Supabase. Sin fallback:
    // si nadie la marcó, el bloque se omite (nunca "próximamente").
    return recipes.find((recipe) => recipe.featured) || null;
  } catch (error) {
    console.error('Feed: error obteniendo receta destacada', error);
    return null;
  }
}

async function fetchFeaturedProtocol() {
  try {
    // "protocolos" no tiene columna editorial de selección ni de nivel de
    // acceso: se usa el más reciente como proxy (acordado, sin tocar esquema)
    // y se trata como contenido premium por defecto.
    const protocols = await getProtocolsFromSupabase(5);
    const protocol = protocols && protocols[0];
    return protocol ? { ...protocol, tier: 'premium' } : null;
  } catch (error) {
    console.error('Feed: error obteniendo protocolo destacado', error);
    return null;
  }
}

async function fetchFeaturedResource() {
  try {
    // "orden" es el campo editorial ya existente en modulos_educativos:
    // el de menor orden (ya viene ordenado asc) hace de "destacado".
    const modules = await getEducationalModulesFromSupabase();
    const resource = modules && modules[0];
    return resource ? { ...resource, tier: 'free' } : null;
  } catch (error) {
    console.error('Feed: error obteniendo recurso destacado', error);
    return null;
  }
}

async function fetchRecentNews(limit = 5) {
  try {
    const [articles, recipes, modules] = await Promise.all([
      getFeaturedArticlesFromSupabase(5),
      getRecipesFromSupabase(30),
      getEducationalModulesFromSupabase()
    ]);

    const items = [
      ...articles.map((item) => ({ ...item, tier: 'free', feedType: 'article', feedLabel: 'Artículo' })),
      ...recipes.filter((recipe) => recipe.isNew).map((item) => ({ ...item, feedType: 'recipe', feedLabel: 'Receta' })),
      ...modules.map((item) => ({ ...item, tier: 'free', feedType: 'resource', feedLabel: 'Recurso' }))
    ];

    return items
      .filter((item) => item.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  } catch (error) {
    console.error('Feed: error obteniendo novedades', error);
    return [];
  }
}

function createFeedCard(item, type, typeLabel, state = 'loaded') {
  if (state === 'loading') {
    return `
      <article class="feed-card feed-card-loading" data-feed-section="${type}">
        <div class="feed-card-media feed-card-image-placeholder"></div>
        <div class="feed-card-body">
          <span class="feed-card-badge">${escapeHtml(typeLabel)}</span>
          <p class="feed-card-summary">Cargando…</p>
        </div>
      </article>
    `;
  }

  // Sin contenido editorial en esta categoría: no se dibuja placeholder ni
  // "próximamente" — el bloque se omite y el resto reordena hacia arriba.
  if (!item) return '';

  const locked = !canAccessTier(item.tier || 'free');
  const title = item.title || 'Sin título';
  const summary = truncateText(item.summary || item.description || '', 140);
  const resolvedImage = resolveFeedImage(item, type);
  const media = resolvedImage
    ? `<img src="${escapeHtml(resolvedImage)}" alt="${escapeHtml(title)}" class="feed-card-image" loading="lazy" />`
    : `<div class="feed-card-image feed-card-image-placeholder">${getIconSVG(type)}</div>`;

  const cta = locked
    ? `<button type="button" class="feed-card-cta feed-card-cta-locked" data-feed-unlock="${item.tier}">${getIcon('lock', 14)} ${item.tier === 'vip' ? 'Hazte VIP' : 'Desbloquear'}</button>`
    : `<button type="button" class="feed-card-cta" data-feed-view="${type}" data-feed-id="${item.id ?? ''}">Ver más</button>`;

  return `
    <article class="feed-card ${locked ? 'feed-card-locked' : ''}" data-feed-section="${type}" data-feed-id="${item.id ?? ''}">
      <div class="feed-card-media">
        ${media}
        ${locked ? `<span class="feed-card-lock-overlay">${getIcon('lock', 20)}</span>` : ''}
      </div>
      <div class="feed-card-body">
        <span class="feed-card-badge">${escapeHtml(typeLabel)}</span>
        <h3 class="feed-card-title">${escapeHtml(title)}</h3>
        <p class="feed-card-summary">${escapeHtml(summary)}</p>
        ${cta}
      </div>
    </article>
  `;
}

function createNewsItemHTML(item) {
  const date = item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
  const locked = !canAccessTier(item.tier || 'free');
  return `
    <div class="feed-news-item ${locked ? 'feed-news-item-locked' : ''}" data-feed-view="${item.feedType}" data-feed-id="${item.id ?? ''}">
      <span class="feed-news-badge">${escapeHtml(item.feedLabel)}</span>
      <span class="feed-news-title">${escapeHtml(item.title || 'Sin título')}</span>
      ${date ? `<span class="feed-news-date">${date}</span>` : ''}
      ${locked ? `<span class="feed-news-lock">${getIcon('lock', 14)}</span>` : ''}
    </div>
  `;
}

function updateFeedSection(type, label, item) {
  const el = document.querySelector(`[data-feed-section="${type}"]`);
  if (!el) return;
  if (!item) {
    el.remove();
    return;
  }
  el.outerHTML = createFeedCard(item, type, label);
}

function renderNewsList(items) {
  const list = document.getElementById('feedNewsList');
  if (!list) return;
  if (!items || items.length === 0) {
    list.innerHTML = '<p class="feed-empty">Sin novedades recientes.</p>';
    return;
  }
  list.innerHTML = items.map(createNewsItemHTML).join('');
}

/**
 * Carga y renderiza el feed dinámico de la columna central.
 * Modular: cada sección se resuelve y actualiza de forma independiente.
 */
async function renderCentralFeed() {
  const container = document.getElementById('homeContentFeed');
  if (!container) return;

  await Promise.all(
    FEED_SECTIONS.map(async (section) => {
      const item = await section.fetch();
      updateFeedSection(section.type, section.label, item);
    })
  );

  const news = await fetchRecentNews();
  renderNewsList(news);
}

function handleFeedClick(event) {
  const unlockBtn = event.target.closest('[data-feed-unlock]');
  if (unlockBtn) {
    showLockedNotice('Contenido premium. Actualiza tu plan para acceder.');
    return;
  }

  const viewTarget = event.target.closest('[data-feed-view]');
  if (viewTarget) {
    const type = viewTarget.dataset.feedView;
    if (type === 'article') {
      window.homePage_navigateToArticles();
    } else if (type === 'diabetes') {
      window.homePage_navigateToDiabetes();
    } else {
      showLockedNotice('Sección en desarrollo');
    }
  }
}

function getStoredUser() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return null;
  }
}

function storeUser(user) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
}

function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_USER_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function renderLoginState(user, t) {
  const loginState = document.querySelector('.home-login-state');
  const userEmail = document.getElementById('homeUserEmail');
  const userLabel = document.getElementById('homeUserLabel');
  const userWelcome = document.getElementById('homeUserWelcome');
  const loginForm = document.getElementById('homeLoginForm');
  const logoutButton = document.getElementById('homeLogoutButton');
  const profileButton = document.getElementById('homeProfileButton');
  const aiButton = document.getElementById('homeAIButton');
  const adminButton = document.getElementById('homeAdminButton');
  const loginPanelIntro = document.getElementById('homeLoginPanelIntro');

  if (!loginState) return;

  if (user && user.name) {
    loginState.classList.add('home-user-logged');
    if (userLabel) userLabel.textContent = user.name;
    if (userWelcome) userWelcome.textContent = `${t.welcomeGreeting} ${user.name.split(' ')[0]}`;
    if (userEmail) userEmail.value = user.email;
    loginForm.classList.add('hidden');
    logoutButton.classList.remove('hidden');
    profileButton.classList.remove('hidden');
    aiButton.classList.remove('hidden');
    
    // ✅ VALIDAR ROLE ANTES DE MOSTRAR ADMIN BUTTON
    SecurityService.isAdmin(user.email).then(isAdminUser => {
      if (isAdminUser) {
        adminButton.classList.remove('hidden');
        console.log('🔧 Botón Admin mostrado (usuario es admin)');
      } else {
        adminButton.classList.add('hidden');
        console.log('🔒 Botón Admin oculto (usuario no es admin)');
      }
    }).catch(error => {
      console.error('Error validando rol de admin:', error);
      adminButton.classList.add('hidden');
    });
    
    loginPanelIntro.textContent = t.loginIntro;
  } else {
    loginState.classList.remove('home-user-logged');
    loginForm.classList.remove('hidden');
    logoutButton.classList.add('hidden');
    profileButton.classList.add('hidden');
    aiButton.classList.add('hidden');
    adminButton.classList.add('hidden');
    loginPanelIntro.textContent = t.loginIntro;
  }
}

function showLockedNotice(message) {
  // Solo mostrar en la notificación visual interna (sin alert bloqueante)
  const notice = document.getElementById('homeLockedNotice');
  if (!notice) return;
  
  notice.textContent = message;
  notice.classList.add('visible');
  
  // Auto-hide después de 3.5 segundos
  window.clearTimeout(showLockedNotice.timeoutId);
  showLockedNotice.timeoutId = window.setTimeout(() => {
    notice.classList.remove('visible');
  }, 3500);
}

/**
 * Renderiza el dashboard personalizado del usuario
 * @param {Object} dashboard - Datos del dashboard desde DashboardService
 */
async function renderDashboard(dashboard) {
  if (!dashboard) return;

  // Presentación dividida en 2 columnas — misma data de DashboardService,
  // solo cambia dónde se inserta cada parte (izquierda=resumen, centro=feed).
  const summaryEl = document.getElementById('dashboardUserSummary');
  const feedEl = document.getElementById('dashboardFeed');
  if (!summaryEl && !feedEl) {
    console.warn('⚠️ Contenedores del dashboard no encontrados');
    return;
  }

  const lastLoginDate = new Date(dashboard.user.lastLogin);
  const lastLoginText = lastLoginDate.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="dashboard-header">
        <div class="dashboard-header-top">
          <div class="dashboard-user-info">
            <h2 id="dashboardUserName">${dashboard.user.name}</h2>
            <p class="dashboard-objective" id="dashboardObjective">${dashboard.objective}</p>
          </div>
          <span class="dashboard-user-plan" id="dashboardPlan">${getPlanBadgeLabel(dashboard.user.plan)}</span>
        </div>

        <div class="dashboard-progress-section">
          <div class="dashboard-progress-label">
            <span>Progreso</span>
            <span id="dashboardProgressText">${dashboard.progress}%</span>
          </div>
          <div class="dashboard-progress-bar">
            <div class="dashboard-progress-fill" id="dashboardProgress" style="width: ${dashboard.progress}%"></div>
          </div>
        </div>

        <div class="dashboard-stats" id="dashboardStats">
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
        </div>

        <div class="dashboard-last-login">
          ⏱️ Último acceso: ${lastLoginText}
        </div>
      </div>
    `;
  }

  if (feedEl) {
    const cardsHTML = dashboard.cards.map(card => createCardHTML(card)).join('');
    feedEl.innerHTML = `
      <div class="dashboard-feed-block">
        <h3 class="feed-section-title">Tu actividad</h3>
        <div class="dashboard-cards" id="dashboardCards">
          ${cardsHTML || '<p class="feed-empty">Todavía no tienes actividad ni favoritos guardados.</p>'}
        </div>
      </div>
      <div class="dashboard-feed-block">
        <h3 class="feed-section-title">Centro Inteligente</h3>
        <button type="button" class="dashboard-ai-cta" id="dashboardAICta">${getIcon('robot', 18)} Pregunta a tu asistente nutricional</button>
      </div>
      <div class="dashboard-feed-block feed-news-section">
        <h3 class="feed-section-title">Contenido reciente</h3>
        <div class="feed-news-list" id="feedNewsList">
          <p class="feed-loading">Cargando…</p>
        </div>
      </div>
    `;
    document.getElementById('dashboardAICta')?.addEventListener('click', () => window.homePage_navigateToAI());
    fetchRecentNews().then(renderNewsList);
  }

  // Actualizar UI con datos
  DashboardService.updateDashboardUI(dashboard);

  console.log('✅ Dashboard renderizado');
}

/**
 * Genera HTML para una tarjeta del dashboard
 * @param {Object} card - Datos de la tarjeta
 * @returns {string} - HTML de la tarjeta
 */
function createCardHTML(card) {
  return `
    <div class="dashboard-card dashboard-card-${card.type}">
      <div class="card-icon">${card.icon}</div>
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
 * @param {string} plan - Plan del usuario (gratis, premium, vip)
 * @returns {string} - Etiqueta para mostrar
 */
function getPlanBadgeLabel(plan) {
  const labels = {
    gratis: `${getIcon('target', 14)} FREE`,
    free: `${getIcon('target', 14)} FREE`,
    premium: `${getIcon('star', 14)} PREMIUM`,
    vip: `${getIcon('crown', 14)} VIP`
  };
  return labels[plan] || labels.gratis;
}

/**
 * Agregar elemento a favoritos
 * @param {string} module - Tipo de módulo (recipe, resource, supplement, article)
 * @param {string} referenceId - ID único del elemento
 * @param {string} name - Nombre del elemento
 * @param {Object} metadata - Datos adicionales
 */
export async function toggleFavorite(module, referenceId, name, metadata = {}) {
  if (FavoritesService.isFavorite(module, referenceId)) {
    // Eliminar favorito
    const removed = await FavoritesService.removeFavorite(module, referenceId);
    if (removed) {
      updateFavoriteBtnUI(referenceId, false);
      showLockedNotice('Favorito eliminado');
    }
  } else {
    // Agregar favorito
    const added = await FavoritesService.addFavorite(module, referenceId, name, metadata);
    if (added) {
      updateFavoriteBtnUI(referenceId, true);
      showLockedNotice('Guardado en favoritos');
    }
  }
}

/**
 * Actualizar UI del botón de favorito
 * @param {string} elementId - ID del elemento
 * @param {boolean} isFav - true si es favorito
 */
function updateFavoriteBtnUI(elementId, isFav) {
  const btn = document.querySelector(`[data-favorite-id="${elementId}"]`);
  if (btn) {
    btn.classList.toggle('active', isFav);
    btn.innerHTML = getIcon('heart', 16);
  }
}

/**
 * Renderizar panel de favoritos (para el menú/perfil)
 * @returns {string} - HTML del panel de favoritos
 */
function renderFavoritesPanel() {
  const favorites = FavoritesService.getFavorites();
  
  if (favorites.length === 0) {
    return `
      <div class="favorites-section">
        <div class="favorites-header">
          <h3>${getIcon('heart', 18)} Favoritos</h3>
        </div>
        <div class="favorites-empty">
          <h3>Sin favoritos aún</h3>
          <p>Agrega contenido a favoritos desde cualquier módulo</p>
        </div>
      </div>
    `;
  }

  const favByModule = {
    recipe: favorites.filter(f => f.type === 'recipe'),
    resource: favorites.filter(f => f.type === 'resource'),
    supplement: favorites.filter(f => f.type === 'supplement'),
    article: favorites.filter(f => f.type === 'article')
  };

  const moduleNames = {
    recipe: `${getIcon('leaf', 14)} Recetas`,
    resource: `${getIcon('book', 14)} Recursos`,
    supplement: `${getIcon('droplet', 14)} Suplementos`,
    article: `${getIcon('book', 14)} Artículos`
  };

  let html = `
    <div class="favorites-section">
      <div class="favorites-header">
        <h3>${getIcon('heart', 18)} Favoritos</h3>
        <span class="favorites-count">${favorites.length}</span>
      </div>
  `;

  Object.entries(favByModule).forEach(([module, items]) => {
    if (items.length > 0) {
      html += `
        <h4 style="margin-top: 16px; margin-bottom: 8px; font-size: 0.95rem; color: var(--text-primary);">
          ${moduleNames[module]}
        </h4>
        <div class="favorites-container">
      `;
      
      items.forEach(fav => {
        html += `
          <div class="favorite-item-card">
            <div class="favorite-item-header">
              <div class="favorite-item-title">${fav.name}</div>
              <button class="favorite-remove-btn" onclick="window.homePage_removeFavorite('${fav.resource_id}', '${module}')" title="Eliminar">${getIcon('close', 14)}</button>
            </div>
            <span class="favorite-item-type">${module}</span>
            <small style="color: var(--text-secondary);">
              ${new Date(fav.created_at).toLocaleDateString('es-ES')}
            </small>
          </div>
        `;
      });
      
      html += `</div>`;
    }
  });

  html += `</div>`;
  return html;
}

/**
 * Mostrar favoritos en el panel lateral
 */
export function showFavoritesPanel() {
  // Favoritos es una función solo para usuario autenticado — vive en el
  // Dashboard (columna de accesos rápidos), nunca en la Landing pública.
  const rightPanel = document.querySelector('.dashboard-col-quick');
  if (rightPanel) {
    const existingPanel = rightPanel.querySelector('.favorites-section');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    const favPanel = document.createElement('div');
    favPanel.innerHTML = renderFavoritesPanel();
    rightPanel.appendChild(favPanel);
  }
}

// Función global para eliminar favorito (desde el HTML)
window.homePage_removeFavorite = async (referenceId, module) => {
  await FavoritesService.removeFavorite(module, referenceId);
  showFavoritesPanel();
  showLockedNotice('Favorito eliminado');
};

// ──────────────────────────────────────────────────────────────
// BÚSQUEDA GLOBAL
// ──────────────────────────────────────────────────────────────

/**
 * Manejar entrada de búsqueda en tiempo real
 */
async function handleSearchInput(query) {
  const dropdown = document.getElementById('searchResultsDropdown');
  const clearBtn = document.getElementById('searchClearBtn');

  // Mostrar botón de limpiar si hay texto
  clearBtn?.classList.toggle('visible', query.length > 0);

  if (query.length < 2) {
    // Mostrar búsquedas recientes
    if (query.length === 0) {
      dropdown.innerHTML = renderRecentSearchesDropdown();
      dropdown.classList.add('visible');
    } else {
      dropdown.classList.remove('visible');
    }
    return;
  }

  // Mostrar loading
  dropdown.innerHTML = '<div class="search-loading">Buscando</div>';
  dropdown.classList.add('visible');

  // Realizar búsqueda
  try {
    const results = await SearchService.searchAll(query);
    dropdown.innerHTML = renderSearchResultsDropdown(results);
    dropdown.classList.add('visible');
  } catch (error) {
    console.error('Error en búsqueda:', error);
    dropdown.innerHTML = `
      <div class="search-empty-state">
        <div class="search-empty-state-icon">${getIcon('close', 28)}</div>
        <div class="search-empty-state-title">Error en la búsqueda</div>
      </div>
    `;
  }
}

/**
 * Renderizar búsquedas recientes en dropdown
 */
function renderRecentSearchesDropdown() {
  const recent = SearchService.getRecentSearches();

  if (recent.length === 0) {
    return `
      <div class="search-empty-state">
        <div class="search-empty-state-icon">${getIcon('search', 28)}</div>
        <div class="search-empty-state-title">Búsqueda Global</div>
        <p style="font-size: 0.85rem; margin-top: 8px;">Escribe al menos 2 caracteres</p>
      </div>
    `;
  }

  let html = '<div class="search-recent-title">Búsquedas Recientes</div>';
  
  recent.slice(0, 5).forEach(search => {
    html += `
      <div class="search-recent-item" onclick="window.homePage_selectSearch('${search.query}')">
        ${search.query}
      </div>
    `;
  });

  return html;
}

/**
 * Renderizar resultados de búsqueda en dropdown
 */
function renderSearchResultsDropdown(results) {
  if (!results.hasResults) {
    return `
      <div class="search-empty-state">
        <div class="search-empty-state-icon">${getIcon('search', 28)}</div>
        <div class="search-empty-state-title">Sin resultados</div>
        <p style="font-size: 0.85rem; margin-top: 8px;">Intenta con otros términos</p>
      </div>
    `;
  }

  let html = '';

  const categories = [
    { type: 'recipes', label: `${getIcon('leaf', 14)} Recetas` },
    { type: 'supplements', label: `${getIcon('droplet', 14)} Suplementos` },
    { type: 'resources', label: `${getIcon('book', 14)} Recursos` },
    { type: 'articles', label: `${getIcon('book', 14)} Artículos` }
  ];

  categories.forEach(cat => {
    const items = results[cat.type];
    if (items && items.length > 0) {
      html += `
        <div class="search-results-group">
          <div class="search-group-title">${cat.label}</div>
      `;

      items.slice(0, 3).forEach(item => {
        html += `
          <div class="search-result-item" onclick="window.homePage_selectResult('${item.id}', '${cat.type}')">
            <div class="search-result-title">${item.title}</div>
            <div class="search-result-description">${item.description}</div>
          </div>
        `;
      });

      if (items.length > 3) {
        html += `<div class="search-result-item" style="padding: 8px 16px; text-align: center; color: var(--brand); cursor: pointer; font-weight: 600;">
          Ver todos (${items.length})
        </div>`;
      }

      html += '</div>';
    }
  });

  return html;
}

/**
 * Seleccionar resultado y realizar acción
 */
window.homePage_selectResult = (itemId, type) => {
  console.log(`📌 Seleccionado: ${itemId} (${type})`);
  // En el futuro: navegar al módulo correspondiente
  showLockedNotice(`Abriendo ${type}: ${itemId}`);
};

/**
 * Seleccionar búsqueda reciente
 */
window.homePage_selectSearch = (query) => {
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = query;
    handleSearchInput(query);
  }
};

/**
 * Navegar a la biblioteca de artículos
 */
window.homePage_navigateToArticles = () => {
  console.log('📚 Navegando a Biblioteca de Artículos');
  ArticlesPage.renderArticlesPage();
};

/**
 * Navegar al programa de nutrición para diabéticos
 */
window.homePage_navigateToDiabetes = () => {
  console.log('🩺 Navegando a Programa de Diabetes');
  DiabetesPage.renderDiabetesPage();
};

/**
 * Navegar al perfil del usuario
 */
window.homePage_navigateToProfile = () => {
  console.log('👤 Navegando a Perfil');
  ProfilePage.renderProfilePage();
};

/**
 * Navegar al Centro IA
 */
window.homePage_navigateToAI = () => {
  console.log('🤖 Navegando a Centro IA');
  AIPage.renderAIPage();
};

/**
 * Navegar a Administración
 * ✅ VALIDAR PERMISOS - Solo admin puede acceder
 */
window.homePage_navigateToAdmin = async () => {
  const user = getStoredUser();

  if (!user) {
    console.error('❌ Usuario no autenticado');
    SecurityService.showAccessDeniedModal({
      title: 'Acceso Denegado',
      message: 'Debes iniciar sesión para acceder a administración.'
    });
    return;
  }

  // ✅ VALIDAR ROL DEL USUARIO — admin ve el panel completo, expert solo
  // la pestaña de revisión de diabetes (restringido dentro de adminPage.js).
  const role = await SecurityService.getUserRole(user.email);

  if (role !== 'admin' && role !== 'expert') {
    console.error('❌ Usuario no tiene permisos de admin/expert');
    SecurityService.showAccessDeniedModal({
      title: 'Acceso Denegado (403)',
      message: 'No tienes permisos para acceder a esta sección. Contacta al equipo de soporte.'
    });
    return;
  }

  console.log(`🔧 Navegando a Administración (role: ${role})`);
  AdminPage.renderAdminPage(role);
};

/**
 * Limpiar búsqueda
 */
function clearSearch() {
  const input = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchResultsDropdown');
  const clearBtn = document.getElementById('searchClearBtn');

  if (input) {
    input.value = '';
    input.focus();
  }
  
  dropdown.classList.remove('visible');
  clearBtn?.classList.remove('visible');
}

// Función global para limpiar desde el botón
window.homePage_clearSearch = () => {
  clearSearch();
};

/**
 * Inicializar listeners de búsqueda
 */
function setupSearchListeners() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  const dropdown = document.getElementById('searchResultsDropdown');

  if (!searchInput) return;

  // Input en tiempo real
  searchInput.addEventListener('input', (e) => {
    handleSearchInput(e.target.value);
  });

  // Click en el botón de limpiar
  clearBtn?.addEventListener('click', () => {
    window.homePage_clearSearch();
  });

  // Cerrar dropdown al clickear fuera
  document.addEventListener('click', (e) => {
    if (
      !e.target.closest('.search-container') &&
      !e.target.closest('.search-results-dropdown')
    ) {
      dropdown?.classList.remove('visible');
    }
  });

  // Focus: mostrar búsquedas recientes
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.length === 0) {
      handleSearchInput('');
    }
  });
}

function initHomeInteractions(t) {
  const loginForm = document.getElementById('homeLoginForm');
  const logoutButton = document.getElementById('homeLogoutButton');
  const lockedButtons = Array.from(document.querySelectorAll('.module-action'));
  const languageToggle = document.getElementById('languageToggle');
  const registerForm = document.getElementById('homeRegisterForm');
  const recoverForm = document.getElementById('homeRecoveryForm');
  const authTabs = Array.from(document.querySelectorAll('.auth-tab'));
  const forgotLink = document.getElementById('homeLinkForgot');
  const backLoginLink = document.getElementById('homeLinkBackLogin');

  function setAuthTab(tab) {
    authTabs.forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
    document.getElementById('homeLoginForm')?.classList.toggle('hidden', tab !== 'login');
    registerForm?.classList.toggle('hidden', tab !== 'registro');
    recoverForm?.classList.toggle('hidden', tab !== 'recuperar');
  }

  authTabs.forEach((button) => {
    button.addEventListener('click', () => {
      setAuthTab(button.dataset.tab);
    });
  });

  forgotLink?.addEventListener('click', (event) => {
    event.preventDefault();
    setAuthTab('recuperar');
  });

  backLoginLink?.addEventListener('click', (event) => {
    event.preventDefault();
    setAuthTab('login');
  });

  loginForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('homeUserEmail')?.value?.trim();
      const password = document.getElementById('homeUserPassword')?.value || '';

      if (!email || !password) {
        showLockedNotice(t.loginValidation);
        return;
      }

      try {
        const response = await fetch(API.login, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        // Aceptar diferentes formatos de respuesta
        const isSuccess = response.ok && (data.success || data.token || data.id || data.email_confirm);
        
        if (!isSuccess) {
          const errorMsg = data.mensaje || data.message || data.error || t.loginAuthFailed;
          showLockedNotice(errorMsg);
          return;
        }

        // Guardar token si existe
        if (data.token) {
          setAuthToken(data.token);
          localStorage.setItem(LEGACY_TOKEN_KEY, data.token);
        } else if (data.access_token) {
          setAuthToken(data.access_token);
          localStorage.setItem(LEGACY_TOKEN_KEY, data.access_token);
        }

        // Extraer datos del usuario de diferentes formatos posibles
        const user = {
          name: data.nombre || data.name || data.user?.name || email.split('@')[0],
          email: data.email || email,
          plan: data.plan || data.user?.plan || 'free',
          loggedAt: new Date().toISOString()
        };

        // Intentar obtener plan desde Supabase
        const supabasePlan = await getUserPlanFromSupabase(email);
        if (supabasePlan) {
          user.plan = supabasePlan;
          console.log(`📊 Plan obtenido desde Supabase: ${supabasePlan}`);
        }

        storeUser(user);
        savePlan(user.plan);
        MenuService.onLoginSuccess(user);
        await renderHomePage();
        updateUIByPlan(user.plan);
        
        // ── Inicializar FavoritesService ──
        await FavoritesService.initializeFavoritesService(user.email);
        
        // ── Inicializar SearchService ──
        SearchService.initializeSearchService(user.email);
        
        // ── Inicializar ArticlesService ──
        ArticlesService.initializeArticlesService(user.email);
        
        // ── Inicializar ProfileService ──
        ProfileService.initializeProfileService(user.email);
        
        // ── Inicializar AIService ──
        AIService.initializeAIService(user.email);
        
        // ── Inicializar AdminService ──
        AdminService.initializeAdminService(user.email, 'admin');
        
        // ── Inicializar RecipesService ──
        RecipesService.initializeRecipesService(user.email);
        
        // ── Inicializar EducationalModulesService ──
        EducationalModulesService.initializeEducationalModulesService();
        
        // ── Inicializar NutritionalPlansService ──
        NutritionalPlansService.initializeNutritionalPlansService(user.email);
        
        // ── Inicializar ProtocolsService ──
        ProtocolsService.initializeProtocolsService();
        
        // ── Inicializar ConditionsService ──
        ConditionsService.initializeConditionsService();
        
        // ── Inicializar ReferencesService ──
        ReferencesService.initializeReferencesService();
        
        // Nota: renderHomePage() (llamado arriba) ya carga y renderiza el
        // dashboard personalizado al detectar el usuario guardado.
        showLockedNotice(t.loginSuccess);
      } catch (error) {
        console.error('Error en login:', error);
        showLockedNotice(t.loginConnectionError);
      }
  });

  registerForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = document.getElementById('homeRegisterName')?.value?.trim();
      const email = document.getElementById('homeRegisterEmail')?.value?.trim();
      const password = document.getElementById('homeRegisterPassword')?.value || '';
      const password2 = document.getElementById('homeRegisterPassword2')?.value || '';

      if (!name || !email || !password || !password2) {
        showLockedNotice(t.loginValidation);
        return;
      }
      if (password !== password2) {
        showLockedNotice(t.passwordMismatch);
        return;
      }
      if (password.length < 8) {
        showLockedNotice(t.passwordTooShort);
        return;
      }

      const terms = document.getElementById('homeRegisterTerms')?.checked;
      if (!terms) {
        showLockedNotice(t.termsRequired || 'Debes aceptar los términos y condiciones.');
        return;
      }

      try {
        const response = await fetch(API.register, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: name, email, password })
        });
        const data = await response.json();

        // Aceptar diferentes formatos de respuesta exitosa
        const isSuccess = response.ok && (data.success || data.email_confirm || data.created || data.id);
        
        if (!isSuccess && !response.ok) {
          const errorMsg = data.mensaje || data.message || data.error || t.loginAuthFailed;
          showLockedNotice(errorMsg);
          return;
        }

        // Mostrar mensaje de éxito
        const successMsg = data.mensaje || data.message || t.registerSuccess;
        showLockedNotice(successMsg);
        setAuthTab('login');
      } catch (error) {
        console.error('Error en registro:', error);
        showLockedNotice(t.loginConnectionError);
      }
  });

  recoverForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('homeRecoverEmail')?.value?.trim();
      if (!email) {
        showLockedNotice(t.recoverValidation);
        return;
      }

      try {
        const response = await fetch(API.recover, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();

        // Aceptar diferentes formatos de respuesta exitosa
        const isSuccess = response.ok && (data.success || data.email_sent || data.message || data.id);
        
        if (!isSuccess) {
          const errorMsg = data.mensaje || data.message || data.error || t.loginAuthFailed;
          showLockedNotice(errorMsg);
          return;
        }

        const successMsg = data.mensaje || data.message || t.recoverSuccess;
        showLockedNotice(successMsg);
      } catch (error) {
        console.error('Error en recuperación:', error);
        showLockedNotice(t.loginConnectionError);
      }
  });

  logoutButton?.addEventListener('click', () => {
    clearStoredUser();
    clearPlan();
    MenuService.onLogout();
    DashboardService.stopDashboardAutoRefresh();
    FavoritesService.clearFavorites();
    SearchService.clearSearchService();
    ArticlesService.clearArticlesService();
    ProfileService.clearProfileService();
    AIService.clearAIService();
    AdminService.clearAdminService();
    RecipesService.clearRecipesService();
    EducationalModulesService.clearModulesCache();
    NutritionalPlansService.clearNutritionalPlansService();
    ProtocolsService.clearProtocolsService();
    ConditionsService.clearConditionsService();
    ReferencesService.clearReferencesService();
    renderHomePage();
    showLockedNotice(t.logoutNotice);
  });

  // Profile Button
  const profileButton = document.getElementById('homeProfileButton');
  profileButton?.addEventListener('click', () => {
    console.log('👤 Abriendo perfil del usuario');
    window.homePage_navigateToProfile();
  });

  // AI Button
  const aiButton = document.getElementById('homeAIButton');
  aiButton?.addEventListener('click', () => {
    console.log('🤖 Abriendo Centro IA');
    window.homePage_navigateToAI();
  });

  // Admin Button
  const adminButton = document.getElementById('homeAdminButton');
  adminButton?.addEventListener('click', () => {
    console.log('🔧 Abriendo Administración');
    window.homePage_navigateToAdmin();
  });

  lockedButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const isLocked = button.dataset.locked === 'true';
      const moduleCard = button.closest('.module-card');
      const moduleName = moduleCard?.dataset.module;

      // Módulos desbloqueados con navegación especial
      if (!isLocked) {
        switch (moduleName) {
          case 'resources':
            window.homePage_navigateToArticles();
            return;
          // Aquí se pueden agregar más módulos con navegación especial
          default:
            showLockedNotice('Módulo en desarrollo');
            return;
        }
      }

      // Módulos bloqueados
      if (isLocked) {
        showLockedNotice(t.lockedAction);
        return;
      }
    });
  });

  languageToggle?.addEventListener('click', () => {
    const nextLanguage = getNextLanguage(getCurrentLanguage());
    setCurrentLanguage(nextLanguage);
    const nextTranslation = getTranslation();
    updateLanguageToggle(nextLanguage);
    updateTexts(nextTranslation);
  });

  // ✅ NUEVOS LISTENERS PARA UX CORRECTIONS v1.0

  // CTA de Actualizar Plan (si existe)
  const upgradePlanBtn = document.querySelector('.upgrade-plan-btn, [data-action="upgrade-plan"]');
  if (upgradePlanBtn) {
    upgradePlanBtn.addEventListener('click', () => {
      const user = getStoredUser();
      if (user) {
        console.log('📈 Abriendo modal de selección de plan');
        StripeService.renderPlanSelectionModal((selectedPlan) => {
          console.log(`💳 Plan seleccionado: ${selectedPlan}`);
          StripeService.startStripeCheckout(selectedPlan, user.email);
        });
      } else {
        // Visitante sin sesión: primero se registra, el checkout requiere email.
        document.querySelector('.auth-tab[data-tab="registro"]')?.click();
        document.getElementById('homeRegisterName')?.focus();
      }
    });
  }

}

/**
 * Configurar listeners para cambios en favoritos
 */
function setupFavoritesListeners() {
  // Escuchar cuando se agrega un favorito
  FavoritesService.onFavoriteChange('favorite-added', (detail) => {
    console.log('♥️ Favorito agregado:', detail);
    updateFavoriteBtnUI(detail.referenceId, true);
  });

  // Escuchar cuando se elimina un favorito
  FavoritesService.onFavoriteChange('favorite-removed', (detail) => {
    console.log('💔 Favorito eliminado:', detail);
    updateFavoriteBtnUI(detail.referenceId, false);
  });
}

function renderFooterHTML(t) {
  return `
    <footer class="home-footer">
      <div class="footer-grid">
        <div class="footer-col footer-field">
          <h4 data-i18n="footerEmailTitle">Correo electrónico</h4>
          <p><a href="mailto:${t.footerEmailValue}" class="footer-link" data-i18n="footerEmailValue">${t.footerEmailValue}</a></p>
        </div>
        <div class="footer-col footer-field">
          <h4 data-i18n="footerPhoneTitle">Teléfono</h4>
          <p><a href="tel:${t.footerPhoneValue}" class="footer-link" data-i18n="footerPhoneValue">${t.footerPhoneValue}</a></p>
        </div>
        <div class="footer-col footer-field">
          <h4 data-i18n="footerAboutTitle">Sobre IsoCore</h4>
          <p data-i18n="footerAboutText">${t.footerAboutText}</p>
        </div>
        <div class="footer-col footer-field">
          <h4 data-i18n="footerPolicyTitle">Políticas</h4>
          <p><a href="${t.footerPolicyUrl}" target="_blank" rel="noopener noreferrer" class="footer-link" data-i18n="footerPolicyLink">${t.footerPolicyLink}</a></p>
        </div>
      </div>
      <div class="footer-bottom" data-i18n="footerBottomText">${t.footerBottomText}</div>
    </footer>
  `;
}

/**
 * Panel de login/registro/recuperación — idéntico al ya existente,
 * misma lógica en initHomeInteractions (no se toca).
 */
function renderLoginPanelHTML(t) {
  return `
    <div class="home-card home-login-card home-login-state">
      <div class="home-login-heading">
        <p class="eyebrow" data-i18n="loginHeading">${t.loginHeading}</p>
      </div>
      <p id="homeLoginPanelIntro" class="home-login-copy" data-i18n="loginIntro">${t.loginIntro}</p>
      <div class="auth-tabs">
        <button type="button" class="auth-tab active" data-tab="login">${t.loginButton}</button>
        <button type="button" class="auth-tab" data-tab="registro">${t.registerButton || 'Registrarse'}</button>
      </div>
      <form id="homeLoginForm" class="home-login-form">
        <label class="input-group">
          <span data-i18n="emailLabel">${t.emailLabel}</span>
          <input id="homeUserEmail" type="email" placeholder="${t.emailPlaceholder}" data-placeholder-i18n="emailPlaceholder" autocomplete="email" />
        </label>
        <label class="input-group">
          <span data-i18n="passwordLabel">${t.passwordLabel}</span>
          <input id="homeUserPassword" type="password" placeholder="${t.passwordPlaceholder}" data-placeholder-i18n="passwordPlaceholder" autocomplete="current-password" />
        </label>
        <div class="form-footer">
          <button id="homeLinkForgot" type="button" class="link-button">${t.linkForgot}</button>
        </div>
        <button type="submit" class="primary-button" data-i18n="loginButton">${t.loginButton}</button>
      </form>
      <form id="homeRegisterForm" class="home-login-form hidden">
        <label class="input-group">
          <span data-i18n="nameLabel">${t.nameLabel}</span>
          <input id="homeRegisterName" type="text" placeholder="${t.nameLabel}" autocomplete="name" />
        </label>
        <label class="input-group">
          <span data-i18n="emailLabel">${t.emailLabel}</span>
          <input id="homeRegisterEmail" type="email" placeholder="${t.emailPlaceholder}" autocomplete="email" />
        </label>
        <label class="input-group">
          <span data-i18n="passwordLabel">${t.passwordLabel}</span>
          <input id="homeRegisterPassword" type="password" placeholder="${t.passwordPlaceholder}" autocomplete="new-password" />
        </label>
        <label class="input-group">
          <span data-i18n="label_pass2">${t.passwordLabel} 2</span>
          <input id="homeRegisterPassword2" type="password" placeholder="${t.passwordPlaceholder}" autocomplete="new-password" />
        </label>
        <label class="input-group input-check">
          <input id="homeRegisterTerms" type="checkbox" />
          <span>${t.termsLabel || 'Acepto los <a href="#">términos y condiciones</a>'}</span>
        </label>
        <button type="submit" class="primary-button">${t.registerButton || 'Registrarse'}</button>
      </form>
      <form id="homeRecoveryForm" class="home-login-form hidden">
        <p class="home-login-copy">${t.recoverDesc}</p>
        <label class="input-group">
          <span data-i18n="emailLabel">${t.emailLabel}</span>
          <input id="homeRecoverEmail" type="email" placeholder="${t.emailPlaceholder}" autocomplete="email" />
        </label>
        <button type="submit" class="primary-button">${t.btnRecover || 'Enviar enlace'}</button>
        <button id="homeLinkBackLogin" type="button" class="ghost-button">${t.linkBackLogin}</button>
      </form>
      <div class="home-user-card hidden" aria-live="polite">
        <p class="eyebrow">${t.sessionActive}</p>
        <h3 id="homeUserLabel">Usuario</h3>
        <p id="homeUserWelcome">${t.loginSuccess}</p>
      </div>
      <div class="home-user-buttons">
        <button id="homeProfileButton" class="primary-button hidden" type="button">${getIcon('user', 16)} Mi Perfil</button>
        <button id="homeAIButton" class="primary-button hidden" type="button">${getIcon('robot', 16)} Centro IA</button>
        <button id="homeAdminButton" class="primary-button hidden" type="button">${getIcon('lock', 16)} Admin</button>
        <button id="homeLogoutButton" class="ghost-button hidden" type="button">${t.logoutButton}</button>
      </div>
    </div>
  `;
}

/**
 * Comparativa de planes — config-driven vía FREE_PLAN_CONFIG + StripeService.getAvailablePlans().
 * El CTA reutiliza el flujo de Stripe ya existente (renderPlanSelectionModal + startStripeCheckout).
 */
function renderPlanComparisonHTML() {
  const plans = [FREE_PLAN_CONFIG, ...StripeService.getAvailablePlans()];

  return `
    <div class="home-card plan-comparison-card">
      <h3 class="feed-section-title">Elige tu plan</h3>
      <div class="plan-mini-grid">
        ${plans.map(plan => `
          <div class="plan-mini-card ${plan.id !== 'free' ? 'plan-mini-paid' : ''}">
            <span class="plan-mini-name">${escapeHtml(plan.name)}</span>
            <span class="plan-mini-price">${plan.price > 0 ? `${plan.price.toFixed(2)}€/mes` : 'Gratis'}</span>
            <ul class="plan-mini-features">
              ${(plan.features || []).slice(0, 2).map(feature => `<li>${escapeHtml(feature)}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
      <button type="button" class="primary-button upgrade-plan-btn" data-action="upgrade-plan">Hazte Premium</button>
    </div>
  `;
}

/**
 * Landing pública (sin sesión) — conversión: hero + contenido real + login/planes.
 */
function renderLandingHTML(t, language) {
  return `
    ${renderHeaderHTML(t, language, null)}
    <main class="home-root page-shell">
      <section class="landing-grid">
        <div class="landing-col landing-col-hero">
          ${renderHeroCarouselHTML()}
        </div>

        <div class="landing-col landing-col-feed">
          <div class="home-details" id="homeContentFeed">
            ${createDiabetesCardHTML()}
            ${FEED_SECTIONS.map(section => createFeedCard(null, section.type, section.label, 'loading')).join('')}
          </div>
          <div class="feed-section feed-news-section">
            <h3 class="feed-section-title">Últimas publicaciones</h3>
            <div class="feed-news-list" id="feedNewsList">
              <p class="feed-loading">Cargando…</p>
            </div>
          </div>
        </div>

        <aside class="landing-col landing-col-convert">
          ${renderLoginPanelHTML(t)}
          ${renderPlanComparisonHTML()}
          <div id="homeLockedNotice" class="home-locked-notice">${t.lockNotice}</div>
        </aside>
      </section>

      ${renderFooterHTML(t)}
    </main>
  `;
}

/**
 * Dashboard (con sesión) — nunca convive con la Landing.
 */
function renderDashboardHTML(t, language, user) {
  return `
    ${renderHeaderHTML(t, language, user)}
    <main class="home-root page-shell">
      <section class="landing-grid dashboard-grid">
        <div class="landing-col dashboard-col-summary" id="dashboardUserSummary">
          <p class="feed-loading">Cargando resumen…</p>
        </div>

        <div class="landing-col dashboard-col-feed" id="dashboardFeed">
          <p class="feed-loading">Cargando tu feed…</p>
        </div>

        <aside class="landing-col dashboard-col-quick">
          <div class="home-card home-lock-card">
            <div class="home-lock-header">
              <h3>Accesos rápidos</h3>
            </div>
            <div class="module-grid">
              ${createModuleCard(t.centerTitle, t.centerDesc, 'center', false, t)}
              ${createModuleCard(t.planTitle, t.planDesc, 'plan', false, t)}
              ${createModuleCard(t.recipesTitle, t.recipesDesc, 'recipes', true, t)}
              ${createModuleCard(t.supplementTitle, t.supplementDesc, 'supplements', true, t)}
              ${createModuleCard(t.resourceTitle, t.resourceDesc, 'resources', false, t)}
              ${createModuleCard(t.aiTitle, t.aiDesc, 'ai', true, t)}
              ${createModuleCard(t.productsTitle, t.productsDesc, 'products', true, t)}
            </div>
          </div>
          <div id="homeLockedNotice" class="home-locked-notice">${t.lockNotice}</div>
        </aside>
      </section>

      ${renderFooterHTML(t)}
    </main>
  `;
}

// Cierra el dropdown del menú al hacer click fuera. Se registra una sola vez
// (a nivel de documento) para no acumular listeners en cada re-render.
document.addEventListener('click', () => {
  document.getElementById('menuDropdown')?.classList.remove('open');
  document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
});

// Logo del header = enlace a Home en todas las vistas (Landing, Dashboard y
// sub-páginas). Delegado en <body> para que funcione aunque el header se
// re-renderice o la sub-página activa haya sustituido <main>.
document.body.addEventListener('click', (event) => {
  if (event.target.closest('#headerLogoBtn')) {
    window.homePage_goHome();
  }
});

window.homePage_goHome = () => {
  renderHomePage();
};

function initMenuDropdown() {
  const toggle = document.getElementById('menuToggle');
  const dropdown = document.getElementById('menuDropdown');
  const loginBtn = document.getElementById('headerLoginBtn');

  loginBtn?.addEventListener('click', () => {
    document.querySelector('.landing-col-convert')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('homeUserEmail')?.focus();
  });

  if (!toggle || !dropdown) return;

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  dropdown.querySelectorAll('[data-menu-action]').forEach((link) => {
    link.addEventListener('click', () => {
      const action = link.dataset.menuAction;
      if (action === 'articles') window.homePage_navigateToArticles();
      else if (action === 'profile') window.homePage_navigateToProfile();
      else if (action === 'ai') window.homePage_navigateToAI();
      else if (action === 'plans') document.querySelector('.plan-comparison-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (action === 'admin') window.homePage_navigateToAdmin();
    });
  });
}

/**
 * Añade la entrada "Panel de administración"/"Panel de revisión" al menú
 * del header, solo visible para role='admin' o role='expert'. Se inyecta
 * de forma asíncrona (tras resolver el rol) en vez de estar en MENU_LINKS,
 * que es estático y no conoce el rol del usuario.
 */
function injectAdminHeaderLink(role) {
  const dropdown = document.getElementById('menuDropdown');
  if (!dropdown || (role !== 'admin' && role !== 'expert')) return;
  if (dropdown.querySelector('[data-menu-action="admin"]')) return;

  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'menu-link';
  link.dataset.menuAction = 'admin';
  link.textContent = role === 'admin' ? 'Panel de administración' : 'Panel de revisión';
  dropdown.appendChild(link);

  link.addEventListener('click', () => window.homePage_navigateToAdmin());
}

export async function renderHomePage() {
  const appRoot = document.getElementById('app');
  const t = getTranslation();
  const language = getCurrentLanguage();
  const persistedUser = getStoredUser();

  appRoot.innerHTML = persistedUser
    ? renderDashboardHTML(t, language, persistedUser)
    : renderLandingHTML(t, language);

  initHomeInteractions(t);
  updateLanguageToggle(language);
  initMenuDropdown();

  // ── MenuService: Restaurar estado dinámico ──
  MenuService.restoreMenuState();

  // ── FavoritesService: Restaurar estado y listeners ──
  FavoritesService.restoreFavoritesState();
  setupFavoritesListeners();

  // ── SearchService: Reinicializar si el usuario está autenticado ──
  if (persistedUser && persistedUser.email) {
    await FavoritesService.initializeFavoritesService(persistedUser.email);
    SearchService.initializeSearchService(persistedUser.email);
  }
  SearchService.restoreSearchState();
  setupSearchListeners();

  // ── ArticlesService: Reinicializar si el usuario está autenticado ──
  if (persistedUser && persistedUser.email) {
    ArticlesService.initializeArticlesService(persistedUser.email);
    ProfileService.initializeProfileService(persistedUser.email);
    AIService.initializeAIService(persistedUser.email);
    const userRole = await SecurityService.getUserRole(persistedUser.email);
    AdminService.initializeAdminService(persistedUser.email, userRole);
    injectAdminHeaderLink(userRole);
    RecipesService.initializeRecipesService(persistedUser.email);
    EducationalModulesService.initializeEducationalModulesService();
    NutritionalPlansService.initializeNutritionalPlansService(persistedUser.email);
    ProtocolsService.initializeProtocolsService();
    ConditionsService.initializeConditionsService();
    ReferencesService.initializeReferencesService();
  }

  if (persistedUser) {
    // ── Dashboard: aplicar bloqueo de módulos según plan (misma lógica de siempre) ──
    updateUIByPlan(persistedUser.plan);

    // ── Dashboard: cargar datos reales (misma lógica de siempre) + auto-refresh ──
    try {
      const dashboard = await DashboardService.loadDashboard(persistedUser.email);
      if (dashboard) {
        await renderDashboard(dashboard);
        DashboardService.startDashboardAutoRefresh(persistedUser.email);
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    }
  } else {
    // ── Landing: estado de login + feed dinámico + carrusel hero ──
    renderLoginState(null, t);
    const feedContainer = document.querySelector('.landing-col-feed');
    feedContainer?.addEventListener('click', handleFeedClick);
    renderCentralFeed();
    initHeroCarousel();
  }
}
