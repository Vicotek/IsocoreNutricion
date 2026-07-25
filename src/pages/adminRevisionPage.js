/**
 * AdminRevisionPage - Revisión clínica de planes de diabetes.
 * Vive dentro del panel de administración existente (adminPage.js la monta
 * en su propia pestaña). Reutiliza admin.css tal cual; los estilos propios
 * de esta pantalla (columnas, alerta de seguridad, bloques editables) están
 * en diabetes.css, que no tiene restricción de edición.
 *
 * Regla de seguridad: esta pantalla nunca lee/escribe diabetes.* en
 * Supabase directamente. Todo pasa por adminDiabetesService.js → n8n, que
 * debe verificar que el token pertenece a un experto activo antes de
 * responder nada.
 */

import * as AdminDiabetesService from '../services/adminDiabetesService.js';
import { getIcon } from '../components/icons.js';

const ESTADO_LABELS = {
  generado_ia: 'Generado por IA',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  enviado: 'Enviado',
  rechazado: 'Rechazado',
  archivado: 'Archivado'
};

const CAMPOS_PLAN = [
  { key: 'resumen_clinico', label: 'Resumen clínico' },
  { key: 'objetivos_nutricionales', label: 'Objetivos nutricionales' },
  { key: 'distribucion_macronutrientes', label: 'Distribución de macronutrientes' },
  { key: 'distribucion_raciones_hc_por_comida', label: 'Raciones de HC por comida' },
  { key: 'menu_ejemplo_3_dias', label: 'Menú de ejemplo (3 días)' },
  { key: 'recomendaciones_timing_medicacion', label: 'Timing de medicación' },
  { key: 'recomendaciones_ejercicio', label: 'Recomendaciones de ejercicio' }
];

let currentPlanId = null;
let currentContenido = null;

function parseContenido(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { resumen_clinico: raw };
  }
}

