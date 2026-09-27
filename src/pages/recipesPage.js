/**
 * RecipesPage - Catálogo de recetas
 * Vive detrás del módulo "Recetas" del home. Reutiliza recipesService.js
 * (ya cargaba el catálogo real de Supabase desde el login, pero no tenía
 * ninguna pantalla que lo mostrara) y sigue el mismo patrón que
 * articlesPage.js: grid con filtros en el sidebar + vista de detalle a
 * página completa.
 */

import * as RecipesService from '../services/recipesService.js';
import * as FavoritesService from '../services/favoritesService.js';
import { getCurrentPlan } from '../services/planService.js';
import { getIcon } from '../components/icons.js';

const MEAL_TYPE_LABELS = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
  merienda: 'Merienda',
  snack: 'Snack',
  postre: 'Postre'
};

const DIFFICULTY_LABELS = {
  facil: 'Fácil',
  medio: 'Medio',
  dificil: 'Difícil'
};

const TIER_RANK = { free: 0, premium: 1, vip: 2 };

let currentFilters = {
  mealType: null,
  difficulty: null,
  searchQuery: ''
};

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

/**
 * Renderizar página de recetas
 */
export function renderRecipesPage() {
  const mainContent = document.querySelector('main');
  if (!mainContent) {
    console.warn('⚠️ No se encontró elemento <main>');
    return;
  }

  currentFilters = { mealType: null, difficulty: null, searchQuery: '' };

  mainContent.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'recipes-page-container';
  container.innerHTML = `
    <div class="recipes-header">
      <button class="recipes-back-btn" id="recipesBackBtn">← Volver</button>
      <div class="recipes-header-content">
        <h1>Recetas</h1>
        <p>Descubre recetas nutricionales personalizadas según tus necesidades.</p>
      </div>
    </div>

    <div class="recipes-main-content">
      <aside class="recipes-sidebar">
        <div class="recipes-search-box">
          <input
            type="text"
            id="recipesSearchInput"
            placeholder="Buscar recetas..."
            class="recipes-search-input"
          />
        </div>

        <div class="recipes-filters">
          <div class="recipes-filter-group">
            <h3 class="recipes-filter-title">Tipo de comida</h3>
            <div class="recipes-filter-chips" id="mealTypeFilter"></div>
          </div>

          <div class="recipes-filter-group">
            <h3 class="recipes-filter-title">Dificultad</h3>
            <div class="recipes-filter-chips" id="difficultyFilter"></div>
          </div>

          <div class="recipes-stats">
            <div class="stat-item">
              <div class="stat-value" id="totalRecipesCount">0</div>
              <div class="stat-label">Recetas</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="avgPrepTimeCount">0</div>
              <div class="stat-label">Min. media</div>
            </div>
          </div>

          <button id="recipesClearFiltersBtn" class="recipes-clear-filters-btn">Limpiar filtros</button>
        </div>
      </aside>

      <main class="recipes-section">
        <h2 id="recipesResultsTitle">Todas las recetas</h2>
        <div class="recipes-grid" id="recipesGrid"></div>
        <div class="recipes-empty-state" id="recipesEmptyState" style="display:none;">
          <p>No encontramos recetas con esos filtros.</p>
        </div>
      </main>
    </div>
  `;

  mainContent.appendChild(container);
  initializeRecipesPage();
}

function initializeRecipesPage() {
  document.getElementById('recipesBackBtn')?.addEventListener('click', () => {
    window.homePage_goHome();
  });

  populateMealTypeFilters();
  populateDifficultyFilters();
  setupSearchListener();
  setupClearFiltersListener();
  updateStats();
  renderRecipesGrid();
}

function getAllRecipes() {
  const recipes = RecipesService.getRecipes();
  // El catálogo se inicializa en el login (initializeRecipesService); si
  // por lo que sea aún no cargó nada, se fuerza una recarga silenciosa.
  if (!recipes || recipes.length === 0) {
    RecipesService.reloadRecipes().then(() => renderRecipesGrid());
  }
  return recipes || [];
}

function populateMealTypeFilters() {
  const container = document.getElementById('mealTypeFilter');
  if (!container) return;

  const types = [...new Set(getAllRecipes().map((r) => r.meal_type).filter(Boolean))];

  container.innerHTML = types.map((type) => `
    <button type="button" class="recipes-filter-chip" data-meal-type="${escapeHtml(type)}">
      ${escapeHtml(MEAL_TYPE_LABELS[type] || type)}
    </button>
  `).join('');

  container.querySelectorAll('[data-meal-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.mealType;
      currentFilters.mealType = currentFilters.mealType === value ? null : value;
      container.querySelectorAll('[data-meal-type]').forEach((b) => b.classList.toggle('active', b.dataset.mealType === currentFilters.mealType));
      renderRecipesGrid();
    });
  });
}

