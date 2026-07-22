/**
 * SECRETIS ERP — useTranslation.js
 * Hook de traduction FR/EN avec interpolation et fallback
 *
 * Usage :
 *   const { t, locale, setLocale } = useTranslation();
 *   t('buttons.save')                          → "Enregistrer"
 *   t('auth.welcome_back', { name: 'Dupont' }) → "Bienvenue, Dupont !"
 *   t('dates.page_of', { current: 2, total: 5 }) → "Page 2 sur 5"
 */

import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

// ─── Fichiers de traduction ────────────────────────────────────────────────────
// Import statique (webpack / vite bundle les JSON)
import frTranslations   from '../i18n/fr.json';
import enTranslations   from '../i18n/en.json';
import arTranslations   from '../i18n/ar.json';
import arMATranslations from '../i18n/ar-MA.json';
import arTNTranslations from '../i18n/ar-TN.json';
import ptBRTranslations from '../i18n/pt-BR.json';
import ptSTTranslations from '../i18n/pt-ST.json';
import ptMZTranslations from '../i18n/pt-MZ.json';
import swTranslations   from '../i18n/sw.json';
import haTranslations   from '../i18n/ha.json';

// Deep merge : base + overrides (pour les variantes régionales)
function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(override[key]) &&
      typeof base[key] === 'object' &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

const TRANSLATIONS = {
  fr:    frTranslations,
  en:    enTranslations,
  ar:    arTranslations,
  'ar-MA': deepMerge(arTranslations, arMATranslations),
  'ar-TN': deepMerge(arTranslations, arTNTranslations),
  'pt-BR': ptBRTranslations,
  'pt-ST': deepMerge(ptBRTranslations, ptSTTranslations),
  'pt-MZ': deepMerge(ptBRTranslations, ptMZTranslations),
  sw:    swTranslations,
  ha:    haTranslations,
};

const SUPPORTED_LOCALES = ['fr', 'en', 'ar', 'ar-MA', 'ar-TN', 'pt-BR', 'pt-ST', 'pt-MZ', 'sw', 'ha'];
const DEFAULT_LOCALE    = 'fr';

// Locales RTL
const RTL_LOCALES = new Set(['ar', 'ar-MA', 'ar-TN']);
const STORAGE_KEY       = 'secretis_locale';

// ─── Résolution d'une clé imbriquée via dot-notation ─────────────────────────
/**
 * Résout "buttons.save" → translations.buttons.save
 * Supporte jusqu'à 5 niveaux d'imbrication.
 */
function resolvePath(obj, path) {
  if (!path || typeof path !== 'string') return undefined;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

// ─── Interpolation de variables ───────────────────────────────────────────────
/**
 * Remplace ":key" dans la chaîne par la valeur correspondante du params.
 * Exemple : interpolate("Bienvenue, :name !", { name: "Dupont" })
 *         → "Bienvenue, Dupont !"
 */
function interpolate(str, params) {
  if (!params || typeof str !== 'string') return str;
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`:${key}`, 'g'), String(value ?? ''));
  }, str);
}

// ─── Détection initiale de la locale ─────────────────────────────────────────
function detectInitialLocale() {
  // 1. LocalStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch { /* SSR ou accès bloqué */ }

  // 2. Attribut lang du HTML (Laravel blade peut le définir)
  const htmlLang = document.documentElement.lang?.slice(0, 2).toLowerCase();
  if (htmlLang && SUPPORTED_LOCALES.includes(htmlLang)) return htmlLang;

  // 3. Préférence navigateur
  const browserLang = navigator.language?.slice(0, 2).toLowerCase();
  if (browserLang && SUPPORTED_LOCALES.includes(browserLang)) return browserLang;

  return DEFAULT_LOCALE;
}

// ─── Contexte global ─────────────────────────────────────────────────────────
export const TranslationContext = createContext(null);

/**
 * Provider à placer à la racine de l'application.
 * Synchronise la locale avec le serveur (préférence utilisateur).
 *
 * @example
 *   <TranslationProvider>
 *     <App />
 *   </TranslationProvider>
 */
