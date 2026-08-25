const tokenKey = 'isocore_auth_token';
const legacyTokenKey = 'icf_token';

export function getAuthToken() {
  const currentToken = localStorage.getItem(tokenKey);
  if (currentToken) return currentToken;

  const legacyToken = localStorage.getItem(legacyTokenKey);
  if (legacyToken) {
    localStorage.setItem(tokenKey, legacyToken);
    return legacyToken;
  }

  return null;
}

export function setAuthToken(token) {
  if (!token) return;

  localStorage.setItem(tokenKey, token);
  localStorage.setItem(legacyTokenKey, token);
}

export function clearAuthToken() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(legacyTokenKey);
}
