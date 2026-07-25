/**
 * ArticlesPage - Interfaz de Biblioteca de Artículos
 * Componente principal para navegación y visualización de artículos
 */

import * as ArticlesService from '../services/articlesService.js';
import * as FavoritesService from '../services/favoritesService.js';
import { getIcon } from '../components/icons.js';

// Estado de la interfaz
let currentView = 'grid'; // 'grid' o 'list'
let currentSort = 'recent'; // 'recent', 'title', 'reading_time'
let currentFilters = {
  category: null,
  difficulty: null,
  tags: [],
  searchQuery: ''
};

/**
 * Renderizar página de artículos
 */
export function renderArticlesPage() {
  const mainContent = document.querySelector('main');
  if (!mainContent) {
    console.warn('⚠️ No se encontró elemento <main>');
    return;
  }

  // Limpiar contenido anterior
  mainContent.innerHTML = '';

  // Crear estructura de la página
  const container = document.createElement('div');
  container.className = 'articles-page-container';
  container.innerHTML = `
    <div class="articles-header">
      <div class="articles-header-content">
        <h1>Biblioteca Científica</h1>
        <p>Accede a artículos, guías y protocolos basados en evidencia</p>
      </div>
    </div>

    <div class="articles-main-content">
      <!-- Sidebar con filtros -->
      <aside class="articles-sidebar">
        <div class="articles-search-box">
          <input 
            type="text" 
            id="articlesSearchInput" 
            placeholder="Buscar artículos..." 
            class="articles-search-input"
          />
          <button id="articlesClearSearchBtn" class="articles-clear-search" title="Limpiar">${getIcon('close', 14)}</button>
        </div>

        <div class="articles-filters">
          <!-- Filtro de categorías -->
          <div class="filter-group">
            <h3 class="filter-title">Categorías</h3>
            <div class="filter-options" id="categoriesFilter"></div>
          </div>

          <!-- Filtro de dificultad -->
          <div class="filter-group">
            <h3 class="filter-title">Dificultad</h3>
            <div class="filter-options" id="difficultyFilter"></div>
          </div>

          <!-- Filtro de tags -->
          <div class="filter-group">
            <h3 class="filter-title">Tags</h3>
            <div class="filter-options" id="tagsFilter"></div>
          </div>

          <!-- Estadísticas -->
          <div class="articles-stats">
            <div class="stat-item">
              <div class="stat-value" id="totalArticlesCount">0</div>
              <div class="stat-label">Artículos</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="avgReadingTimeCount">0</div>
              <div class="stat-label">Min. lectura</div>
            </div>
          </div>

          <!-- Botón de limpiar filtros -->
          <button id="clearFiltersBtn" class="clear-filters-btn">Limpiar Filtros</button>
        </div>
      </aside>

      <!-- Contenido principal -->
      <main class="articles-main">
        <!-- Barra de vista -->
        <div class="articles-view-bar">
          <div class="articles-view-controls">
            <button class="view-btn grid-view-btn active" id="gridViewBtn" title="Vista de cuadrícula">
              ⊞ Cuadrícula
            </button>
            <button class="view-btn list-view-btn" id="listViewBtn" title="Vista de lista">
              ≡ Lista
            </button>
          </div>
          <div class="articles-sort-controls">
            <label for="sortSelect">Ordenar por:</label>
            <select id="sortSelect" class="sort-select">
              <option value="recent">Más recientes</option>
              <option value="title">Título (A-Z)</option>
              <option value="reading">Tiempo de lectura</option>
            </select>
          </div>
        </div>

        <!-- Destacados -->
        <section class="articles-featured">
          <h2>Artículos Destacados</h2>
          <div class="featured-articles-grid" id="featuredArticlesContainer"></div>
        </section>

        <!-- Listado de artículos -->
        <section class="articles-section">
          <h2 id="articlesTitle">Todos los Artículos</h2>
          <div class="articles-grid" id="articlesContainer"></div>
        </section>

        <!-- Sin resultados -->
        <div class="articles-empty-state" id="emptyStateContainer" style="display: none;">
          <div class="empty-icon">${getIcon('book', 32)}</div>
          <h3>No hay artículos</h3>
          <p>Intenta ajustar tus filtros de búsqueda</p>
        </div>
      </main>
    </div>
  `;

  mainContent.appendChild(container);

  // Inicializar la página
  initializeArticlesPage();
}

/**
 * Inicializar página de artículos
 */
function initializeArticlesPage() {
  populateCategoryFilters();
  populateDifficultyFilters();
  populateTagFilters();
  setupSearchListener();
  setupFilterListeners();
  setupViewControls();
  setupSortControls();
  updateLibraryStats();
  renderFeaturedArticles();
  renderAllArticles();
}

