/**
 * AIPage - Centro IA de IsoCore
 * Chat inteligente con recomendaciones basadas en evidencia
 * Historial de conversaciones, preguntas sugeridas, respuestas con referencias
 */

import * as AIService from '../services/aiService.js';
import { getIcon } from '../components/icons.js';

/**
 * Renderizar página del Centro IA
 */
export function renderAIPage() {
  const mainContent = document.querySelector('main');
  if (!mainContent) {
    console.error('❌ <main> no encontrado');
    return;
  }

  mainContent.innerHTML = `
    <div class="ai-page">
      <div class="ai-container">
        <!-- Sidebar: Historial -->
        <aside class="ai-sidebar">
          <div class="ai-sidebar-header">
            <h3>${getIcon('robot', 20)} Mi Centro IA</h3>
            <button id="aiNewChatBtn" class="icon-button" title="Nuevo chat">
              ${getIcon('plus', 18)}
            </button>
          </div>
          <div id="aiConversationsList" class="ai-conversations-list">
            <p class="placeholder">Cargando conversaciones...</p>
          </div>
        </aside>

        <!-- Centro: Chat -->
        <main class="ai-chat-main">
          <!-- Header -->
          <header class="ai-chat-header">
            <div class="ai-header-content">
              <h2>Centro de Inteligencia Artificial</h2>
              <p class="ai-subtitle">Recomendaciones basadas en evidencia científica</p>
            </div>
            <div class="ai-header-info">
              <span class="ai-source-badge">${getIcon('book', 14)} Basado en IsoCore</span>
            </div>
          </header>

          <!-- Mensajes del chat -->
          <div id="aiChatMessages" class="ai-chat-messages">
            <div class="ai-welcome">
              <div class="ai-welcome-icon">${getIcon('robot', 32)}</div>
              <h3>¡Bienvenido al Centro IA!</h3>
              <p>Hago recomendaciones de suplementos, recetas, artículos y recursos basadas en tu pregunta.</p>
              <p class="ai-welcome-note">Toda la información proviene de fuentes validadas de IsoCore.</p>
            </div>

            <!-- Preguntas sugeridas -->
            <div id="aiSuggestedQuestions" class="ai-suggested-questions">
              <p class="suggested-label">Preguntas sugeridas:</p>
              <div class="suggested-buttons"></div>
            </div>
          </div>

          <!-- Input: Pregunta -->
          <footer class="ai-chat-footer">
            <form id="aiChatForm" class="ai-chat-input-form">
              <input
                type="text"
                id="aiChatInput"
                class="ai-chat-input"
                placeholder="Escribe tu pregunta... ¿Cuál es el mejor suplemento para...?"
                autocomplete="off"
              />
              <button type="submit" class="ai-send-button" id="aiSendBtn">
                ${getIcon('send', 16)} Enviar
              </button>
            </form>
            <p class="ai-input-help">${getIcon('info', 14)} Pregunta sobre suplementos, recetas, nutrición o analíticas</p>
          </footer>
        </main>
      </div>
    </div>
  `;

  // Inicializar
  setupAIPage();
  loadSuggestedQuestions();
  loadConversationsList();
}

/**
 * Setup de eventos y listeners
 */
function setupAIPage() {
  const chatForm = document.getElementById('aiChatForm');
  const chatInput = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const newChatBtn = document.getElementById('aiNewChatBtn');

  // Enviar mensaje al presionar Enter
  chatForm?.addEventListener('submit', handleSendMessage);
  
  // Botón nueva conversación
  newChatBtn?.addEventListener('click', handleNewChat);

  // Limpiar focus
  chatInput?.focus();
}

/**
 * Cargar preguntas sugeridas
 */
async function loadSuggestedQuestions() {
  const suggestedButtons = document.querySelector('.suggested-buttons');
  if (!suggestedButtons) return;

  const questions = AIService.getSuggestedQuestions();
  
  suggestedButtons.innerHTML = questions.map(q => `
    <button type="button" class="suggested-question-btn" data-question="${q}">
      ${q}
    </button>
  `).join('');

  // Agregar event listeners
  suggestedButtons.querySelectorAll('.suggested-question-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const question = btn.dataset.question;
      const input = document.getElementById('aiChatInput');
      if (input) input.value = question;
      handleSendMessage(e);
    });
  });
}

/**
 * Cargar lista de conversaciones anteriores
 */
async function loadConversationsList() {
  const conversationsList = document.getElementById('aiConversationsList');
  if (!conversationsList) return;

  try {
    const conversations = await AIService.getConversations();
    
    if (!conversations || conversations.length === 0) {
      conversationsList.innerHTML = '<p class="placeholder">No hay conversaciones</p>';
      return;
    }

    conversationsList.innerHTML = conversations.map(conv => `
      <div class="ai-conversation-item" data-conv-id="${conv.id}">
        <div class="ai-conv-title">${truncateText(conv.question, 40)}</div>
        <div class="ai-conv-date">${formatDate(conv.created_at)}</div>
      </div>
    `).join('');

    // Event listeners para converaciones
    conversationsList.querySelectorAll('.ai-conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const convId = item.dataset.convId;
        loadConversation(convId);
      });
    });
  } catch (error) {
    console.error('Error loading conversations:', error);
    conversationsList.innerHTML = '<p class="error">Error cargando conversaciones</p>';
  }
}

/**
 * Cargar conversación específica
 */
