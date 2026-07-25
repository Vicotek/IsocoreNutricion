/**
 * AdminPage - Panel de Administración Completo
 * 8 Secciones: Usuarios, Artículos, Recetas, Suplementos, Recursos, IA, Planes, Estadísticas
 * CRUD, búsqueda, filtros, publicación
 */

import * as AdminService from '../services/adminService.js';
import * as AdminRevisionPage from './adminRevisionPage.js';
import { getIcon } from '../components/icons.js';

/**
 * Renderizar página de administración
 * @param {string} role - 'admin' (todo el panel) o 'expert' (solo revisión de diabetes)
 */
export function renderAdminPage(role = 'admin') {
  const mainContent = document.querySelector('main');
  if (!mainContent) {
    console.error('❌ <main> no encontrado');
    return;
  }

  const isExpert = role === 'expert';
  const defaultTab = isExpert ? 'diabetes' : 'stats';

  // Para role='expert' estas pestañas/secciones ni se incluyen en el HTML
  // — no basta con ocultarlas visualmente, no deben montarse en absoluto,
  // así su lógica de carga de datos (loadUsers, loadArticles, etc.) nunca
  // tiene un tab-button ni un contenedor al que engancharse.
  const adminOnlyTabsHTML = isExpert ? '' : `
        <button class="admin-tab ${defaultTab === 'stats' ? 'active' : ''}" data-tab="stats">${getIcon('chart', 16)} Estadísticas</button>
        <button class="admin-tab" data-tab="users">${getIcon('users', 16)} Usuarios</button>
        <button class="admin-tab" data-tab="articles">${getIcon('book', 16)} Artículos</button>
        <button class="admin-tab" data-tab="recipes">${getIcon('leaf', 16)} Recetas</button>
        <button class="admin-tab" data-tab="supplements">${getIcon('droplet', 16)} Suplementos</button>
        <button class="admin-tab" data-tab="resources">${getIcon('book', 16)} Recursos</button>
        <button class="admin-tab" data-tab="ai">${getIcon('robot', 16)} IA</button>
        <button class="admin-tab" data-tab="plans">${getIcon('clipboard', 16)} Planes</button>`;

  const adminOnlySectionsHTML = isExpert ? '' : `
        <!-- ESTADÍSTICAS -->
        <div id="stats-tab" class="admin-section ${defaultTab === 'stats' ? 'active' : ''}">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">${getIcon('users', 26)}</div>
              <div class="stat-info">
                <p class="stat-label">Usuarios</p>
                <p class="stat-value" id="statUsers">-</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">${getIcon('book', 26)}</div>
              <div class="stat-info">
                <p class="stat-label">Artículos</p>
                <p class="stat-value" id="statArticles">-</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">${getIcon('leaf', 26)}</div>
              <div class="stat-info">
                <p class="stat-label">Recetas</p>
                <p class="stat-value" id="statRecipes">-</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">${getIcon('droplet', 26)}</div>
              <div class="stat-info">
                <p class="stat-label">Suplementos</p>
                <p class="stat-value" id="statSupplements">-</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">${getIcon('book', 26)}</div>
              <div class="stat-info">
                <p class="stat-label">Recursos</p>
                <p class="stat-value" id="statResources">-</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">${getIcon('robot', 26)}</div>
              <div class="stat-info">
                <p class="stat-label">IA Conversaciones</p>
                <p class="stat-value" id="statConversations">-</p>
              </div>
            </div>
          </div>
        </div>

        <!-- USUARIOS -->
        <div id="users-tab" class="admin-section">
          <div class="admin-section-header">
            <h2>${getIcon('users', 20)} Gestión de Usuarios</h2>
            <div class="section-controls">
              <input type="text" id="usersSearch" class="admin-search" placeholder="Buscar usuarios...">
              <button class="admin-btn primary" id="addUserBtn">+ Nuevo Usuario</button>
            </div>
          </div>
          <div id="usersList" class="admin-list">
            <p class="loading">Cargando usuarios...</p>
          </div>
        </div>

        <!-- ARTÍCULOS -->
        <div id="articles-tab" class="admin-section">
          <div class="admin-section-header">
            <h2>${getIcon('book', 20)} Gestión de Artículos</h2>
            <div class="section-controls">
              <input type="text" id="articlesSearch" class="admin-search" placeholder="Buscar artículos...">
              <select id="articlesFilter" class="admin-filter">
                <option value="">Todos</option>
                <option value="true">Publicados</option>
                <option value="false">Borradores</option>
              </select>
              <button class="admin-btn primary" id="addArticleBtn">+ Nuevo Artículo</button>
            </div>
          </div>
          <div id="articlesList" class="admin-list">
            <p class="loading">Cargando artículos...</p>
          </div>
        </div>

        <!-- RECETAS -->
        <div id="recipes-tab" class="admin-section">
          <div class="admin-section-header">
            <h2>${getIcon('leaf', 20)} Gestión de Recetas</h2>
            <div class="section-controls">
              <input type="text" id="recipesSearch" class="admin-search" placeholder="Buscar recetas...">
              <select id="recipesFilter" class="admin-filter">
                <option value="">Todos</option>
                <option value="true">Publicadas</option>
                <option value="false">Borradores</option>
              </select>
              <button class="admin-btn primary" id="addRecipeBtn">+ Nueva Receta</button>
            </div>
          </div>
          <div id="recipesList" class="admin-list">
            <p class="loading">Cargando recetas...</p>
          </div>
        </div>

        <!-- SUPLEMENTOS -->
        <div id="supplements-tab" class="admin-section">
          <div class="admin-section-header">
            <h2>${getIcon('droplet', 20)} Gestión de Suplementos</h2>
            <div class="section-controls">
              <input type="text" id="supplementsSearch" class="admin-search" placeholder="Buscar suplementos...">
              <select id="supplementsFilter" class="admin-filter">
                <option value="">Todos</option>
                <option value="true">Publicados</option>
                <option value="false">Borradores</option>
              </select>
              <button class="admin-btn primary" id="addSupplementBtn">+ Nuevo Suplemento</button>
            </div>
          </div>
          <div id="supplementsList" class="admin-list">
            <p class="loading">Cargando suplementos...</p>
          </div>
        </div>

        <!-- RECURSOS -->
        <div id="resources-tab" class="admin-section">
          <div class="admin-section-header">
            <h2>${getIcon('book', 20)} Gestión de Recursos</h2>
            <div class="section-controls">
              <input type="text" id="resourcesSearch" class="admin-search" placeholder="Buscar recursos...">
              <select id="resourcesFilter" class="admin-filter">
                <option value="">Todos</option>
                <option value="true">Publicados</option>
                <option value="false">Borradores</option>
              </select>
              <button class="admin-btn primary" id="addResourceBtn">+ Nuevo Recurso</button>
            </div>
          </div>
          <div id="resourcesList" class="admin-list">
            <p class="loading">Cargando recursos...</p>
          </div>
        </div>

        <!-- IA -->
        <div id="ai-tab" class="admin-section">
          <div class="admin-section-header">
            <h2>${getIcon('robot', 20)} Gestión de IA</h2>
            <div class="section-controls">
              <input type="text" id="aiSearch" class="admin-search" placeholder="Buscar conversaciones...">
            </div>
          </div>
          <div id="aiList" class="admin-list">
            <p class="loading">Cargando conversaciones...</p>
          </div>
        </div>

        <!-- PLANES -->
        <div id="plans-tab" class="admin-section">
          <div class="admin-section-header">
            <h2>${getIcon('clipboard', 20)} Gestión de Planes</h2>
            <div class="section-controls">
              <button class="admin-btn primary" id="addPlanBtn">+ Nuevo Plan</button>
            </div>
          </div>
          <div id="plansList" class="admin-list">
            <p class="loading">Cargando planes...</p>
          </div>
        </div>`;

  mainContent.innerHTML = `
    <div class="admin-page">
      <!-- Header -->
      <header class="admin-header">
        <div class="admin-header-content">
          <h1>${getIcon('lock', 24)} ${isExpert ? 'Panel de Revisión' : 'Panel de Administración'}</h1>
          <p>${isExpert ? 'Revisión de planes de nutrición para diabéticos' : 'Gestión completa de la plataforma IsoCore'}</p>
        </div>
        <div class="admin-header-info">
          <span class="admin-role">${isExpert ? 'Experta' : (AdminService.isAdmin() ? 'Administrador' : 'Editor')}</span>
        </div>
      </header>

      <!-- Tabs de secciones -->
      <div class="admin-tabs">${adminOnlyTabsHTML}
        <button class="admin-tab ${defaultTab === 'diabetes' ? 'active' : ''}" data-tab="diabetes">${getIcon('pill', 16)} Diabetes</button>
      </div>

      <!-- Contenido de tabs -->
      <div class="admin-content">${adminOnlySectionsHTML}

        <!-- REVISIÓN DIABETES -->
        <div id="diabetes-tab" class="admin-section ${defaultTab === 'diabetes' ? 'active' : ''}">
          <div class="admin-section-header">
            <h2>${getIcon('pill', 20)} Revisión de planes de diabetes</h2>
          </div>
          <div id="diabetesRevisionList" class="admin-list">
            <p class="loading">Cargando casos...</p>
          </div>
          <div id="diabetesRevisionDetail" class="is-hidden"></div>
        </div>
      </div>
    </div>
  `;

  setupAdminPage();

  if (isExpert) {
    AdminRevisionPage.loadCasosParaRevision();
  } else {
    loadDashboardStats();
  }
}

