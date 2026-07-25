/**
 * DiabetesPage - Programa de nutrición para diabéticos
 * Formulario multi-paso + estado del plan. Sigue el patrón de estado y
 * listeners de articlesPage.js (variables de módulo, setupPasoXListener,
 * updateFormularioDisplay).
 *
 * Todas las lecturas/escrituras de datos clínicos pasan por
 * diabetesService.js (webhooks de n8n) — esta página nunca llama a
 * Supabase directo para historial médico, hábitos, planes ni documentos.
 * La única llamada "directa" es getUserFromSupabase, que solo trae datos
 * no sensibles (id, plan, programa_diabetes_activo) desde la vista segura
 * usuarios_publicas — igual que ya hace el resto del sitio.
 */

import * as DiabetesService from '../services/diabetesService.js';
import { getUserFromSupabase } from '../services/supabaseClient.js';
import { getIcon } from '../components/icons.js';

// Misma clave y patrón de lectura que menuService.js — evita un import
// circular con homePage.js (que ya importa esta página para navegar aquí).
const STORAGE_KEY = 'isocore_home_user';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return null;
  }
}

// ── Estado a nivel de módulo ──
let currentStep = 1;
let usuarioActual = null; // { id, email, nombre, plan, programa_diabetes_activo }
let formData = {
  personal: {},
  historial: {},
  habitos: {}
};
let ultimoPlan = null;
let saveStatus = '';

const STEPS = [
  { id: 1, key: 'personal', label: 'Datos personales' },
  { id: 2, key: 'historial', label: 'Historial médico' },
  { id: 3, key: 'alimentacion', label: 'Hábitos alimentarios' },
  { id: 4, key: 'ejercicio', label: 'Ejercicio y estilo de vida' },
  { id: 5, key: 'objetivos', label: 'Objetivos' }
];

const ESTADO_LABELS = {
  generado_ia: 'Borrador generado',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  enviado: 'Enviado',
  archivado: 'Archivado'
};

/**
 * Punto de entrada — igual patrón que renderArticlesPage/renderAIPage.
 */
export async function renderDiabetesPage() {
  const mainContent = document.querySelector('main');
  if (!mainContent) {
    console.warn('⚠️ DiabetesPage: no se encontró elemento <main>');
    return;
  }

  const storedUser = getStoredUser();
  if (!storedUser || !storedUser.email) {
    mainContent.innerHTML = `
      <div class="diabetes-root">
        <div class="diabetes-locked-card">
          <div class="diabetes-locked-icon">${getIcon('user', 26)}</div>
          <h2>Inicia sesión</h2>
          <p>Necesitas una cuenta para acceder al programa de nutrición para diabéticos.</p>
        </div>
      </div>
    `;
    return;
  }

  mainContent.innerHTML = `
    <div class="diabetes-root">
      <p style="color:#fff; opacity:.85;">Cargando programa…</p>
    </div>
  `;

  try {
    usuarioActual = await getUserFromSupabase(storedUser.email);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    usuarioActual = null;
  }

  if (!usuarioActual) {
    mainContent.innerHTML = `
      <div class="diabetes-root">
        <div class="diabetes-locked-card">
          <div class="diabetes-locked-icon">${getIcon('warning', 26)}</div>
          <h2>No se pudo cargar tu cuenta</h2>
          <p>Inténtalo de nuevo en unos minutos.</p>
        </div>
      </div>
    `;
    return;
  }

  if (!usuarioActual.programa_diabetes_activo) {
    renderLockedView();
    return;
  }

  await loadExistingData();
  currentStep = 1;
  renderFormShell();
}

/**
 * Vista bloqueada — mismo patrón visual de candado + CTA que los módulos
 * bloqueados del home, adaptado a página completa.
 */
function renderLockedView() {
  const mainContent = document.querySelector('main');
  mainContent.innerHTML = `
    <div class="diabetes-root">
      <div class="diabetes-header">
        <p class="diabetes-eyebrow">Nutrición para diabéticos</p>
        <h1 class="diabetes-title">Un plan hecho para tu diabetes</h1>
        <p class="diabetes-subtitle">Plan nutricional personalizado, generado con evidencia y revisado por una experta antes de llegar a ti — no una recomendación genérica.</p>
      </div>
      <div class="diabetes-locked-card">
        <div class="diabetes-locked-icon">${getIcon('lock', 26)}</div>
        <h2>Este programa todavía no está activo en tu cuenta</h2>
        <p>Es un programa independiente de tu plan de suscripción (Free/Premium/VIP), con su propio acompañamiento clínico.</p>
        <button type="button" class="primary-button" id="diabetesUnlockBtn" style="width:auto; padding:14px 28px;">Solicitar acceso</button>
      </div>
    </div>
  `;

  document.getElementById('diabetesUnlockBtn')?.addEventListener('click', () => {
    window.homePage_navigateToProfile?.();
  });
}

