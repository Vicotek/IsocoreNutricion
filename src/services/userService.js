import { getProfile } from '../../api/profile.js';

export async function loadUserProfile() {
  return getProfile();
}