/**
 * Setup de eventos
 */
function setupAdminPage() {
  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });

  // Búsquedas
  document.getElementById('usersSearch')?.addEventListener('input', (e) => handleUserSearch(e.target.value));
  document.getElementById('articlesSearch')?.addEventListener('input', (e) => handleArticleSearch(e.target.value));
  document.getElementById('recipesSearch')?.addEventListener('input', (e) => handleRecipeSearch(e.target.value));
  document.getElementById('supplementsSearch')?.addEventListener('input', (e) => handleSupplementSearch(e.target.value));
  document.getElementById('resourcesSearch')?.addEventListener('input', (e) => handleResourceSearch(e.target.value));
  document.getElementById('aiSearch')?.addEventListener('input', (e) => handleAISearch(e.target.value));

  // Filtros
  document.getElementById('articlesFilter')?.addEventListener('change', (e) => loadArticles(e.target.value));
  document.getElementById('recipesFilter')?.addEventListener('change', (e) => loadRecipes(e.target.value));
  document.getElementById('supplementsFilter')?.addEventListener('change', (e) => loadSupplements(e.target.value));
  document.getElementById('resourcesFilter')?.addEventListener('change', (e) => loadResources(e.target.value));

  // Botones de agregar
  document.getElementById('addUserBtn')?.addEventListener('click', () => handleAddItem('user'));
  document.getElementById('addArticleBtn')?.addEventListener('click', () => handleAddItem('article'));
  document.getElementById('addRecipeBtn')?.addEventListener('click', () => handleAddItem('recipe'));
  document.getElementById('addSupplementBtn')?.addEventListener('click', () => handleAddItem('supplement'));
  document.getElementById('addResourceBtn')?.addEventListener('click', () => handleAddItem('resource'));
  document.getElementById('addPlanBtn')?.addEventListener('click', () => handleAddItem('plan'));
}

