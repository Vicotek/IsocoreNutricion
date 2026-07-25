import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseConfig.js';

// Supabase Configuration - Ahora con credenciales reales
export const API_URL = `${SUPABASE_URL}/rest/v1`;
export const AUTH_HEADER = {
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json'
};

let supabaseClient = null;

/**
 * Obtener plan del usuario desde Supabase usando REST API
 * @param {string} email - Email del usuario
 * @returns {Promise<string|null>} - Plan: 'free', 'premium', 'vip' o null
 */
export async function getUserPlanFromSupabase(email) {
  if (!email) return null;

  try {
    console.log(`📊 Obteniendo plan desde Supabase para: ${email}`);
    
    // Vista segura (mismo motivo que getUserFromSupabase): la tabla usuarios
    // no tiene lectura pública a propósito (contiene password_hash/tokens).
    const response = await fetch(
      `${API_URL}/usuarios_publicas?email=eq.${encodeURIComponent(email)}&select=plan`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Error de Supabase (${response.status}):`, await response.text());
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      let plan = data[0].plan;
      
      // Mapear valores de Supabase a valores internos
      if (plan === 'gratis') plan = 'free';
      
      console.log(`✅ Plan obtenido desde Supabase: ${plan}`);
      return plan;
    }

    console.log('ℹ️ Usuario no encontrado en usuarios');
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo plan de Supabase:', error);
    return null;
  }
}

/**
 * Actualizar plan del usuario en Supabase
 * @param {string} userId - ID del usuario
 * @param {string} plan - Nuevo plan
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
export async function updateUserPlanInSupabase(userId, plan) {
  if (!userId || !plan) return false;

  try {
    console.log(`📝 Actualizando plan en Supabase: ${userId} → ${plan}`);
    
    const response = await fetch(
      `${API_URL}/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify({ plan })
      }
    );

    if (!response.ok) {
      console.error(`❌ Error actualizando plan (${response.status}):`, await response.text());
      return false;
    }

    console.log(`✅ Plan actualizado correctamente en Supabase`);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando plan:', error);
    return false;
  }
}

/**
 * Obtener usuario completo desde Supabase
 * @param {string} email - Email del usuario
 * @returns {Promise<Object|null>} - Objeto de usuario o null
 */