async function loadExistingData() {
  const usuarioId = usuarioActual.id;
  const [personal, historial, habitos, plan] = await Promise.all([
    DiabetesService.getDatosPersonales(usuarioId),
    DiabetesService.getHistorialMedico(usuarioId),
    DiabetesService.getHabitosPaciente(usuarioId),
    DiabetesService.getUltimoPlan(usuarioId)
  ]);

  formData.personal = personal || {};
  formData.historial = historial || {};
  formData.habitos = habitos || {};
  ultimoPlan = plan || null;
}

/**
 * Estructura fija de la página: cabecera + estado del plan (si existe) +
 * tarjeta del formulario multi-paso.
 */
function renderFormShell() {
  const mainContent = document.querySelector('main');
  mainContent.innerHTML = `
    <div class="diabetes-root">
      <div class="diabetes-header">
        <p class="diabetes-eyebrow">Nutrición para diabéticos</p>
        <h1 class="diabetes-title">Tu programa personalizado</h1>
        <p class="diabetes-subtitle">Completa cada paso a tu ritmo — se guarda automáticamente al avanzar, puedes volver cuando quieras.</p>
      </div>

      ${ultimoPlan ? renderPlanStatusHTML() : ''}

      <div class="diabetes-form-card">
        <div class="diabetes-steps" id="diabetesSteps"></div>
        <div>
          <span class="diabetes-step-label" id="diabetesStepLabel"></span>
          <h2 class="diabetes-step-title" id="diabetesStepTitle"></h2>
        </div>
        <div id="diabetesStepContent"></div>
        <div class="diabetes-actions">
          <button type="button" class="ghost-button" id="diabetesBackBtn">Atrás</button>
          <span class="diabetes-save-status" id="diabetesSaveStatus"></span>
          <button type="button" class="primary-button" id="diabetesNextBtn" style="width:auto; padding:12px 24px;">Siguiente</button>
        </div>
      </div>
    </div>
  `;

  setupNavigationListeners();
  updateFormularioDisplay();
}

function renderPlanStatusHTML() {
  const estado = ultimoPlan.estado || 'generado_ia';
  return `
    <div class="diabetes-plan-card">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <h3 style="margin:0; color:var(--text-primary);">Tu plan actual</h3>
        <span class="diabetes-status-pill estado-${estado}">${ESTADO_LABELS[estado] || estado}</span>
      </div>
      <p style="margin:0; color:var(--text-secondary);">${ultimoPlan.contenido_final || ultimoPlan.contenido_ia || 'Tu plan se está preparando — te avisaremos en cuanto esté listo.'}</p>
    </div>
  `;
}

/**
 * Redibuja los dots de progreso, el título del paso y el contenido del
 * paso actual. Equivalente a updateArticlesDisplay() en articlesPage.js.
 */
function updateFormularioDisplay() {
  const step = STEPS[currentStep - 1];

  const stepsEl = document.getElementById('diabetesSteps');
  if (stepsEl) {
    stepsEl.innerHTML = STEPS.map((s) => {
      const cls = s.id < currentStep ? 'done' : s.id === currentStep ? 'active' : '';
      return `<span class="diabetes-step-dot ${cls}"></span>`;
    }).join('');
  }

  const labelEl = document.getElementById('diabetesStepLabel');
  if (labelEl) labelEl.textContent = `Paso ${currentStep} de ${STEPS.length}`;

  const titleEl = document.getElementById('diabetesStepTitle');
  if (titleEl) titleEl.textContent = step.label;

  const contentEl = document.getElementById('diabetesStepContent');
  if (contentEl) contentEl.innerHTML = renderStepContent(step.key);

  const backBtn = document.getElementById('diabetesBackBtn');
  if (backBtn) backBtn.classList.toggle('hidden', currentStep === 1);

  const nextBtn = document.getElementById('diabetesNextBtn');
  if (nextBtn) nextBtn.textContent = currentStep === STEPS.length ? 'Guardar' : 'Siguiente';

  const statusEl = document.getElementById('diabetesSaveStatus');
  if (statusEl) statusEl.textContent = saveStatus;
}

// ═════════════════════════════════════════════════════════════════════════
// Contenido de cada paso
// ═════════════════════════════════════════════════════════════════════════

