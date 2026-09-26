import { getSupplementsCatalogFromSupabase } from './supabaseClient.js';

/**
 * Carga el catálogo de suplementos para la UI (components/supplements.js).
 * Fuente real: public.catalogo_suplementos en Supabase (incluye Zinzino).
 * Si Supabase no responde, cae al listado local de ejemplo para que la
 * pantalla nunca quede vacía.
 */
export async function loadSupplements() {
  const rows = await getSupplementsCatalogFromSupabase();
  if (rows && rows.length > 0) {
    return rows;
  }

  console.warn('⚠️ SupplementService: sin datos de Supabase, usando catálogo local de ejemplo');
  const module = await import('../data/supplements.js');
  return module.supplements;
}
