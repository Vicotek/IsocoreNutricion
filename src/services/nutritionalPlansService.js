/**
 * NutritionalPlansService - Planes personalizados del usuario
 * Opción A: plan personalizado por usuario, no catálogo de plantillas.
 */

import { API_URL, AUTH_HEADER } from './supabaseClient.js';
import { getAuthToken } from './authService.js';

let plansCache = [];
let activePlanId = null;

export const PLAN_OBJECTIVE_OPTIONS = [
  { value: 'perder_peso', label: 'Perder peso' },
  { value: 'ganar_musculo', label: 'Ganar músculo' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'definicion', label: 'Definición' }
];

export const ACTIVITY_OPTIONS = [
  { value: 'sedentario', label: 'Sedentario' },
  { value: 'ligero', label: 'Ligero' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'activo', label: 'Activo' },
  { value: 'muy_activo', label: 'Muy activo' }
];

export const RESTRICTION_OPTIONS = [
  { value: 'sin_gluten', label: 'Sin gluten' },
  { value: 'sin_lactosa', label: 'Sin lactosa' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'vegano', label: 'Vegano' },
  { value: 'pescetariano', label: 'Pescetariano' },
  { value: 'sin_frutos_secos', label: 'Sin frutos secos' }
];

function normalizePlanRow(plan) {
  if (!plan) return null;

  return {
    id: plan.id ?? null,
    objetivo: plan.objetivo || 'mantenimiento',
    edad: plan.edad ?? null,
    peso_kg: plan.peso_kg ?? null,
    altura_cm: plan.altura_cm ?? null,
    actividad: plan.actividad || 'moderado',
    restricciones: Array.isArray(plan.restricciones) ? plan.restricciones : [],
    calorias_objetivo: plan.calorias_objetivo ?? null,
    proteina_objetivo_g: plan.proteina_objetivo_g ?? null,
    carbos_objetivo_g: plan.carbos_objetivo_g ?? null,
    grasas_objetivo_g: plan.grasas_objetivo_g ?? null,
    plan_generado: plan.plan_generado || '',
    condicion_principal: plan.condicion_principal || '',
    observaciones: plan.observaciones || '',
    profesional: plan.profesional || '',
    version: plan.version ?? 1,
    created_at: plan.created_at || null,
    updated_at: plan.updated_at || null
  };
}

