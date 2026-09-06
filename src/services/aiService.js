/**
 * AIService - Centro de IA de IsoCore
 * Gestiona conversaciones, recomendaciones y respuestas basadas en evidencia
 * Fuentes: articles, recipes, supplements, resources
 */

import {
  API_URL,
  AUTH_HEADER,
  getRecursosFromSupabase,
  getAIConversationsFromSupabase,
  createAIConversationInSupabase,
  getConversationMessagesFromSupabase,
  addMessageToConversationInSupabase
} from './supabaseClient.js';

let currentUserEmail = null;
let currentConversation = null;
let conversations = [];
let suggestedQuestions = [];

/**
 * Sugerencias de preguntas iniciales
 */
const INITIAL_QUESTIONS = [
  '¿Cuál es el mejor suplemento para ganar masa muscular?',
  '¿Qué alimentos son ricos en proteína?',
  '¿Cómo debo tomar whey protein?',
  '¿Cuál es mi objetivo nutricional recomendado?',
  '¿Qué vitaminas necesito en invierno?',
  '¿Cómo puedo mejorar mi energía?'
];

/**
 * Inicializar servicio de IA con email del usuario
 */
export async function initializeAIService(userEmail) {
  console.log(`🤖 Inicializando AIService para ${userEmail}`);
  currentUserEmail = userEmail;
  
  try {
    // Cargar historial de conversaciones
    await loadConversationHistory();
    suggestedQuestions = INITIAL_QUESTIONS;
  } catch (error) {
    console.error('Error inicializando AIService:', error);
    suggestedQuestions = INITIAL_QUESTIONS;
  }
}

/**
 * Obtener preguntas sugeridas
 */
export function getSuggestedQuestions() {
  return suggestedQuestions;
}

/**
 * Obtener conversaciones del usuario
 */