/**
 * Cambiar tab
 */
function switchTab(tabName) {
  // Actualizar tabs activos
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

  // Actualizar contenido
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`${tabName}-tab`)?.classList.add('active');

  // Cargar datos
  if (tabName === 'users') loadUsers();
  else if (tabName === 'articles') loadArticles();
  else if (tabName === 'recipes') loadRecipes();
  else if (tabName === 'supplements') loadSupplements();
  else if (tabName === 'resources') loadResources();
  else if (tabName === 'ai') loadAIConversations();
  else if (tabName === 'plans') loadPlans();
  else if (tabName === 'diabetes') AdminRevisionPage.loadCasosParaRevision();
}

/**
 * ESTADÍSTICAS
 */
async function loadDashboardStats() {
  const stats = AdminService.getAdminStats();
  document.getElementById('statUsers').textContent = stats.totalUsers || 0;
  document.getElementById('statArticles').textContent = stats.totalArticles || 0;
  document.getElementById('statRecipes').textContent = stats.totalRecipes || 0;
  document.getElementById('statSupplements').textContent = stats.totalSupplements || 0;
  document.getElementById('statResources').textContent = stats.totalResources || 0;
  document.getElementById('statConversations').textContent = stats.totalConversations || 0;
}

/**
 * USUARIOS
 */
