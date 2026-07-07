import { initSupplementsModule } from '../components/supplements.js';

export function renderSupplementsPage() {
  const appRoot = document.getElementById('app');
  appRoot.innerHTML = `
    <main class="page-shell">
      <section class="section header-section">
        <div class="header-line">
          <button class="ghost-button" type="button">← Centro</button>
        </div>
        <div class="page-title-block">
          <p class="eyebrow">Suplementos</p>
          <h1>Conocimiento basado en evidencia científica.</h1>
        </div>
      </section>

      <section class="section search-section">
        <div class="search-group">
          <label for="searchInput" class="search-label">Buscar un suplemento</label>
          <div class="search-box">
            <input id="searchInput" class="search-input" type="search" placeholder="Buscar un suplemento..." autocomplete="off" />
          </div>
          <p class="search-help">Ejemplos: Vitamina D · Magnesio · Omega 3 · Creatina · Hierro</p>
        </div>
        <div class="suggestions" id="suggestions"></div>
      </section>

      <section class="section results-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Resultados</p>
            <h2>Encuentra información clara en segundos.</h2>
          </div>
          <p class="section-copy">Cada suplemento resume su propósito, evidencia y contexto con claridad.</p>
        </div>
        <div id="resultsGrid" class="results-grid"></div>
        <p id="emptyMessage" class="empty-message" hidden>No se encontró ningún suplemento con ese término.</p>
      </section>
    </main>

    <aside class="detail-panel show" id="detailPanel" aria-live="polite">
      <div class="panel-inner">
        <button class="close-panel" id="closePanel" type="button">✕</button>
        <div class="detail-top">
          <p class="eyebrow">Ficha del suplemento</p>
          <h2 id="detailTitle">Selecciona un suplemento</h2>
        </div>

        <div id="detailPlaceholder" class="detail-placeholder">
          <p>Elige un suplemento para ver su resumen científico, cuándo es útil y qué considerar.</p>
        </div>

        <div id="detailFields" class="detail-fields hidden">
          <p class="detail-description" id="detailDescription"></p>
          <div class="detail-block">
            <h3>¿Para qué sirve?</h3>
            <p id="detailPurpose"></p>
          </div>
          <div class="detail-block">
            <h3>¿Cuándo puede ser útil?</h3>
            <p id="detailWhen"></p>
          </div>
          <div class="detail-block">
            <h3>Nivel de evidencia científica</h3>
            <p id="detailEvidence"></p>
          </div>
          <div class="detail-block">
            <h3>Precauciones generales</h3>
            <p id="detailPrecautions"></p>
          </div>
          <div class="detail-note">
            <strong>Importante:</strong> Este contenido es informativo y no sustituye el consejo profesional.
          </div>
          <div class="detail-actions">
            <button class="secondary-button" id="favoriteButton">Añadir a favoritos</button>
            <button class="ghost-button" id="askButton">Preguntar</button>
          </div>
          <p id="actionNote" class="action-note hidden" role="status"></p>
          <div class="related-section">
            <h3>También puede interesarte</h3>
            <div id="relatedGrid" class="related-grid"></div>
          </div>
        </div>
      </div>
    </aside>
  `;

  initSupplementsModule();
}
