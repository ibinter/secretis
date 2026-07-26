/**
 * IBIG SECRETIS — LanguageSwitcher.jsx
 * Sélecteur de langue avec support RTL — 6 langues
 *
 * Fonctionnalités :
 *   - 6 langues : Français, English, العربية (RTL), Português, Kiswahili, Hausa
 *   - Modifie <html lang="xx" dir="ltr|rtl"> dynamiquement
 *   - Sauvegarde via localStorage + PUT /api/profile/preferences
 *   - WCAG 2.1 AA : navigation clavier, aria-*, focus visible
 *   - Mode sombre complet
 */

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { router } from '@inertiajs/react';

// ─── Définition des langues ───────────────────────────────────────────────────
const LANGUAGES = [
  {
    code:   'fr',
    label:  'Français',
    flag:   '🇫🇷',
    dir:    'ltr',
    nativeName: 'Français',
  },
  {
    code:   'en',
    label:  'English',
    flag:   '🇬🇧',
    dir:    'ltr',
    nativeName: 'English',
  },
  {
    code:   'ar',
    label:  'العربية',
    flag:   '🇸🇦',
    dir:    'rtl',
    nativeName: 'العربية',
  },
  {
    code:   'pt',
    label:  'Português',
    flag:   '🇵🇹',
    dir:    'ltr',
    nativeName: 'Português',
  },
  {
    code:   'sw',
    label:  'Kiswahili',
    flag:   '🇰🇪',
    dir:    'ltr',
    nativeName: 'Kiswahili',
  },
  {
    code:   'ha',
    label:  'Hausa',
    flag:   '🇳🇬',
    dir:    'ltr',
    nativeName: 'Hausa',
  },
];

// ─── Application de la locale ─────────────────────────────────────────────────
function applyLocale(lang) {
  const html = document.documentElement;
  html.setAttribute('lang', lang.code);
  html.setAttribute('dir',  lang.dir);

  // Sauvegarde locale
  try { localStorage.setItem('locale', lang.code); } catch (_) {}

  // Dispatch custom event pour les composants i18n
  window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale: lang.code, dir: lang.dir } }));
}

// ─── Sauvegarde côté serveur (best-effort) ───────────────────────────────────
async function persistLocale(code) {
  try {
    await fetch('/api/profile/preferences', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ locale: code }),
    });
  } catch (_) {
    // Silencieux — la sauvegarde localStorage suffit en cas d'erreur réseau
  }
}

// ─── Lecture de la locale initiale ───────────────────────────────────────────
function getInitialLocale() {
  try {
    const stored = localStorage.getItem('locale');
    if (stored && LANGUAGES.find(l => l.code === stored)) return stored;
  } catch (_) {}

  const htmlLang = document.documentElement.getAttribute('lang') || 'fr';
  const match = LANGUAGES.find(l => l.code === htmlLang.split('-')[0]);
  return match ? match.code : 'fr';
}

// ─── Icônes ──────────────────────────────────────────────────────────────────
const ChevronDown = ({ open }) => (
  <svg
    className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const CheckMark = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd" />
  </svg>
);

// ─── Composant principal ──────────────────────────────────────────────────────
/**
 * @param {'header'|'sidebar'|'menu'} variant — contexte d'affichage
 * @param {boolean} showLabel — afficher le nom de la langue active
 * @param {string} className — classes supplémentaires
 */