async function loadUsers() {
  const usersList = document.getElementById('usersList');
  try {
    const users = await AdminService.getAllUsers();
    
    if (users.length === 0) {
      usersList.innerHTML = '<p class="empty">No hay usuarios</p>';
      return;
    }

    usersList.innerHTML = users.map(user => `
      <div class="admin-item">
        <div class="item-info">
          <p class="item-title">${user.name}</p>
          <p class="item-meta">${user.email} • Plan: ${user.plan}</p>
        </div>
        <div class="item-actions">
          <button class="admin-btn small" onclick="window.editItem('user', ${user.id})">Editar</button>
          <button class="admin-btn small danger" onclick="window.deleteItem('user', ${user.id})">Eliminar</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    usersList.innerHTML = '<p class="error">Error cargando usuarios</p>';
  }
}

async function handleUserSearch(query) {
  const usersList = document.getElementById('usersList');
  if (!query.trim()) {
    loadUsers();
    return;
  }
  
  try {
    const users = await AdminService.searchUsers(query);
    usersList.innerHTML = users.length === 0 
      ? '<p class="empty">No hay resultados</p>'
      : users.map(user => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${user.name}</p>
            <p class="item-meta">${user.email}</p>
          </div>
          <div class="item-actions">
            <button class="admin-btn small">Editar</button>
            <button class="admin-btn small danger">Eliminar</button>
          </div>
        </div>
      `).join('');
  } catch (error) {
    usersList.innerHTML = '<p class="error">Error en búsqueda</p>';
  }
}

/**
 * ARTÍCULOS
 */
async function loadArticles(filter = '') {
  const articlesList = document.getElementById('articlesList');
  try {
    const articles = await AdminService.getAllArticles();
    const filtered = filter === '' ? articles : articles.filter(a => String(a.published) === filter);
    
    if (filtered.length === 0) {
      articlesList.innerHTML = '<p class="empty">No hay artículos</p>';
      return;
    }

    articlesList.innerHTML = filtered.map(article => `
      <div class="admin-item">
        <div class="item-info">
          <p class="item-title">${article.title}</p>
          <p class="item-meta">${article.author || 'Anónimo'} • ${article.published ? `${getIcon('check', 12)} Publicado` : `${getIcon('edit', 12)} Borrador`}</p>
        </div>
        <div class="item-actions">
          <button class="admin-btn small" onclick="window.togglePublish('article', ${article.id}, ${!article.published})">
            ${article.published ? 'Despublicar' : 'Publicar'}
          </button>
          <button class="admin-btn small" onclick="window.editItem('article', ${article.id})">Editar</button>
          <button class="admin-btn small danger" onclick="window.deleteItem('article', ${article.id})">Eliminar</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    articlesList.innerHTML = '<p class="error">Error cargando artículos</p>';
  }
}

async function handleArticleSearch(query) {
  const articlesList = document.getElementById('articlesList');
  if (!query.trim()) {
    loadArticles();
    return;
  }
  
  try {
    const articles = await AdminService.searchArticles(query);
    articlesList.innerHTML = articles.length === 0 
      ? '<p class="empty">No hay resultados</p>'
      : articles.map(article => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${article.title}</p>
            <p class="item-meta">${article.published ? `${getIcon('check', 12)} Publicado` : `${getIcon('edit', 12)} Borrador`}</p>
          </div>
          <div class="item-actions">
            <button class="admin-btn small">Editar</button>
            <button class="admin-btn small danger">Eliminar</button>
          </div>
        </div>
      `).join('');
  } catch (error) {
    articlesList.innerHTML = '<p class="error">Error en búsqueda</p>';
  }
}

/**
 * RECETAS
 */
async function loadRecipes(filter = '') {
  const recipesList = document.getElementById('recipesList');
  try {
    const recipes = await AdminService.getAllRecipes();
    const filtered = filter === '' ? recipes : recipes.filter(r => String(r.published) === filter);
    
    recipesList.innerHTML = filtered.length === 0 
      ? '<p class="empty">No hay recetas</p>'
      : filtered.map(recipe => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${recipe.name}</p>
            <p class="item-meta">${recipe.servings || '-'} porciones • ${recipe.calories || '-'} kcal • ${recipe.published ? `${getIcon('check', 12)} Publicada` : `${getIcon('edit', 12)} Borrador`}</p>
          </div>
          <div class="item-actions">
            <button class="admin-btn small" onclick="window.togglePublish('recipe', ${recipe.id}, ${!recipe.published})">
              ${recipe.published ? 'Despublicar' : 'Publicar'}
            </button>
            <button class="admin-btn small">Editar</button>
            <button class="admin-btn small danger">Eliminar</button>
          </div>
        </div>
      `).join('');
  } catch (error) {
    recipesList.innerHTML = '<p class="error">Error cargando recetas</p>';
  }
}

async function handleRecipeSearch(query) {
  const recipesList = document.getElementById('recipesList');
  if (!query.trim()) {
    loadRecipes();
    return;
  }
  
  try {
    const recipes = await AdminService.searchRecipes(query);
    recipesList.innerHTML = recipes.length === 0 
      ? '<p class="empty">No hay resultados</p>'
      : recipes.map(recipe => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${recipe.name}</p>
            <p class="item-meta">${recipe.published ? `${getIcon('check', 12)} Publicada` : `${getIcon('edit', 12)} Borrador`}</p>
          </div>
        </div>
      `).join('');
  } catch (error) {
    recipesList.innerHTML = '<p class="error">Error en búsqueda</p>';
  }
}

