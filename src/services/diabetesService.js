/**
 * DiabetesService - Programa de nutrición para diabéticos
 *
 * Diferencia deliberada respecto a articlesService.js: esto son datos
 * clínicos, no contenido público. No hay Supabase Auth real en este
 * proyecto (la "sesión" es un objeto autodeclarado en localStorage), así
 * que ninguna función de aquí llama a Supabase directo desde el navegador.
 * Todo pasa por webhooks de n8n, que son quienes deben verificar la
 * identidad server-side (con el token de sesión) y usar la service_role
 * key de Supabase para leer/escribir en el schema `diabetes`.
 *
 * ⚠️ DEPENDENCIA BLOQUEANTE: los webhooks listados en ENDPOINTS no existen
 * todavía en n8n. Hasta que se creen (ver contrato esperado al final de
 * este archivo), toda función de aquí devolverá null / error de conexión.
 * Esto es intencional y seguro — nunca debe hacer fallback a Supabase
 * directo para estos datos.
 */

import { getAuthToken } from './authService.js';

const BACKEND_BASE_URL = 'https://n8n.srv1569124.hstgr.cloud/webhook';

const ENDPOINTS = {
  datosPersonalesGet: `${BACKEND_BASE_URL}/diabetes/datos-personales/get`,
  datosPersonalesGuardar: `${BACKEND_BASE_URL}/diabetes/datos-personales/guardar`,
  historialGet: `${BACKEND_BASE_URL}/diabetes/historial-medico/get`,
  historialGuardar: `${BACKEND_BASE_URL}/diabetes/historial-medico/guardar`,
  habitosGet: `${BACKEND_BASE_URL}/diabetes/habitos/get`,
  habitosGuardar: `${BACKEND_BASE_URL}/diabetes/habitos/guardar`,
  planesListar: `${BACKEND_BASE_URL}/diabetes/planes/listar`,
  planUltimo: `${BACKEND_BASE_URL}/diabetes/planes/ultimo`,
  seguimientoGet: `${BACKEND_BASE_URL}/diabetes/seguimiento/get`,
  seguimientoGuardar: `${BACKEND_BASE_URL}/diabetes/seguimiento/guardar`,
  documentoSubir: `${BACKEND_BASE_URL}/diabetes/documentos/subir`
};

// Cache SOLO en memoria — se pierde al recargar la página a propósito.
// Nunca persistir historial médico, hábitos ni analíticas en
// localStorage/sessionStorage bajo ningún concepto.
const cache = {
  datosPersonales: null,   // { usuarioId, data }
  historialMedico: null,   // { usuarioId, data }
  habitosPaciente: null,   // { usuarioId, data }
  planes: null,            // { usuarioId, data }
  seguimiento: null        // { usuarioId, data }
};

/**
 * POST genérico a un webhook de n8n, incluyendo el token de sesión para
 * que el workflow lo valide server-side antes de tocar datos clínicos.
 */
