/**
 * AnaliticaService - Gestión de resultados de analítica del usuario
 * Consume RPCs del backend sin lógica clínica en frontend.
 */

import { API_URL, AUTH_HEADER } from './supabaseClient.js';
import { getAuthToken } from './authService.js';

async function callAnaliticaRpc(functionName, params = {}) {
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
      return {
        data: null,
        error: {
          code: String(response.status),
          message: result?.message || response.statusText || 'Error RPC'
        }
      };
    }

    return { data: result, error: null };
  } catch (error) {
    console.error(`❌ Error ejecutando RPC ${functionName}:`, error);
    return { data: null, error: { code: 'unknown', message: error.message } };
  }
}

export async function agregarResultadoAnalitica(payload = {}) {
  const normalizedSexo = typeof payload.sexo === 'string' && payload.sexo.trim()
    ? payload.sexo.trim().toLowerCase()
    : null;

  const cleaned = {
    p_marcador: String(payload.marcador || '').trim(),
    p_valor: Number(payload.valor),
    ...(payload.unidad ? { p_unidad: String(payload.unidad).trim() } : {}),
    ...(payload.fecha_analitica ? { p_fecha_analitica: payload.fecha_analitica } : {}),
    ...(payload.notas ? { p_notas: String(payload.notas).trim() } : {}),
    ...(payload.documento_origen ? { p_documento_origen: String(payload.documento_origen).trim() } : {}),
    p_sexo: normalizedSexo
  };

  if (!cleaned.p_marcador || Number.isNaN(cleaned.p_valor)) {
    return { ok: false, error: { code: '400', message: 'Marcador o valor inválido' } };
  }

  const { data, error } = await callAnaliticaRpc('app_agregar_resultado_analitica', cleaned);
  if (error) return { ok: false, error };

  return { ok: true, data };
}

export async function getResultadosConContexto() {
  const { data, error } = await callAnaliticaRpc('app_get_resultados_con_contexto');
  if (error) return { ok: false, error, data: [] };

  return { ok: true, data: Array.isArray(data) ? data : [] };
}

export async function eliminarResultadoAnalitica(resultadoId) {
  if (!resultadoId) {
    return { ok: false, error: { code: '400', message: 'Falta resultadoId' } };
  }

  const { data, error } = await callAnaliticaRpc('app_eliminar_resultado_analitica', {
    p_resultado_id: Number(resultadoId)
  });

  if (error) return { ok: false, error };

  return { ok: true, data };
}

export async function getMarcadoresSugeridos(limit = 300) {
  try {
    const response = await fetch(
      `${API_URL}/rangos_funcionales_laboratorio?select=marcador&order=marcador.asc&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          ...AUTH_HEADER,
          'Authorization': `Bearer ${AUTH_HEADER.apikey}`
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const rows = await response.json();
    const markers = Array.isArray(rows)
      ? rows.map((row) => String(row?.marcador || '').trim()).filter(Boolean)
      : [];

    return [...new Set(markers)];
  } catch (error) {
    console.warn('⚠️ No se pudieron cargar sugerencias de marcadores:', error);
    return [];
  }
}