export async function getUserFromSupabase(email) {
  if (!email) return null;

  try {
    // Vista segura (usuarios_publicas): expone solo columnas no sensibles
    // (nunca password_hash / tokens) — la tabla real usuarios sigue sin
    // lectura pública.
    const response = await fetch(
      `${API_URL}/usuarios_publicas?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
}

/**
 * Actualizar plan del usuario en tabla usuarios
 * @param {string} email - Email del usuario
 * @param {string} plan - Nuevo plan
 * @returns {Promise<boolean>}
 */
export async function createOrUpdateUserInSupabase(userData) {
  if (!userData.email) return false;

  try {
    // Mapear plan de valores internos a Supabase
    let supabasePlan = userData.plan || 'gratis';
    if (supabasePlan === 'free') supabasePlan = 'gratis';

    const response = await fetch(
      `${API_URL}/usuarios?email=eq.${encodeURIComponent(userData.email)}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify({
          nombre: userData.name || userData.nombre || '',
          plan: supabasePlan,
          idioma: userData.language || 'es'
        })
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Error actualizando usuario (${response.status}):`, await response.text());
      return false;
    }

    console.log('✅ Usuario actualizado en Supabase');
    return true;
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return false;
  }
}

/**
 * Escuchar cambios en tiempo real del plan del usuario (Usando polling)
 * @param {string} email - Email del usuario
 * @param {Function} callback - Función que se ejecuta cuando cambia el plan
 * @returns {Function} - Función para detener el polling
 */
export function subscribeToUserPlan(email, callback) {
  if (!email || !callback) return null;

  let lastPlan = null;
  const pollInterval = 5000; // Consultar cada 5 segundos

  const interval = setInterval(async () => {
    try {
      const plan = await getUserPlanFromSupabase(email);
      
      if (plan && plan !== lastPlan) {
        lastPlan = plan;
        console.log(`🔔 Plan actualizado detectado: ${plan}`);
        callback(plan);
      }
    } catch (error) {
      console.error('Error en polling de plan:', error);
    }
  }, pollInterval);

  // Retornar función para detener el polling
  return () => clearInterval(interval);
}

/**
 * Obtener actividad reciente del usuario
 * @param {string} email - Email del usuario
 * @param {number} limit - Número de registros a obtener
 * @returns {Promise<Array|null>} - Array de actividad reciente
 */
export async function getRecentActivityFromSupabase(email, limit = 10) {
  if (!email) return null;

  try {
    console.log(`📊 Obteniendo actividad reciente para: ${email}`);
    
    const response = await fetch(
      `${API_URL}/user_activity?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=${limit}`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Error obteniendo actividad (${response.status})`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ ${data?.length || 0} registros de actividad obtenidos`);
    return data || [];
  } catch (error) {
    console.error('Error obteniendo actividad reciente:', error);
    return null;
  }
}

/**
 * Obtener favoritos/recursos guardados del usuario
 * @param {string} email - Email del usuario
 * @returns {Promise<Array|null>} - Array de favoritos
 */
export async function getFavoritesFromSupabase(email) {
  if (!email) return null;

  try {
    console.log(`💾 Obteniendo favoritos para: ${email}`);
    
    const response = await fetch(
      `${API_URL}/favorites?email=eq.${encodeURIComponent(email)}&order=created_at.desc`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Error obteniendo favoritos (${response.status})`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ ${data?.length || 0} favoritos obtenidos`);
    return data || [];
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    return null;
  }
}

/**
 * Guardar nueva actividad del usuario
 * @param {string} email - Email del usuario
 * @param {Object} activity - Datos de actividad
 * @returns {Promise<boolean>} - true si se guardó correctamente
 */
export async function saveActivityToSupabase(email, activity) {
  if (!email || !activity) return false;

  try {
    console.log(`📝 Guardando actividad:`, activity.type);
    
    const activityData = {
      email: email,
      type: activity.type,
      resource_name: activity.resourceName || activity.name || 'sin nombre',
      resource_id: activity.resourceId || null,
      action: activity.action || 'view',
      metadata: activity.metadata || {},
      created_at: new Date().toISOString()
    };

    const response = await fetch(
      `${API_URL}/user_activity`,
      {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify(activityData)
      }
    );

    if (!response.ok) {
      console.error(`❌ Error guardando actividad (${response.status})`);
      return false;
    }

    console.log(`✅ Actividad guardada`);
    return true;
  } catch (error) {
    console.error('Error guardando actividad:', error);
    return false;
  }
}

/**
 * Guardar favorito
 * @param {string} email - Email del usuario
 * @param {Object} favorite - Datos del favorito
 * @returns {Promise<boolean>} - true si se guardó correctamente
 */
export async function saveFavoriteToSupabase(email, favorite) {
  if (!email || !favorite) return false;

  try {
    console.log(`💾 Guardando favorito:`, favorite.type);
    
    const favoriteData = {
      email: email,
      type: favorite.type, // 'recipe', 'resource', 'supplement'
      name: favorite.name || 'sin nombre',
      resource_id: favorite.resourceId || null,
      url: favorite.url || null,
      metadata: favorite.metadata || {},
      created_at: new Date().toISOString()
    };

    const response = await fetch(
      `${API_URL}/favorites`,
      {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify(favoriteData)
      }
    );

    if (!response.ok) {
      console.error(`❌ Error guardando favorito (${response.status})`);
      return false;
    }

    console.log(`✅ Favorito guardado`);
    return true;
  } catch (error) {
    console.error('Error guardando favorito:', error);
    return false;
  }
}

/**
 * Obtener todos los artículos publicados desde Supabase
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @returns {Promise<Array>} - Array de artículos
 */
function normalizeArticleRow(row) {
  if (!row) return row;
  const content = row.contenido || '';
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const summary = row.resumen || (content ? `${content.slice(0, 180)}${content.length > 180 ? '…' : ''}` : '');

  return {
    id: row.id,
    title: row.titulo,
    summary,
    description: row.resumen || '',
    excerpt: summary,
    content,
    category: row.categoria,
    topic: row.tema,
    subcategory: row.subcategoria,
    author: row.autor || 'IsoCore',
    tags: row.tags || [],
    slug: row.slug,
    evidence_level: row.nivel_evidencia,
    reference_url: row.referencia_url,
    source: row.fuente,
    status: row.activo === false ? 'draft' : 'published',
    reading_time: wordCount ? Math.max(1, Math.round(wordCount / 200)) : null,
    image: null,
    created_at: row.fecha_creacion,
    updated_at: row.fecha_actualizacion
  };
}

export async function getArticlesFromSupabase(limit = 999, offset = 0) {
  try {
    console.log('📚 Obteniendo artículos desde Supabase (base_conocimientos)...');

    const response = await fetch(
      `${API_URL}/base_conocimientos?activo=eq.true&order=fecha_creacion.desc&limit=${limit}&offset=${offset}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo artículos (${response.status})`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ ${data.length || 0} artículos obtenidos`);
    return Array.isArray(data) ? data.map(normalizeArticleRow) : [];
  } catch (error) {
    console.error('Error obteniendo artículos:', error);
    return [];
  }
}

