/**
 * MenuSemanalService - Menú semanal generado desde recetas reales
 *
 * Consume los RPC app_generar_menu_semanal / app_get_mi_menu_semanal.
 * El backend devuelve 21 filas (7 días × desayuno/comida/cena):
 *   { dia_semana (1-7), tipo_comida, receta_id, receta_nombre,
 *     receta_calorias, receta_proteina, franja_vacia }
 *
 * franja_vacia = true significa que NO hay ninguna receta que cumpla las
 * restricciones del usuario para esa franja. Se muestra como vacía, nunca
 * se rellena con otra cosa (regla de honestidad de datos del proyecto).
 *
 * error.code '42501' → el plan no pertenece al usuario (sesión)
 * error.code '22004' → el plan no tiene calorías objetivo calculadas todavía
 */

import { API_URL, AUTH_HEADER } from './supabaseClient.js';
import { getAuthToken } from './authService.js';

export const MENU_DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' }
];

export const MENU_TIPOS_COMIDA = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'comida', label: 'Comida' },
  { value: 'cena', label: 'Cena' }
];

const MENU_TOTAL_FRANJAS = MENU_DIAS.length * MENU_TIPOS_COMIDA.length; // 21

async function callMenuRpc(functionName, params = {}) {
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
      // PostgREST devuelve el código SQLSTATE real en el body (42501, 22004...).
      return { data: null, error: { code: result?.code ? String(result.code) : String(response.status), message: result?.message || response.statusText } };
    }

    return { data: result, error: null };
  } catch (error) {
    console.error(`❌ Error ejecutando RPC ${functionName}:`, error);
    return { data: null, error: { code: 'unknown', message: error.message } };
  }
}

function normalizeMenuRow(row) {
  if (!row) return null;

  return {
    dia_semana: Number(row.dia_semana) || null,
    tipo_comida: row.tipo_comida || null,
    receta_id: row.receta_id ?? null,
    receta_nombre: row.receta_nombre || '',
    receta_calorias: row.receta_calorias ?? null,
    receta_proteina: row.receta_proteina ?? null,
    franja_vacia: row.franja_vacia === true
  };
}

function buildMenuResult(rows = []) {
  const franjas = (Array.isArray(rows) ? rows : []).map(normalizeMenuRow).filter(Boolean);
  const generadas = franjas.filter((franja) => !franja.franja_vacia).length;

  return {
    franjas,
    generadas,
    total: MENU_TOTAL_FRANJAS
  };
}

/**
 * Lee el menú semanal ya generado (no regenera).
 */
export async function getMiMenuSemanal(planId) {
  if (!planId) {
    return { ok: false, error: { code: '400', message: 'Falta planId' } };
  }

  const { data, error } = await callMenuRpc('app_get_mi_menu_semanal', { p_plan_id: planId });
  if (error) return { ok: false, error };

  return { ok: true, menu: buildMenuResult(data) };
}

/**
 * Genera (o regenera) el menú semanal completo del plan.
 * Solo debe llamarse cuando el usuario lo pide explícitamente.
 */
export async function generarMenuSemanal(planId) {
  if (!planId) {
    return { ok: false, error: { code: '400', message: 'Falta planId' } };
  }

  const { data, error } = await callMenuRpc('app_generar_menu_semanal', { p_plan_id: planId });
  if (error) return { ok: false, error };

  return { ok: true, menu: buildMenuResult(data) };
}
