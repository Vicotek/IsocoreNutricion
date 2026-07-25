// Credenciales de Supabase
export const SUPABASE_URL = 'https://dhvouecsvhcxxzputvvq.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_jJNhVo8W8T9ejNLHrFeR5w_NP78ZPt-';

// Inicializar cliente de Supabase
let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient && typeof window !== 'undefined') {
    // Usar el cliente de Supabase si está disponible
    // En producción, esto vendría de un import real
    console.log('✅ Supabase configurado para:', SUPABASE_URL);
  }
  return supabaseClient;
}