function stringifyCampo(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

/**
 * Punto de entrada llamado por adminPage.js al activar la pestaña.
 */
export async function loadCasosParaRevision(containerId = 'diabetesRevisionList') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<p class="loading">Cargando casos...</p>';

  const casos = await AdminDiabetesService.listarCasosParaRevision('en_revision');

  if (!casos || casos.length === 0) {
    container.innerHTML = '<p class="empty">No hay casos pendientes de revisión</p>';
    return;
  }

  container.innerHTML = casos.map(caso => `
    <div class="admin-item revision-case-item" data-plan-id="${caso.plan_id}">
      <div class="item-info">
        <p class="item-title">${getIcon('pill', 14)} ${caso.nombre_paciente || 'Paciente #' + caso.usuario_id}</p>
        <p class="item-meta">
          ${caso.diabetes_tipo || '-'} •
          <span class="diabetes-status-pill estado-${caso.estado}">${ESTADO_LABELS[caso.estado] || caso.estado}</span>
        </p>
      </div>
      <div class="item-actions">
        <button class="admin-btn small" data-open-caso="${caso.plan_id}">${getIcon('eye', 14)} Revisar</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-open-caso]').forEach(btn => {
    btn.addEventListener('click', () => abrirCasoDetalle(btn.dataset.openCaso));
  });
}

/**
 * Abre el detalle de un caso dentro del contenedor de detalle de la
 * pestaña de revisión (creado por adminPage.js).
 */
export async function abrirCasoDetalle(planId, listContainerId = 'diabetesRevisionList', detailContainerId = 'diabetesRevisionDetail') {
  const listEl = document.getElementById(listContainerId);
  const detailEl = document.getElementById(detailContainerId);
  if (!detailEl) return;

  listEl?.classList.add('is-hidden');
  detailEl.classList.remove('is-hidden');
  detailEl.innerHTML = '<p class="loading">Cargando caso...</p>';

  const data = await AdminDiabetesService.getCasoParaRevision(planId);

  if (!data || !data.plan) {
    detailEl.innerHTML = `
      <button class="revision-back-btn" id="revisionVolverBtn">${getIcon('close', 14)} Volver a la lista</button>
      <p class="error">No se pudo cargar el caso</p>
    `;
    document.getElementById('revisionVolverBtn')?.addEventListener('click', () => volverALista(listContainerId, detailContainerId));
    return;
  }

  const { plan, historial_medico: historial } = data;
  currentPlanId = plan.plan_id;
  currentContenido = parseContenido(plan.contenido_final || plan.contenido_ia);
  const fuentes = Array.isArray(plan.fuentes_usadas) ? plan.fuentes_usadas : [];
  const notasSeguridad = currentContenido.notas_seguridad;
  const puntosAVerificar = currentContenido.puntos_a_verificar;

  detailEl.innerHTML = `
    <button class="revision-back-btn" id="revisionVolverBtn">${getIcon('close', 14)} Volver a la lista</button>

    <div class="revision-header">
      <div>
        <h2>${plan.nombre_paciente || 'Paciente #' + plan.usuario_id}</h2>
        <p>Plan #${plan.plan_id} • ${plan.diabetes_tipo || historial?.diabetes_tipo || '-'}</p>
      </div>
      <span class="diabetes-status-pill estado-${plan.estado}">${ESTADO_LABELS[plan.estado] || plan.estado}</span>
    </div>

    <div class="revision-grid">
      <aside class="revision-summary-card">
        <h3>${getIcon('shield', 14)} Resumen clínico</h3>
        <div class="revision-summary-row">
          <span class="label">HbA1c más reciente</span>
          <span class="value">${historial?.ultima_hba1c ?? '-'}</span>
        </div>
        <div class="revision-summary-row">
          <span class="label">Años desde diagnóstico</span>
          <span class="value">${historial?.anios_diagnostico ?? '-'}</span>
        </div>
        <div class="revision-summary-row">
          <span class="label">Medicación / insulina</span>
          <span class="value">${formatLista(historial?.medicacion)}</span>
        </div>
        <div class="revision-summary-row">
          <span class="label">Alergias</span>
          <span class="value">${formatLista(historial?.alergias)}</span>
        </div>
        <div class="revision-summary-row">
          <span class="label">Complicaciones</span>
          <span class="value">${formatLista(historial?.complicaciones)}</span>
        </div>
      </aside>

      <div class="revision-content">
        ${renderAlertaSeguridad(notasSeguridad, puntosAVerificar)}
        ${renderFuentes(fuentes)}
        ${CAMPOS_PLAN.map(campo => renderBloqueEditable(campo, currentContenido[campo.key])).join('')}

        <div class="revision-comentarios">
          <label for="revisionComentarios">Comentarios de la experta</label>
          <textarea id="revisionComentarios" class="revision-block-textarea" placeholder="Notas internas, no visibles para el paciente...">${plan.comentarios || ''}</textarea>
        </div>

        <div class="revision-actions">
          <button class="admin-btn danger" id="revisionRechazarBtn">${getIcon('close', 14)} Rechazar</button>
          <button class="admin-btn" id="revisionGuardarBtn">${getIcon('save', 14)} Guardar cambios</button>
          <button class="admin-btn primary" id="revisionAprobarBtn">${getIcon('check', 14)} Aprobar y enviar</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('revisionVolverBtn')?.addEventListener('click', () => volverALista(listContainerId, detailContainerId));
  detailEl.querySelectorAll('.revision-sources-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.target)?.classList.toggle('open');
    });
  });

  document.getElementById('revisionGuardarBtn')?.addEventListener('click', () => handleGuardar(detailEl));
  document.getElementById('revisionAprobarBtn')?.addEventListener('click', () => handleAprobar(detailEl, listContainerId, detailContainerId));
  document.getElementById('revisionRechazarBtn')?.addEventListener('click', () => handleRechazar(detailEl, listContainerId, detailContainerId));
}