function field(id, label, value, type = 'text', extra = '') {
  return `
    <div class="diabetes-field">
      <label for="${id}">${label}</label>
      <input id="${id}" type="${type}" value="${value ?? ''}" ${extra} />
    </div>
  `;
}

function selectField(id, label, value, options) {
  return `
    <div class="diabetes-field">
      <label for="${id}">${label}</label>
      <select id="${id}">
        <option value="">Selecciona…</option>
        ${options.map(([val, text]) => `<option value="${val}" ${value === val ? 'selected' : ''}>${text}</option>`).join('')}
      </select>
    </div>
  `;
}

function textareaField(id, label, value, hint = '') {
  return `
    <div class="diabetes-field">
      <label for="${id}">${label}</label>
      <textarea id="${id}" rows="3">${value ?? ''}</textarea>
      ${hint ? `<p class="diabetes-field-hint">${hint}</p>` : ''}
    </div>
  `;
}

function renderStepContent(key) {
  if (key === 'personal') {
    const d = formData.personal;
    return `
      <div class="diabetes-field-group">
        <div class="diabetes-row">
          ${field('dpFechaNacimiento', 'Fecha de nacimiento', d.fecha_nacimiento, 'date')}
          ${selectField('dpSexo', 'Sexo', d.sexo, [['femenino', 'Femenino'], ['masculino', 'Masculino'], ['otro', 'Otro']])}
        </div>
        <div class="diabetes-row">
          ${field('dpAltura', 'Altura (cm)', d.altura_cm, 'number')}
          ${field('dpCiudad', 'Ciudad', d.ciudad)}
        </div>
        ${field('dpPais', 'País', d.pais)}
        <label class="input-check" style="display:flex; gap:8px; align-items:flex-start; font-size:.85rem; color:var(--text-secondary);">
          <input type="checkbox" id="dpConsentimiento" ${d.consentimiento_datos_salud_en ? 'checked' : ''} />
          <span>Doy mi consentimiento para el tratamiento de mis datos de salud con el único fin de recibir este programa nutricional.</span>
        </label>
      </div>
    `;
  }

  if (key === 'historial') {
    const d = formData.historial;
    return `
      <div class="diabetes-field-group">
        ${selectField('hmTipo', 'Tipo de diabetes', d.diabetes_tipo, [
          ['tipo_1', 'Tipo 1'], ['tipo_2', 'Tipo 2'], ['gestacional', 'Gestacional'],
          ['prediabetes', 'Prediabetes'], ['lada', 'LADA'], ['mody', 'MODY'], ['no_seguro', 'No estoy seguro/a']
        ])}
        <div class="diabetes-row">
          ${field('hmAniosDiagnostico', 'Años desde el diagnóstico', d.anios_diagnostico, 'number')}
          ${field('hmUltimaHba1c', 'Última HbA1c (%)', d.ultima_hba1c, 'number', 'step="0.1"')}
        </div>
        ${field('hmFechaHba1c', 'Fecha de esa última HbA1c', d.fecha_ultima_hba1c, 'date')}
        <div class="diabetes-row">
          ${field('hmRangoAyunas', 'Rango de glucemia en ayunas', d.rango_glucemia_ayunas)}
          ${field('hmRangoPostprandial', 'Rango de glucemia postprandial', d.rango_glucemia_postprandial)}
        </div>
        <div class="diabetes-row">
          ${field('hmFrecHipo', 'Frecuencia de hipoglucemias', d.frecuencia_hipoglucemias)}
          ${field('hmFrecHiper', 'Frecuencia de hiperglucemias', d.frecuencia_hiperglucemias)}
        </div>
        ${field('hmUltimoEpisodio', 'Último episodio de hipoglucemia', d.ultimo_episodio_hipoglucemia)}
        ${textareaField('hmComplicaciones', 'Complicaciones conocidas', Array.isArray(d.complicaciones) ? d.complicaciones.join(', ') : d.complicaciones, 'Ej. retinopatía, neuropatía — separadas por comas')}
        <label class="input-check" style="display:flex; gap:8px; align-items:center; font-size:.9rem;">
          <input type="checkbox" id="hmUsaSensor" ${d.usa_sensor_glucosa ? 'checked' : ''} />
          <span>Uso sensor de glucosa</span>
        </label>
        ${field('hmDispositivo', 'Dispositivo (si aplica)', d.dispositivo_glucosa)}
        ${selectField('hmConteoRaciones', 'Nivel de conteo de raciones de HC', d.nivel_conteo_raciones, [['avanzado', 'Avanzado'], ['basico', 'Básico'], ['ninguno', 'Ninguno']])}
        ${textareaField('hmMedicacion', 'Medicación actual', Array.isArray(d.medicacion) ? d.medicacion.join(', ') : d.medicacion, 'Incluye insulina si aplica — separadas por comas')}
        ${field('hmAlergias', 'Alergias', d.alergias)}
        ${textareaField('hmOtrasPatologias', 'Otras patologías', d.otras_patologias)}
      </div>
    `;
  }

  if (key === 'alimentacion') {
    const d = formData.habitos;
    return `
      <div class="diabetes-field-group">
        <div class="diabetes-row">
          ${field('haComidasDia', 'Comidas al día', d.comidas_dia, 'number')}
          ${selectField('haPresupuesto', 'Nivel de presupuesto', d.nivel_presupuesto, [['bajo', 'Bajo'], ['medio', 'Medio'], ['alto', 'Alto']])}
        </div>
        ${textareaField('haHorarios', 'Horarios habituales de comida', typeof d.horarios_comida === 'object' ? JSON.stringify(d.horarios_comida) : d.horarios_comida, 'Ej. Desayuno 8:00, Comida 14:00, Cena 21:00')}
        ${field('haPreferencias', 'Preferencias alimentarias', d.preferencias_alimentarias)}
        ${field('haRechazos', 'Alimentos que no te gustan / evitas', d.rechazos_alimentarios)}
        ${field('haComeFuera', 'Frecuencia con la que comes fuera de casa', d.frecuencia_come_fuera)}
        <div class="diabetes-row">
          ${field('haAlcohol', 'Consumo de alcohol', d.consumo_alcohol)}
          <label class="input-check" style="display:flex; gap:8px; align-items:center; font-size:.9rem; align-self:end; padding-bottom:10px;">
            <input type="checkbox" id="haTabaco" ${d.consumo_tabaco ? 'checked' : ''} />
            <span>Fumo actualmente</span>
          </label>
        </div>
      </div>
    `;
  }

  if (key === 'ejercicio') {
    const d = formData.habitos;
    return `
      <div class="diabetes-field-group">
        ${selectField('haActividad', 'Nivel de actividad física', d.nivel_actividad, [
          ['sedentario', 'Sedentario'], ['ligero', 'Ligero'], ['moderado', 'Moderado'], ['activo', 'Activo'], ['muy_activo', 'Muy activo']
        ])}
        ${field('haTipoEjercicio', 'Tipo de ejercicio habitual', d.tipo_ejercicio)}
        ${field('haAjustaMedicacion', '¿Ajustas la medicación por el ejercicio?', d.ajusta_medicacion_ejercicio)}
        <label class="input-check" style="display:flex; gap:8px; align-items:center; font-size:.9rem;">
          <input type="checkbox" id="haHipoEjercicio" ${d.hipoglucemias_por_ejercicio ? 'checked' : ''} />
          <span>Sufro hipoglucemias relacionadas con el ejercicio</span>
        </label>
        <div class="diabetes-row">
          ${field('haHorasSueno', 'Horas de sueño habituales', d.horas_sueno, 'number', 'step="0.5"')}
          ${field('haNivelEstres', 'Nivel de estrés (1-5)', d.nivel_estres, 'number', 'min="1" max="5"')}
        </div>
        ${field('haHorarioLaboral', 'Horario laboral', d.horario_laboral)}
      </div>
    `;
  }

  if (key === 'objetivos') {
    const d = formData.habitos;
    return `
      <div class="diabetes-field-group">
        ${textareaField('haObjetivoPrincipal', 'Tu objetivo principal con este programa', d.objetivo_principal)}
        ${textareaField('haIntentosPrevios', 'Intentos previos de manejo nutricional', d.intentos_previos)}
        <div class="diabetes-upload">
          <p style="margin:0 0 8px;">${getIcon('download', 20)} Sube tu última analítica o informe médico (opcional)</p>
          <input type="file" id="haDocumento" accept=".pdf,.jpg,.jpeg,.png" />
        </div>
      </div>
    `;
  }

  return '';
}

