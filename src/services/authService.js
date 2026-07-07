const tokenKey = 'isocore_auth_token';

export function getAuthToken() {
  return localStorage.getItem(tokenKey);
}

export function setAuthToken(token) {
  localStorage.setItem(tokenKey, token);
}

export function clearAuthToken() {
  localStorage.removeItem(tokenKey);
}
