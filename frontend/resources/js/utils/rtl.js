/**
 * IBIG SECRETIS — utils/rtl.js
 * Utilitaires pour le support RTL (Right-to-Left)
 *
 * Gère l'inversion des classes Tailwind CSS et les helpers RTL
 * pour les langues arabophones (Arabe).
 *
 * Usage :
 *   import { useRTL, rtlFlip, flipClass } from '@/utils/rtl';
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Détection de la direction ────────────────────────────────────────────────

/**
 * Vérifie si le document est en mode RTL
 * @returns {boolean}
 */
export const isRTL = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dir === 'rtl';
};

/**
 * Vérifie si la direction donnée est RTL
 * @param {string} dir
 * @returns {boolean}
 */
export const dirIsRTL = (dir) => dir === 'rtl';

// ─── Mapping d'inversion des classes Tailwind ─────────────────────────────────

/**
 * Table de correspondance pour l'inversion LTR ↔ RTL
 * Utilisée par flipClass() pour inverser les marges/paddings/positions
 */
export const rtlFlipMap = {
  // Marges
  'ml-':      'mr-',
  'mr-':      'ml-',
  '-ml-':     '-mr-',
  '-mr-':     '-ml-',
  // Paddings
  'pl-':      'pr-',
  'pr-':      'pl-',
  // Positions absolues
  'left-':    'right-',
  'right-':   'left-',
  '-left-':   '-right-',
  '-right-':  '-left-',
  // Alignement texte
  'text-left':    'text-right',
  'text-right':   'text-left',
  // Arrondis
  'rounded-l':    'rounded-r',
  'rounded-r':    'rounded-l',
  'rounded-tl':   'rounded-tr',
  'rounded-tr':   'rounded-tl',
  'rounded-bl':   'rounded-br',
  'rounded-br':   'rounded-bl',
  // Bordures
  'border-l':     'border-r',
  'border-r':     'border-l',
  // Flex
  'flex-row':         'flex-row-reverse',
  'flex-row-reverse': 'flex-row',
  // Espacement entre items (space-x ne s'inverse pas nativement)
  'space-x-':     'space-x-reverse-',
  // Translate
  'translate-x-':     'translate-x-',
  '-translate-x-':    'translate-x-',
  // Scroll
  'scroll-ml-':   'scroll-mr-',
  'scroll-mr-':   'scroll-ml-',
  'scroll-pl-':   'scroll-pr-',
  'scroll-pr-':   'scroll-pl-',
};

/**
 * Inverse une classe Tailwind pour le mode RTL
 * @param {string} cls — classe Tailwind (ex: "ml-4")
 * @returns {string} — classe inversée (ex: "mr-4")
 */
export function flipClass(cls) {
  for (const [ltr, rtl] of Object.entries(rtlFlipMap)) {
    if (cls === ltr) return rtl;
    if (cls.startsWith(ltr)) return rtl + cls.slice(ltr.length);
  }
  return cls;
}

/**
 * Inverse toutes les classes concernées dans une chaîne
 * @param {string} classStr — chaîne de classes (ex: "ml-4 pl-2 text-left")
 * @returns {string} — chaîne inversée
 */
export function flipClasses(classStr) {
  if (!classStr) return classStr;
  return classStr
    .split(/\s+/)
    .map(cls => flipClass(cls))
    .join(' ');
}

// ─── Hook React ───────────────────────────────────────────────────────────────

/**
 * Hook retournant l'état RTL courant et les helpers associés
 *
 * @returns {{
 *   isRtl: boolean,
 *   dir: 'ltr' | 'rtl',
 *   rtlClass: (ltrClass: string, rtlClass: string) => string,
 *   flip: (cls: string) => string,
 *   flipAll: (classStr: string) => string,
 *   start: string,   // 'left'  en LTR, 'right' en RTL
 *   end: string,     // 'right' en LTR, 'left'  en RTL
 *   marginStart: (n: string) => string,  // ex: "ml-4" ou "mr-4"
 *   marginEnd: (n: string) => string,
 *   paddingStart: (n: string) => string,
 *   paddingEnd: (n: string) => string,
 * }}
 */