export async function getConversations() {
  if (!currentUserEmail) return [];

  try {
    const { data, error } = await getAIConversationsFromSupabase();

    if (error) {
      console.warn('⚠️ Error cargando conversaciones IA:', error);
      conversations = [];
      return conversations;
    }

    conversations = (Array.isArray(data) ? data : []).map((conv) => ({
      id: conv.id,
      title: conv.titulo || 'Nueva conversación',
      question: conv.titulo || 'Nueva conversación',
      created_at: conv.created_at,
      updated_at: conv.updated_at
    }));

    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
}

/**
 * Obtener conversación específica
 */
export async function getConversation(conversationId) {
  if (!currentUserEmail || !conversationId) return null;

  try {
    const allConversations = conversations.length > 0 ? conversations : await getConversations();
    const targetConversation = allConversations.find((item) => String(item.id) === String(conversationId));

    const { data, error } = await getConversationMessagesFromSupabase(conversationId);

    if (error) {
      if (String(error.code) === '42501') {
        console.warn('⚠️ Conversación no accesible para este usuario');
      }
      return null;
    }

    const messages = Array.isArray(data) ? data : [];
    const userMessage = messages.find((msg) => msg.rol === 'user');
    const assistantMessages = messages.filter((msg) => msg.rol === 'assistant');
    const assistantMessage = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;

    return {
      id: conversationId,
      question: userMessage?.contenido || targetConversation?.title || 'Nueva conversación',
      answer: assistantMessage?.contenido || 'Sin respuesta todavía',
      sources: [],
      created_at: targetConversation?.created_at || userMessage?.created_at || assistantMessage?.created_at || null,
      updated_at: targetConversation?.updated_at || null,
      messages
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

/**
 * Crear nueva conversación
 */
export async function createNewConversation() {
  currentConversation = {
    id: null,
    messages: [],
    created_at: new Date().toISOString()
  };
  return currentConversation;
}

/**
 * Procesar pregunta y generar respuesta
 * Busca en fuentes: articles, recipes, supplements, resources
 */
export async function askQuestion(question) {
  if (!currentUserEmail || !question.trim()) {
    return {
      error: 'Pregunta vacía o usuario no autenticado',
      answer: '',
      sources: []
    };
  }

  try {
    console.log(`🤔 Procesando pregunta: ${question}`);

    // Buscar en fuentes disponibles
    const [articles, recipes, supplements, resources] = await Promise.all([
      searchArticles(question),
      searchRecipes(question),
      searchSupplements(question),
      searchResources(question)
    ]);

    const sources = [...articles, ...recipes, ...supplements, ...resources];

    // Generar respuesta basada en fuentes
    const answer = generateAnswer(question, sources);

    // Guardar en historial
    await saveConversation(question, answer, sources);

    return {
      success: true,
      answer,
      sources
    };
  } catch (error) {
    console.error('Error asking question:', error);
    return {
      error: error.message,
      answer: 'Disculpa, ocurrió un error procesando tu pregunta.',
      sources: []
    };
  }
}

/**
 * Buscar artículos relevantes
 */
async function searchArticles(question) {
  try {
    const keywords = extractKeywords(question);
    const query = keywords.slice(0, 2).join('|');

    const response = await fetch(
      `${API_URL}/articles?title=ilike.%${query}%&or(description.ilike.%${query}%,tags.ilike.%${query}%)&limit=3`,
      {
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) return [];
    const articles = await response.json();

    return articles.map(a => ({
      type: 'article',
      title: a.title,
      description: a.description,
      url: a.url,
      author: a.author,
      relevance: 0.9
    }));
  } catch (error) {
    console.error('Error searching articles:', error);
    return [];
  }
}

/**
 * Buscar recetas relevantes
 */
async function searchRecipes(question) {
  try {
    const keywords = extractKeywords(question);
    const query = keywords.slice(0, 2).join('|');

    const response = await fetch(
      `${API_URL}/recipes?name=ilike.%${query}%&or(description.ilike.%${query}%,ingredients.ilike.%${query}%)&limit=3`,
      {
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) return [];
    const recipes = await response.json();

    return recipes.map(r => ({
      type: 'recipe',
      title: r.name,
      description: r.description,
      servings: r.servings,
      calories: r.calories,
      relevance: 0.85
    }));
  } catch (error) {
    console.error('Error searching recipes:', error);
    return [];
  }
}

/**
 * Buscar suplementos relevantes
 */
async function searchSupplements(question) {
  try {
    const keywords = extractKeywords(question);
    const query = keywords.slice(0, 2).join('|');

    const response = await fetch(
      `${API_URL}/supplements?name=ilike.%${query}%&or(description.ilike.%${query}%,benefits.ilike.%${query}%)&limit=3`,
      {
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) return [];
    const supplements = await response.json();

    return supplements.map(s => ({
      type: 'supplement',
      title: s.name,
      description: s.description,
      dosage: s.dosage,
      benefits: s.benefits,
      relevance: 0.9
    }));
  } catch (error) {
    console.error('Error searching supplements:', error);
    return [];
  }
}

/**
 * Buscar recursos adicionales
 */
async function searchResources(question) {
  try {
    const keywords = extractKeywords(question);
    const query = keywords.slice(0, 2).join(' ').trim();
    if (!query) return [];

    const resources = await getRecursosFromSupabase(999, 0);
    const normalizedQuery = query.toLowerCase();
    const filtered = resources
      .filter((resource) => {
        const title = String(resource.title || '').toLowerCase();
        const description = String(resource.description || '').toLowerCase();
        return title.includes(normalizedQuery) || description.includes(normalizedQuery);
      })
      .slice(0, 3);

    return filtered.map(r => ({
      type: 'resource',
      title: r.title,
      description: r.description,
      url: r.url,
      relevance: 0.8
    }));
  } catch (error) {
    console.error('Error searching resources:', error);
    return [];
  }
}

/**
 * Extraer palabras clave de la pregunta
 */
function extractKeywords(question) {
  const stopWords = ['el', 'la', 'de', 'que', 'es', 'y', 'a', 'en', 'con', 'por', 'para', 'qué', 'cuál', 'cómo', 'debo', 'puedo', 'tengo', 'son', 'es'];
  return question
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 5);
}

/**
 * Generar respuesta basada en fuentes encontradas
 */
function generateAnswer(question, sources) {
  if (sources.length === 0) {
    return 'Lo siento, no encontré información específica sobre esa pregunta en nuestra base de datos. Por favor, intenta con otra pregunta o consulta con nuestro equipo de nutrición.';
  }

  // Generar respuesta genérica basada en fuentes
  const articles = sources.filter(s => s.type === 'article');
  const recipes = sources.filter(s => s.type === 'recipe');
  const supplements = sources.filter(s => s.type === 'supplement');
  const resources = sources.filter(s => s.type === 'resource');

  let answer = '';

  if (articles.length > 0) {
    answer += `📚 **Basado en nuestros artículos:** ${articles[0].title}. `;
  }

  if (supplements.length > 0) {
    answer += `💊 **Recomendación:** ${supplements[0].title}. ${supplements[0].benefits || ''}. `;
  }

  if (recipes.length > 0) {
    answer += `🍽️ **Receta sugerida:** ${recipes[0].title} (${recipes[0].calories || 0} kcal). `;
  }

  if (resources.length > 0) {
    answer += `📖 **Más información:** Consulta nuestro recurso "${resources[0].title}". `;
  }

  answer += '\n\nBasa tus decisiones en fuentes validadas de IsoCore. Cada recomendación está respaldada por evidencia científica.';

  return answer;
}

/**
 * Guardar conversación en base de datos
 */
export async function saveConversation(question, answer, sources) {
  if (!currentUserEmail) return false;

  try {
    const conversationTitle = question.length > 60 ? `${question.slice(0, 57)}...` : question;

    const { data: createdConversation, error: createError } = await createAIConversationInSupabase(conversationTitle);

    if (createError) {
      if (String(createError.code) === '28000') {
        console.warn('⚠️ Sesión inválida al crear conversación');
      }
      throw new Error(createError.message || 'Error creating conversation');
    }

    const conversation = Array.isArray(createdConversation) ? createdConversation[0] : createdConversation;
    const conversationId = conversation?.id;

    if (!conversationId) {
      throw new Error('No se pudo obtener ID de conversación creada');
    }

    const userInsert = await addMessageToConversationInSupabase(conversationId, 'user', question);
    if (userInsert.error) {
      throw new Error(userInsert.error.message || 'Error adding user message');
    }

    const answerWithSources = sources?.length
      ? `${answer}\n\nFuentes sugeridas: ${sources.map((s) => s.title).filter(Boolean).slice(0, 3).join(' | ')}`
      : answer;

    const assistantInsert = await addMessageToConversationInSupabase(conversationId, 'assistant', answerWithSources);
    if (assistantInsert.error) {
      throw new Error(assistantInsert.error.message || 'Error adding assistant message');
    }

    await loadConversationHistory();

    console.log('✅ Conversación guardada por RPC');
    return true;
  } catch (error) {
    console.error('Error saving conversation:', error);
    return false;
  }
}

/**
 * Cargar historial de conversaciones
 */
async function loadConversationHistory() {
  if (!currentUserEmail) return [];

  try {
    const { data, error } = await getAIConversationsFromSupabase();

    if (error) {
      if (String(error.code) === '28000') {
        console.warn('⚠️ Sesión no válida cargando historial IA');
      }
      conversations = [];
      return conversations;
    }

    conversations = (Array.isArray(data) ? data : []).map((conv) => ({
      id: conv.id,
      title: conv.titulo || 'Nueva conversación',
      question: conv.titulo || 'Nueva conversación',
      created_at: conv.created_at,
      updated_at: conv.updated_at
    }));
    return conversations;
  } catch (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }
}

/**
 * Obtener historial completo de conversaciones
 */
export function getConversationHistory() {
  return conversations;
}

/**
 * Limpiar servicio al logout
 */
export function clearAIService() {
  console.log('🤖 Limpiando AIService');
  currentUserEmail = null;
  currentConversation = null;
  conversations = [];
  suggestedQuestions = [];
}

/**
 * Exportar estadísticas del usuario
 */
export async function getAIStats() {
  if (!currentUserEmail) return null;

  try {
    const { data, error } = await getAIConversationsFromSupabase();
    if (error) return null;
    const items = Array.isArray(data) ? data : [];

    return {
      totalConversations: items.length,
      lastConversation: conversations[0]?.created_at || null
    };
  } catch (error) {
    console.error('Error getting AI stats:', error);
    return null;
  }
}
