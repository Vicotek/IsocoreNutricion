import { apiRequest } from '../lib/apiClient.js';
import { getSupplements } from '../data/supplements.js';

export const apiBase = '/api';

export async function fetchSupplements() {
  try {
    return await apiRequest(`${apiBase}/supplements`);
  } catch (error) {
    console.warn('API fallback: cargando suplementos locales', error.message);
    return getSupplements();
  }
}

export function fetchRecipes() {
  return apiRequest(`${apiBase}/recipes`);
}

export function fetchResources() {
  return apiRequest(`${apiBase}/resources`);
}

export function fetchPlan() {
  return apiRequest(`${apiBase}/plan`);
}

export function fetchProfile() {
  return apiRequest(`${apiBase}/profile`);
}
