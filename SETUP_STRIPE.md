// ═══════════════════════════════════════════════════════════════════════════
// CÓMO CONFIGURAR STRIPE EN ISOCORENUTRICION
// ═══════════════════════════════════════════════════════════════════════════

/*
PASO 1: Obtener la clave pública de Stripe
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Ve a https://dashboard.stripe.com/apikeys
2. Bajo "Standard keys", copia la "Publishable key"
   - Si es producción: empieza con pk_live_
   - Si es testing: empieza con pk_test_

PASO 2: Reemplazar en config.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Abre src/config.js y busca:
  
  STRIPE_PUBLIC_KEY: 'pk_test_',
  
Y reemplázalo con tu clave real. Ejemplo:

  STRIPE_PUBLIC_KEY: 'pk_test_51HbjXABCDEFG1234567890',

PASO 3: Verificar que funciona
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Abre el navegador (F12 → Console)
2. Ejecuta: console.log(window.APP_CONFIG.STRIPE_PUBLIC_KEY)
3. Deberías ver tu clave pública

PASO 4: Verificar stripeService.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
En la consola, ejecuta:
  
  import * as StripeService from './src/services/stripeService.js'
  StripeService.getAvailablePlans()
  
Deberías ver los planes sin errores.

═══════════════════════════════════════════════════════════════════════════════
ESTRUCTURA ACTUAL:

config.js (SIN DEPENDENCIAS VITE)
    └─ window.APP_CONFIG = { STRIPE_PUBLIC_KEY, BACKEND_BASE_URL, ... }
         └─ Cargada en index.html como <script> normal (NO module)
              └─ stripeService.js lee desde window.APP_CONFIG
                   └─ import { loadStripe } from 'https://js.stripe.com/v3/'

═══════════════════════════════════════════════════════════════════════════════
*/