export function volverALista(listContainerId = 'diabetesRevisionList', detailContainerId = 'diabetesRevisionDetail') {
  document.getElementById(detailContainerId)?.classList.add('is-hidden');
  document.getElementById(listContainerId)?.classList.remove('is-hidden');
  currentPlanId = null;
  currentContenido = null;
}

function renderAlertaSeguridad(notas, puntos) {
  if (!notas && !puntos) return '';
  return `
    <div class="revision-alert">
      <h4>${getIcon('warning', 14)} Puntos de seguridad marcados por la IA</h4>
      ${notas ? `<p>${Array.isArray(notas) ? notas.join(' · ') : notas}</p>` : ''}
      ${puntos ? `<p>${Array.isArray(puntos) ? puntos.join(' · ') : puntos}</p>` : ''}
    </div>
  `;
}

function renderFuentes(fuentes) {
  if (!fuentes.length) return '';
  return `
    <div class="revision-block">
      <div class="revision-block-header">
        <p class="revision-block-label">${getIcon('book', 14)} Fuentes usadas (${fuentes.length})</p>
        <button class="revision-sources-toggle" data-target="revisionFuentesList">Ver detalle</button>
      </div>
      <div class="revision-sources-list" id="revisionFuentesList">
        ${fuentes.map(f => `<div>${f.titulo || f.title || 'Fuente'} ${f.autor ? '— ' + f.autor : ''} ${f.nivel_evidencia ? `(${f.nivel_evidencia})` : ''}</div>`).join('')}
      </div>
    </div>
  `;
}

function renderBloqueEditable(campo, valor) {
  return `
    <div class="revision-block">
      <div class="revision-block-header">
        <p class="revision-block-label">${campo.label}</p>
      </div>
      <textarea class="revision-block-textarea" data-campo="${campo.key}">${stringifyCampo(valor)}</textarea>
    </div>
  `;
}

function formatLista(value) {
  if (!value) return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  return value;
}

function leerContenidoFinal(detailEl) {
  const resultado = { ...currentContenido };
  detailEl.querySelectorAll('[data-campo]').forEach(textarea => {
    const raw = textarea.value;
    try {
      resultado[textarea.dataset.campo] = JSON.parse(raw);
    } catch {
      resultado[textarea.dataset.campo] = raw;
    }
  });
  return JSON.stringify(resultado);
}

async function handleGuardar(detailEl) {
  const contenidoFinal = leerContenidoFinal(detailEl);
  const comentarios = detailEl.querySelector('#revisionComentarios')?.value || '';
  const btn = document.getElementById('revisionGuardarBtn');
  if (btn) btn.disabled = true;

  const result = await AdminDiabetesService.guardarCambiosPlan(currentPlanId, contenidoFinal, comentarios);

  if (btn) btn.disabled = false;
  if (!result) {
    alert('No se pudieron guardar los cambios. Inténtalo de nuevo.');
    return;
  }
  alert('Cambios guardados.');
}

async function handleAprobar(detailEl, listContainerId, detailContainerId) {
  if (!confirm('¿Aprobar y enviar este plan al paciente?')) return;

  await handleGuardar(detailEl);
  const result = await AdminDiabetesService.aprobarPlan(currentPlanId);

  if (!result) {
    alert('No se pudo aprobar el plan. Inténtalo de nuevo.');
    return;
  }
  alert('Plan aprobado y enviado.');
  volverALista(listContainerId, detailContainerId);
  loadCasosParaRevision(listContainerId);
}

async function handleRechazar(detailEl, listContainerId, detailContainerId) {
  const motivo = prompt('Motivo del rechazo (visible solo para el equipo interno):');
  if (motivo === null) return;

  const result = await AdminDiabetesService.rechazarPlan(currentPlanId, motivo);

  if (!result) {
    alert('No se pudo rechazar el plan. Inténtalo de nuevo.');
    return;
  }
  alert('Plan rechazado.');
  volverALista(listContainerId, detailContainerId);
  loadCasosParaRevision(listContainerId);
}