// ═════════════════════════════════════════════════════════════════════════
// Navegación entre pasos + guardado
// ═════════════════════════════════════════════════════════════════════════

function setupNavigationListeners() {
  document.getElementById('diabetesBackBtn')?.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep -= 1;
      updateFormularioDisplay();
    }
  });

  document.getElementById('diabetesNextBtn')?.addEventListener('click', handleNextStep);
}

function readStepFieldsIntoState(key) {
  if (key === 'personal') {
    formData.personal = {
      ...formData.personal,
      fecha_nacimiento: valueOf('dpFechaNacimiento'),
      sexo: valueOf('dpSexo'),
      altura_cm: numberOf('dpAltura'),
      ciudad: valueOf('dpCiudad'),
      pais: valueOf('dpPais'),
      consentimientoAceptado: checkedOf('dpConsentimiento')
    };
    return;
  }

  if (key === 'historial') {
    formData.historial = {
      ...formData.historial,
      diabetes_tipo: valueOf('hmTipo'),
      anios_diagnostico: numberOf('hmAniosDiagnostico'),
      ultima_hba1c: numberOf('hmUltimaHba1c'),
      fecha_ultima_hba1c: valueOf('hmFechaHba1c'),
      rango_glucemia_ayunas: valueOf('hmRangoAyunas'),
      rango_glucemia_postprandial: valueOf('hmRangoPostprandial'),
      frecuencia_hipoglucemias: valueOf('hmFrecHipo'),
      frecuencia_hiperglucemias: valueOf('hmFrecHiper'),
      ultimo_episodio_hipoglucemia: valueOf('hmUltimoEpisodio'),
      complicaciones: splitList(valueOf('hmComplicaciones')),
      usa_sensor_glucosa: checkedOf('hmUsaSensor'),
      dispositivo_glucosa: valueOf('hmDispositivo'),
      nivel_conteo_raciones: valueOf('hmConteoRaciones'),
      medicacion: splitList(valueOf('hmMedicacion')),
      alergias: valueOf('hmAlergias'),
      otras_patologias: valueOf('hmOtrasPatologias')
    };
    return;
  }

  if (key === 'alimentacion') {
    formData.habitos = {
      ...formData.habitos,
      comidas_dia: numberOf('haComidasDia'),
      nivel_presupuesto: valueOf('haPresupuesto'),
      horarios_comida: valueOf('haHorarios'),
      preferencias_alimentarias: valueOf('haPreferencias'),
      rechazos_alimentarios: valueOf('haRechazos'),
      frecuencia_come_fuera: valueOf('haComeFuera'),
      consumo_alcohol: valueOf('haAlcohol'),
      consumo_tabaco: checkedOf('haTabaco')
    };
    return;
  }

  if (key === 'ejercicio') {
    formData.habitos = {
      ...formData.habitos,
      nivel_actividad: valueOf('haActividad'),
      tipo_ejercicio: valueOf('haTipoEjercicio'),
      ajusta_medicacion_ejercicio: valueOf('haAjustaMedicacion'),
      hipoglucemias_por_ejercicio: checkedOf('haHipoEjercicio'),
      horas_sueno: numberOf('haHorasSueno'),
      nivel_estres: numberOf('haNivelEstres'),
      horario_laboral: valueOf('haHorarioLaboral')
    };
    return;
  }

  if (key === 'objetivos') {
    formData.habitos = {
      ...formData.habitos,
      objetivo_principal: valueOf('haObjetivoPrincipal'),
      intentos_previos: valueOf('haIntentosPrevios')
    };
  }
}

