/**
 * AdminDiabetesService - Revisión clínica de planes (uso exclusivo de la
 * experta), separado de diabetesService.js a propósito para poder aplicar
 * comprobaciones de rol distintas sin mezclar los dos servicios.
 *
 * Mismo criterio de seguridad que diabetesService.js: nunca Supabase
 * directo desde el navegador para datos clínicos — todo pasa por webhooks
 * de n8n, que deben verificar que el usuario del token es un experto con
 * diabetes.expertos.activo = true antes de servir nada.
 *
 * ⚠️ DEPENDENCIA BLOQUEANTE: los webhooks de ENDPOINTS no existen todavía.
 */

import { getAuthToken } from './authService.js';

const BACKEND_BASE_URL = 'https://n8n.srv1569124.hstgr.cloud/webhook';

const ENDPOINTS = {
  listarCasos: `${BACKEND_BASE_URL}/revision-listar-casos`,
  obtenerCaso: `${BACKEND_BASE_URL}/revision-obtener-caso`,
  guardarCambios: `${BACKEND_BASE_URL}/revision-guardar-cambios`,
  aprobar: `${BACKEND_BASE_URL}/revision-aprobar`,
  rechazar: `${BACKEND_BASE_URL}/revision-rechazar`,
  seguimientoGet: `${BACKEND_BASE_URL}/revision-seguimiento-get`,
  seguimientoGuardar: `${BACKEND_BASE_URL}/revision-seguimiento-guardar`
};

async function postToWebhook(url, payload) {
  const token = getAuthToken();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...payload })
    });
    if (!response.ok) {
      console.error(`❌ AdminDiabetesService: error ${response.status} en ${url}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ AdminDiabetesService: fallo de conexión en ${url}`, error);
    return null;
  }
}

/**
 * No estaba en la lista original de funciones — la añado porque sin una
 * forma de listar casos, la pantalla de revisión no tiene manera de saber
 * qué planId abrir. Webhook nuevo a crear: wf-revision-listar-casos.
 * @param {string|null} [estado] - filtro opcional ('en_revision', 'generado_ia', ...);
 *   si es null el backend devuelve los casos pendientes (generado_ia y en_revision).
 */
export async function listarCasosParaRevision(estado = null) {
  const data = await postToWebhook(ENDPOINTS.listarCasos, { estado });
  return Array.isArray(data) ? data : (data?.casos || []);
}

/**
 * → wf-revision-obtener-caso
 * Devuelve { plan, historial_medico, habitos_paciente } en una sola respuesta.
 */
export async function getCasoParaRevision(planId) {
  return postToWebhook(ENDPOINTS.obtenerCaso, { planId });
}

/**
 * → wf-revision-guardar-cambios — botón "Guardar cambios"
 * Mantiene estado = 'en_revision', permite iterar sin cerrar el caso.
 */
export async function guardarCambiosPlan(planId, contenidoFinal, comentarios) {
  return postToWebhook(ENDPOINTS.guardarCambios, { planId, contenidoFinal, comentarios });
}

/**
 * → wf-revision-aprobar — botón "Aprobar y enviar"
 * estado = 'aprobado', guarda revisado_en, dispara el workflow de pago/entrega.
 */
export async function aprobarPlan(planId) {
  return postToWebhook(ENDPOINTS.aprobar, { planId });
}

/**
 * → wf-revision-rechazar — botón "Rechazar"
 */
export async function rechazarPlan(planId, motivo) {
  return postToWebhook(ENDPOINTS.rechazar, { planId, motivo });
}

/**
 * → wf-revision-seguimiento-get (nuevo, a crear)
 * A diferencia de diabetesService.getSeguimiento (que solo puede leer el
 * seguimiento del propio usuario autenticado), esta función deja que una
 * experta lea el seguimiento de OTRO usuario — por eso vive en un endpoint
 * separado, que debe verificar que el token pertenece a un experto activo
 * (diabetes.expertos.activo = true) antes de devolver nada, en vez de
 * comparar el token contra el usuarioId como hace la ruta del paciente.
 * @param {string} usuarioId - id del paciente cuyo caso se está revisando
 * @returns {Promise<Array>} - filas de diabetes.seguimiento, la más reciente primero
 */
export async function getSeguimientoPaciente(usuarioId) {
  const data = await postToWebhook(ENDPOINTS.seguimientoGet, { usuarioId });
  return Array.isArray(data) ? data : (data?.registros || []);
}

/**
 * → wf-revision-seguimiento-guardar (nuevo, a crear)
 * Inserta un registro nuevo (peso/HbA1c/adherencia/notas) para el paciente
 * indicado. Mismo requisito de seguridad que arriba: resolver la experta a
 * partir del token, nunca fiarse de un rol que llegue en el body.
 * @param {string} usuarioId
 * @param {{fecha_registro:string, peso_kg?:number|null, hba1c?:number|null, adherencia?:number|null, notas?:string|null}} data
 */
export async function guardarSeguimientoPaciente(usuarioId, data) {
  return postToWebhook(ENDPOINTS.seguimientoGuardar, { usuarioId, data });
}

/*
 * ═══════════════════════════════════════════════════════════════════════
 * CONTRATO ESPERADO (además de wf-revision-obtener-caso / guardar-cambios /
 * aprobar / rechazar, ya descritos en el prompt del producto):
 *
 * POST /webhook/diabetes/revision/listar-casos
 *   body: { token, estado }
 *   n8n: verificar que el usuario del token es un experto activo antes de
 *   responder. Devuelve un array con lo mínimo para pintar la lista:
 *   [{ plan_id, usuario_id, nombre_paciente, diabetes_tipo, estado, created_at }]
 *
 * Para las 4 rutas ya especificadas por el producto, recordatorio del
 * mismo requisito de seguridad que en diabetesService.js: resolver el
 * experto a partir del token (nunca fiarse de un rol que llegue en el
 * body), y solo entonces tocar diabetes.planes_nutricionales /
 * diabetes.revisiones_plan con la service_role key.
 *
 * POST /webhook/diabetes/revision/seguimiento/get
 *   body: { token, usuarioId }
 *   n8n: verificar experto activo a partir del token. Responde un array de
 *   diabetes.seguimiento del usuarioId indicado, más reciente primero:
 *   [{ id, fecha_registro, peso_kg, hba1c, adherencia, notas, registrado_por }]
 *
 * POST /webhook/diabetes/revision/seguimiento/guardar
 *   body: { token, usuarioId, data: { fecha_registro, peso_kg, hba1c, adherencia, notas } }
 *   n8n: verificar experto activo, insertar fila en diabetes.seguimiento con
 *   registrado_por = id del experto resuelto desde el token (nunca desde el
 *   body). Responde la fila insertada.
 * ═══════════════════════════════════════════════════════════════════════
 */