async function loadConversation(conversationId) {
  try {
    const conversation = await AIService.getConversation(conversationId);
    if (!conversation) return;

    const messagesContainer = document.getElementById('aiChatMessages');
    if (!messagesContainer) return;

    // Mostrar conversación
    messagesContainer.innerHTML = `
      <div class="ai-message ai-user-message">
        <div class="ai-message-content">
          <p>${conversation.question}</p>
        </div>
        <time>${formatDateTime(conversation.created_at)}</time>
      </div>
      <div class="ai-message ai-bot-message">
        <div class="ai-message-content">
          <p>${conversation.answer}</p>
          ${renderSources(conversation.sources)}
        </div>
      </div>
    `;

    // Scroll al fondo
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (error) {
    console.error('Error loading conversation:', error);
  }
}

/**
 * Manejar envío de mensaje
 */
async function handleSendMessage(e) {
  e.preventDefault();

  const input = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const messagesContainer = document.getElementById('aiChatMessages');

  if (!input || !messagesContainer) return;

  const question = input.value.trim();
  if (!question) return;

  // Remover preguntas sugeridas
  const suggestedSection = messagesContainer.querySelector('.ai-suggested-questions');
  if (suggestedSection) suggestedSection.remove();

  // Agregar mensaje del usuario
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'ai-message ai-user-message';
  userMessageDiv.innerHTML = `
    <div class="ai-message-content">
      <p>${escapeHtml(question)}</p>
    </div>
    <time>${new Date().toLocaleTimeString()}</time>
  `;
  messagesContainer.appendChild(userMessageDiv);

  // Limpiar input
  input.value = '';
  sendBtn.disabled = true;
  sendBtn.textContent = '⏳ Procesando...';

  // Agregar indicador de escritura
  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-message ai-bot-message ai-typing';
  typingDiv.innerHTML = `
    <div class="ai-message-content">
      <div class="ai-typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    // Obtener respuesta del IA Service
    const result = await AIService.askQuestion(question);

    // Remover indicador de escritura
    typingDiv.remove();

    if (result.error) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'ai-message ai-bot-message ai-error';
      errorDiv.innerHTML = `
        <div class="ai-message-content">
          <p>${getIcon('warning', 16)} ${result.error}</p>
        </div>
      `;
      messagesContainer.appendChild(errorDiv);
    } else {
      // Agregar respuesta del bot
      const botMessageDiv = document.createElement('div');
      botMessageDiv.className = 'ai-message ai-bot-message';
      botMessageDiv.innerHTML = `
        <div class="ai-message-content">
          <p>${result.answer}</p>
          ${renderSources(result.sources)}
        </div>
      `;
      messagesContainer.appendChild(botMessageDiv);
    }

    // Recargar lista de conversaciones
    loadConversationsList();

  } catch (error) {
    console.error('Error:', error);
    typingDiv.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'ai-message ai-bot-message ai-error';
    errorDiv.innerHTML = `
      <div class="ai-message-content">
        <p>${getIcon('warning', 16)} Error procesando tu pregunta. Intenta de nuevo.</p>
      </div>
    `;
    messagesContainer.appendChild(errorDiv);
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = `${getIcon('send', 16)} Enviar`;
    input.focus();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * Manejar nuevo chat
 */
async function handleNewChat() {
  const messagesContainer = document.getElementById('aiChatMessages');
  const input = document.getElementById('aiChatInput');

  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div class="ai-welcome">
        <div class="ai-welcome-icon">${getIcon('robot', 32)}</div>
        <h3>¡Nuevo chat iniciado!</h3>
        <p>Hago recomendaciones de suplementos, recetas, artículos y recursos basadas en tu pregunta.</p>
      </div>
      <div id="aiSuggestedQuestions" class="ai-suggested-questions">
        <p class="suggested-label">Preguntas sugeridas:</p>
        <div class="suggested-buttons"></div>
      </div>
    `;
    
    loadSuggestedQuestions();
  }

  if (input) {
    input.value = '';
    input.focus();
  }

  await AIService.createNewConversation();
}

/**
 * Renderizar fuentes encontradas
 */
function renderSources(sources) {
  if (!sources || sources.length === 0) {
    return '<div class="ai-sources-empty">No se encontraron fuentes adicionales</div>';
  }

  // Agrupar por tipo
  const byType = {};
  sources.forEach(source => {
    if (!byType[source.type]) byType[source.type] = [];
    byType[source.type].push(source);
  });

  let html = '<div class="ai-sources">';
  html += `<p class="sources-title">${getIcon('book', 14)} Fuentes:</p>`;

  Object.entries(byType).forEach(([type, items]) => {
    html += `<div class="source-group source-${type}">`;
    html += `<h4>${getSourceTypeLabel(type)}</h4>`;
    
    items.forEach((source, idx) => {
      if (idx >= 2) return; // Mostrar máximo 2 por tipo
      
      html += `
        <div class="source-item">
          <p class="source-title">${source.title}</p>
          ${source.description ? `<p class="source-desc">${truncateText(source.description, 80)}</p>` : ''}
          ${source.benefits ? `<p class="source-meta">${getIcon('muscle', 14)} ${source.benefits}</p>` : ''}
          ${source.dosage ? `<p class="source-meta">${getIcon('scale', 14)} ${source.dosage}</p>` : ''}
          ${source.author ? `<p class="source-author">Por ${source.author}</p>` : ''}
          ${source.url ? `<a href="${source.url}" target="_blank" class="source-link">Ver más →</a>` : ''}
        </div>
      `;
    });
    
    html += '</div>';
  });

  html += '</div>';
  return html;
}

/**
 * Obtener label para tipo de fuente
 */
function getSourceTypeLabel(type) {
  const labels = {
    'article': `${getIcon('book', 14)} Artículos`,
    'recipe': `${getIcon('leaf', 14)} Recetas`,
    'supplement': `${getIcon('droplet', 14)} Suplementos`,
    'resource': `${getIcon('book', 14)} Recursos`
  };
  return labels[type] || type;
}

/**
 * Utilidades
 */

function truncateText(text, max) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max) + '...' : text;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-ES', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
