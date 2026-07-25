/**
 * Icon Library — sistema de iconos lineales compartido
 * Trazo 2px, un solo color (currentColor), mismo lenguaje visual en todo el sitio.
 * Sustituye a los emoji usados como icono/decoración (Master Prompt V1.0).
 */

const PATHS = {
  brain: '<path d="M9.5 2a3.5 3.5 0 0 1 5 0" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 5a3.5 3.5 0 0 0 0 5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 5a3.5 3.5 0 0 1 0 5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9.5a3.5 3.5 0 0 0 0 5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 9.5a3.5 3.5 0 0 1 0 5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 19a3.5 3.5 0 0 1 0-5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 19a3.5 3.5 0 0 0 0-5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 22a3.5 3.5 0 0 0 5 0" stroke-linecap="round" stroke-linejoin="round"/>',
  clipboard: '<path d="M16 4h-2.5A1.5 1.5 0 0 0 12 2.5a1.5 1.5 0 0 0-1.5 1.5H8c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
  leaf: '<path d="M5 21c9 0 13-6 14-14C11 8 5 12 5 21z" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 21c0-4 2-8 6-11" stroke-linecap="round" stroke-linejoin="round"/>',
  droplet: '<path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z" stroke-linecap="round" stroke-linejoin="round"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5A2.5 2.5 0 0 0 17.5 21H6.5A2.5 2.5 0 0 1 4 18.5v-13z" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 18.5H6.5A2.5 2.5 0 0 0 4 21" stroke-linecap="round" stroke-linejoin="round"/>',
  flask: '<path d="M9 3h6" stroke-linecap="round"/><path d="M10 3v6.5L4.8 18.4A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.6L14 9.5V3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 15h8" stroke-linecap="round"/>',
  shield: '<path d="M12 2l8 3.5V11c0 5-3.5 8.5-8 9.5C7.5 19.5 4 16 4 11V5.5L12 2z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 11.5l2 2 4-4.5" stroke-linecap="round" stroke-linejoin="round"/>',
  star: '<path d="M12 3l2.6 5.7 6.2.6-4.6 4.3 1.3 6.1L12 16.9l-5.5 2.8 1.3-6.1L3.2 9.3l6.2-.6L12 3z" stroke-linecap="round" stroke-linejoin="round"/>',
  crown: '<path d="M4 8l4 3 4-6 4 6 4-3-1.5 10h-13L4 8z" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 21h12" stroke-linecap="round"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/>',
  close: '<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" stroke-linejoin="round"/>',
  check: '<path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/>',
  chevronDown: '<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>',
  logout: '<path d="M15 17l5-5-5-5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12H9" stroke-linecap="round"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke-linecap="round" stroke-linejoin="round"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke-linecap="round"/>',
  robot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4" stroke-linecap="round"/><circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none"/><path d="M9 17.5h6" stroke-linecap="round"/>',
  heart: '<path d="M12 20s-7-4.4-9.5-9C1 7.8 2.8 4.5 6.2 4.5c2 0 3.6 1.2 5.8 3.5 2.2-2.3 3.8-3.5 5.8-3.5 3.4 0 5.2 3.3 3.7 6.5-2.5 4.6-9.5 9-9.5 9z" stroke-linecap="round" stroke-linejoin="round"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round" stroke-linejoin="round"/>',
  chart: '<path d="M4 20V10M11 20V4M18 20v-7" stroke-linecap="round"/><path d="M2 20h20" stroke-linecap="round"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20" stroke-linecap="round"/>',
  pill: '<rect x="4.5" y="9.5" width="15" height="9" rx="4.5" transform="rotate(-40 12 14)"/><path d="M9 15.5l4.5-5.5" stroke-linecap="round"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" stroke-linecap="round"/>',
  bag: '<path d="M6 8h12l-1 12H7L6 8z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke-linecap="round"/>',
  pin: '<path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.5"/>',
  wave: '<path d="M4 15c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" stroke-linecap="round" stroke-linejoin="round"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5z" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19.5a2 2 0 0 0 4 0" stroke-linecap="round"/>',
  door: '<path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21h18" stroke-linecap="round"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  save: '<path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 4v6h8V4" stroke-linecap="round"/><path d="M8 14h8v6H8z" stroke-linecap="round"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
  send: '<path d="M4 20l17-8L4 4l3 8-3 8z" stroke-linecap="round" stroke-linejoin="round"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5" stroke-linecap="round"/>',
  warning: '<path d="M12 3l10 18H2L12 3z" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5" stroke-linecap="round"/>',
  scale: '<path d="M12 3v18M7 7l-4 8a4 4 0 0 0 8 0l-4-8zM17 7l-4 8a4 4 0 0 0 8 0l-4-8z" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 21h14M7 7h10" stroke-linecap="round"/>',
  muscle: '<path d="M4 14c0-4 2-8 6-9 1 2-1 3-1 5 3-1 5-3 6-6 3 1 5 4 5 8 0 5-4 9-9 9-4 0-7-3-7-7z" stroke-linecap="round" stroke-linejoin="round"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke-linecap="round"/><path d="M16 4.5a3 3 0 0 1 0 5.9" stroke-linecap="round"/><path d="M21 19.5c0-2.6-2-4.8-4.5-5.4" stroke-linecap="round"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17v.5" stroke-linecap="round"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16v4z" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 6l4 4" stroke-linecap="round"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke-linecap="round" stroke-linejoin="round"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" stroke-linecap="round" stroke-linejoin="round"/>',
  trendDown: '<path d="M4 7l7 7 4-4 5 5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 9v6h-6" stroke-linecap="round" stroke-linejoin="round"/>',
  flash: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" stroke-linecap="round" stroke-linejoin="round"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19h16" stroke-linecap="round"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" stroke-linecap="round"/>',
  storefront: '<path d="M4 10v9h16v-9" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 6l1.5-3h15L21 6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 6a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" stroke-linecap="round" stroke-linejoin="round"/>'
};

/**
 * Devuelve el SVG de un icono lineal (2px, currentColor).
 * @param {string} name - Nombre del icono (ver PATHS)
 * @param {number} size - Tamaño en px (ancho = alto)
 */
export function getIcon(name, size = 20) {
  const path = PATHS[name] || PATHS.circle;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="currentColor" stroke-width="2" fill="none">${path}</g></svg>`;
}

export const ICON_NAMES = Object.keys(PATHS);
