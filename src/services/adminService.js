/**
 * AdminService - Panel de Administración de IsoCore
 * Gestión completa: CRUD, búsqueda, filtros, publicación
 * Roles: Admin, Editor
 */

import { API_URL, AUTH_HEADER } from './supabaseClient.js';

let currentUserEmail = null;
let currentUserRole = 'admin'; // admin, editor
let adminStats = {};

/**
 * Inicializar servicio de administración
 */
export async function initializeAdminService(userEmail, role = 'admin') {
  console.log(`🔧 Inicializando AdminService para ${userEmail} (${role})`);
  currentUserEmail = userEmail;
  currentUserRole = role;
  
  // Cargar estadísticas
  await loadAdminStats();
}

/**
 * USUARIOS - Gestión de usuarios
 */

export async function getAllUsers(limit = 100, offset = 0) {
  try {
    const response = await fetch(
      `${API_URL}/usuarios?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error fetching users');
    return await response.json();
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

export async function searchUsers(query) {
  try {
    const response = await fetch(
      `${API_URL}/usuarios?or(name.ilike.%${query}%,email.ilike.%${query}%)&select=*`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error searching users');
    return await response.json();
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

export async function getUserById(userId) {
  try {
    const response = await fetch(
      `${API_URL}/usuarios?id=eq.${userId}&select=*`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error fetching user');
    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function updateUser(userId, updates) {
  try {
    const response = await fetch(
      `${API_URL}/usuarios?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify(updates)
      }
    );
    if (!response.ok) throw new Error('Error updating user');
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

export async function deleteUser(userId) {
  try {
    const response = await fetch(
      `${API_URL}/usuarios?id=eq.${userId}`,
      { method: 'DELETE', headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error deleting user');
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

/**
 * ARTÍCULOS - Gestión de artículos
 */

export async function getAllArticles(limit = 100, offset = 0) {
  try {
    const response = await fetch(
      `${API_URL}/articles?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error fetching articles');
    return await response.json();
  } catch (error) {
    console.error('Error getting articles:', error);
    return [];
  }
}

export async function searchArticles(query) {
  try {
    const response = await fetch(
      `${API_URL}/articles?or(title.ilike.%${query}%,description.ilike.%${query}%)&select=*`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error searching articles');
    return await response.json();
  } catch (error) {
    console.error('Error searching articles:', error);
    return [];
  }
}

export async function createArticle(articleData) {
  try {
    const response = await fetch(
      `${API_URL}/articles`,
      {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify({
          ...articleData,
          created_by: currentUserEmail,
          created_at: new Date().toISOString()
        })
      }
    );
    if (!response.ok) throw new Error('Error creating article');
    return await response.json();
  } catch (error) {
    console.error('Error creating article:', error);
    return null;
  }
}

export async function updateArticle(articleId, updates) {
  try {
    const response = await fetch(
      `${API_URL}/articles?id=eq.${articleId}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
      }
    );
    if (!response.ok) throw new Error('Error updating article');
    return true;
  } catch (error) {
    console.error('Error updating article:', error);
    return false;
  }
}

export async function deleteArticle(articleId) {
  try {
    const response = await fetch(
      `${API_URL}/articles?id=eq.${articleId}`,
      { method: 'DELETE', headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error deleting article');
    return true;
  } catch (error) {
    console.error('Error deleting article:', error);
    return false;
  }
}

export async function toggleArticlePublish(articleId, published) {
  return updateArticle(articleId, { published });
}

/**
 * RECETAS - Gestión de recetas
 */

export async function getAllRecipes(limit = 100, offset = 0) {
  try {
    const response = await fetch(
      `${API_URL}/recipes?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error fetching recipes');
    return await response.json();
  } catch (error) {
    console.error('Error getting recipes:', error);
    return [];
  }
}

export async function searchRecipes(query) {
  try {
    const response = await fetch(
      `${API_URL}/recipes?or(name.ilike.%${query}%,description.ilike.%${query}%)&select=*`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error searching recipes');
    return await response.json();
  } catch (error) {
    console.error('Error searching recipes:', error);
    return [];
  }
}

export async function createRecipe(recipeData) {
  try {
    const response = await fetch(
      `${API_URL}/recipes`,
      {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify({
          ...recipeData,
          created_by: currentUserEmail,
          created_at: new Date().toISOString()
        })
      }
    );
    if (!response.ok) throw new Error('Error creating recipe');
    return await response.json();
  } catch (error) {
    console.error('Error creating recipe:', error);
    return null;
  }
}

export async function updateRecipe(recipeId, updates) {
  try {
    const response = await fetch(
      `${API_URL}/recipes?id=eq.${recipeId}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
      }
    );
    if (!response.ok) throw new Error('Error updating recipe');
    return true;
  } catch (error) {
    console.error('Error updating recipe:', error);
    return false;
  }
}

export async function deleteRecipe(recipeId) {
  try {
    const response = await fetch(
      `${API_URL}/recipes?id=eq.${recipeId}`,
      { method: 'DELETE', headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error deleting recipe');
    return true;
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return false;
  }
}

export async function toggleRecipePublish(recipeId, published) {
  return updateRecipe(recipeId, { published });
}

/**
 * SUPLEMENTOS - Gestión de suplementos
 */

export async function getAllSupplements(limit = 100, offset = 0) {
  try {
    const response = await fetch(
      `${API_URL}/supplements?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error fetching supplements');
    return await response.json();
  } catch (error) {
    console.error('Error getting supplements:', error);
    return [];
  }
}

export async function searchSupplements(query) {
  try {
    const response = await fetch(
      `${API_URL}/supplements?or(name.ilike.%${query}%,description.ilike.%${query}%)&select=*`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error searching supplements');
    return await response.json();
  } catch (error) {
    console.error('Error searching supplements:', error);
    return [];
  }
}

export async function createSupplement(supplementData) {
  try {
    const response = await fetch(
      `${API_URL}/supplements`,
      {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify({
          ...supplementData,
          created_by: currentUserEmail,
          created_at: new Date().toISOString()
        })
      }
    );
    if (!response.ok) throw new Error('Error creating supplement');
    return await response.json();
  } catch (error) {
    console.error('Error creating supplement:', error);
    return null;
  }
}

export async function updateSupplement(supplementId, updates) {
  try {
    const response = await fetch(
      `${API_URL}/supplements?id=eq.${supplementId}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
      }
    );
    if (!response.ok) throw new Error('Error updating supplement');
    return true;
  } catch (error) {
    console.error('Error updating supplement:', error);
    return false;
  }
}

export async function deleteSupplement(supplementId) {
  try {
    const response = await fetch(
      `${API_URL}/supplements?id=eq.${supplementId}`,
      { method: 'DELETE', headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error deleting supplement');
    return true;
  } catch (error) {
    console.error('Error deleting supplement:', error);
    return false;
  }
}

export async function toggleSupplementPublish(supplementId, published) {
  return updateSupplement(supplementId, { published });
}

/**
 * RECURSOS - Gestión de recursos
 */

export async function getAllResources(limit = 100, offset = 0) {
  try {
    const response = await fetch(
      `${API_URL}/resources?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error fetching resources');
    return await response.json();
  } catch (error) {
    console.error('Error getting resources:', error);
    return [];
  }
}

export async function searchResources(query) {
  try {
    const response = await fetch(
      `${API_URL}/resources?or(title.ilike.%${query}%,description.ilike.%${query}%)&select=*`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error searching resources');
    return await response.json();
  } catch (error) {
    console.error('Error searching resources:', error);
    return [];
  }
}

export async function createResource(resourceData) {
  try {
    const response = await fetch(
      `${API_URL}/resources`,
      {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify({
          ...resourceData,
          created_by: currentUserEmail,
          created_at: new Date().toISOString()
        })
      }
    );
    if (!response.ok) throw new Error('Error creating resource');
    return await response.json();
  } catch (error) {
    console.error('Error creating resource:', error);
    return null;
  }
}

export async function updateResource(resourceId, updates) {
  try {
    const response = await fetch(
      `${API_URL}/resources?id=eq.${resourceId}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
      }
    );
    if (!response.ok) throw new Error('Error updating resource');
    return true;
  } catch (error) {
    console.error('Error updating resource:', error);
    return false;
  }
}

export async function deleteResource(resourceId) {
  try {
    const response = await fetch(
      `${API_URL}/resources?id=eq.${resourceId}`,
      { method: 'DELETE', headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error deleting resource');
    return true;
  } catch (error) {
    console.error('Error deleting resource:', error);
    return false;
  }
}

export async function toggleResourcePublish(resourceId, published) {
  return updateResource(resourceId, { published });
}

/**
 * PLANES - Gestión de planes
 */

export async function getAllPlans() {
  try {
    const response = await fetch(
      `${API_URL}/planes?select=*&order=order.asc`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error fetching plans');
    return await response.json();
  } catch (error) {
    console.error('Error getting plans:', error);
    return [];
  }
}

export async function createPlan(planData) {
  try {
    const response = await fetch(
      `${API_URL}/planes`,
      {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify({
          ...planData,
          created_at: new Date().toISOString()
        })
      }
    );
    if (!response.ok) throw new Error('Error creating plan');
    return await response.json();
  } catch (error) {
    console.error('Error creating plan:', error);
    return null;
  }
}

export async function updatePlan(planId, updates) {
  try {
    const response = await fetch(
      `${API_URL}/planes?id=eq.${planId}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify(updates)
      }
    );
    if (!response.ok) throw new Error('Error updating plan');
    return true;
  } catch (error) {
    console.error('Error updating plan:', error);
    return false;
  }
}

export async function deletePlan(planId) {
  try {
    const response = await fetch(
      `${API_URL}/planes?id=eq.${planId}`,
      { method: 'DELETE', headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error deleting plan');
    return true;
  } catch (error) {
    console.error('Error deleting plan:', error);
    return false;
  }
}

/**
 * IA - Conversaciones y moderación
 */

export async function getAIConversations(limit = 50, offset = 0) {
  try {
    const response = await fetch(
      `${API_URL}/ai_conversations?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error fetching conversations');
    return await response.json();
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
}

export async function deleteAIConversation(conversationId) {
  try {
    const response = await fetch(
      `${API_URL}/ai_conversations?id=eq.${conversationId}`,
      { method: 'DELETE', headers: AUTH_HEADER }
    );
    if (!response.ok) throw new Error('Error deleting conversation');
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
}

/**
 * ESTADÍSTICAS - Dashboard
 */

export async function loadAdminStats() {
  try {
    const [users, articles, recipes, supplements, resources, conversations] = await Promise.all([
      fetch(`${API_URL}/usuarios?select=count`, { headers: AUTH_HEADER }).then(r => r.json()),
      fetch(`${API_URL}/articles?select=count`, { headers: AUTH_HEADER }).then(r => r.json()),
      fetch(`${API_URL}/recipes?select=count`, { headers: AUTH_HEADER }).then(r => r.json()),
      fetch(`${API_URL}/supplements?select=count`, { headers: AUTH_HEADER }).then(r => r.json()),
      fetch(`${API_URL}/resources?select=count`, { headers: AUTH_HEADER }).then(r => r.json()),
      fetch(`${API_URL}/ai_conversations?select=count`, { headers: AUTH_HEADER }).then(r => r.json())
    ]);

    adminStats = {
      totalUsers: users[0]?.count || 0,
      totalArticles: articles[0]?.count || 0,
      totalRecipes: recipes[0]?.count || 0,
      totalSupplements: supplements[0]?.count || 0,
      totalResources: resources[0]?.count || 0,
      totalConversations: conversations[0]?.count || 0
    };

    return adminStats;
  } catch (error) {
    console.error('Error loading admin stats:', error);
    return adminStats;
  }
}

export function getAdminStats() {
  return adminStats;
}

/**
 * Verificar rol de usuario
 */
export function getCurrentUserRole() {
  return currentUserRole;
}

export function isAdmin() {
  return currentUserRole === 'admin';
}

export function isEditor() {
  return currentUserRole === 'editor' || currentUserRole === 'admin';
}

/**
 * Limpiar servicio
 */
export function clearAdminService() {
  console.log('🔧 Limpiando AdminService');
  currentUserEmail = null;
  currentUserRole = 'admin';
  adminStats = {};
}
