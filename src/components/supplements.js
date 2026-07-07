import { loadSupplements } from '../services/supplementService.js';

const suggestions = ['Vitamina D', 'Omega 3', 'Magnesio', 'Creatina', 'Probióticos', 'Hierro'];
let activeSupplement = null;
let currentData = [];
const favorites = new Set();
const elements = {};

function queryElements() {
  elements.searchInput = document.getElementById('searchInput');
  elements.suggestionsContainer = document.getElementById('suggestions');
  elements.resultsGrid = document.getElementById('resultsGrid');
  elements.emptyMessage = document.getElementById('emptyMessage');
  elements.detailTitle = document.getElementById('detailTitle');
  elements.detailDescription = document.getElementById('detailDescription');
  elements.detailPurpose = document.getElementById('detailPurpose');
  elements.detailWhen = document.getElementById('detailWhen');
  elements.detailEvidence = document.getElementById('detailEvidence');
  elements.detailPrecautions = document.getElementById('detailPrecautions');
  elements.detailFields = document.getElementById('detailFields');
  elements.detailPlaceholder = document.getElementById('detailPlaceholder');
  elements.relatedGrid = document.getElementById('relatedGrid');
  elements.favoriteButton = document.getElementById('favoriteButton');
  elements.askButton = document.getElementById('askButton');
  elements.actionNote = document.getElementById('actionNote');
}

function createSuggestionPill(text) {
  const pill = document.createElement('span');
  pill.className = 'suggestion-pill';
  pill.textContent = text;
  pill.addEventListener('click', () => {
    elements.searchInput.value = text;
    updateResults();
  });
  return pill;
}

function renderSuggestions() {
  elements.suggestionsContainer.innerHTML = '';
  suggestions.forEach((suggestion) => elements.suggestionsContainer.appendChild(createSuggestionPill(suggestion)));
}

function createResultCard(item) {
  const card = document.createElement('article');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="card-header">
      <span class="card-icon" aria-hidden="true">${item.icon}</span>
      <div>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-purpose">${item.summary}</p>
      </div>
    </div>
    <span class="evidence-pill">${item.evidence}</span>
    <button class="explore-button" type="button">Explorar</button>
  `;
  card.querySelector('.explore-button').addEventListener('click', () => openDetail(item));
  return card;
}

function renderRelated(items) {
  elements.relatedGrid.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'related-card';
    card.innerHTML = `<strong>${item.type}</strong><p>${item.text}</p>`;
    elements.relatedGrid.appendChild(card);
  });
}

function showActionNote(message) {
  if (!elements.actionNote) return;
  elements.actionNote.textContent = message;
  elements.actionNote.classList.remove('hidden');
  window.clearTimeout(showActionNote.timeoutId);
  showActionNote.timeoutId = window.setTimeout(() => elements.actionNote.classList.add('hidden'), 4200);
}

function openDetail(item) {
  activeSupplement = item;
  elements.detailTitle.textContent = item.title;
  elements.detailDescription.textContent = item.summary;
  elements.detailPurpose.textContent = item.purpose;
  elements.detailWhen.textContent = item.when;
  elements.detailEvidence.textContent = item.evidence;
  elements.detailPrecautions.textContent = item.precautions;
  elements.detailFields.classList.remove('hidden');
  elements.detailPlaceholder.classList.add('hidden');
  elements.favoriteButton.textContent = favorites.has(item.id) ? 'Guardado' : 'Añadir a favoritos';
  renderRelated(item.related);
}

function updateResults(data = currentData) {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = data.filter((item) => {
    return [item.title, item.summary, item.purpose, item.when].some((text) => text.toLowerCase().includes(query));
  });

  elements.resultsGrid.innerHTML = '';
  if (filtered.length === 0) {
    elements.emptyMessage.hidden = false;
    return;
  }

  elements.emptyMessage.hidden = true;
  filtered.forEach((item) => elements.resultsGrid.appendChild(createResultCard(item)));
}

function initEventHandlers() {
  elements.searchInput.addEventListener('input', () => updateResults());
  elements.favoriteButton.addEventListener('click', () => {
    if (!activeSupplement) return;
    const isFavorite = favorites.has(activeSupplement.id);
    if (isFavorite) {
      favorites.delete(activeSupplement.id);
      elements.favoriteButton.textContent = 'Añadir a favoritos';
    } else {
      favorites.add(activeSupplement.id);
      elements.favoriteButton.textContent = 'Guardado';
    }
  });

  elements.askButton.addEventListener('click', () => {
    showActionNote('Consulta siempre a un profesional. Este espacio es para explorar conocimiento basado en evidencia.');
  });
}

export async function initSupplementsModule() {
  queryElements();
  currentData = await loadSupplements() || [];
  renderSuggestions();
  initEventHandlers();
  updateResults();
}