export default function LanguageSwitcher({ variant = 'header', showLabel = false, className = '' }) {
  const uid          = useId();
  const triggerId    = `lang-trigger-${uid}`;
  const listboxId    = `lang-listbox-${uid}`;

  const [open, setOpen]             = useState(false);
  const [activeCode, setActiveCode] = useState(getInitialLocale);
  const [activeIdx, setActiveIdx]   = useState(0);

  const containerRef = useRef(null);
  const triggerRef   = useRef(null);
  const optionRefs   = useRef([]);

  const currentLang = LANGUAGES.find(l => l.code === activeCode) || LANGUAGES[0];

  // ── Fermer sur clic extérieur ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // ── Fermer sur Escape globalement ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // ── Focus sur l'option active à l'ouverture ───────────────────────────────
  useEffect(() => {
    if (open) {
      const idx = LANGUAGES.findIndex(l => l.code === activeCode);
      setActiveIdx(idx >= 0 ? idx : 0);
      setTimeout(() => { optionRefs.current[idx >= 0 ? idx : 0]?.focus(); }, 50);
    }
  }, [open, activeCode]);

  // ── Sélection ─────────────────────────────────────────────────────────────
  const selectLang = useCallback((lang) => {
    setActiveCode(lang.code);
    applyLocale(lang);
    persistLocale(lang.code);
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // ── Navigation clavier dans la liste ──────────────────────────────────────
  const handleListKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => {
          const next = (i + 1) % LANGUAGES.length;
          optionRefs.current[next]?.focus();
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => {
          const prev = (i - 1 + LANGUAGES.length) % LANGUAGES.length;
          optionRefs.current[prev]?.focus();
          return prev;
        });
        break;
      case 'Home':
        e.preventDefault();
        setActiveIdx(0);
        optionRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        setActiveIdx(LANGUAGES.length - 1);
        optionRefs.current[LANGUAGES.length - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectLang(LANGUAGES[activeIdx]);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      setOpen(o => !o);
    }
  };

  // ── Styles selon variante ──────────────────────────────────────────────────
  const triggerBase = `
    flex items-center gap-1.5 rounded-lg transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-[#F39C12] focus:ring-offset-1
    dark:focus:ring-offset-[#0F1923]
  `;

  const triggerVariants = {
    header: `${triggerBase} px-2.5 py-1.5 text-sm
      text-gray-600 dark:text-[#A8C0D6]
      hover:bg-gray-100 dark:hover:bg-[#243447]
      border border-transparent hover:border-gray-200 dark:hover:border-[#2A3F55]`,
    sidebar: `${triggerBase} px-3 py-2 w-full text-sm
      text-gray-700 dark:text-[#A8C0D6]
      hover:bg-gray-100 dark:hover:bg-[#243447]`,
    menu: `${triggerBase} px-2 py-1 text-xs
      text-gray-500 dark:text-[#6B8BA4]
      hover:text-gray-900 dark:hover:text-[#E8F1FA]`,
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Déclencheur ─────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Langue : ${currentLang.nativeName}. Changer de langue`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleTriggerKeyDown}
        className={triggerVariants[variant] || triggerVariants.header}
      >
        <GlobeIcon />
        <span className="text-base leading-none" aria-hidden="true">{currentLang.flag}</span>
        {showLabel && (
          <span className="font-medium hidden sm:block">{currentLang.nativeName}</span>
        )}
        <ChevronDown open={open} />
      </button>

      {/* ── Liste déroulante ─────────────────────────────────────────────── */}
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Sélectionner une langue"
          aria-activedescendant={`${listboxId}-${LANGUAGES[activeIdx]?.code}`}
          onKeyDown={handleListKeyDown}
          className="
            absolute top-full mt-1 z-[400]
            w-52 py-1 rounded-xl
            bg-white dark:bg-[#1E2D40]
            border border-gray-200 dark:border-[#2A3F55]
            shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.60)]
            outline-none
            ltr:right-0 rtl:left-0
          "
          style={{ direction: 'ltr' }}
        >
          {LANGUAGES.map((lang, index) => {
            const isSelected = lang.code === activeCode;
            const isActive   = index === activeIdx;

            return (
              <li
                key={lang.code}
                id={`${listboxId}-${lang.code}`}
                ref={el => { optionRefs.current[index] = el; }}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => selectLang(lang)}
                onFocus={() => setActiveIdx(index)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 cursor-pointer
                  text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-inset focus:ring-[#7e22ce]
                  ${isSelected
                    ? 'bg-purple-50 dark:bg-[#162230] text-[#7e22ce] dark:text-purple-400 font-medium'
                    : isActive
                    ? 'bg-gray-50 dark:bg-[#243447] text-gray-900 dark:text-[#E8F1FA]'
                    : 'text-gray-700 dark:text-[#A8C0D6] hover:bg-gray-50 dark:hover:bg-[#243447]'
                  }
                `}
              >
                {/* Drapeau */}
                <span className="text-xl leading-none flex-shrink-0" aria-hidden="true">
                  {lang.flag}
                </span>

                {/* Nom natif + indicateur RTL */}
                <span className="flex-1 flex flex-col">
                  <span className="leading-tight">{lang.nativeName}</span>
                  {lang.dir === 'rtl' && (
                    <span className="text-xs text-gray-400 dark:text-[#6B8BA4] mt-0.5">RTL</span>
                  )}
                </span>

                {/* Coche si actif */}
                {isSelected && (
                  <span className="text-[#7e22ce] dark:text-purple-400 flex-shrink-0">
                    <CheckMark />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Export du hook pour usage externe ───────────────────────────────────────
export function useLocale() {
  const [locale, setLocale] = useState(getInitialLocale());

  useEffect(() => {
    const handler = (e) => setLocale(e.detail.locale);
    window.addEventListener('localeChanged', handler);
    return () => window.removeEventListener('localeChanged', handler);
  }, []);

  const lang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];
  return { locale, lang, isRTL: lang.dir === 'rtl', LANGUAGES };
}
export { LanguageSwitcher };