async function callPlanRpc(functionName, params = {}) {
  const token = getAuthToken();

  if (!token) {
    return { data: null, error: { code: '28000', message: 'Sesión no válida' } };
  }

  try {
    const response = await fetch(`${API_URL}/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        ...AUTH_HEADER,
        'Authorization': `Bearer ${AUTH_HEADER.apikey}`
      },
      body: JSON.stringify({ p_sesion_token: token, ...params })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return { data: null, error: { code: response.status, message: result?.message || response.statusText } };
    }

    return { data: result, error: null };
  } catch (error) {
    console.error(`❌ Error ejecutando RPC ${functionName}:`, error);
    return { data: null, error: { code: 'unknown', message: error.message } };
  }
}

function cachePlans(items = []) {
  plansCache = items.map(normalizePlanRow).filter(Boolean);
  if (plansCache.length > 0) {
    activePlanId = plansCache[0].id ?? activePlanId;
  }
  localStorage.setItem('isocore_personal_plans_cache', JSON.stringify(plansCache));
}

export function getPlanObjectiveOptions() {
  return PLAN_OBJECTIVE_OPTIONS;
}

export function getActivityOptions() {
  return ACTIVITY_OPTIONS;
}

export function getRestrictionOptions() {
  return RESTRICTION_OPTIONS;
}

export function initializeNutritionalPlansService(email) {
  if (!email) {
    console.warn('⚠️ Email no proporcionado para NutritionalPlansService');
    return;
  }

  console.log('📋 NutritionalPlansService inicializado para:', email);
  loadMyPlans();
}

export async function loadMyPlans() {
  try {
    const { data, error } = await callPlanRpc('app_get_mis_planes');

    if (error) {
      console.warn('⚠️ Error cargando planes del usuario:', error);
      const cached = localStorage.getItem('isocore_personal_plans_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        plansCache = Array.isArray(parsed) ? parsed : [];
      }
      return plansCache;
    }

    const items = Array.isArray(data) ? data : [];
    cachePlans(items);
    console.log(`✅ ${plansCache.length} planes personales cargados`);
    return plansCache;
  } catch (error) {
    console.error('❌ Error cargando planes personales:', error);
    return plansCache;
  }
}

export function getNutritionalPlans() {
  if (plansCache.length === 0) {
    try {
      const cached = localStorage.getItem('isocore_personal_plans_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        plansCache = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error leyendo cache de planes personales:', error);
    }
  }

  return plansCache;
}

export function getCurrentUserPlan() {
  const plans = getNutritionalPlans();
  if (!plans.length) return null;

  if (activePlanId) {
    return plans.find(plan => String(plan.id) === String(activePlanId)) || plans[0];
  }

  return plans[0];
}

export function getNutritionalPlan(planId) {
  if (!planId) return null;
  return getNutritionalPlans().find(plan => String(plan.id) === String(planId)) || null;
}

export async function createNutritionalPlan(payload = {}) {
  const cleaned = {
    p_objetivo: payload.objetivo || 'mantenimiento',
    p_edad: payload.edad ?? null,
    p_peso_kg: payload.peso_kg ?? null,
    p_altura_cm: payload.altura_cm ?? null,
    p_actividad: payload.actividad || 'moderado',
    p_restricciones: Array.isArray(payload.restricciones) ? payload.restricciones : [],
    p_calorias_objetivo: payload.calorias_objetivo ?? null,
    p_proteina_objetivo_g: payload.proteina_objetivo_g ?? null,
    p_carbos_objetivo_g: payload.carbos_objetivo_g ?? null,
    p_grasas_objetivo_g: payload.grasas_objetivo_g ?? null,
    p_plan_generado: payload.plan_generado || null,
    p_condicion_principal: payload.condicion_principal || null,
    p_observaciones: payload.observaciones || null,
    p_profesional: payload.profesional || null
  };

  const { data, error } = await callPlanRpc('app_crear_plan_nutricional', cleaned);

  if (error) {
    return { ok: false, error };
  }

  const created = Array.isArray(data) ? data[0] : data;
  const normalized = normalizePlanRow(created || cleaned);
  const merged = [normalized, ...plansCache.filter(plan => String(plan.id) !== String(normalized?.id || ''))];
  cachePlans(merged);

  return { ok: true, plan: normalized };
}

export async function updateNutritionalPlan(planId, updates = {}) {
  if (!planId) {
    return { ok: false, error: { code: '400', message: 'Falta planId' } };
  }

  const payload = {
    p_plan_id: planId,
    ...(updates.objetivo ? { p_objetivo: updates.objetivo } : {}),
    ...(updates.edad !== undefined && updates.edad !== null ? { p_edad: Number(updates.edad) } : {}),
    ...(updates.peso_kg !== undefined && updates.peso_kg !== null ? { p_peso_kg: Number(updates.peso_kg) } : {}),
    ...(updates.altura_cm !== undefined && updates.altura_cm !== null ? { p_altura_cm: Number(updates.altura_cm) } : {}),
    ...(updates.actividad ? { p_actividad: updates.actividad } : {}),
    ...(updates.restricciones ? { p_restricciones: updates.restricciones } : {}),
    ...(updates.calorias_objetivo !== undefined && updates.calorias_objetivo !== null ? { p_calorias_objetivo: Number(updates.calorias_objetivo) } : {}),
    ...(updates.proteina_objetivo_g !== undefined && updates.proteina_objetivo_g !== null ? { p_proteina_objetivo_g: Number(updates.proteina_objetivo_g) } : {}),
    ...(updates.carbos_objetivo_g !== undefined && updates.carbos_objetivo_g !== null ? { p_carbos_objetivo_g: Number(updates.carbos_objetivo_g) } : {}),
    ...(updates.grasas_objetivo_g !== undefined && updates.grasas_objetivo_g !== null ? { p_grasas_objetivo_g: Number(updates.grasas_objetivo_g) } : {}),
    ...(updates.plan_generado ? { p_plan_generado: updates.plan_generado } : {}),
    ...(updates.condicion_principal ? { p_condicion_principal: updates.condicion_principal } : {}),
    ...(updates.observaciones ? { p_observaciones: updates.observaciones } : {}),
    ...(updates.profesional ? { p_profesional: updates.profesional } : {})
  };

  const { data, error } = await callPlanRpc('app_actualizar_plan_nutricional', payload);

  if (error) {
    return { ok: false, error };
  }

  const updated = Array.isArray(data) ? data[0] : data;
  const next = normalizePlanRow(updated || { ...getNutritionalPlan(planId), ...updates, id: planId });
  const merged = [next, ...plansCache.filter(plan => String(plan.id) !== String(planId))];
  cachePlans(merged);

  return { ok: true, plan: next };
}

export async function deleteNutritionalPlan(planId) {
  if (!planId) {
    return { ok: false, error: { code: '400', message: 'Falta planId' } };
  }

  const { data, error } = await callPlanRpc('app_eliminar_plan_nutricional', { p_plan_id: planId });

  if (error) {
    return { ok: false, error };
  }

  plansCache = plansCache.filter(plan => String(plan.id) !== String(planId));
  if (String(activePlanId) === String(planId)) {
    activePlanId = plansCache[0]?.id ?? null;
  }
  localStorage.setItem('isocore_personal_plans_cache', JSON.stringify(plansCache));

  return { ok: true, data };
}

export function setUserPlan(planId) {
  if (!planId) return;
  activePlanId = planId;
  localStorage.setItem('isocore_user_plan', String(planId));
}

export function getUserPlan() {
  const existing = localStorage.getItem('isocore_user_plan');
  if (existing) {
    activePlanId = existing;
  }

  return getCurrentUserPlan();
}

export function getAvailableObjectives() {
  return PLAN_OBJECTIVE_OPTIONS.map(option => option.value);
}

export function getAvailableDietTypes() {
  return [];
}

export function getAvailableLevels() {
  return [];
}

export function clearNutritionalPlansService() {
  plansCache = [];
  activePlanId = null;
  localStorage.removeItem('isocore_personal_plans_cache');
  localStorage.removeItem('isocore_user_plan');
}

export async function reloadPlans() {
  return loadMyPlans();
}