/**
 * Obtener un artículo específico por ID
 * @param {string} articleId - ID del artículo
 * @returns {Promise<Object|null>} - Objeto del artículo o null
 */
export async function getArticleFromSupabase(articleId) {
  try {
    const response = await fetch(
      `${API_URL}/base_conocimientos?id=eq.${articleId}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo artículo ${articleId}`);
      return null;
    }

    const data = await response.json();
    return data && data.length > 0 ? normalizeArticleRow(data[0]) : null;
  } catch (error) {
    console.error('Error obteniendo artículo:', error);
    return null;
  }
}

/**
 * Buscar artículos por query de búsqueda
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Array>} - Array de artículos que coinciden
 */
export async function searchArticlesInSupabase(query) {
  try {
    if (!query || query.length < 2) return [];

    const response = await fetch(
      `${API_URL}/base_conocimientos?activo=eq.true&or=(titulo.ilike.%${encodeURIComponent(query)}%,resumen.ilike.%${encodeURIComponent(query)}%,contenido.ilike.%${encodeURIComponent(query)}%)&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error buscando artículos`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeArticleRow) : [];
  } catch (error) {
    console.error('Error buscando artículos:', error);
    return [];
  }
}

/**
 * Obtener artículos por categoría
 * @param {string} category - Nombre de la categoría
 * @returns {Promise<Array>} - Array de artículos en la categoría
 */
export async function getArticlesByCategoryFromSupabase(category) {
  try {
    const response = await fetch(
      `${API_URL}/base_conocimientos?categoria=eq.${encodeURIComponent(category)}&activo=eq.true&order=fecha_creacion.desc&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo artículos por categoría`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeArticleRow) : [];
  } catch (error) {
    console.error('Error obteniendo artículos por categoría:', error);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 🍽️ PRIORIDAD 2: RECETAS - Biblioteca de recetas desde Supabase
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtener todas las recetas
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @returns {Promise<Array>} - Array de recetas
 */
/**
 * Normaliza una fila real de `recetas` (esquema en español: nombre_es,
 * imagen_url, destacada, nueva, nivel_acceso...) a los campos en inglés
 * que espera recipesService.js (title, featured, image, difficulty...).
 * @param {Object} row - Fila cruda de Supabase
 * @returns {Object} - Receta normalizada
 */
function normalizeRecipeRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    title: row.nombre_es,
    name_ca: row.nombre_ca,
    name_en: row.nombre_en,
    category: row.categoria,
    meal_type: row.tipo_comida,
    tier: row.nivel_acceso === 'gratis' ? 'free' : row.nivel_acceso,
    calories: row.calorias ?? row.kcal,
    protein: row.proteina_g ?? row.proteinas,
    carbs: row.carbos_g ?? row.carbohidratos,
    fat: row.grasas_g ?? row.grasas,
    prep_time: row.tiempo_preparacion ?? row.tiempo_min,
    difficulty: row.dificultad,
    ingredients: row.ingredientes,
    steps: row.pasos,
    image: row.imagen_url,
    featured: row.destacada === true,
    isNew: row.nueva === true,
    active: row.activa !== false,
    tags: row.etiquetas || [],
    slug: row.slug,
    created_at: row.fecha_creacion
  };
}

