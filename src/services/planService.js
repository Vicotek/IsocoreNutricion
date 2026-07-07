import { getPlan } from '../../api/plan.js';

export async function loadPlan() {
  return getPlan();
}
