/**
 * ProfilePage - Perfil completo del usuario
 * Centraliza: datos personales, objetivo, plan, favoritos, historial, notificaciones, idioma, seguridad
 */

import * as ProfileService from '../services/profileService.js';
import * as FavoritesService from '../services/favoritesService.js';
import { API_URL, AUTH_HEADER } from '../services/supabaseClient.js';
import { getIcon } from '../components/icons.js';

/**
 * Renderizar página de perfil
 */
export function renderProfilePage() {
  const mainContent = document.querySelector('main');
  if (!mainContent) {
    console.warn('⚠️ No se encontró elemento <main>');
    return;
  }

  // Limpiar contenido anterior
  mainContent.innerHTML = '';

  // Crear estructura de la página
  const container = document.createElement('div');
  container.className = 'profile-page-container';
  container.innerHTML = `
    <div class="profile-header">
      <div class="profile-header-content">
        <h1>Mi Perfil</h1>
        <p>Gestiona tu información personal y preferencias</p>
      </div>
    </div>

    <div class="profile-main-content">
      <!-- Tabs de navegación -->
      <div class="profile-tabs">
        <button class="profile-tab active" data-tab="personal">${getIcon('user', 16)} Personal</button>
        <button class="profile-tab" data-tab="objetivos">${getIcon('target', 16)} Objetivos</button>
        <button class="profile-tab" data-tab="favoritos">${getIcon('heart', 16)} Favoritos</button>
        <button class="profile-tab" data-tab="historial">${getIcon('clock', 16)} Historial</button>
        <button class="profile-tab" data-tab="notificaciones">${getIcon('bell', 16)} Notificaciones</button>
        <button class="profile-tab" data-tab="preferencias">${getIcon('gear', 16)} Preferencias</button>
      </div>

      <!-- Contenido de tabs -->
      <div class="profile-content">
        
        <!-- TAB: Datos Personales -->
        <div class="profile-tab-content active" id="tab-personal">
          <div class="profile-section">
            <h2>Datos Personales</h2>
            
            <div class="profile-form">
              <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" id="fullName" class="form-input" placeholder="Tu nombre"/>
              </div>

              <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" class="form-input" readonly/>
              </div>

              <div class="form-group">
                <label>Biografía</label>
                <textarea id="bio" class="form-input" placeholder="Cuéntanos sobre ti..." rows="4"></textarea>
              </div>

              <div class="form-group">
                <label>Foto de Perfil</label>
                <input type="text" id="avatarUrl" class="form-input" placeholder="URL de la foto"/>
                <div class="profile-preview" id="profilePreview"></div>
              </div>

              <button class="btn btn-primary" id="savePersonalBtn">${getIcon('save', 16)} Guardar Cambios</button>
            </div>
          </div>

          <!-- Plan Activo -->
          <div class="profile-section">
            <h2>Plan Actual</h2>
            <div class="plan-display" id="planDisplay"></div>
          </div>
        </div>

        <!-- TAB: Objetivos Nutricionales -->
        <div class="profile-tab-content" id="tab-objetivos">
          <div class="profile-section">
            <h2>Objetivo Nutricional</h2>
            <p class="section-description">Selecciona tu objetivo principal para recibir recomendaciones personalizadas</p>
            
            <div class="goals-grid">
              <div class="goal-card" data-goal="general">
                <div class="goal-icon">${getIcon('scale', 26)}</div>
                <h3>Bienestar General</h3>
                <p>Mantener una buena salud y energía</p>
              </div>

              <div class="goal-card" data-goal="weight_loss">
                <div class="goal-icon">${getIcon('trendDown', 26)}</div>
                <h3>Pérdida de Peso</h3>
                <p>Reducir peso de forma saludable</p>
              </div>

              <div class="goal-card" data-goal="muscle_gain">
                <div class="goal-icon">${getIcon('muscle', 26)}</div>
                <h3>Ganancia Muscular</h3>
                <p>Aumentar masa muscular</p>
              </div>

              <div class="goal-card" data-goal="performance">
                <div class="goal-icon">${getIcon('flash', 26)}</div>
                <h3>Rendimiento Deportivo</h3>
                <p>Optimizar rendimiento atlético</p>
              </div>
            </div>
          </div>

          <!-- Estadísticas -->
          <div class="profile-section">
            <h2>Tu Actividad</h2>
            <div class="stats-grid" id="statsDisplay"></div>
          </div>
        </div>

        <!-- TAB: Favoritos -->
        <div class="profile-tab-content" id="tab-favoritos">
          <div class="profile-section">
            <h2>Mis Favoritos</h2>
            <div class="favorites-list" id="favoritesList"></div>
          </div>
        </div>

        <!-- TAB: Historial -->
        <div class="profile-tab-content" id="tab-historial">
          <div class="profile-section">
            <h2>Historial</h2>
            <div class="history-list" id="historyList"></div>
          </div>
        </div>

        <!-- TAB: Notificaciones -->
        <div class="profile-tab-content" id="tab-notificaciones">
          <div class="profile-section">
            <h2>Notificaciones</h2>
            <div class="notifications-list" id="notificationsList"></div>
          </div>
        </div>

        <!-- TAB: Preferencias -->
        <div class="profile-tab-content" id="tab-preferencias">
          <div class="profile-section">
            <h2>Idioma</h2>
            <div class="language-options">
              <label class="radio-option">
                <input type="radio" name="language" value="es" class="language-radio">
                <span>Español</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="language" value="en" class="language-radio">
                <span>English</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="language" value="pt" class="language-radio">
                <span>Português</span>
              </label>
            </div>
          </div>

          <div class="profile-section">
            <h2>Notificaciones</h2>
            <label class="checkbox-option">
              <input type="checkbox" id="notificationsToggle" class="checkbox-input">
              <span>Activar notificaciones</span>
            </label>
          </div>

          <div class="profile-section">
            <h2>Seguridad</h2>
            <button class="btn btn-secondary" id="changePasswordBtn">${getIcon('lock', 16)} Cambiar Contraseña</button>
            <button class="btn btn-secondary" id="exportDataBtn">${getIcon('download', 16)} Exportar Mis Datos (GDPR)</button>
          </div>

          <div class="profile-section danger-zone">
            <h2>Zona de Peligro</h2>
            <button class="btn btn-danger" id="deleteAccountBtn">${getIcon('trash', 16)} Eliminar Cuenta</button>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal de Cambio de Contraseña -->
    <div class="modal" id="passwordModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Cambiar Contraseña</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Contraseña Actual</label>
            <input type="password" id="currentPassword" class="form-input" placeholder="Contraseña actual"/>
          </div>
          <div class="form-group">
            <label>Nueva Contraseña</label>
            <input type="password" id="newPassword" class="form-input" placeholder="Nueva contraseña"/>
          </div>
          <div class="form-group">
            <label>Confirmar Contraseña</label>
            <input type="password" id="confirmPassword" class="form-input" placeholder="Confirmar nueva contraseña"/>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelPasswordBtn">Cancelar</button>
          <button class="btn btn-primary" id="confirmPasswordBtn">Cambiar</button>
        </div>
      </div>
    </div>
  `;

  mainContent.appendChild(container);

  // Inicializar funcionalidad
  initializeProfilePage();
}