/**
 * SUPLEMENTOS
 */
async function loadSupplements(filter = '') {
  const supplementsList = document.getElementById('supplementsList');
  try {
    const supplements = await AdminService.getAllSupplements();
    const filtered = filter === '' ? supplements : supplements.filter(s => String(s.published) === filter);
    
    supplementsList.innerHTML = filtered.length === 0 
      ? '<p class="empty">No hay suplementos</p>'
      : filtered.map(supplement => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${supplement.name}</p>
            <p class="item-meta">Dosis: ${supplement.dosage || '-'} • ${supplement.published ? `${getIcon('check', 12)} Publicado` : `${getIcon('edit', 12)} Borrador`}</p>
          </div>
          <div class="item-actions">
            <button class="admin-btn small" onclick="window.togglePublish('supplement', ${supplement.id}, ${!supplement.published})">
              ${supplement.published ? 'Despublicar' : 'Publicar'}
            </button>
            <button class="admin-btn small">Editar</button>
            <button class="admin-btn small danger">Eliminar</button>
          </div>
        </div>
      `).join('');
  } catch (error) {
    supplementsList.innerHTML = '<p class="error">Error cargando suplementos</p>';
  }
}

async function handleSupplementSearch(query) {
  const supplementsList = document.getElementById('supplementsList');
  if (!query.trim()) {
    loadSupplements();
    return;
  }
  
  try {
    const supplements = await AdminService.searchSupplements(query);
    supplementsList.innerHTML = supplements.length === 0 
      ? '<p class="empty">No hay resultados</p>'
      : supplements.map(s => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${s.name}</p>
          </div>
        </div>
      `).join('');
  } catch (error) {
    supplementsList.innerHTML = '<p class="error">Error en búsqueda</p>';
  }
}

/**
 * RECURSOS
 */
async function loadResources(filter = '') {
  const resourcesList = document.getElementById('resourcesList');
  try {
    const resources = await AdminService.getAllResources();
    const filtered = filter === '' ? resources : resources.filter(r => String(r.published) === filter);
    
    resourcesList.innerHTML = filtered.length === 0 
      ? '<p class="empty">No hay recursos</p>'
      : filtered.map(resource => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${resource.title}</p>
            <p class="item-meta">${resource.url || '-'} • ${resource.published ? `${getIcon('check', 12)} Publicado` : `${getIcon('edit', 12)} Borrador`}</p>
          </div>
          <div class="item-actions">
            <button class="admin-btn small" onclick="window.togglePublish('resource', ${resource.id}, ${!resource.published})">
              ${resource.published ? 'Despublicar' : 'Publicar'}
            </button>
            <button class="admin-btn small">Editar</button>
            <button class="admin-btn small danger">Eliminar</button>
          </div>
        </div>
      `).join('');
  } catch (error) {
    resourcesList.innerHTML = '<p class="error">Error cargando recursos</p>';
  }
}

async function handleResourceSearch(query) {
  const resourcesList = document.getElementById('resourcesList');
  if (!query.trim()) {
    loadResources();
    return;
  }
  
  try {
    const resources = await AdminService.searchResources(query);
    resourcesList.innerHTML = resources.length === 0 
      ? '<p class="empty">No hay resultados</p>'
      : resources.map(r => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${r.title}</p>
          </div>
        </div>
      `).join('');
  } catch (error) {
    resourcesList.innerHTML = '<p class="error">Error en búsqueda</p>';
  }
}

/**
 * IA
 */
