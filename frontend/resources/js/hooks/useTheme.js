/**
 * IBIG SECRETIS — useTheme.js
 * Hook de gestion du thème : light / dark / system
 * - Lit la préférence depuis localStorage (clé: secretis_theme)
 * - Écoute prefers-color-scheme pour le mode system
 * - Applique data-theme sur <html>
 * - Synchronise avec l'API pour persistance multi-device
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY  = 'secretis_theme';
const VALID_THEMES = ['light', 'dark', 'system'];
const API_ENDPOINT = '/api/user/preferences';

/**
 * Détermine si le système est en mode sombre
 */
function getSystemDark() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Applique le thème sur l'élément <html>
 */
function applyTheme(theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && getSystemDark());

  if (isDark) {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
  } else {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
  }
}

/**
 * Lire le thème sauvegardé
 */
function getSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_THEMES.includes(saved)) return saved;
  } catch {
    /* localStorage indisponible (mode privé, etc.) */
  }
  return 'system';
}

/**
 * Sauvegarder le thème localement
 */
function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch { /* ignore */ }
}

/**
 * Synchroniser avec l'API (persistance multi-device)
 * Fire-and-forget — ne bloque pas l'UI
 */
async function syncWithApi(theme) {
  try {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta?.getAttribute('content') || '';

    await fetch(API_ENDPOINT, {
      method:  'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf,
        'Accept':       'application/json',
      },
      body: JSON.stringify({ theme }),
    });
  } catch {
    /* Silencieux — la préférence locale reste disponible */
  }
}

/**
 * Charger le thème depuis l'API (au démarrage)
 */
async function loadFromApi() {
  try {
    const res = await fetch(API_ENDPOINT, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const apiTheme = data?.preferences?.theme || data?.theme;
      if (apiTheme && VALID_THEMES.includes(apiTheme)) return apiTheme;
    }
  } catch { /* Silencieux */ }
  return null;
}

// ─── Hook principal ────────────────────────────────────────────────────────────
export function useTheme() {
  const [theme, setThemeState]  = useState(() => getSavedTheme());
  const [isDark, setIsDark]     = useState(false);
  const mediaQueryRef           = useRef(null);
  const syncTimerRef            = useRef(null);

  // Calculer isDark en fonction du thème et du système
  const computeIsDark = useCallback((currentTheme) => {
    if (currentTheme === 'dark')  return true;
    if (currentTheme === 'light') return false;
    return getSystemDark(); // system
  }, []);

  // Appliquer et sauvegarder un nouveau thème
  const setTheme = useCallback((newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return;

    saveTheme(newTheme);
    applyTheme(newTheme);
    setThemeState(newTheme);
    setIsDark(computeIsDark(newTheme));

    // Synchronisation API différée (debounce 1s)
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => syncWithApi(newTheme), 1000);
  }, [computeIsDark]);

  // Initialisation
  useEffect(() => {
    const init = async () => {
      // 1. Appliquer immédiatement la préférence locale
      const localTheme = getSavedTheme();
      applyTheme(localTheme);
      setIsDark(computeIsDark(localTheme));

      // 2. Essayer de charger depuis l'API (si utilisateur connecté)
      const apiTheme = await loadFromApi();
      if (apiTheme && apiTheme !== localTheme) {
        saveTheme(apiTheme);
        applyTheme(apiTheme);
        setThemeState(apiTheme);
        setIsDark(computeIsDark(apiTheme));
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Écouter les changements de prefers-color-scheme (pour le mode system)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryRef.current = mq;

    const handleChange = () => {
      setThemeState(prev => {
        if (prev === 'system') {
          const sysDark = mq.matches;
          applyTheme('system');
          setIsDark(sysDark);
        }
        return prev;
      });
    };

    // Compatibilité : addEventListener vs addListener (Safari < 14)
    if (mq.addEventListener) {
      mq.addEventListener('change', handleChange);
    } else {
      mq.addListener(handleChange);
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handleChange);
      } else {
        mq.removeListener(handleChange);
      }
      clearTimeout(syncTimerRef.current);
    };
  }, []);

  // Écouter le raccourci clavier Ctrl+Shift+L
  useEffect(() => {
    const handleKeyboard = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [theme, setTheme]);

  return {
    theme,       // 'light' | 'dark' | 'system'
    setTheme,
    isDark,      // true si le rendu actuel est sombre
    isSystem: theme === 'system',
    isLight:  theme === 'light',
    toggle: () => setTheme(isDark ? 'light' : 'dark'),
  };
}

export default useTheme;