async function handleNextStep() {
  const step = STEPS[currentStep - 1];
  readStepFieldsIntoState(step.key);

  saveStatus = 'Guardando…';
  updateSaveStatusOnly();

  const usuarioId = usuarioActual.id;
  let ok = true;

  if (step.key === 'personal') {
    ok = !!(await DiabetesService.guardarDatosPersonales(usuarioId, formData.personal));
  } else if (step.key === 'historial') {
    ok = !!(await DiabetesService.guardarHistorialMedico(usuarioId, formData.historial));
  } else if (['alimentacion', 'ejercicio', 'objetivos'].includes(step.key)) {
    ok = !!(await DiabetesService.guardarHabitosPaciente(usuarioId, formData.habitos));
  }

  if (step.key === 'objetivos') {
    const fileInput = document.getElementById('haDocumento');
    const file = fileInput?.files?.[0];
    if (file) {
      await DiabetesService.subirDocumento(usuarioId, file, 'analitica');
    }
  }

  saveStatus = ok ? 'Guardado' : 'No se pudo guardar — revisa tu conexión';

  if (currentStep < STEPS.length) {
    currentStep += 1;
    updateFormularioDisplay();
  } else {
    updateSaveStatusOnly();
  }
}

function updateSaveStatusOnly() {
  const statusEl = document.getElementById('diabetesSaveStatus');
  if (statusEl) statusEl.textContent = saveStatus;
}

// ── Helpers de lectura de inputs ──

function valueOf(id) {
  return document.getElementById(id)?.value?.trim() || null;
}

function numberOf(id) {
  const raw = document.getElementById(id)?.value;
  return raw ? Number(raw) : null;
}

function checkedOf(id) {
  return document.getElementById(id)?.checked || false;
}

function splitList(value) {
  if (!value) return [];
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}