export function useRTL() {
  const [isRtl, setIsRtl] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.dir === 'rtl';
  });

  useEffect(() => {
    // Observer les changements de l'attribut "dir" sur <html>
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'dir') {
          setIsRtl(document.documentElement.dir === 'rtl');
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });

    // Écouter l'événement personnalisé du LanguageSwitcher
    const handler = (e) => setIsRtl(e.detail?.dir === 'rtl');
    window.addEventListener('localeChanged', handler);

    return () => {
      observer.disconnect();
      window.removeEventListener('localeChanged', handler);
    };
  }, []);

  /**
   * Retourne la classe appropriée selon la direction
   * @param {string} ltrClass — classe en mode LTR
   * @param {string} rtlClass — classe en mode RTL
   * @returns {string}
   */
  const rtlClass = useCallback(
    (ltrClass, rtlClassStr) => isRtl ? rtlClassStr : ltrClass,
    [isRtl]
  );

  return {
    isRtl,
    dir:          isRtl ? 'rtl' : 'ltr',
    rtlClass,
    flip:         flipClass,
    flipAll:      flipClasses,
    start:        isRtl ? 'right' : 'left',
    end:          isRtl ? 'left'  : 'right',
    marginStart:  (n) => isRtl ? `mr-${n}` : `ml-${n}`,
    marginEnd:    (n) => isRtl ? `ml-${n}` : `mr-${n}`,
    paddingStart: (n) => isRtl ? `pr-${n}` : `pl-${n}`,
    paddingEnd:   (n) => isRtl ? `pl-${n}` : `pr-${n}`,
  };
}

// ─── Helpers statiques ────────────────────────────────────────────────────────

/**
 * Retourne "ms-{n}" (margin-start) — classe Tailwind logique si disponible
 * Sinon retourne la classe physique selon la direction courante
 * @param {string} n — valeur Tailwind (ex: "4", "auto")
 * @returns {string}
 */
export const ms = (n) => isRTL() ? `mr-${n}` : `ml-${n}`;

/**
 * Retourne "me-{n}" (margin-end) selon la direction courante
 */
export const me = (n) => isRTL() ? `ml-${n}` : `mr-${n}`;

/**
 * Retourne "ps-{n}" (padding-start) selon la direction courante
 */
export const ps = (n) => isRTL() ? `pr-${n}` : `pl-${n}`;

/**
 * Retourne "pe-{n}" (padding-end) selon la direction courante
 */
export const pe = (n) => isRTL() ? `pl-${n}` : `pr-${n}`;

/**
 * Retourne "start-{n}" (inset-inline-start) selon la direction courante
 */
export const insetStart = (n) => isRTL() ? `right-${n}` : `left-${n}`;

/**
 * Retourne "end-{n}" (inset-inline-end) selon la direction courante
 */
export const insetEnd = (n) => isRTL() ? `left-${n}` : `right-${n}`;

/**
 * Retourne "text-start" ou "text-end" selon la direction
 */
export const textStart = () => isRTL() ? 'text-right' : 'text-left';
export const textEnd   = () => isRTL() ? 'text-left'  : 'text-right';

/**
 * Applique les attributs RTL sur un élément HTML
 * Utile pour les iframes, canvases ou éléments dynamiques
 * @param {HTMLElement} el
 * @param {string} locale — code de langue
 */
export function applyRTLAttributes(el, locale) {
  if (!el) return;
  const rtlLocales = ['ar', 'ar-MA', 'ar-TN', 'he', 'fa', 'ur'];
  const isRtlLocale = rtlLocales.some(l => locale.startsWith(l));
  el.setAttribute('dir',  isRtlLocale ? 'rtl' : 'ltr');
  el.setAttribute('lang', locale);
}

// ─── Classe conditionnelle RTL-aware ─────────────────────────────────────────

/**
 * Équivalent de clsx() mais avec inversion automatique en mode RTL
 * @param {...(string|false|null|undefined)} classes
 * @returns {string}
 */
export function rtlCx(...classes) {
  const rtl = isRTL();
  return classes
    .filter(Boolean)
    .map(cls => rtl ? flipClasses(cls) : cls)
    .join(' ');
}

// ─── Tailwind CSS custom properties pour RTL ─────────────────────────────────
/**
 * Injecte les variables CSS pour le support RTL dans les styles inline
 * Utiliser avec style={{ ...rtlVars() }} sur le conteneur racine
 * @returns {React.CSSProperties}
 */
export function rtlVars() {
  const rtl = isRTL();
  return {
    '--direction':      rtl ? 'rtl' : 'ltr',
    '--text-align':     rtl ? 'right' : 'left',
    '--text-align-end': rtl ? 'left' : 'right',
    '--float-start':    rtl ? 'right' : 'left',
    '--float-end':      rtl ? 'left' : 'right',
    '--border-start':   rtl ? 'border-right' : 'border-left',
    '--border-end':     rtl ? 'border-left' : 'border-right',
  };
}
