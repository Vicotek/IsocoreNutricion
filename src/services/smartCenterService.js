/**
 * SmartCenterService - Chat "Smart Center"
 * Conecta con el agente IA alojado en n8n (workflow publicado) que responde
 * con datos reales del plan nutricional del usuario.
 *
 * Contrato del webhook:
 *   POST { sesion_token, plan_id, conversation_id, mensaje }
 *   ←  { conversation_id, respuesta }
 *
 * conversation_id se mantiene solo en memoria (v1): cada vez que se entra a
 * la pantalla se empieza una conversación nueva (primer mensaje con
 * conversation_id: null) y los mensajes siguientes reutilizan el mismo hilo.
 */

import { getAuthToken } from './authService.js';
import * as NutritionalPlansService from './nutritionalPlansService.js';

// URL del webhook de producción (/webhook/, NO /webhook-test/: la de test
// solo responde mientras el workflow escucha manualmente desde el editor).
// Centralizada en config.js → window.APP_CONFIG.SMART_CENTER_CHAT_URL;
// el fallback existe por si config.js no se hubiera cargado.
// ⚠️ Si las llamadas fallan con error de conexión, lo primero a comprobar es
// que el workflow siga ACTIVO en n8n (toggle "Active"), no solo guardado.
const SMART_CENTER_CHAT_URL =
  window.APP_CONFIG?.SMART_CENTER_CHAT_URL ||
  'https://n8n.srv1569124.hstgr.cloud/webhook/smart-center-chat';

// Timeout amplio: cada respuesta implica una llamada real a un modelo de lenguaje.
const SMART_CENTER_TIMEOUT_MS = 90000;

let currentConversationId = null;
let currentPlanId = null;
let planIdResolved = false;

/**
 * conversation_id activo (null si la sesión de chat todavía no ha empezado).
 */
export function getSmartCenterConversationId() {
  return currentConversationId;
}

/**
 * Reinicia la sesión de chat: el próximo mensaje se enviará con
 * conversation_id: null y el agente abrirá una conversación nueva.
 */
export function resetSmartCenterConversation() {
  currentConversationId = null;
}

async function fetchCurrentPlanId() {
  try {
    let plan = NutritionalPlansService.getCurrentUserPlan();
    if (!plan) {
      await NutritionalPlansService.loadMyPlans();
      plan = NutritionalPlansService.getCurrentUserPlan();
    }
    return plan?.id ?? null;
  } catch (error) {
    console.warn('⚠️ Smart Center: no se pudo resolver el plan del usuario:', error);
    return null;
  }
}

/**
 * Plan nutricional actual del usuario (el más reciente si tuviera varios).
 * Se resuelve una sola vez por carga de página y se cachea en memoria.
 * @returns {Promise<number|string|null>} - id del plan o null si no tiene
 */
export async function resolveSmartCenterPlanId() {
  if (!planIdResolved) {
    currentPlanId = await fetchCurrentPlanId();
    planIdResolved = true;
  }
  return currentPlanId;
}

/**
 * Enviar un mensaje al agente Smart Center.
 * @param {string} mensaje - Texto del usuario
 * @returns {Promise<{success: boolean, answer?: string, conversationId?: string, error?: string}>}
 *   error: 'empty_message' | 'auth' | 'timeout' | 'network' | 'http_<status>' | 'empty_response'
 */
export async function sendSmartCenterMessage(mensaje) {
  const text = (mensaje || '').trim();
  if (!text) {
    return { success: false, error: 'empty_message' };
  }

  const sesionToken = getAuthToken();
  if (!sesionToken) {
    console.warn('⚠️ Smart Center: sin sesión activa');
    return { success: false, error: 'auth' };
  }

  const planId = await resolveSmartCenterPlanId();

  const payload = {
    sesion_token: sesionToken,
    plan_id: planId,
    conversation_id: currentConversationId,
    mensaje: text
  };

  console.log(`🧠 Smart Center → mensaje (plan_id: ${planId ?? 'sin plan'}, conversation_id: ${currentConversationId ?? 'nueva'})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SMART_CENTER_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(SMART_CENTER_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ Smart Center: error de red:', error);
    return { success: false, error: error.name === 'AbortError' ? 'timeout' : 'network' };
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    console.error(`❌ Smart Center: webhook respondió ${response.status}`);
    return { success: false, error: `http_${response.status}` };
  }

  const raw = await response.json().catch(() => null);
  // n8n a veces devuelve el resultado envuelto en un array de un elemento
  const result = Array.isArray(raw) ? raw[0] : raw;
  const respuesta = typeof result?.respuesta === 'string' ? result.respuesta.trim() : '';

  if (!respuesta) {
    console.error('❌ Smart Center: respuesta sin campo "respuesta":', raw);
    return { success: false, error: 'empty_response' };
  }

  if (result?.conversation_id) {
    currentConversationId = result.conversation_id;
  }

  console.log(`✅ Smart Center ← respuesta (conversation_id: ${currentConversationId})`);
  return { success: true, answer: respuesta, conversationId: currentConversationId };
}
