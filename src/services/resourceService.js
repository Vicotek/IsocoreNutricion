import { getResources } from '../../api/resources.js';

export async function loadResources() {
  return getResources();
}
