/**
 * IBIG SECRETIS — a11y.js
 * Alias et extensions de accessibility.js.
 * Exporte toutes les fonctions de accessibility.js + les utilitaires supplémentaires.
 *
 * Importez depuis ce fichier pour avoir l'ensemble complet :
 *   import { announceToScreenReader, isHighContrast } from '@/utils/a11y'
 */

export {
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
} from './accessibility'

// ─── Détection mode contraste élevé ──────────────────────────────────────────
/**
 * Détecte si l'utilisateur a activé le mode contraste élevé.
 * @returns {boolean}
 */
export function isHighContrast() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(prefers-contrast: high)').matches ||
    window.matchMedia('(prefers-contrast: more)').matches ||
    // Détection Windows High Contrast (legacy)
    window.matchMedia('(-ms-high-contrast: active)').matches
  )
}

// ─── Focus au montage ─────────────────────────────────────────────────────────
/**
 * Focus le premier élément focusable dans ref après montage du composant.
 * @param {React.RefObject<HTMLElement>} ref
 * @param {string} [selector] — sélecteur CSS personnalisé
 */
export function focusAfterMount(ref, selector = null) {
  const FOCUSABLE = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  requestAnimationFrame(() => {
    if (!ref?.current) return
    const target = selector
      ? ref.current.querySelector(selector)
      : ref.current.querySelector(FOCUSABLE)
    target?.focus()
  })
}

// ─── Ré-export du default ─────────────────────────────────────────────────────
export { default } from './accessibility'