export async function getRecipesFromSupabase(limit = 999, offset = 0) {
  try {
    console.log('🍽️ Obteniendo recetas desde Supabase...');

    const response = await fetch(
      `${API_URL}/recetas?order=fecha_creacion.desc&limit=${limit}&offset=${offset}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo recetas (${response.status})`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ ${data.length || 0} recetas obtenidas`);
    return Array.isArray(data) ? data.map(normalizeRecipeRow) : [];
  } catch (error) {
    console.error('❌ Error obteniendo recetas:', error);
    return [];
  }
}

/**
 * Obtener una receta específica por ID
 * @param {string} recipeId - ID de la receta
 * @returns {Promise<Object|null>} - Objeto de la receta o null
 */
export async function getRecipeFromSupabase(recipeId) {
  try {
    const response = await fetch(
      `${API_URL}/recetas?id=eq.${recipeId}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo receta ${recipeId}`);
      return null;
    }

    const data = await response.json();
    return data && data.length > 0 ? normalizeRecipeRow(data[0]) : null;
  } catch (error) {
    console.error('❌ Error obteniendo receta:', error);
    return null;
  }
}

/**
 * Buscar recetas por término de búsqueda
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Array>} - Array de recetas que coinciden
 */
export async function searchRecipesInSupabase(query) {
  try {
    if (!query || query.length < 2) return [];

    console.log(`🔍 Buscando recetas: ${query}`);
    
    const response = await fetch(
      `${API_URL}/recetas?or=(name.ilike.%${encodeURIComponent(query)}%,description.ilike.%${encodeURIComponent(query)}%,ingredients.ilike.%${encodeURIComponent(query)}%)&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error buscando recetas`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error buscando recetas:', error);
    return [];
  }
}

/**
 * Filtrar recetas por criterios (dificultad, tiempo, etc)
 * @param {Object} filters - Objeto con filtros
 * @returns {Promise<Array>} - Array de recetas filtradas
 */
export async function filterRecipesInSupabase(filters = {}) {
  try {
    let query = `${API_URL}/recetas?`;
    const params = [];

    if (filters.difficulty) {
      params.push(`difficulty=eq.${encodeURIComponent(filters.difficulty)}`);
    }

    if (filters.prepTime) {
      params.push(`prep_time=lte.${filters.prepTime}`);
    }

    if (filters.servings) {
      params.push(`servings=eq.${filters.servings}`);
    }

    if (filters.mealType) {
      params.push(`meal_type=eq.${encodeURIComponent(filters.mealType)}`);
    }

    query += params.join('&') + '&select=*&order=created_at.desc';

    console.log(`🔍 Filtrando recetas con criterios...`);
    
    const response = await fetch(query, {
      method: 'GET',
      headers: AUTH_HEADER
    });

    if (!response.ok) {
      console.error(`❌ Error filtrando recetas`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error filtrando recetas:', error);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 📚 PRIORIDAD 3: MÓDULOS EDUCATIVOS - Módulos reales del Centro
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtener módulos educativos
 * @param {string} status - Estado de los módulos (published, draft, all)
 * @returns {Promise<Array>} - Array de módulos educativos
 */
/**
 * Normaliza una fila real de `modulos_educativos` (titulo, descripcion,
 * orden, activo) a los campos genéricos que usa el resto de la app.
 */
function normalizeModuleRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    slug: row.slug,
    title: row.titulo,
    description: row.descripcion,
    order_index: row.orden,
    category: row.categoria,
    active: row.activo !== false,
    image: null,
    created_at: row.fecha_creacion
  };
}

export async function getEducationalModulesFromSupabase(status = 'published') {
  try {
    console.log('📚 Obteniendo módulos educativos desde Supabase...');

    let query = `${API_URL}/modulos_educativos?`;
    if (status !== 'all') {
      query += `activo=eq.true&`;
    }
    query += `order=orden.asc&select=*`;

    const response = await fetch(query, {
      method: 'GET',
      headers: AUTH_HEADER
    });

    if (!response.ok) {
      console.error(`❌ Error obteniendo módulos educativos (${response.status})`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ ${data.length || 0} módulos educativos obtenidos`);
    return Array.isArray(data) ? data.map(normalizeModuleRow) : [];
  } catch (error) {
    console.error('❌ Error obteniendo módulos educativos:', error);
    return [];
  }
}

