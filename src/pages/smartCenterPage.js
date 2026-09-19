/**
 * SmartCenterPage - Chat "Smart Center"
 * Conversación con el agente IA (n8n) sobre el plan nutricional del usuario.
 * Layout simple: cabecera + lista de mensajes + input. Reutiliza los estilos
 * de burbuja, indicador de escritura y formulario del Centro IA (ai.css) y
 * añade los propios en smartCenter.css.
 */

import * as SmartCenterService from '../services/smartCenterService.js';
import { getIcon } from '../components/icons.js';

const SUGGESTED_QUESTIONS = [
  '¿Cuántas calorías tiene mi plan?',
  '¿Cómo va mi reparto de macros esta semana?',
  'Cambia la comida del lunes, sugiere alternativas',
  '¿Qué recetas encajan mejor con mi objetivo?'
];

/**
 * Renderizar la pantalla de chat Smart Center
 */
export function renderSmartCenterPage() {
  const mainContent = document.querySelector('main');
  if (!mainContent) {
    console.error('❌ <main> no encontrado');
    return;
  }

  // v1: cada entrada a la pantalla empieza una conversación nueva
  // (el primer mensaje se envía con conversation_id: null).
  SmartCenterService.resetSmartCenterConversation();

  mainContent.innerHTML = `
    <div class="sc-page">
      <div class="sc-container">
        <header class="sc-header">
          <button type="button" id="scBackBtn" class="sc-back-btn" title="Volver al inicio">
            ${getIcon('close', 14)} Volver
          </button>
          <div class="sc-header-title">
            <h2>${getIcon('brain', 22)} Smart Center</h2>
            <p class="sc-subtitle" id="scPlanContext">Tu asistente de nutrición con IA</p>
          </div>
          <button type="button" id="scNewChatBtn" class="icon-button" title="Nuevo chat">
            ${getIcon('plus', 18)}
          </button>
        </header>

        <div id="scChatMessages" class="ai-chat-messages sc-chat-messages">
          ${renderWelcomeHTML()}
        </div>

        <footer class="ai-chat-footer sc-chat-footer">
          <form id="scChatForm" class="ai-chat-input-form">
            <input
              type="text"
              id="scChatInput"
              class="ai-chat-input"
              placeholder="Pregunta sobre tu plan nutricional..."
              autocomplete="off"
            />
            <button type="submit" class="ai-send-button" id="scSendBtn">
              ${getIcon('send', 16)} Enviar
            </button>
          </form>
          <p class="ai-input-help">${getIcon('info', 14)} Las respuestas pueden tardar unos segundos — el asistente consulta tu plan en tiempo real</p>
        </footer>
      </div>
    </div>
  `;

  setupSmartCenterPage();
  loadPlanContext();
}

function renderWelcomeHTML() {
  return `
    <div class="ai-welcome">
      <div class="ai-welcome-icon">${getIcon('robot', 32)}</div>
      <h3>¡Hola! Soy tu asistente Smart Center</h3>
      <p>Pregúntame lo que necesites sobre tu plan nutricional: calorías, macros, recetas o cambios en tu menú semanal.</p>
    </div>
    <div id="scSuggestedQuestions" class="ai-suggested-questions">
      <p class="suggested-label">Puedes preguntarme:</p>
      <div class="suggested-buttons">
        ${SUGGESTED_QUESTIONS.map((q) => `
          <button type="button" class="suggested-question-btn" data-question="${q}">${q}</button>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Setup de eventos y listeners
 */
function setupSmartCenterPage() {
  const chatForm = document.getElementById('scChatForm');
  const chatInput = document.getElementById('scChatInput');

  chatForm?.addEventListener('submit', handleSendMessage);

  document.getElementById('scBackBtn')?.addEventListener('click', () => {
    window.homePage_goHome();
  });

  document.getElementById('scNewChatBtn')?.addEventListener('click', handleNewChat);

  // Preguntas sugeridas → rellenan el input y envían
  document.querySelectorAll('#scSuggestedQuestions .suggested-question-btn').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const input = document.getElementById('scChatInput');
      if (input) input.value = btn.dataset.question || '';
      handleSendMessage(event);
    });
  });

  chatInput?.focus();
}