/**
 * Rellenar filtros de categorías
 */
function populateCategoryFilters() {
  const container = document.getElementById('categoriesFilter');
  if (!container) return;

  const categories = ArticlesService.getCategories();
  
  const html = categories.map(cat => `
    <label class="filter-checkbox">
      <input type="checkbox" value="${cat}" data-filter-type="category" class="category-filter">
      <span>${cat}</span>
    </label>
  `).join('');

  container.innerHTML = html;
}

/**
 * Rellenar filtros de dificultad
 */
function populateDifficultyFilters() {
  const container = document.getElementById('difficultyFilter');
  if (!container) return;

  const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
  
  const html = difficulties.map(diff => `
    <label class="filter-checkbox">
      <input type="checkbox" value="${diff}" data-filter-type="difficulty" class="difficulty-filter">
      <span>${diff}</span>
    </label>
  `).join('');

  container.innerHTML = html;
}

/**
 * Rellenar filtros de tags
 */
function populateTagFilters() {
  const container = document.getElementById('tagsFilter');
  if (!container) return;

  const tags = ArticlesService.getAllTags();
  
  if (tags.length === 0) {
    container.innerHTML = '<p style="font-size: 0.85rem; color: #999;">No hay tags disponibles</p>';
    return;
  }

  const html = tags.map(tag => `
    <label class="filter-checkbox">
      <input type="checkbox" value="${tag}" data-filter-type="tag" class="tag-filter">
      <span>${tag}</span>
    </label>
  `).join('');

  container.innerHTML = html;
}

/**
 * Agregar búsqueda al historial
 */
function addSearchToHistory(query) {
  if (!query || query.length < 2) return;

  let history = JSON.parse(localStorage.getItem('isocore_search_history') || '[]');
  
  // Evitar duplicados - remover si ya existe
  history = history.filter(h => h !== query);
  
  // Agregar al principio
  history.unshift(query);
  
  // Limitar a 10 búsquedas
  history = history.slice(0, 10);
  
  localStorage.setItem('isocore_search_history', JSON.stringify(history));
}

/**
 * Obtener historial de búsquedas
 */
function getSearchHistory() {
  return JSON.parse(localStorage.getItem('isocore_search_history') || '[]');
}

/**
 * Limpiar historial de búsquedas
 */
function clearSearchHistory() {
  localStorage.removeItem('isocore_search_history');
  console.log('🗑️ Historial de búsquedas limpiado');
}

/**
 * Configurar listener de búsqueda
 */
function setupSearchListener() {
  const searchInput = document.getElementById('articlesSearchInput');
  const clearBtn = document.getElementById('articlesClearSearchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilters.searchQuery = e.target.value;
      clearBtn?.classList.toggle('visible', e.target.value.length > 0);
      updateArticlesDisplay();
    });

    // Guardar búsqueda en historial cuando pierde el foco
    searchInput.addEventListener('blur', (e) => {
      if (e.target.value.length >= 2) {
        addSearchToHistory(e.target.value);
      }
    });

    // Permitir guardar con Enter
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.length >= 2) {
        addSearchToHistory(e.target.value);
        console.log('📝 Búsqueda guardada en historial');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      currentFilters.searchQuery = '';
      searchInput.value = '';
      clearBtn.classList.remove('visible');
      updateArticlesDisplay();
    });
  }
}

/**
 * Configurar listeners de filtros
 */
function setupFilterListeners() {
  // Filtros de categoría
  document.querySelectorAll('.category-filter').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      currentFilters.category = e.target.checked ? e.target.value : null;
      updateArticlesDisplay();
    });
  });

  // Filtros de dificultad
  document.querySelectorAll('.difficulty-filter').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      currentFilters.difficulty = e.target.checked ? e.target.value : null;
      updateArticlesDisplay();
    });
  });

  // Filtros de tags
  document.querySelectorAll('.tag-filter').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        currentFilters.tags.push(e.target.value);
      } else {
        currentFilters.tags = currentFilters.tags.filter(t => t !== e.target.value);
      }
      updateArticlesDisplay();
    });
  });

  // Botón de limpiar filtros
  const clearBtn = document.getElementById('clearFiltersBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      currentFilters = {
        category: null,
        difficulty: null,
        tags: [],
        searchQuery: ''
      };
      document.getElementById('articlesSearchInput').value = '';
      document.querySelectorAll('.category-filter, .difficulty-filter, .tag-filter').forEach(cb => cb.checked = false);
      updateArticlesDisplay();
    });
  }
}