/**
 * Obtener un módulo educativo específico
 * @param {string} moduleId - ID del módulo
 * @returns {Promise<Object|null>} - Objeto del módulo o null
 */
export async function getEducationalModuleFromSupabase(moduleId) {
  try {
    const response = await fetch(
      `${API_URL}/modulos_educativos?id=eq.${moduleId}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo módulo ${moduleId}`);
      return null;
    }

    const data = await response.json();
    return data && data.length > 0 ? normalizeModuleRow(data[0]) : null;
  } catch (error) {
    console.error('❌ Error obteniendo módulo:', error);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 📋 PRIORIDAD 4: PLANES NUTRICIONALES - Conectar con "Mi Plan"
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtener todos los planes nutricionales
 * @returns {Promise<Array>} - Array de planes
 */
export async function getNutritionalPlansFromSupabase() {
  try {
    console.log('📋 Obteniendo planes nutricionales desde Supabase...');
    
    const response = await fetch(
      `${API_URL}/planes_nutricionales?order=created_at.desc&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo planes nutricionales`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ ${data.length || 0} planes obtenidos`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo planes nutricionales:', error);
    return [];
  }
}

/**
 * Obtener un plan nutricional específico
 * @param {string} planId - ID del plan
 * @returns {Promise<Object|null>} - Objeto del plan o null
 */
export async function getNutritionalPlanFromSupabase(planId) {
  try {
    const response = await fetch(
      `${API_URL}/planes_nutricionales?id=eq.${planId}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo plan ${planId}`);
      return null;
    }

    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('❌ Error obteniendo plan:', error);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 🔬 PRIORIDAD 5: PROTOCOLOS - Apartado Protocolos en Centro IA
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtener todos los protocolos
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Offset para paginación
 * @returns {Promise<Array>} - Array de protocolos
 */
/**
 * Normaliza una fila real de `protocolos` (nombre, descripcion, objetivo,
 * evidencia, activo) a los campos genéricos que usa el resto de la app.
 */
function normalizeProtocolRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.nombre,
    title: row.nombre,
    description: row.descripcion,
    content: row.descripcion || '',
    objective: row.objetivo,
    evidence: row.evidencia,
    active: row.activo !== false,
    image: null,
    created_at: row.created_at
  };
}

export async function getProtocolsFromSupabase(limit = 999, offset = 0) {
  try {
    console.log('🔬 Obteniendo protocolos desde Supabase...');

    const response = await fetch(
      `${API_URL}/protocolos?order=created_at.desc&limit=${limit}&offset=${offset}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo protocolos`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ ${data.length || 0} protocolos obtenidos`);
    return Array.isArray(data) ? data.map(normalizeProtocolRow) : [];
  } catch (error) {
    console.error('❌ Error obteniendo protocolos:', error);
    return [];
  }
}

/**
 * Obtener un protocolo específico
 * @param {string} protocolId - ID del protocolo
 * @returns {Promise<Object|null>} - Objeto del protocolo o null
 */
export async function getProtocolFromSupabase(protocolId) {
  try {
    const response = await fetch(
      `${API_URL}/protocolos?id=eq.${protocolId}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo protocolo ${protocolId}`);
      return null;
    }

    const data = await response.json();
    return data && data.length > 0 ? normalizeProtocolRow(data[0]) : null;
  } catch (error) {
    console.error('❌ Error obteniendo protocolo:', error);
    return null;
  }
}

/**
 * Buscar protocolos por término
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Array>} - Array de protocolos que coinciden
 */