/**
 * Inicializar página de perfil
 */
function initializeProfilePage() {
  setupTabs();
  loadProfileData();
  setupEventListeners();
}

/**
 * Configurar navegación de tabs
 */
function setupTabs() {
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      
      // Actualizar botones activos
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      // Actualizar contenido
      document.querySelectorAll('.profile-tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${tabName}`).classList.add('active');

      // Cargar datos dinámicos si es necesario
      if (tabName === 'favoritos') loadFavorites();
      if (tabName === 'historial') loadHistory();
      if (tabName === 'notificaciones') loadNotifications();
      if (tabName === 'objetivos') loadStats();
    });
  });
}

/**
 * Cargar datos del perfil
 */
async function loadProfileData() {
  const profile = ProfileService.getProfile();
  
  // Datos personales
  document.getElementById('fullName').value = profile.full_name || '';
  document.getElementById('email').value = profile.email || '';
  document.getElementById('bio').value = profile.bio || '';
  document.getElementById('avatarUrl').value = profile.avatar_url || '';

  // Vista previa del avatar
  if (profile.avatar_url) {
    document.getElementById('profilePreview').innerHTML = 
      `<img src="${profile.avatar_url}" alt="Avatar" class="profile-avatar-preview"/>`;
  }

  // Plan activo
  displayPlanInfo(profile);

  // Objetivo seleccionado
  document.querySelectorAll('.goal-card').forEach(card => {
    if (card.dataset.goal === profile.nutritional_goal) {
      card.classList.add('active');
    }
  });

  // Idioma seleccionado
  const languageRadio = document.querySelector(`input[name="language"][value="${profile.language || 'es'}"]`);
  if (languageRadio) languageRadio.checked = true;

  // Notificaciones
  document.getElementById('notificationsToggle').checked = profile.notifications_enabled !== false;
}

