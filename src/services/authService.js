const tokenKey = 'isocore_auth_token';
const legacyTokenKey = 'icf_token';

function isLikelyEmail(value) {
  return typeof value === 'string' && value.includes('@') && value.includes('.');
}

export function getAuthToken() {
  const currentToken = localStorage.getItem(tokenKey);
  if (currentToken) {
    const normalized = currentToken.trim();
    if (isLikelyEmail(normalized)) {
      console.warn('⚠️ Token de sesión inválido detectado (parece email). Se limpia la sesión para evitar llamadas RPC con email como UUID.');
      clearAuthToken();
      return null;
    }
    return normalized;
  }

  const legacyToken = localStorage.getItem(legacyTokenKey);
  if (legacyToken) {
    const normalized = legacyToken.trim();
    if (isLikelyEmail(normalized)) {
      console.warn('⚠️ Token legacy inválido detectado (parece email). Se limpia la sesión para evitar llamadas RPC con email como UUID.');
      clearAuthToken();
      return null;
    }
    localStorage.setItem(tokenKey, normalized);
    return normalized;
  }

  return null;
}

export function setAuthToken(token) {
  if (!token || typeof token !== 'string') return;

  const normalizedToken = token.trim();
  if (!normalizedToken || isLikelyEmail(normalizedToken)) {
    console.warn('⚠️ Se intentó guardar un valor de sesión inválido. Se descarta para no enviar email como UUID a la RPC.');
    clearAuthToken();
    return;
  }

  localStorage.setItem(tokenKey, normalizedToken);
  localStorage.setItem(legacyTokenKey, normalizedToken);
}

export function clearAuthToken() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(legacyTokenKey);
}