/**
 * Configurar controles de vista
 */
function setupViewControls() {
  const gridBtn = document.getElementById('gridViewBtn');
  const listBtn = document.getElementById('listViewBtn');
  const container = document.getElementById('articlesContainer');

  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      currentView = 'grid';
      gridBtn.classList.add('active');
      listBtn?.classList.remove('active');
      container?.classList.remove('list-view');
      container?.classList.add('grid-view');
    });
  }

  if (listBtn) {
    listBtn.addEventListener('click', () => {
      currentView = 'list';
      listBtn.classList.add('active');
      gridBtn?.classList.remove('active');
      container?.classList.remove('grid-view');
      container?.classList.add('list-view');
    });
  }
}

/**
 * Configurar controles de ordenamiento
 */
function setupSortControls() {
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      console.log('📊 Ordenando por:', currentSort);
      updateArticlesDisplay();
    });
  }
}

/**
 * Actualizar estadísticas de la biblioteca
 */
function updateLibraryStats() {
  const stats = ArticlesService.getLibraryStats();
  
  const totalCount = document.getElementById('totalArticlesCount');
  const avgReadingCount = document.getElementById('avgReadingTimeCount');

  if (totalCount) totalCount.textContent = stats.totalArticles || 0;
  if (avgReadingCount) avgReadingCount.textContent = stats.averageReadingTime || 0;
}

/**
 * Renderizar artículos destacados
 */
function renderFeaturedArticles() {
  const featured = ArticlesService.getFeaturedArticles();
  const container = document.getElementById('featuredArticlesContainer');

  if (!container) return;

  if (featured.length === 0) {
    container.innerHTML = '<p>No hay artículos destacados</p>';
    return;
  }

  const html = featured.slice(0, 3).map(article => `
    <article class="featured-article-card">
      <div class="featured-article-image">
        <img src="${article.image}" alt="${article.title}" />
        <div class="featured-article-category">${article.category}</div>
      </div>
      <div class="featured-article-content">
        <h3>${article.title}</h3>
        <p>${article.excerpt}</p>
        <div class="featured-article-meta">
          <span class="reading-time">⏱️ ${article.reading_time} min</span>
          <span class="difficulty ${article.difficulty.toLowerCase()}">${article.difficulty}</span>
        </div>
        <button class="featured-article-btn" onclick="window.articlesPage_viewArticle('${article.id}')">
          Leer artículo →
        </button>
      </div>
    </article>
  `).join('');

  container.innerHTML = html;
}

/**
 * Renderizar todos los artículos con filtros aplicados
 */
function renderAllArticles() {
  updateArticlesDisplay();
}

/**
 * Actualizar visualización de artículos
 */