export function TranslationProvider({ children, initialLocale }) {
  const [locale, setLocaleState] = useState(initialLocale || detectInitialLocale());
  const [synced, setSynced]      = useState(false);

  // Synchronisation avec le serveur au montage
  useEffect(() => {
    if (synced) return;
    axios.get('/api/user/locale')
      .then(res => {
        const serverLocale = res.data?.locale;
        if (serverLocale && SUPPORTED_LOCALES.includes(serverLocale)) {
          setLocaleState(serverLocale);
          try { localStorage.setItem(STORAGE_KEY, serverLocale); } catch { /* noop */ }
        }
      })
      .catch(() => { /* utilisateur non connecté, utiliser localStorage */ })
      .finally(() => setSynced(true));
  }, [synced]);

  // Changer la locale + persistance
  const setLocale = useCallback(async (newLocale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);

    // Persister en localStorage
    try { localStorage.setItem(STORAGE_KEY, newLocale); } catch { /* noop */ }

    // Mettre à jour l'attribut lang du HTML
    document.documentElement.lang = newLocale;

    // Synchroniser avec le serveur (si connecté)
    try {
      await axios.put('/api/user/locale', { locale: newLocale });
    } catch { /* silencieux si non connecté */ }
  }, []);

  // Fonction de traduction
  const t = useCallback((key, params) => {
    // Essai dans la locale active
    const dict = TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
    let value  = resolvePath(dict, key);

    // Fallback sur FR si clé manquante dans EN
    if ((value === undefined || value === null) && locale !== DEFAULT_LOCALE) {
      value = resolvePath(TRANSLATIONS[DEFAULT_LOCALE], key);
    }

    // Si la clé est toujours introuvable, retourner la clé comme fallback (dev mode)
    if (value === undefined || value === null) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing translation key: "${key}" (locale: ${locale})`);
      }
      return key;
    }

    // Tableau → retourner le tableau (pour les jours, mois, etc.)
    if (Array.isArray(value)) return value;

    // Objet → retourner l'objet (pour accès dynamique à des sous-clés)
    if (typeof value === 'object') return value;

    // Chaîne → interpoler
    return interpolate(String(value), params);
  }, [locale]);

  // Appliquer la direction sur le document HTML
  useEffect(() => {
    const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', locale);
    document.body.classList.toggle('rtl', dir === 'rtl');
  }, [locale]);

  const value = {
    t,
    locale,
    setLocale,
    supportedLocales: SUPPORTED_LOCALES,
    isRTL: RTL_LOCALES.has(locale),
    dir: RTL_LOCALES.has(locale) ? 'rtl' : 'ltr',
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

// ─── Hook principal ───────────────────────────────────────────────────────────
/**
 * Hook useTranslation — à utiliser dans tout composant enfant de TranslationProvider.
 *
 * @returns {{ t, locale, setLocale, supportedLocales }}
 *
 * @example
 *   const { t, locale, setLocale } = useTranslation();
 *
 *   // Traduction simple
 *   t('buttons.save') // → "Enregistrer"
 *
 *   // Avec interpolation
 *   t('auth.welcome_back', { name: user.name }) // → "Bienvenue, Jean !"
 *
 *   // Tableau (jours, mois)
 *   t('dates.days_short')[1] // → "Lun" (fr) / "Mon" (en)
 *
 *   // Changer la locale
 *   setLocale('en')
 */
export function useTranslation() {
  const ctx = useContext(TranslationContext);

  // Fallback standalone sans Provider (usage en dehors du contexte)
  if (!ctx) {
    const [locale, setLocaleState] = useState(detectInitialLocale());

    const setLocale = useCallback((newLocale) => {
      if (!SUPPORTED_LOCALES.includes(newLocale)) return;
      setLocaleState(newLocale);
      try { localStorage.setItem(STORAGE_KEY, newLocale); } catch { /* noop */ }
      document.documentElement.lang = newLocale;
    }, []);

    const t = useCallback((key, params) => {
      const dict  = TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
      let value   = resolvePath(dict, key);
      if ((value === undefined || value === null) && locale !== DEFAULT_LOCALE) {
        value = resolvePath(TRANSLATIONS[DEFAULT_LOCALE], key);
      }
      if (value === undefined || value === null) return key;
      if (Array.isArray(value) || typeof value === 'object') return value;
      return interpolate(String(value), params);
    }, [locale]);

    return { t, locale, setLocale, supportedLocales: SUPPORTED_LOCALES, isRTL: RTL_LOCALES.has(locale), dir: RTL_LOCALES.has(locale) ? 'rtl' : 'ltr' };
  }

  return ctx;
}

// ─── HOC pour les composants classe (legacy) ──────────────────────────────────
export function withTranslation(Component) {
  return function WrappedWithTranslation(props) {
    const translation = useTranslation();
    return <Component {...props} {...translation} />;
  };
}

// ─── Utilitaire : formater une date selon la locale ──────────────────────────
/**
 * Formate une date JS selon la locale active.
 * @param {Date|string} date
 * @param {'date'|'datetime'|'time'|'relative'} format
 * @param {string} locale
 */
export function formatDate(date, format = 'date', locale = DEFAULT_LOCALE) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d?.getTime())) return '';

  const localeCode = locale === 'fr' ? 'fr-FR' : 'en-US';

  switch (format) {
    case 'date':
      return d.toLocaleDateString(localeCode, {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    case 'datetime':
      return d.toLocaleString(localeCode, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    case 'time':
      return d.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' });
    case 'relative': {
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1)  return locale === 'fr' ? 'À l\'instant' : 'Just now';
      if (mins < 60) return locale === 'fr' ? `Il y a ${mins} min` : `${mins} min ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24)  return locale === 'fr' ? `Il y a ${hrs} h` : `${hrs} h ago`;
      const days = Math.floor(hrs / 24);
      return locale === 'fr' ? `Il y a ${days} j` : `${days} d ago`;
    }
    default:
      return d.toLocaleDateString(localeCode);
  }
}

export default useTranslation;
