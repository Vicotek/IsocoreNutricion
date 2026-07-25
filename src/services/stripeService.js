/**
 * Stripe Plans Service
 * Integración con Stripe para gestión de planes y pagos
 */

import { getCurrentPlan, savePlan } from './planService.js';
import { updateUserPlanInSupabase } from './supabaseClient.js';

// ✅ Leer configuración desde window.APP_CONFIG en lugar de import.meta.env
const STRIPE_PUBLIC_KEY = window.APP_CONFIG?.STRIPE_PUBLIC_KEY || 'pk_test_'; // Placeholder
let stripePromise = null;

// Validar que Stripe está configurado
if (!STRIPE_PUBLIC_KEY || STRIPE_PUBLIC_KEY === 'pk_test_') {
  console.warn('⚠️ STRIPE_PUBLIC_KEY no configurada correctamente. Actualiza window.APP_CONFIG en src/config.js');
}

/**
 * Obtener Stripe (lazy load)
 */
async function getStripe() {
  if (!stripePromise) {
    stripePromise = import('https://js.stripe.com/v3/').then(module => {
      return module.loadStripe(STRIPE_PUBLIC_KEY);
    });
  }
  return stripePromise;
}

/**
 * Definición de planes disponibles
 */
const PLANS_CONFIG = {
  premium: {
    name: 'Premium',
    priceId: 'price_premium_monthly', // ID de Stripe
    price: 9.99,
    currency: 'eur',
    interval: 'month',
    features: [
      'Acceso a todas las recetas',
      'Suplementos y análisis',
      'Planes nutricionales personalizados',
      'Actualizaciones regulares'
    ],
    description: 'Acceso completo a todas las funciones básicas'
  },
  vip: {
    name: 'VIP',
    priceId: 'price_vip_monthly', // ID de Stripe
    price: 29.99,
    currency: 'eur',
    interval: 'month',
    features: [
      'Todo del plan Premium',
      'Centro IA ilimitado',
      'Módulos educativos avanzados',
      'Prioridad en soporte',
      'Descarga de recursos'
    ],
    description: 'Acceso premium con funciones avanzadas e IA'
  }
};

/**
 * Obtener configuración de un plan
 * @param {string} planName - Nombre del plan ('premium', 'vip')
 * @returns {Object|null} - Configuración del plan
 */
export function getPlanConfig(planName) {
  return PLANS_CONFIG[planName] || null;
}

/**
 * Obtener todos los planes disponibles
 * @returns {Array} - Array de configuraciones de planes
 */
export function getAvailablePlans() {
  return Object.entries(PLANS_CONFIG).map(([key, config]) => ({
    id: key,
    ...config
  }));
}

/**
 * Iniciar Stripe Checkout para un plan
 * @param {string} planName - Nombre del plan ('premium', 'vip')
 * @param {string} email - Email del usuario
 * @param {string} successUrl - URL de retorno en caso de éxito
 * @param {string} cancelUrl - URL de retorno en caso de cancelación
 */
export async function startStripeCheckout(planName, email, successUrl = null, cancelUrl = null) {
  try {
    console.log(`💳 Iniciando Stripe Checkout para: ${planName}`);
    
    const plan = PLANS_CONFIG[planName];
    if (!plan) {
      console.error(`❌ Plan no encontrado: ${planName}`);
      return false;
    }

    // Llamar al backend para crear sesión de Stripe
    const response = await fetch('/api/stripe/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: planName,
        email: email,
        successUrl: successUrl || `${window.location.origin}/#home?payment=success`,
        cancelUrl: cancelUrl || `${window.location.origin}/#home?payment=cancelled`
      })
    });

    if (!response.ok) {
      console.error(`❌ Error creando sesión de Stripe`);
      return false;
    }

    const data = await response.json();
    
    // Redirigir a Stripe Checkout
    if (data.sessionId) {
      const stripe = await getStripe();
      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      
      if (result.error) {
        console.error('❌ Error en Stripe:', result.error.message);
        return false;
      }
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error en Stripe Checkout:', error);
    return false;
  }
}

/**
 * Procesar confirmación de pago (ejecutarse en página de retorno)
 * @param {string} sessionId - ID de sesión de Stripe
 * @param {string} email - Email del usuario
 * @returns {Promise<boolean>} - true si el pago se procesó correctamente
 */
export async function processPaymentConfirmation(sessionId, email) {
  try {
    console.log(`✅ Procesando confirmación de pago...`);
    
    // Verificar sesión de Stripe
    const response = await fetch('/api/stripe/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, email })
    });

    if (!response.ok) {
      console.error(`❌ Error verificando sesión de pago`);
      return false;
    }

    const data = await response.json();
    
    if (data.success && data.plan) {
      // Actualizar plan del usuario
      savePlan(data.plan);
      await updateUserPlanInSupabase(email, data.plan);
      
      console.log(`✅ Plan actualizado a: ${data.plan}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error procesando pago:', error);
    return false;
  }
}

/**
 * Obtener URL de portal de facturación del cliente en Stripe
 * @param {string} email - Email del usuario
 * @returns {Promise<string|null>} - URL del portal o null
 */
export async function getStripeCustomerPortalUrl(email) {
  try {
    const response = await fetch('/api/stripe/customer-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      console.error(`❌ Error obteniendo portal de cliente`);
      return null;
    }

    const data = await response.json();
    return data.portalUrl || null;
  } catch (error) {
    console.error('❌ Error obteniendo portal:', error);
    return null;
  }
}

/**
 * Cancelar suscripción del usuario
 * @param {string} email - Email del usuario
 * @returns {Promise<boolean>} - true si se canceló correctamente
 */
export async function cancelSubscription(email) {
  try {
    console.log(`🚫 Cancelando suscripción de: ${email}`);
    
    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      console.error(`❌ Error cancelando suscripción`);
      return false;
    }

    // Actualizar plan a free
    savePlan('free');
    
    console.log(`✅ Suscripción cancelada`);
    return true;
  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    return false;
  }
}

/**
 * Renderizar modal de selección de plan
 * @param {Function} onSelectPlan - Callback cuando se selecciona un plan
 */
export function renderPlanSelectionModal(onSelectPlan) {
  const modal = document.createElement('div');
  modal.className = 'plan-selection-modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content plans-modal">
      <button class="modal-close-btn">✕</button>
      <h2>Elige tu plan</h2>
      <div class="plans-grid">
        ${getAvailablePlans().map(plan => `
          <div class="plan-card">
            <h3>${plan.name}</h3>
            <p class="plan-price">
              <span class="amount">${plan.price.toFixed(2)}</span>
              <span class="currency">${plan.currency.toUpperCase()}</span>
              <span class="interval">/${plan.interval}</span>
            </p>
            <p class="plan-description">${plan.description}</p>
            <ul class="plan-features">
              ${plan.features.map(feature => `
                <li>✓ ${feature}</li>
              `).join('')}
            </ul>
            <button class="btn-select-plan" data-plan="${plan.id}">
              Seleccionar
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  const closeBtn = modal.querySelector('.modal-close-btn');
  const overlay = modal.querySelector('.modal-overlay');
  const selectBtns = modal.querySelectorAll('.btn-select-plan');

  closeBtn.addEventListener('click', () => modal.remove());
  overlay.addEventListener('click', () => modal.remove());

  selectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const planId = btn.dataset.plan;
      onSelectPlan(planId);
      modal.remove();
    });
  });

  return modal;
}