/**
 * Mostrar información del plan
 */
function displayPlanInfo(profile) {
  const planDisplay = document.getElementById('planDisplay');
  const planInfo = {
    'free': { icon: getIcon('bag', 28), name: 'Plan Gratuito', color: '#8CC63F' },
    'premium': { icon: getIcon('star', 28), name: 'Plan Premium', color: '#FFD700' },
    'vip': { icon: getIcon('crown', 28), name: 'Plan VIP', color: '#FF6B6B' }
  };

  const plan = planInfo[profile.active_plan || 'free'];
  
  planDisplay.innerHTML = `
    <div class="plan-card" style="border-color: ${plan.color}">
      <div class="plan-icon">${plan.icon}</div>
      <h3>${plan.name}</h3>
      <p style="color: ${plan.color}; font-weight: bold;">Plan activo</p>
    </div>
  `;
}

/**
 * Cargar favoritos
 */
async function loadFavorites() {
  const favoritesList = document.getElementById('favoritesList');
  favoritesList.innerHTML = '<div class="loading">Cargando favoritos...</div>';

  try {
    const favorites = await ProfileService.getFavorites();
    
    if (favorites.length === 0) {
      favoritesList.innerHTML = '<div class="empty-state">No tienes favoritos aún</div>';
      return;
    }

    favoritesList.innerHTML = favorites.map(fav => `
      <div class="favorite-item">
        <div class="favorite-icon">${fav.type === 'articles' ? getIcon('book', 20) : getIcon('storefront', 20)}</div>
        <div class="favorite-info">
          <h4>${fav.item_title}</h4>
          <p>${fav.item_description || 'Sin descripción'}</p>
          <small>Agregado: ${new Date(fav.created_at).toLocaleDateString('es-ES')}</small>
        </div>
        <button class="btn-small btn-danger" onclick="removeFavorite('${fav.id}')">${getIcon('close', 14)}</button>
      </div>
    `).join('');
  } catch (error) {
    favoritesList.innerHTML = '<div class="error">Error cargando favoritos</div>';
  }
}

/**
 * Cargar historial
 */
