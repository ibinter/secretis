/**
 * SECRETIS ERP — useDirection.js
 * Hook de détection de direction textuelle (RTL / LTR)
 *
 * Détecte la direction à partir de la locale active,
 * applique `dir` et `lang` sur <html>, et retourne
 * des informations utiles pour les composants.
 *
 * Usage :
 *   const { dir, isRTL, locale } = useDirection();
 *
 *   // Dans le JSX :
 *   <div dir={dir} className={isRTL ? 'font-arabic' : ''}>…</div>
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Locales RTL ──────────────────────────────────────────────────────────────
const RTL_LOCALES = new Set([
  'ar',
  'ar-MA',
  'ar-TN',
  'ar-DZ',
  'ar-EG',
  'ar-SA',
  'ar-AE',
  'fa',   // Persan
  'he',   // Hébreu
  'ur',   // Ourdou
]);

// ─── Langues qui utilisent la police arabe ─────────────────────────────────
const ARABIC_FONT_LOCALES = new Set([
  'ar', 'ar-MA', 'ar-TN', 'ar-DZ', 'ar-EG', 'ar-SA', 'ar-AE',
]);

/**
 * Détermine si une locale est RTL.
 * @param {string} locale - ex: 'ar', 'ar-MA', 'fr', 'en'
 * @returns {boolean}
 */
export function isRTLLocale(locale) {
  if (!locale) return false;
  // Test exact
  if (RTL_LOCALES.has(locale)) return true;
  // Test du préfixe langue (ex: 'ar-XX' → 'ar')
  const prefix = locale.split('-')[0].toLowerCase();
  return RTL_LOCALES.has(prefix);
}

/**
 * Retourne 'rtl' ou 'ltr' pour une locale donnée.
 * @param {string} locale
 * @returns {'rtl'|'ltr'}
 */
export function getDirection(locale) {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Retourne true si la locale utilise la police arabe.
 * @param {string} locale
 * @returns {boolean}
 */
export function usesArabicFont(locale) {
  if (!locale) return false;
  if (ARABIC_FONT_LOCALES.has(locale)) return true;
  const prefix = locale.split('-')[0].toLowerCase();
  return prefix === 'ar';
}

// ─── Hook principal ───────────────────────────────────────────────────────────
/**
 * useDirection(locale)
 *
 * @param {string} [locale] - Locale courante. Si omis, lit depuis localStorage
 *                            ou document.documentElement.lang.
 * @returns {{
 *   dir: 'rtl'|'ltr',
 *   isRTL: boolean,
 *   locale: string,
 *   fontClass: string,
 *   applyToDocument: (locale: string) => void
 * }}
 */
export function useDirection(locale) {
  // Détecter la locale initiale si non fournie
  const detectLocale = useCallback(() => {
    if (locale) return locale;
    try {
      const stored = localStorage.getItem('secretis_locale');
      if (stored) return stored;
    } catch { /* SSR / accès bloqué */ }
    return document.documentElement.lang || 'fr';
  }, [locale]);

  const [currentLocale, setCurrentLocale] = useState(detectLocale);

  // Synchroniser quand la prop locale change
  useEffect(() => {
    if (locale) {
      setCurrentLocale(locale);
    }
  }, [locale]);

  const dir    = getDirection(currentLocale);
  const isRTL  = dir === 'rtl';
  const fontClass = usesArabicFont(currentLocale) ? 'font-arabic' : '';

  /**
   * Applique la direction et la langue sur <html>.
   * À appeler au changement de locale.
   */
  const applyToDocument = useCallback((newLocale) => {
    const newDir = getDirection(newLocale);
    const htmlEl = document.documentElement;

    htmlEl.setAttribute('dir', newDir);
    htmlEl.setAttribute('lang', newLocale);

    // Classe utilitaire sur le body pour les overrides CSS
    document.body.classList.toggle('rtl', newDir === 'rtl');
    document.body.classList.toggle('ltr', newDir === 'ltr');

    // Police arabe sur le body
    if (usesArabicFont(newLocale)) {
      document.body.classList.add('font-arabic');
    } else {
      document.body.classList.remove('font-arabic');
    }

    setCurrentLocale(newLocale);
  }, []);

  // Applique automatiquement au montage et aux changements
  useEffect(() => {
    applyToDocument(currentLocale);
  }, [currentLocale, applyToDocument]);

  return {
    dir,
    isRTL,
    locale: currentLocale,
    fontClass,
    applyToDocument,
  };
}

export default useDirection;
