/**
 * Language Service
 * Gestión de idiomas compartida
 */

const LANGUAGE_KEY = 'isocore_home_language';
const supportedLanguages = ['es', 'en', 'ca'];

const languageCodes = {
  es: 'ES',
  en: 'EN',
  ca: 'CA'
};

/**
 * Obtener idioma actual
 * @returns {string} - Código de idioma ('es', 'en', 'ca')
 */
export function getCurrentLanguage() {
  let lang = localStorage.getItem(LANGUAGE_KEY) || 'es';
  if (!supportedLanguages.includes(lang)) {
    lang = 'es';
  }
  return lang;
}

/**
 * Establecer idioma
 * @param {string} lang - Código de idioma
 */
export function setCurrentLanguage(lang) {
  if (supportedLanguages.includes(lang)) {
    localStorage.setItem(LANGUAGE_KEY, lang);
  }
}

/**
 * Obtener códigos de idiomas
 */
export function getLanguageCodes() {
  return languageCodes;
}

/**
 * Obtener idiomas soportados
 */
export function getSupportedLanguages() {
  return supportedLanguages;
}

/**
 * Ciclar al siguiente idioma
 * @returns {string} - Nuevo idioma
 */
export function toggleLanguage() {
  const current = getCurrentLanguage();
  const idx = supportedLanguages.indexOf(current);
  const next = supportedLanguages[(idx + 1) % supportedLanguages.length];
  setCurrentLanguage(next);
  return next;
}
