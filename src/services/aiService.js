/**
 * AIService - Centro de IA de IsoCore
 * Gestiona conversaciones, recomendaciones y respuestas basadas en evidencia
 * Fuentes: articles, recipes, supplements, resources
 */

import { API_URL, AUTH_HEADER } from './supabaseClient.js';

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
  if (!currentUserEmail) {
    console.warn('⚠️ No user email set in AIService');
    return [];
  }

  try {
    const response = await fetch(
      `${API_URL}/ai_conversations?user_email=eq.${currentUserEmail}&select=id,created_at,question&order=created_at.desc&limit=50`,
      {
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) throw new Error('Error fetching conversations');
    conversations = await response.json();
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
    const response = await fetch(
      `${API_URL}/ai_conversations?id=eq.${conversationId}&user_email=eq.${currentUserEmail}`,
      {
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) throw new Error('Error fetching conversation');
    const data = await response.json();
    return data[0] || null;
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
    const query = keywords.slice(0, 2).join('|');

    const response = await fetch(
      `${API_URL}/resources?title=ilike.%${query}%&or(description.ilike.%${query}%)&limit=3`,
      {
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) return [];
    const resources = await response.json();

    return resources.map(r => ({
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
    const sourcesJSON = JSON.stringify(sources);

    const response = await fetch(`${API_URL}/ai_conversations`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_email: currentUserEmail,
        question,
        answer,
        sources: sourcesJSON,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error('Error saving conversation');
    
    console.log('✅ Conversación guardada');
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
    const response = await fetch(
      `${API_URL}/ai_conversations?user_email=eq.${currentUserEmail}&order=created_at.desc&limit=50`,
      {
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) throw new Error('Error loading history');
    conversations = await response.json();
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
    const response = await fetch(
      `${API_URL}/ai_conversations?user_email=eq.${currentUserEmail}&select=id`,
      {
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) return null;
    const data = await response.json();

    return {
      totalConversations: data.length,
      lastConversation: conversations[0]?.created_at || null
    };
  } catch (error) {
    console.error('Error getting AI stats:', error);
    return null;
  }
}
