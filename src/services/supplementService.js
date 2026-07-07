import { fetchSupplements } from './apiService.js';

export async function loadSupplements() {
  return fetchSupplements();
}