function updateArticlesDisplay() {
  let articles = ArticlesService.getArticles();

  // Aplicar filtro de búsqueda
  if (currentFilters.searchQuery) {
    articles = ArticlesService.searchArticles(currentFilters.searchQuery);
  }

  // Aplicar filtro de categoría
  if (currentFilters.category) {
    articles = articles.filter(a => a.category === currentFilters.category);
  }

  // Aplicar filtro de dificultad
  if (currentFilters.difficulty) {
    articles = articles.filter(a => a.difficulty === currentFilters.difficulty);
  }

  // Aplicar filtro de tags
  if (currentFilters.tags.length > 0) {
    articles = articles.filter(a =>
      a.tags && a.tags.some(tag => currentFilters.tags.includes(tag))
    );
  }

  // Aplicar ordenamiento
  articles = ArticlesService.sortArticles(articles, currentSort, 'desc');

  const container = document.getElementById('articlesContainer');
  const emptyState = document.getElementById('emptyStateContainer');
  const title = document.getElementById('articlesTitle');

  if (!container) return;

  // Actualizar título según filtros
  if (currentFilters.category) {
    title.textContent = `Artículos de ${currentFilters.category}`;
  } else if (currentFilters.searchQuery) {
    title.textContent = `Resultados para "${currentFilters.searchQuery}"`;
  } else {
    title.textContent = 'Todos los Artículos';
  }

  if (articles.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = articles.map(article => renderArticleCard(article)).join('');
}

/**
 * Renderizar tarjeta de artículo
 */
function renderArticleCard(article) {
  const isFavorite = FavoritesService.isFavorite('articles', article.id);
  const favoriteClass = isFavorite ? 'active' : '';
  const favoriteIcon = getIcon('heart', 16);
  const image = article.image || './src/assets/stock/card-articulo.jpg';

  return `
    <article class="article-card">
      <div class="article-card-image">
        <img src="${image}" alt="${article.title}" loading="lazy" />
        <div class="article-card-category">${article.category}</div>
      </div>
      <div class="article-card-content">
        <div class="article-card-header">
          <h3 class="article-card-title">${article.title}</h3>
          <button
            class="article-favorite-btn ${favoriteClass}"
            onclick="window.articlesPage_toggleFavorite('${article.id}', '${article.title}')"
            title="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
          >
            ${favoriteIcon}
          </button>
        </div>
        <p class="article-card-excerpt">${article.excerpt}</p>
        <div class="article-card-meta">
          <span class="reading-time">${getIcon('clock', 14)} ${article.reading_time} min</span>
          <span class="difficulty ${article.difficulty.toLowerCase()}">${article.difficulty}</span>
          <span class="author">${getIcon('user', 14)} ${article.author}</span>
        </div>
        <button 
          class="article-read-btn"
          onclick="window.articlesPage_viewArticle('${article.id}')"
        >
          Leer artículo →
        </button>
      </div>
    </article>
  `;
}

/**
 * Ver artículo completo (abre modal o navega)
 */
export function viewArticle(articleId) {
  const article = ArticlesService.getArticle(articleId);
  
  if (!article) {
    console.warn('⚠️ Artículo no encontrado:', articleId);
    return;
  }

  console.log(`📖 Abriendo artículo: ${article.title}`);

  // Renderizar vista de artículo completo
  renderArticleDetailView(article);
}

/**
 * Renderizar vista detallada de artículo
 */
function renderArticleDetailView(article) {
  const mainContent = document.querySelector('main');
  if (!mainContent) return;

  const isFavorite = FavoritesService.isFavorite('articles', article.id);
  const favoriteIcon = getIcon('heart', 18);

  const relatedArticles = ArticlesService.getRelatedArticles(article.id);

  const html = `
    <div class="article-detail-container">
      <button class="article-back-btn" onclick="window.articlesPage_backToLibrary()">
        ← Volver a Biblioteca
      </button>

      <article class="article-detail">
        <header class="article-detail-header">
          <div class="article-detail-category">${article.category}</div>
          <h1 class="article-detail-title">${article.title}</h1>
          <p class="article-detail-excerpt">${article.excerpt}</p>
          
          <div class="article-detail-meta">
            <div class="meta-group">
              <span class="meta-item">${getIcon('clock', 14)} ${article.reading_time} minutos de lectura</span>
              <span class="meta-item">${getIcon('chart', 14)} Nivel: <strong>${article.difficulty}</strong></span>
              <span class="meta-item">${getIcon('user', 14)} ${article.author}</span>
            </div>
            <button 
              class="article-detail-favorite ${isFavorite ? 'active' : ''}"
              onclick="window.articlesPage_toggleFavorite('${article.id}', '${article.title}')"
            >
              ${favoriteIcon} ${isFavorite ? 'En favoritos' : 'Añadir a favoritos'}
            </button>
          </div>
        </header>

        <img class="article-detail-image" src="${article.image}" alt="${article.title}" />

        <div class="article-detail-content">
          <div class="article-body">
            ${article.content}
          </div>

          <div class="article-tags">
            <strong>Temas:</strong>
            <div class="tags-list">
              ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </div>
        </div>
      </article>

      ${relatedArticles.length > 0 ? `
        <section class="article-related">
          <h2>Artículos Relacionados</h2>
          <div class="related-articles-grid">
            ${relatedArticles.map(related => renderArticleCard(related)).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;

  mainContent.innerHTML = html;
}

/**
 * Alternar favorito para un artículo
 */
export async function toggleFavorite(articleId, articleTitle) {
  const article = ArticlesService.getArticle(articleId);
  if (!article) return;

  const isFavorite = FavoritesService.isFavorite('articles', articleId);

  if (isFavorite) {
    await FavoritesService.removeFavorite('articles', articleId);
    console.log(`💔 Artículo eliminado de favoritos: ${articleTitle}`);
  } else {
    await FavoritesService.addFavorite(
      'articles',
      articleId,
      articleTitle,
      { category: article.category, author: article.author }
    );
    console.log(`❤️ Artículo añadido a favoritos: ${articleTitle}`);
  }

  // Actualizar UI
  updateArticlesDisplay();
}

/**
 * Volver a la biblioteca desde vista de detalle
 */
export function backToLibrary() {
  renderArticlesPage();
}

// Funciones globales para eventos inline
window.articlesPage_viewArticle = viewArticle;
window.articlesPage_toggleFavorite = toggleFavorite;
window.articlesPage_backToLibrary = backToLibrary;