async function loadAIConversations() {
  const aiList = document.getElementById('aiList');
  try {
    const conversations = await AdminService.getAIConversations();
    
    if (conversations.length === 0) {
      aiList.innerHTML = '<p class="empty">No hay conversaciones</p>';
      return;
    }

    aiList.innerHTML = conversations.map(conv => `
      <div class="admin-item">
        <div class="item-info">
          <p class="item-title">${getIcon('question', 14)} ${conv.question}</p>
          <p class="item-meta">${conv.user_email} • ${new Date(conv.created_at).toLocaleDateString()}</p>
        </div>
        <div class="item-actions">
          <button class="admin-btn small" onclick="window.viewItem('conversation', ${conv.id})">Ver</button>
          <button class="admin-btn small danger" onclick="window.deleteItem('conversation', ${conv.id})">Eliminar</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    aiList.innerHTML = '<p class="error">Error cargando conversaciones</p>';
  }
}

async function handleAISearch(query) {
  const aiList = document.getElementById('aiList');
  if (!query.trim()) {
    loadAIConversations();
    return;
  }
  
  try {
    const conversations = await AdminService.getAIConversations();
    const filtered = conversations.filter(c => 
      c.question.toLowerCase().includes(query.toLowerCase()) ||
      c.user_email.toLowerCase().includes(query.toLowerCase())
    );
    
    aiList.innerHTML = filtered.length === 0 
      ? '<p class="empty">No hay resultados</p>'
      : filtered.map(conv => `
        <div class="admin-item">
          <div class="item-info">
            <p class="item-title">${getIcon('question', 14)} ${conv.question}</p>
          </div>
        </div>
      `).join('');
  } catch (error) {
    aiList.innerHTML = '<p class="error">Error en búsqueda</p>';
  }
}

/**
 * PLANES
 */
async function loadPlans() {
  const plansList = document.getElementById('plansList');
  try {
    const plans = await AdminService.getAllPlans();
    
    if (plans.length === 0) {
      plansList.innerHTML = '<p class="empty">No hay planes</p>';
      return;
    }

    plansList.innerHTML = plans.map(plan => `
      <div class="admin-item">
        <div class="item-info">
          <p class="item-title">${plan.name}</p>
          <p class="item-meta">$${plan.price} • ${plan.features || '-'}</p>
        </div>
        <div class="item-actions">
          <button class="admin-btn small" onclick="window.editItem('plan', ${plan.id})">Editar</button>
          <button class="admin-btn small danger" onclick="window.deleteItem('plan', ${plan.id})">Eliminar</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    plansList.innerHTML = '<p class="error">Error cargando planes</p>';
  }
}

/**
 * Funciones globales para acciones
 */
window.togglePublish = async (type, id, published) => {
  try {
    if (type === 'article') await AdminService.toggleArticlePublish(id, published);
    else if (type === 'recipe') await AdminService.toggleRecipePublish(id, published);
    else if (type === 'supplement') await AdminService.toggleSupplementPublish(id, published);
    else if (type === 'resource') await AdminService.toggleResourcePublish(id, published);
    
    // Recargar lista
    if (type === 'article') loadArticles();
    else if (type === 'recipe') loadRecipes();
    else if (type === 'supplement') loadSupplements();
    else if (type === 'resource') loadResources();
  } catch (error) {
    alert('Error al cambiar estado de publicación');
  }
};

window.deleteItem = async (type, id) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este elemento?')) return;
  
  try {
    if (type === 'user') await AdminService.deleteUser(id);
    else if (type === 'article') await AdminService.deleteArticle(id);
    else if (type === 'recipe') await AdminService.deleteRecipe(id);
    else if (type === 'supplement') await AdminService.deleteSupplement(id);
    else if (type === 'resource') await AdminService.deleteResource(id);
    else if (type === 'conversation') await AdminService.deleteAIConversation(id);
    else if (type === 'plan') await AdminService.deletePlan(id);
    
    // Recargar lista
    if (type === 'user') loadUsers();
    else if (type === 'article') loadArticles();
    else if (type === 'recipe') loadRecipes();
    else if (type === 'supplement') loadSupplements();
    else if (type === 'resource') loadResources();
    else if (type === 'conversation') loadAIConversations();
    else if (type === 'plan') loadPlans();
  } catch (error) {
    alert('Error al eliminar');
  }
};

window.editItem = (type, id) => {
  alert(`Editar ${type} #${id} (en desarrollo)`);
};

window.viewItem = (type, id) => {
  alert(`Ver ${type} #${id} (en desarrollo)`);
};

function handleAddItem(type) {
  alert(`Agregar nuevo ${type} (en desarrollo)`);
}