/**
 * Mostrar en la cabecera si el chat está conectado a un plan activo
 */
async function loadPlanContext() {
  const contextEl = document.getElementById('scPlanContext');
  if (!contextEl) return;

  const planId = await SmartCenterService.resolveSmartCenterPlanId();

  // El usuario pudo navegar a otra pantalla mientras se resolvía el plan
  if (!document.getElementById('scPlanContext')) return;

  contextEl.textContent = planId
    ? 'Conectado a tu plan nutricional activo'
    : 'Sin plan activo — el asistente responderá con información general';
}

/**
 * Manejar envío de mensaje
 */
async function handleSendMessage(event) {
  event.preventDefault();

  const input = document.getElementById('scChatInput');
  const sendBtn = document.getElementById('scSendBtn');
  const messagesContainer = document.getElementById('scChatMessages');

  if (!input || !messagesContainer || sendBtn?.disabled) return;

  const question = input.value.trim();
  if (!question) return;

  // Quitar bienvenida + preguntas sugeridas en cuanto hay conversación real
  messagesContainer.querySelector('.ai-welcome')?.remove();
  messagesContainer.querySelector('.ai-suggested-questions')?.remove();

  appendMessage(messagesContainer, 'user', question);

  input.value = '';
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Enviando…';
  }

  // Indicador de "escribiendo..." (las respuestas del agente tardan varios segundos)
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
  scrollToBottom(messagesContainer);

  try {
    const result = await SmartCenterService.sendSmartCenterMessage(question);

    typingDiv.remove();

    if (result.success) {
      appendMessage(messagesContainer, 'assistant', result.answer);
    } else {
      appendErrorMessage(messagesContainer, getErrorMessage(result.error));
    }
  } catch (error) {
    console.error('❌ Smart Center: error inesperado:', error);
    typingDiv.remove();
    appendErrorMessage(messagesContainer, 'No se pudo conectar, inténtalo de nuevo.');
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = `${getIcon('send', 16)} Enviar`;
    }
    input.focus();
    scrollToBottom(messagesContainer);
  }
}

/**
 * Nuevo chat: reinicia la conversación (el próximo mensaje abre hilo nuevo)
 */
function handleNewChat() {
  SmartCenterService.resetSmartCenterConversation();

  const messagesContainer = document.getElementById('scChatMessages');
  const input = document.getElementById('scChatInput');

  if (messagesContainer) {
    messagesContainer.innerHTML = renderWelcomeHTML();
    setupSmartCenterPage();
  }

  if (input) {
    input.value = '';
    input.focus();
  }
}

/**
 * Añadir mensaje a la lista (usuario a la derecha, asistente a la izquierda)
 */
function appendMessage(container, role, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${role === 'user' ? 'ai-user-message' : 'ai-bot-message'}`;

  const content = role === 'assistant' ? formatAnswerText(text) : escapeHtml(text);

  messageDiv.innerHTML = `
    <div class="ai-message-content">
      <p>${content}</p>
    </div>
    <time>${new Date().toLocaleTimeString()}</time>
  `;

  container.appendChild(messageDiv);
  scrollToBottom(container);
}

function appendErrorMessage(container, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'ai-message ai-bot-message ai-error';
  errorDiv.innerHTML = `
    <div class="ai-message-content">
      <p>${getIcon('warning', 16)} ${escapeHtml(message)}</p>
    </div>
  `;
  container.appendChild(errorDiv);
  scrollToBottom(container);
}

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

/**
 * Mensaje de error claro según el tipo de fallo del webhook
 */
function getErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth':
      return 'Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.';
    case 'timeout':
      return 'El asistente está tardando demasiado en responder. Inténtalo de nuevo.';
    case 'network':
    case 'empty_response':
      return 'No se pudo conectar, inténtalo de nuevo.';
    default:
      return 'No se pudo conectar, inténtalo de nuevo.';
  }
}

/**
 * Respuesta de la IA: escapar HTML y respetar los saltos de línea
 */
function formatAnswerText(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}