function populateDifficultyFilters() {
  const container = document.getElementById('difficultyFilter');
  if (!container) return;

  const difficulties = [...new Set(getAllRecipes().map((r) => r.difficulty).filter(Boolean))];

  container.innerHTML = difficulties.map((diff) => `
    <button type="button" class="recipes-filter-chip" data-difficulty="${escapeHtml(diff)}">
      ${escapeHtml(DIFFICULTY_LABELS[diff] || diff)}
    </button>
  `).join('');

  container.querySelectorAll('[data-difficulty]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.difficulty;
      currentFilters.difficulty = currentFilters.difficulty === value ? null : value;
      container.querySelectorAll('[data-difficulty]').forEach((b) => b.classList.toggle('active', b.dataset.difficulty === currentFilters.difficulty));
      renderRecipesGrid();
    });
  });
}

function setupSearchListener() {
  const input = document.getElementById('recipesSearchInput');
  input?.addEventListener('input', () => {
    currentFilters.searchQuery = input.value.trim();
    renderRecipesGrid();
  });
}

function setupClearFiltersListener() {
  document.getElementById('recipesClearFiltersBtn')?.addEventListener('click', () => {
    currentFilters = { mealType: null, difficulty: null, searchQuery: '' };
    document.getElementById('recipesSearchInput').value = '';
    document.querySelectorAll('.recipes-filter-chip').forEach((b) => b.classList.remove('active'));
    renderRecipesGrid();
  });
}

function updateStats() {
  const recipes = getAllRecipes();
  document.getElementById('totalRecipesCount').textContent = recipes.length;
  const avgTime = recipes.length
    ? Math.round(recipes.reduce((sum, r) => sum + (parseInt(r.prep_time) || 0), 0) / recipes.length)
    : 0;
  document.getElementById('avgPrepTimeCount').textContent = avgTime;
}

function getFilteredRecipes() {
  let result = getAllRecipes().filter((r) => r.active !== false);

  if (currentFilters.mealType) {
    result = result.filter((r) => r.meal_type === currentFilters.mealType);
  }
  if (currentFilters.difficulty) {
    result = result.filter((r) => r.difficulty === currentFilters.difficulty);
  }
  if (currentFilters.searchQuery && currentFilters.searchQuery.length >= 2) {
    const q = currentFilters.searchQuery.toLowerCase();
    result = result.filter((r) =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.ingredients && r.ingredients.toLowerCase().includes(q))
    );
  }

  return result;
}

function renderRecipesGrid() {
  const grid = document.getElementById('recipesGrid');
  const emptyState = document.getElementById('recipesEmptyState');
  if (!grid) return;

  const recipes = getFilteredRecipes();
  document.getElementById('recipesResultsTitle').textContent = `${recipes.length} receta${recipes.length === 1 ? '' : 's'}`;

  if (recipes.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  grid.innerHTML = recipes.map(renderRecipeCardHTML).join('');

  grid.querySelectorAll('[data-open-recipe]').forEach((el) => {
    el.addEventListener('click', () => viewRecipe(el.dataset.openRecipe));
  });
}

function renderRecipeCardHTML(recipe) {
  const locked = !canAccessTier(recipe.tier || 'free');
  const mealLabel = MEAL_TYPE_LABELS[recipe.meal_type] || recipe.meal_type || '';
  const media = recipe.image
    ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}" loading="lazy" />`
    : getIcon('leaf', 32);

  return `
    <article class="recipe-card" data-open-recipe="${recipe.id}">
      <div class="recipe-card-media">
        ${media}
        ${mealLabel ? `<span class="recipe-card-badge">${escapeHtml(mealLabel)}</span>` : ''}
        ${recipe.isNew ? '<span class="recipe-card-new">Nueva</span>' : ''}
        ${locked ? `<div class="recipe-card-lock-overlay">${getIcon('lock', 22)}</div>` : ''}
      </div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${escapeHtml(recipe.title)}</h3>
        <div class="recipe-card-meta">
          ${recipe.calories ? `<span>${getIcon('flash', 13)} ${recipe.calories} kcal</span>` : ''}
          ${recipe.prep_time ? `<span>${getIcon('clock', 13)} ${recipe.prep_time} min</span>` : ''}
          ${recipe.difficulty ? `<span>${DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}</span>` : ''}
        </div>
        <button type="button" class="recipe-card-cta ${locked ? 'locked' : ''}" data-open-recipe="${recipe.id}">
          ${locked ? `${getIcon('lock', 13)} Hazte Premium` : 'Ver receta'}
        </button>
      </div>
    </article>
  `;
}

/**
 * Abre la vista de detalle de una receta (o el aviso de bloqueo si el
 * plan del usuario no da acceso).
 */
