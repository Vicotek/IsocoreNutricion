export async function fetchSupplements() {
  try {
    const response = await fetch('/api/supplements');
    if (!response.ok) {
      throw new Error('Error al cargar suplementos');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('fetchSupplements fallback:', error.message);
    const module = await import('./supplements.js');
    return module.supplements;
  }
}
