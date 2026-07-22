/**
 * IBIG SECRETIS — accessibility.js
 * Utilitaires d'accessibilité WCAG 2.1 AA
 */

// ─── Compteur global d'IDs uniques ────────────────────────────────────────────
let _idCounter = 0;

/**
 * Génère un ID ARIA unique.
 * @param {string} prefix
 * @returns {string}
 */
export function generateId(prefix = 'secretis') {
  return `${prefix}-${++_idCounter}`;
}

// ─── Focus Trap ───────────────────────────────────────────────────────────────
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'details > summary',
].join(', ');

/**
 * Piège le focus à l'intérieur d'un élément (Tab cyclique).
 * @param {HTMLElement} element — conteneur (modal, drawer, etc.)
 * @returns {Function} — fonction de nettoyage (removeEventListener)
 */
export function trapFocus(element) {
  if (!element) return () => {};

  const getFocusables = () =>
    Array.from(element.querySelectorAll(FOCUSABLE_SELECTORS))
      .filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none');

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;

    const focusables = getFocusables();
    if (focusables.length === 0) { e.preventDefault(); return; }

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !element.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !element.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  element.addEventListener('keydown', handleKeyDown);

  // Focus le premier élément focusable
  const focusables = getFocusables();
  if (focusables.length > 0) {
    requestAnimationFrame(() => focusables[0].focus());
  }

  return () => element.removeEventListener('keydown', handleKeyDown);
}

/**
 * Restaure le focus sur un élément précédent après fermeture de modal.
 * @param {HTMLElement|null} previousElement
 */
export function restoreFocus(previousElement) {
  if (previousElement && typeof previousElement.focus === 'function') {
    requestAnimationFrame(() => previousElement.focus());
  }
}

// ─── ARIA Live Regions ─────────────────────────────────────────────────────────
let _liveRegion = null;

function getLiveRegion(priority = 'polite') {
  const id = `secretis-live-${priority}`;
  let region = document.getElementById(id);

  if (!region) {
    region = document.createElement('div');
    region.id          = id;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('aria-relevant', 'additions text');
    region.className = 'sr-only';
    Object.assign(region.style, {
      position: 'absolute',
      width:    '1px',
      height:   '1px',
      padding:  '0',
      margin:   '-1px',
      overflow: 'hidden',
      clip:     'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      borderWidth: '0',
    });
    document.body.appendChild(region);
  }

  return region;
}

/**
 * Annonce un message aux lecteurs d'écran via ARIA live region.
 * @param {string} message    — texte à annoncer
 * @param {'polite'|'assertive'} priority — polite (default) ou assertive (urgent)
 */
export function announceToScreenReader(message, priority = 'polite') {
  const region = getLiveRegion(priority);

  // Vider d'abord pour forcer une nouvelle annonce si même texte
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
    // Nettoyer après 5s
    setTimeout(() => { region.textContent = ''; }, 5000);
  });
}

// ─── Détection prefers-reduced-motion ─────────────────────────────────────────
/**
 * Détecte si l'utilisateur a activé "Réduire le mouvement".
 * @returns {boolean}
 */
export function isReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── Calcul de contraste WCAG ─────────────────────────────────────────────────
/**
 * Convertit un hex en valeur linéaire (pour calcul luminance).
 */
function hexToLinear(hex) {
  const c = parseInt(hex, 16) / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Calcule la luminance relative d'une couleur hex.
 * @param {string} hex — ex: "#FFFFFF" ou "FFFFFF"
 * @returns {number} luminance [0, 1]
 */
function getLuminance(hex) {
  const clean = hex.replace('#', '');
  const r = hexToLinear(clean.slice(0, 2));
  const g = hexToLinear(clean.slice(2, 4));
  const b = hexToLinear(clean.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calcule le ratio de contraste WCAG entre deux couleurs.
 * @param {string} hex1 — couleur 1 (ex: "#1A3A5C")
 * @param {string} hex2 — couleur 2 (ex: "#FFFFFF")
 * @returns {number} ratio (1:1 à 21:1)
 */
export function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Vérifie si deux couleurs satisfont le niveau WCAG AA.
 * AA : 4.5:1 pour le texte normal, 3:1 pour le grand texte
 * @param {string} hex1
 * @param {string} hex2
 * @param {'normal'|'large'|'ui'} textSize
 * @returns {boolean}
 */
export function meetsWcagAA(hex1, hex2, textSize = 'normal') {
  const ratio = getContrastRatio(hex1, hex2);
  const threshold = textSize === 'large' || textSize === 'ui' ? 3.0 : 4.5;
  return ratio >= threshold;
}

/**
 * Vérifie WCAG AAA (7:1 pour texte normal, 4.5:1 pour grand texte).
 * @param {string} hex1
 * @param {string} hex2
 * @param {'normal'|'large'} textSize
 * @returns {boolean}
 */
export function meetsWcagAAA(hex1, hex2, textSize = 'normal') {
  const ratio = getContrastRatio(hex1, hex2);
  const threshold = textSize === 'large' ? 4.5 : 7.0;
  return ratio >= threshold;
}

// ─── Navigation clavier dans les listes ──────────────────────────────────────
/**
 * Gère la navigation clavier dans un groupe d'éléments (liste, menu).
 * @param {KeyboardEvent} e
 * @param {HTMLElement[]} items
 * @param {number} currentIndex
 * @param {Function} onSelect — appelé avec le nouvel index
 * @param {Object} options
 * @param {boolean} options.wrap — cyclique (défaut: true)
 * @param {boolean} options.horizontal — flèches gauche/droite (défaut: false)
 */
export function handleListKeyboard(e, items, currentIndex, onSelect, options = {}) {
  const { wrap = true, horizontal = false } = options;
  const count = items.length;
  if (count === 0) return;

  const prevKey = horizontal ? 'ArrowLeft'  : 'ArrowUp';
  const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';

  let newIndex = currentIndex;

  switch (e.key) {
    case prevKey:
      e.preventDefault();
      newIndex = currentIndex <= 0
        ? (wrap ? count - 1 : 0)
        : currentIndex - 1;
      break;

    case nextKey:
      e.preventDefault();
      newIndex = currentIndex >= count - 1
        ? (wrap ? 0 : count - 1)
        : currentIndex + 1;
      break;

    case 'Home':
      e.preventDefault();
      newIndex = 0;
      break;

    case 'End':
      e.preventDefault();
      newIndex = count - 1;
      break;

    default:
      return;
  }

  onSelect(newIndex);
  items[newIndex]?.focus();
}

// ─── Attributs ARIA courants ──────────────────────────────────────────────────
/**
 * Génère les attributs ARIA pour un champ de formulaire.
 */
export function getFieldAriaProps({ id, label, description, error, required }) {
  const describedBy = [
    description ? `${id}-description` : null,
    error       ? `${id}-error`       : null,
  ].filter(Boolean).join(' ');

  return {
    id,
    'aria-label':       label,
    'aria-describedby': describedBy || undefined,
    'aria-required':    required ? 'true' : undefined,
    'aria-invalid':     error ? 'true' : undefined,
  };
}

export default {
  generateId,
  trapFocus,
  restoreFocus,
  announceToScreenReader,
  isReducedMotion,
  getContrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  handleListKeyboard,
  getFieldAriaProps,
};