function viewRecipe(recipeId) {
  const recipe = RecipesService.getRecipe(recipeId);
  if (!recipe) {
    console.warn('⚠️ Receta no encontrada:', recipeId);
    return;
  }

  if (!canAccessTier(recipe.tier || 'free')) {
    showRecipeNotice('Esta receta es contenido premium. Actualiza tu plan para acceder.');
    return;
  }

  renderRecipeDetailView(recipe);
}
window.recipesPage_viewRecipe = viewRecipe;

function renderRecipeDetailView(recipe) {
  const mainContent = document.querySelector('main');
  if (!mainContent) return;

  const isFavorite = FavoritesService.isFavorite('recipe', String(recipe.id));
  const ingredients = (recipe.ingredients || '')
    .split(';')
    .map((i) => i.trim())
    .filter(Boolean);
  const steps = (recipe.steps || '')
    .split('\n')
    .map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  const media = recipe.image
    ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}" />`
    : getIcon('leaf', 48);

  mainContent.innerHTML = `
    <div class="recipe-detail-container">
      <button class="recipes-back-btn" style="position:static; margin-bottom:16px; color:var(--recipes-brand); background:none; border:1px solid var(--recipes-border);" id="recipeDetailBackBtn">← Volver a Recetas</button>

      <article class="recipe-detail">
        <div class="recipe-detail-media">${media}</div>
        <div class="recipe-detail-body">
          ${recipe.meal_type ? `<span class="recipe-detail-badge">${escapeHtml(MEAL_TYPE_LABELS[recipe.meal_type] || recipe.meal_type)}</span>` : ''}
          <h1 class="recipe-detail-title">${escapeHtml(recipe.title)}</h1>

          <div class="recipe-detail-meta">
            ${recipe.prep_time ? `<span class="meta-item">${getIcon('clock', 14)} ${recipe.prep_time} minutos</span>` : ''}
            ${recipe.difficulty ? `<span class="meta-item">${getIcon('chart', 14)} ${DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}</span>` : ''}
            <button class="recipe-detail-favorite ${isFavorite ? 'active' : ''}" id="recipeFavoriteBtn">
              ${getIcon('heart', 16)} ${isFavorite ? 'En favoritos' : 'Añadir a favoritos'}
            </button>
          </div>

          <div class="recipe-macros">
            ${recipe.calories ? `<div class="recipe-macro-item"><div class="recipe-macro-value">${recipe.calories}</div><div class="recipe-macro-label">kcal</div></div>` : ''}
            ${recipe.protein ? `<div class="recipe-macro-item"><div class="recipe-macro-value">${recipe.protein}g</div><div class="recipe-macro-label">Proteína</div></div>` : ''}
            ${recipe.carbs ? `<div class="recipe-macro-item"><div class="recipe-macro-value">${recipe.carbs}g</div><div class="recipe-macro-label">Carbos</div></div>` : ''}
            ${recipe.fat ? `<div class="recipe-macro-item"><div class="recipe-macro-value">${recipe.fat}g</div><div class="recipe-macro-label">Grasas</div></div>` : ''}
          </div>

          ${ingredients.length ? `
            <div class="recipe-detail-section">
              <h3>Ingredientes</h3>
              <ul class="recipe-ingredients-list">
                ${ingredients.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${steps.length ? `
            <div class="recipe-detail-section">
              <h3>Preparación</h3>
              <ol class="recipe-steps-list">
                ${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
              </ol>
            </div>
          ` : ''}

          ${recipe.tags && recipe.tags.length ? `
            <div class="recipe-detail-section">
              <h3>Etiquetas</h3>
              <div class="recipe-tags-list">
                ${recipe.tags.map((t) => `<span class="recipe-tag">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </article>
    </div>
  `;

  document.getElementById('recipeDetailBackBtn')?.addEventListener('click', () => {
    renderRecipesPage();
  });

  document.getElementById('recipeFavoriteBtn')?.addEventListener('click', () => toggleRecipeFavorite(recipe));
}

async function toggleRecipeFavorite(recipe) {
  const id = String(recipe.id);
  const isFavorite = FavoritesService.isFavorite('recipe', id);

  if (isFavorite) {
    await FavoritesService.removeFavorite('recipe', id);
  } else {
    await FavoritesService.addFavorite('recipe', id, recipe.title, { meal_type: recipe.meal_type });
  }

  renderRecipeDetailView(recipe);
}

function showRecipeNotice(message) {
  let notice = document.getElementById('recipesNotice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'recipesNotice';
    notice.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--recipes-brand, #184A3A);color:white;padding:12px 20px;border-radius:10px;z-index:9999;font-size:0.9rem;box-shadow:0 6px 20px rgba(0,0,0,0.2);';
    document.body.appendChild(notice);
  }
  notice.textContent = message;
  notice.style.display = 'block';
  window.clearTimeout(showRecipeNotice.timeoutId);
  showRecipeNotice.timeoutId = window.setTimeout(() => { notice.style.display = 'none'; }, 3500);
}
