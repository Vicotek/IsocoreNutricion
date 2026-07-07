import '../styles/home.css';

const STORAGE_KEY = 'isocore_home_user';

function createBrandSection() {
  return `
    <div class="home-brand">
      <p class="home-brand-tag">ISOCORE</p>
      <p class="home-brand-subtitle">NUTRICIÓN</p>
    </div>
  `;
}

function createFeatureCard(icon, title, description) {
  return `
    <article class="feature-card">
      <div class="feature-icon">${icon}</div>
      <div>
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
    </article>
  `;
}

function createModuleCard(title, description, locked = true) {
  return `
    <article class="module-card ${locked ? 'module-locked' : ''}">
      <div>
        <h4>${title}</h4>
        <p>${description}</p>
      </div>
      <div class="module-footer">
        <span class="module-badge">${locked ? 'BLOQUEADO' : 'ACTIVO'}</span>
        <button type="button" class="secondary-button module-action" data-locked="${locked}">${locked ? 'Vista previa' : 'Entrar'}</button>
      </div>
    </article>
  `;
}

function getStoredUser() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return null;
  }
}

function storeUser(user) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function renderLoginState(user) {
  const loginState = document.querySelector('.home-login-state');
  const userName = document.getElementById('homeUserName');
  const userEmail = document.getElementById('homeUserEmail');
  const userLabel = document.getElementById('homeUserLabel');
  const userWelcome = document.getElementById('homeUserWelcome');
  const loginForm = document.getElementById('homeLoginForm');
  const logoutButton = document.getElementById('homeLogoutButton');
  const loginPanelIntro = document.getElementById('homeLoginPanelIntro');

  if (!loginState) return;

  if (user && user.name) {
    loginState.classList.add('home-user-logged');
    userLabel.textContent = user.name;
    userWelcome.textContent = `Bienvenido de nuevo, ${user.name.split(' ')[0]}`;
    userName.value = user.name;
    userEmail.value = user.email;
    loginForm.classList.add('hidden');
    logoutButton.classList.remove('hidden');
    loginPanelIntro.textContent = 'Acceso permanente. Sigue tus avances desde aquí.';
  } else {
    loginState.classList.remove('home-user-logged');
    loginForm.classList.remove('hidden');
    logoutButton.classList.add('hidden');
    loginPanelIntro.textContent = 'Accede a ISOCORE con tus credenciales para continuar.';
  }
}

function showLockedNotice(message) {
  const notice = document.getElementById('homeLockedNotice');
  if (!notice) return;
  notice.textContent = message;
  notice.classList.add('visible');
  window.clearTimeout(showLockedNotice.timeoutId);
  showLockedNotice.timeoutId = window.setTimeout(() => {
    notice.classList.remove('visible');
  }, 3600);
}

function initHomeInteractions() {
  const loginForm = document.getElementById('homeLoginForm');
  const logoutButton = document.getElementById('homeLogoutButton');
  const lockedButtons = Array.from(document.querySelectorAll('.module-action'));

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('homeUserName')?.value?.trim();
    const email = document.getElementById('homeUserEmail')?.value?.trim();

    if (!name || !email) {
      showLockedNotice('Completa el nombre y el correo para iniciar sesión.');
      return;
    }

    const user = { name, email, loggedAt: new Date().toISOString() };
    storeUser(user);
    renderLoginState(user);
    showLockedNotice('Has iniciado sesión. Tu acceso permanece activo en esta pantalla.');
  });

  logoutButton?.addEventListener('click', () => {
    clearStoredUser();
    renderLoginState(null);
    showLockedNotice('Has cerrado sesión. Puedes iniciar sesión de nuevo en cualquier momento.');
  });

  lockedButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const isLocked = button.dataset.locked === 'true';
      if (isLocked) {
        showLockedNotice('Este módulo está bloqueado. Completa la experiencia inicial para desbloquearlo.');
        return;
      }
      showLockedNotice('Navegando al módulo...');
    });
  });
}

export function renderHomePage() {
  const appRoot = document.getElementById('app');

  appRoot.innerHTML = `
    <main class="home-root page-shell">
      <section class="home-grid">
        <div class="home-panel home-panel-left">
          ${createBrandSection()}

          <div class="home-hero">
            <p class="eyebrow">Conocimiento profesional</p>
            <h1>Tu centro premium de nutrición basado en evidencia científica.</h1>
            <p class="home-copy">Una experiencia clara y calmada donde ISOCORE y NUTRICIÓN se separan para ofrecer un enfoque distintivo, moderno y eficiente.</p>
          </div>

          <div class="home-details">
            ${createFeatureCard('📘', 'Estrategia clara', 'Un espacio pensado para profesionales y personas que buscan respuestas confiables, no un catálogo saturado.')}
            ${createFeatureCard('🧠', 'Decisiones científicas', 'Contenido estructurado en módulos, protocolos y resúmenes para avanzar con seguridad.')}
            ${createFeatureCard('🔒', 'Módulos bloqueados', 'Control premium: tu progreso y acceso se muestran con claridad antes de desbloquear cada sección.')}
          </div>

          <div class="home-summary-card">
            <div>
              <p class="summary-label">Estado actual</p>
              <h2>Landing home lista.</h2>
              <p>Este Home es la primera versión funcional: visual premium, responsive, con login permanente y módulos bloqueados.</p>
            </div>
            <div class="summary-keypoints">
              <span>65/35</span>
              <span>Apple / Linear</span>
              <span>Diseño amplio</span>
            </div>
          </div>
        </div>

        <aside class="home-panel home-panel-right">
          <div class="home-card home-login-card home-login-state">
            <div class="home-login-heading">
              <p class="eyebrow">Acceso permanente</p>
              <h2>Inicia sesión en ISOCORE.</h2>
            </div>
            <p id="homeLoginPanelIntro" class="home-login-copy">Accede a ISOCORE con tus credenciales para continuar.</p>
            <form id="homeLoginForm" class="home-login-form">
              <label class="input-group">
                <span>Nombre</span>
                <input id="homeUserName" type="text" placeholder="Tu nombre completo" autocomplete="name" />
              </label>
              <label class="input-group">
                <span>Correo</span>
                <input id="homeUserEmail" type="email" placeholder="usuario@ejemplo.com" autocomplete="email" />
              </label>
              <button type="submit" class="primary-button">Iniciar sesión</button>
            </form>
            <div class="home-user-card hidden" aria-live="polite">
              <p class="eyebrow">Sesión activa</p>
              <h3 id="homeUserLabel">Usuario</h3>
              <p id="homeUserWelcome">Bienvenido</p>
            </div>
            <button id="homeLogoutButton" class="ghost-button hidden" type="button">Cerrar sesión</button>
          </div>

          <div class="home-card home-lock-card">
            <div class="home-lock-header">
              <h3>Módulos</h3>
              <span class="status-pill">Bloqueados</span>
            </div>
            <p class="module-copy">Los módulos se presentan aquí como parte del producto. La navegación es clara y el acceso se desbloquea de forma controlada.</p>
            <div class="module-grid">
              ${createModuleCard('Recursos', 'Explora artículos, guías y protocolos cuidadosamente seleccionados.')}
              ${createModuleCard('Suplementos', 'Analiza suplementos con evidencia, contexto y recomendaciones clínicas.')}
            </div>
          </div>

          <div id="homeLockedNotice" class="home-locked-notice">Selecciona un módulo para ver más.</div>
        </aside>
      </section>
    </main>
  `;

  const persistedUser = getStoredUser();
  renderLoginState(persistedUser);
  initHomeInteractions();
}