async function loadHistory() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '<div class="loading">Cargando historial...</div>';

  try {
    const history = await ProfileService.getHistory();
    
    if (history.length === 0) {
      historyList.innerHTML = '<div class="empty-state">No tienes historial aún</div>';
      return;
    }

    historyList.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="history-type">${getHistoryIcon(item.action)}</div>
        <div class="history-info">
          <h4>${item.action}</h4>
          <p>${item.description || 'Sin detalles'}</p>
          <small>${new Date(item.created_at).toLocaleString('es-ES')}</small>
        </div>
      </div>
    `).join('');
  } catch (error) {
    historyList.innerHTML = '<div class="error">Error cargando historial</div>';
  }
}

/**
 * Cargar notificaciones
 */
async function loadNotifications() {
  const notificationsList = document.getElementById('notificationsList');
  notificationsList.innerHTML = '<div class="loading">Cargando notificaciones...</div>';

  try {
    const notifications = await ProfileService.getNotifications();
    
    if (notifications.length === 0) {
      notificationsList.innerHTML = '<div class="empty-state">No tienes notificaciones</div>';
      return;
    }

    notificationsList.innerHTML = notifications.map(notif => `
      <div class="notification-item ${notif.read ? 'read' : 'unread'}">
        <div class="notification-icon">${notif.type === 'info' ? getIcon('info', 18) : notif.type === 'warning' ? getIcon('warning', 18) : getIcon('check', 18)}</div>
        <div class="notification-info">
          <h4>${notif.title}</h4>
          <p>${notif.message}</p>
          <small>${new Date(notif.created_at).toLocaleString('es-ES')}</small>
        </div>
        ${!notif.read ? `<button class="btn-small btn-primary" onclick="markAsRead(${notif.id})">Marcar leído</button>` : ''}
      </div>
    `).join('');
  } catch (error) {
    notificationsList.innerHTML = '<div class="error">Error cargando notificaciones</div>';
  }
}

/**
 * Cargar estadísticas
 */
async function loadStats() {
  const statsDisplay = document.getElementById('statsDisplay');
  statsDisplay.innerHTML = '<div class="loading">Cargando estadísticas...</div>';

  try {
    const stats = await ProfileService.getUserStats();
    
    statsDisplay.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${stats.totalFavorites || 0}</div>
        <div class="stat-label">Favoritos</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalHistory || 0}</div>
        <div class="stat-label">Acciones Realizadas</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.unreadNotifications || 0}</div>
        <div class="stat-label">Notificaciones</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.planStatus.toUpperCase()}</div>
        <div class="stat-label">Plan Actual</div>
      </div>
    `;
  } catch (error) {
    statsDisplay.innerHTML = '<div class="error">Error cargando estadísticas</div>';
  }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
  // Guardar datos personales
  document.getElementById('savePersonalBtn').addEventListener('click', async () => {
    const updates = {
      full_name: document.getElementById('fullName').value,
      bio: document.getElementById('bio').value,
      avatar_url: document.getElementById('avatarUrl').value
    };

    await ProfileService.updateProfile(updates);
    alert('Perfil actualizado');
    loadProfileData();
  });

  // Seleccionar objetivo
  document.querySelectorAll('.goal-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      const goal = card.dataset.goal;
      await ProfileService.updateNutritionalGoal(goal);
      console.log('🎯 Objetivo actualizado:', goal);
    });
  });

  // Cambiar idioma
  document.querySelectorAll('.language-radio').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      await ProfileService.updateLanguage(e.target.value);
      console.log('🌍 Idioma actualizado:', e.target.value);
    });
  });

  // Toggle notificaciones
  document.getElementById('notificationsToggle').addEventListener('change', async (e) => {
    await ProfileService.updateNotificationSettings(e.target.checked);
    console.log('🔔 Notificaciones:', e.target.checked ? 'activadas' : 'desactivadas');
  });

  // Cambiar contraseña
  document.getElementById('changePasswordBtn').addEventListener('click', () => {
    document.getElementById('passwordModal').style.display = 'flex';
  });

  document.getElementById('cancelPasswordBtn').addEventListener('click', () => {
    document.getElementById('passwordModal').style.display = 'none';
  });

  document.getElementById('confirmPasswordBtn').addEventListener('click', async () => {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (newPass !== confirm) {
      alert('Las contraseñas no coinciden');
      return;
    }

    const success = await ProfileService.changePassword(current, newPass);
    if (success) {
      alert('Contraseña cambiada exitosamente');
      document.getElementById('passwordModal').style.display = 'none';
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    } else {
      alert('Error al cambiar contraseña');
    }
  });

  // Exportar datos
  document.getElementById('exportDataBtn').addEventListener('click', async () => {
    const data = await ProfileService.exportUserData();
    if (data) {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `isocore-datos-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      alert('Datos exportados correctamente');
    }
  });

  // Cerrar modal
  document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('passwordModal').style.display = 'none';
  });
}

/**
 * Obtener icono por tipo de acción en historial
 */
function getHistoryIcon(action) {
  const icons = {
    'view': getIcon('eye', 16),
    'favorite': getIcon('heart', 16),
    'search': getIcon('search', 16),
    'download': getIcon('download', 16),
    'share': getIcon('send', 16)
  };
  return icons[action] || getIcon('edit', 16);
}

/**
 * Remover favorito (función global)
 */
window.removeFavorite = async (favoriteId) => {
  try {
    await fetch(`${API_URL}/favorites?id=eq.${favoriteId}`, {
      method: 'DELETE',
      headers: AUTH_HEADER
    });
    loadFavorites();
    console.log('✅ Favorito removido');
  } catch (error) {
    console.error('❌ Error removiendo favorito:', error);
  }
};

/**
 * Marcar notificación como leída (función global)
 */
window.markAsRead = async (notificationId) => {
  await ProfileService.markNotificationAsRead(notificationId);
  loadNotifications();
  console.log('✅ Notificación marcada como leída');
};
