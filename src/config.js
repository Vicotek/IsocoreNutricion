/**
 * Configuración centralizada de la aplicación
 * 
 * Este archivo define todas las constantes de configuración de la aplicación
 * en un único lugar, sin dependencias de import.meta.env ni variables de entorno.
 * 
 * IMPORTANTE: Actualiza estos valores según tu entorno de desarrollo/producción
 */

window.APP_CONFIG = {
  // ── API Configuration ──────────────────────────────────────────────
  // URL base para todos los webhooks de n8n
  API_BASE_URL: 'https://n8n.srv1569124.hstgr.cloud/webhook',
  BACKEND_BASE_URL: 'https://n8n.srv1569124.hstgr.cloud/webhook',

  // ── Supabase Configuration ─────────────────────────────────────────
  // (Si es necesario en el futuro)
  SUPABASE_URL: 'https://dhvouecsvhcxxzputvvq.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

  // ── Stripe Configuration ──────────────────────────────────────────
  // VITE_STRIPE_PUBLIC_KEY - Clave pública de Stripe
  // Obtén la tuya en: https://dashboard.stripe.com/apikeys
  STRIPE_PUBLIC_KEY: 'pk_test_', // Placeholder - Reemplazar con tu clave real

  // ── App Info ───────────────────────────────────────────────────────
  APP_NAME: 'IsoCore',
  VERSION: '1.0',
  DEBUG: false,
  ENVIRONMENT: 'production',

  // ── Storage Keys ───────────────────────────────────────────────────
  // Claves para almacenamiento local
  STORAGE_KEY: 'isocore_home_user',
  LANGUAGE_KEY: 'isocore_home_language',

  // ── App Settings ───────────────────────────────────────────────────
  SUPPORTED_LANGUAGES: ['es', 'en', 'ca'],
  DEFAULT_LANGUAGE: 'es',

  // ── Validación ─────────────────────────────────────────────────────
  /**
   * Verifica que la configuración crítica esté correctamente establecida
   * @returns {boolean} true si la config es válida
   */
  isValid: function() {
    if (!this.STRIPE_PUBLIC_KEY || this.STRIPE_PUBLIC_KEY === 'pk_test_') {
      console.warn('⚠️ APP_CONFIG: STRIPE_PUBLIC_KEY no está configurada. La funcionalidad de pagos estará limitada.');
      return false;
    }
    return true;
  },
  
  /**
   * Obtiene el valor de una configuración con valor por defecto
   * @param {string} key - Clave de configuración
   * @param {*} defaultValue - Valor por defecto si no existe
   * @returns {*} El valor de la configuración
   */
  get: function(key, defaultValue = null) {
    return this[key] !== undefined ? this[key] : defaultValue;
  }
};

console.log('✅ APP_CONFIG cargada:', window.APP_CONFIG);