async function postToWebhook(url, payload) {
  const token = getAuthToken();
  if (!token) {
    console.warn('⚠️ DiabetesService: sin token de sesión — n8n debería rechazar esta petición');
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...payload })
    });

    if (!response.ok) {
      console.error(`❌ DiabetesService: error ${response.status} en ${url}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ DiabetesService: fallo de conexión en ${url}`, error);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// Datos personales (diabetes.pacientes_programa)
// ═════════════════════════════════════════════════════════════════════════

export async function getDatosPersonales(usuarioId) {
  if (cache.datosPersonales?.usuarioId === usuarioId) {
    return cache.datosPersonales.data;
  }
  const data = await postToWebhook(ENDPOINTS.datosPersonalesGet, { usuarioId });
  if (data) cache.datosPersonales = { usuarioId, data };
  return data;
}

/**
 * data puede incluir consentimientoAceptado: true en el paso 1 — n8n debe
 * traducirlo a consentimiento_datos_salud_en = now() y consentimiento_version.
 */
export async function guardarDatosPersonales(usuarioId, data) {
  const result = await postToWebhook(ENDPOINTS.datosPersonalesGuardar, { usuarioId, data });
  if (result) {
    cache.datosPersonales = { usuarioId, data: { ...(cache.datosPersonales?.data || {}), ...data } };
  }
  return result;
}

// ═════════════════════════════════════════════════════════════════════════
// Historial médico
// ═════════════════════════════════════════════════════════════════════════

export async function getHistorialMedico(usuarioId) {
  if (cache.historialMedico?.usuarioId === usuarioId) {
    return cache.historialMedico.data;
  }
  const data = await postToWebhook(ENDPOINTS.historialGet, { usuarioId });
  if (data) cache.historialMedico = { usuarioId, data };
  return data;
}

export async function guardarHistorialMedico(usuarioId, data) {
  const result = await postToWebhook(ENDPOINTS.historialGuardar, { usuarioId, data });
  if (result) {
    cache.historialMedico = { usuarioId, data: { ...(cache.historialMedico?.data || {}), ...data } };
  }
  return result;
}

// ═════════════════════════════════════════════════════════════════════════
// Hábitos del paciente (alimentación, ejercicio, estilo de vida, objetivos)
// ═════════════════════════════════════════════════════════════════════════

export async function getHabitosPaciente(usuarioId) {
  if (cache.habitosPaciente?.usuarioId === usuarioId) {
    return cache.habitosPaciente.data;
  }
  const data = await postToWebhook(ENDPOINTS.habitosGet, { usuarioId });
  if (data) cache.habitosPaciente = { usuarioId, data };
  return data;
}

/**
 * Guarda hábitos de forma parcial — se llama una vez por paso del
 * formulario (alimentación / ejercicio / objetivos), nunca solo al final.
 * n8n debe hacer upsert combinando con lo ya guardado, no sobrescribir.
 */
export async function guardarHabitosPaciente(usuarioId, data) {
  const result = await postToWebhook(ENDPOINTS.habitosGuardar, { usuarioId, data });
  if (result) {
    cache.habitosPaciente = { usuarioId, data: { ...(cache.habitosPaciente?.data || {}), ...data } };
  }
  return result;
}

// ═════════════════════════════════════════════════════════════════════════
// Planes nutricionales
// ═════════════════════════════════════════════════════════════════════════

export async function getPlanesNutricionales(usuarioId) {
  if (cache.planes?.usuarioId === usuarioId) {
    return cache.planes.data;
  }
  const data = await postToWebhook(ENDPOINTS.planesListar, { usuarioId });
  if (data) cache.planes = { usuarioId, data };
  return data || [];
}

export async function getUltimoPlan(usuarioId) {
  return postToWebhook(ENDPOINTS.planUltimo, { usuarioId });
}

// ═════════════════════════════════════════════════════════════════════════
// Seguimiento (peso, HbA1c, adherencia — registrado por la experta)
// ═════════════════════════════════════════════════════════════════════════

export async function getSeguimiento(usuarioId) {
  if (cache.seguimiento?.usuarioId === usuarioId) {
    return cache.seguimiento.data;
  }
  const data = await postToWebhook(ENDPOINTS.seguimientoGet, { usuarioId });
  if (data) cache.seguimiento = { usuarioId, data };
  return data || [];
}

export async function guardarSeguimientoEntry(usuarioId, data) {
  const result = await postToWebhook(ENDPOINTS.seguimientoGuardar, { usuarioId, data });
  if (result) cache.seguimiento = null; // fuerza recarga: es una lista, no un objeto único
  return result;
}

// ═════════════════════════════════════════════════════════════════════════
// Documentos (analíticas, informes médicos) — sube a Storage vía n8n,
// nunca directo desde el navegador a un bucket.
// ═════════════════════════════════════════════════════════════════════════

export async function subirDocumento(usuarioId, file, tipoDocumento) {
  const token = getAuthToken();
  if (!file) return null;

  try {
    const formData = new FormData();
    formData.append('usuarioId', usuarioId);
    formData.append('tipoDocumento', tipoDocumento);
    formData.append('token', token || '');
    formData.append('file', file);

    const response = await fetch(ENDPOINTS.documentoSubir, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error(`❌ DiabetesService: error ${response.status} subiendo documento`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('❌ DiabetesService: fallo de conexión subiendo documento', error);
    return null;
  }
}

/**
 * Limpia el cache en memoria (llamar en logout).
 */
export function clearDiabetesCache() {
  cache.datosPersonales = null;
  cache.historialMedico = null;
  cache.habitosPaciente = null;
  cache.planes = null;
  cache.seguimiento = null;
}

/*
 * ═══════════════════════════════════════════════════════════════════════
 * CONTRATO ESPERADO DE LOS WEBHOOKS DE n8n (a crear, bloqueante)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Todas las peticiones son POST con Content-Type: application/json
 * (excepto /documentos/subir, que es multipart/form-data), y siempre
 * incluyen `token` (el valor de authService.getAuthToken(), emitido en el
 * login) en el body. Cada workflow debe:
 *   1. Validar `token` contra la sesión real del usuario (p.ej. comparando
 *      con usuarios.sesion_token) — si no es válido, responder 401.
 *   2. Resolver el usuario autenticado a partir de ese token, NUNCA fiarse
 *      del `usuarioId` que llega en el body para decidir a qué fila leer o
 *      escribir — usarlo solo como comprobación adicional (si no coincide
 *      con el usuario del token, responder 403).
 *   3. Verificar usuarios.programa_diabetes_activo = true antes de
 *      cualquier lectura/escritura clínica.
 *   4. Usar la service_role key de Supabase (nunca la anon key) para
 *      acceder al schema `diabetes`, ya que no hay políticas RLS reales.
 *   5. Insertar una fila en diabetes.historial_acceso_clinico en cada
 *      lectura de historial_medico, documentos_paciente o
 *      planes_nutricionales (la tabla ya existe justo para esto).
 *
 * POST /webhook/diabetes/datos-personales/get
 *   body: { token, usuarioId }
 *   respuesta: fila de diabetes.pacientes_programa (o null)
 *
 * POST /webhook/diabetes/datos-personales/guardar
 *   body: { token, usuarioId, data: {...columnas de pacientes_programa} }
 *   respuesta: fila resultante tras upsert
 *   nota: si data.consentimientoAceptado === true, guardar
 *   consentimiento_datos_salud_en = now() y consentimiento_version con la
 *   versión vigente del texto legal — no aceptar escrituras clínicas
 *   posteriores para ese usuario si nunca se registró este consentimiento.
 *
 * POST /webhook/diabetes/historial-medico/get
 *   body: { token, usuarioId }
 *   respuesta: fila de diabetes.historial_medico (o null si no existe)
 *
 * POST /webhook/diabetes/historial-medico/guardar
 *   body: { token, usuarioId, data: {...columnas de historial_medico} }
 *   respuesta: fila resultante tras upsert
 *   nota: si data.diabetes_tipo === 'tipo_1', o data.medicacion incluye
 *   insulina, o hay hipoglucemias frecuentes, marcar
 *   requiere_revision_manual = true (según el comentario ya presente en
 *   la propia columna del schema) y notificar a una experta en vez de
 *   generar un borrador IA automático.
 *
 * POST /webhook/diabetes/habitos/get
 *   body: { token, usuarioId }
 *   respuesta: fila de diabetes.habitos_paciente (o null)
 *
 * POST /webhook/diabetes/habitos/guardar
 *   body: { token, usuarioId, data: {...columnas parciales} }
 *   respuesta: fila resultante tras upsert (merge, no sobrescritura)
 *
 * POST /webhook/diabetes/planes/listar
 *   body: { token, usuarioId }
 *   respuesta: array de filas de diabetes.planes_nutricionales, más
 *   recientes primero
 *
 * POST /webhook/diabetes/planes/ultimo
 *   body: { token, usuarioId }
 *   respuesta: última fila de diabetes.planes_nutricionales (o null)
 *
 * POST /webhook/diabetes/seguimiento/get
 *   body: { token, usuarioId }
 *   respuesta: array de filas de diabetes.seguimiento
 *
 * POST /webhook/diabetes/seguimiento/guardar
 *   body: { token, usuarioId, data: {...columnas de seguimiento} }
 *   respuesta: fila insertada
 *
 * POST /webhook/diabetes/documentos/subir  (multipart/form-data)
 *   campos: token, usuarioId, tipoDocumento, file
 *   n8n sube el archivo al bucket privado "documentos-clinicos" (ya creado
 *   en Storage, public=false) y guarda la ruta en
 *   diabetes.documentos_paciente.storage_path — el navegador nunca ve ni
 *   necesita el nombre del bucket, solo n8n lo usa server-side.
 *   respuesta: { id, storage_path, tipo_documento, subido_en }
 * ═══════════════════════════════════════════════════════════════════════
 */