export async function searchProtocolsInSupabase(query) {
  try {
    if (!query || query.length < 2) return [];

    console.log(`🔍 Buscando protocolos: ${query}`);
    
    const response = await fetch(
      `${API_URL}/protocolos?or=(nombre.ilike.%${encodeURIComponent(query)}%,descripcion.ilike.%${encodeURIComponent(query)}%,objetivo.ilike.%${encodeURIComponent(query)}%)&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error buscando protocolos`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeProtocolRow) : [];
  } catch (error) {
    console.error('❌ Error buscando protocolos:', error);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 🏥 PRIORIDAD 6: CONDICIONES - Relacionar artículos, protocolos y suplementos
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtener todas las condiciones
 * @returns {Promise<Array>} - Array de condiciones
 */
export async function getConditionsFromSupabase() {
  try {
    console.log('🏥 Obteniendo condiciones desde Supabase...');
    
    const response = await fetch(
      `${API_URL}/condiciones?order=name.asc&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo condiciones`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ ${data.length || 0} condiciones obtenidas`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo condiciones:', error);
    return [];
  }
}

/**
 * Obtener una condición específica
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Object|null>} - Objeto de la condición o null
 */
export async function getConditionFromSupabase(conditionId) {
  try {
    const response = await fetch(
      `${API_URL}/condiciones?id=eq.${conditionId}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo condición ${conditionId}`);
      return null;
    }

    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('❌ Error obteniendo condición:', error);
    return null;
  }
}

/**
 * Obtener artículos relacionados a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Array>} - Array de artículos relacionados
 */
export async function getArticlesByConditionFromSupabase(conditionId) {
  try {
    if (!conditionId) return [];

    console.log(`📚 Obteniendo artículos para condición ${conditionId}...`);
    
    const response = await fetch(
      `${API_URL}/articles?condition_id=eq.${conditionId}&select=*&order=created_at.desc`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo artículos por condición`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo artículos por condición:', error);
    return [];
  }
}

/**
 * Obtener protocolos relacionados a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Array>} - Array de protocolos relacionados
 */
export async function getProtocolsByConditionFromSupabase(conditionId) {
  try {
    if (!conditionId) return [];

    console.log(`🔬 Obteniendo protocolos para condición ${conditionId}...`);
    
    const response = await fetch(
      `${API_URL}/protocolos?condition_id=eq.${conditionId}&select=*&order=created_at.desc`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo protocolos por condición`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo protocolos por condición:', error);
    return [];
  }
}

/**
 * Obtener suplementos relacionados a una condición
 * @param {string} conditionId - ID de la condición
 * @returns {Promise<Array>} - Array de suplementos relacionados
 */
export async function getSupplementsByConditionFromSupabase(conditionId) {
  try {
    if (!conditionId) return [];

    console.log(`💊 Obteniendo suplementos para condición ${conditionId}...`);
    
    const response = await fetch(
      `${API_URL}/supplements?condition_id=eq.${conditionId}&select=*&order=created_at.desc`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo suplementos por condición`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo suplementos por condición:', error);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 📖 PRIORIDAD 7: REFERENCIAS CIENTÍFICAS - Referencias al final de artículos
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtener todas las referencias científicas
 * @returns {Promise<Array>} - Array de referencias
 */
export async function getScientificReferencesFromSupabase() {
  try {
    console.log('📖 Obteniendo referencias científicas desde Supabase...');
    
    const response = await fetch(
      `${API_URL}/referencias_cientificas?order=created_at.desc&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo referencias científicas`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ ${data.length || 0} referencias obtenidas`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias científicas:', error);
    return [];
  }
}

/**
 * Obtener referencias científicas asociadas a un artículo
 * @param {string} articleId - ID del artículo
 * @returns {Promise<Array>} - Array de referencias para el artículo
 */
export async function getReferencesByArticleFromSupabase(articleId) {
  try {
    if (!articleId) return [];

    console.log(`📖 Obteniendo referencias para artículo ${articleId}...`);
    
    const response = await fetch(
      `${API_URL}/referencias_cientificas?article_id=eq.${articleId}&order=order_index.asc&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo referencias del artículo`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias del artículo:', error);
    return [];
  }
}

/**
 * Obtener referencias científicas asociadas a un protocolo
 * @param {string} protocolId - ID del protocolo
 * @returns {Promise<Array>} - Array de referencias para el protocolo
 */
export async function getReferencesByProtocolFromSupabase(protocolId) {
  try {
    if (!protocolId) return [];

    console.log(`📖 Obteniendo referencias para protocolo ${protocolId}...`);
    
    const response = await fetch(
      `${API_URL}/referencias_cientificas?protocol_id=eq.${protocolId}&order=order_index.asc&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo referencias del protocolo`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias del protocolo:', error);
    return [];
  }
}

/**
 * Obtener referencias científicas de un suplemento
 * @param {string} supplementId - ID del suplemento
 * @returns {Promise<Array>} - Array de referencias para el suplemento
 */
export async function getReferencesBySupplementFromSupabase(supplementId) {
  try {
    if (!supplementId) return [];

    console.log(`📖 Obteniendo referencias para suplemento ${supplementId}...`);
    
    const response = await fetch(
      `${API_URL}/referencias_cientificas?supplement_id=eq.${supplementId}&order=order_index.asc&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo referencias del suplemento`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo referencias del suplemento:', error);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ✨ FUNCIONES AUXILIARES - Featured/Destacados
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtener artículos destacados (featured)
 * @param {number} limit - Número máximo de artículos a retornar
 * @returns {Promise<Array>} - Array de artículos destacados
 */
export async function getFeaturedArticlesFromSupabase(limit = 5) {
  try {
    console.log('⭐ Obteniendo artículos destacados...');

    // base_conocimientos no tiene columna "featured": usamos los más recientes
    const response = await fetch(
      `${API_URL}/base_conocimientos?activo=eq.true&order=fecha_creacion.desc&limit=${limit}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo artículos destacados`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeArticleRow) : [];
  } catch (error) {
    console.error('❌ Error obteniendo artículos destacados:', error);
    return [];
  }
}

/**
 * Obtener suplementos destacados (featured)
 * @param {number} limit - Número máximo de suplementos a retornar
 * @returns {Promise<Array>} - Array de suplementos destacados
 */
export async function getFeaturedSupplementsFromSupabase(limit = 5) {
  try {
    console.log('⭐ Obteniendo suplementos destacados...');
    
    const response = await fetch(
      `${API_URL}/supplements?featured=eq.true&order=created_at.desc&limit=${limit}&select=*`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.error(`❌ Error obteniendo suplementos destacados`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error obteniendo suplementos destacados:', error);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 🔐 GESTIÓN DE ROLES - Control de acceso a funcionalidades
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtener rol del usuario desde Supabase
 * @param {string} email - Email del usuario
 * @returns {Promise<string|null>} - Role: 'admin', 'expert' o 'user' (null en BD = paciente normal, sin privilegios)
 */
export async function getUserRoleFromSupabase(email) {
  if (!email) return null;

  try {
    console.log(`🔐 Obteniendo rol del usuario: ${email}`);

    // usuarios_publicas (no usuarios directo): la tabla real tiene la
    // columna "Role" con mayúscula y RLS sin políticas para el anon key;
    // la vista ya expone "role" en minúscula y de lectura pública.
    const response = await fetch(
      `${API_URL}/usuarios_publicas?email=eq.${encodeURIComponent(email)}&select=role`,
      {
        method: 'GET',
        headers: AUTH_HEADER
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Error obteniendo rol (${response.status})`);
      return null;
    }

    const data = await response.json();
    const role = data && data.length > 0 ? data[0].role : null;
    console.log(`✅ Rol obtenido: ${role || 'user'}`);
    return role || 'user';
  } catch (error) {
    console.error('❌ Error obteniendo rol del usuario:', error);
    return null;
  }
}

/**
 * Actualizar rol del usuario en Supabase
 * @param {string} email - Email del usuario
 * @param {string} role - Nuevo rol ('admin' o 'user')
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 * ⚠️ Sin usar todavía desde ningún UI, y probablemente falla hoy: escribe
 * en la tabla usuarios directamente (RLS activo sin política de UPDATE
 * para el anon key). Si se construye una pantalla de gestión de roles,
 * esto debería pasar por un webhook de n8n en vez de PATCH directo.
 */
export async function updateUserRoleInSupabase(email, role) {
  if (!email || !role) return false;

  try {
    console.log(`🔐 Actualizando rol: ${email} → ${role}`);
    
    const response = await fetch(
      `${API_URL}/usuarios?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: AUTH_HEADER,
        body: JSON.stringify({ role })
      }
    );

    if (!response.ok) {
      console.error(`❌ Error actualizando rol (${response.status}):`, await response.text());
      return false;
    }

    console.log(`✅ Rol actualizado correctamente`);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando rol:', error);
    return false;
  }
}

/**
 * Verificar si un usuario tiene rol de administrador
 * @param {string} email - Email del usuario
 * @returns {Promise<boolean>} - true si es admin
 */
export async function isUserAdminFromSupabase(email) {
  const role = await getUserRoleFromSupabase(email);
  return role === 'admin';
}
