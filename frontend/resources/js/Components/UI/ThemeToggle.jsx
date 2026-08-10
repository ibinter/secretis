/**
 * IBIG SECRETIS — ThemeToggle.jsx
 * Bouton toggle de thème avec 3 états : light / dark / system
 * - Animation rotation + fade
 * - Tooltip multilingue
 * - Raccourci clavier : Ctrl+Shift+L
 */

import React, { useState, useRef, useEffect } from 'react';
import useTheme from '@/hooks/useTheme';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const SunIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="5" strokeWidth={2} />
    <path strokeLinecap="round" strokeWidth={2}
      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42
         M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const SystemIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2} />
    <path strokeLinecap="round" strokeWidth={2} d="M8 21h8M12 17v4" />
    <circle cx="12" cy="10" r="2" strokeWidth={2} />
  </svg>
);

// ─── Configuration des états ──────────────────────────────────────────────────
const THEME_CONFIG = {
  light: {
    next:    'dark',
    label:   'Passer en mode sombre',
    tooltip: 'Thème clair — cliquer pour sombre',
    icon:    SunIcon,
    iconClass: 'text-amber-500',
  },
  dark: {
    next:    'system',
    label:   'Passer en mode automatique',
    tooltip: 'Thème sombre — cliquer pour automatique',
    icon:    MoonIcon,
    iconClass: 'text-purple-400',
  },
  system: {
    next:    'light',
    label:   'Passer en mode clair',
    tooltip: 'Thème automatique — cliquer pour clair',
    icon:    SystemIcon,
    iconClass: 'text-gray-400 dark:text-gray-500',
  },
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ThemeToggle({
  size      = 'md',
  showLabel = false,
  className = '',
}) {
  const { theme, setTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  const [animating, setAnimating]     = useState(false);
  const buttonRef                     = useRef(null);

  const config  = THEME_CONFIG[theme] || THEME_CONFIG.system;
  const IconCmp = config.icon;

  const sizes = {
    sm: { btn: 'w-8 h-8',   icon: 'w-4 h-4' },
    md: { btn: 'w-9 h-9',   icon: 'w-5 h-5' },
    lg: { btn: 'w-11 h-11', icon: 'w-6 h-6' },
  };
  const sz = sizes[size] || sizes.md;

  function handleClick() {
    setAnimating(true);
    setTheme(config.next);
    setTimeout(() => setAnimating(false), 350);
  }

  // Afficher le raccourci dans le tooltip
  useEffect(() => {
    const hint = buttonRef.current?.getAttribute('title') || '';
    const withShortcut = `${config.tooltip} (Ctrl+Shift+L)`;
    if (buttonRef.current) {
      buttonRef.current.setAttribute('title', withShortcut);
    }
  }, [theme, config.tooltip]);

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={config.label}
        aria-live="polite"
        className={`
          relative inline-flex items-center justify-center rounded-lg
          ${sz.btn}
          transition-all duration-200
          text-gray-500 hover:text-gray-700
          dark:text-gray-400 dark:hover:text-gray-200
          hover:bg-gray-100 dark:hover:bg-[#1A2A3A]
          focus:outline-none focus:ring-2 focus:ring-purple-500
          dark:focus:ring-[#7e22ce] focus:ring-offset-2
          dark:focus:ring-offset-[#0F1923]
        `}
      >
        {/* Icône avec animation de rotation */}
        <span
          className={`
            inline-flex transition-all duration-300 ease-in-out
            ${animating ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}
          `}
          aria-hidden="true"
        >
          <IconCmp className={`${sz.icon} ${config.iconClass}`} />
        </span>

        {/* Indicateur du mode actuel (petit point) */}
        {theme === 'system' && (
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400"
            aria-hidden="true"
          />
        )}

        {showLabel && (
          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-[#A8C0D6]">
            {theme === 'light' ? 'Clair' : theme === 'dark' ? 'Sombre' : 'Auto'}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className={`
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            px-2.5 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg
            bg-gray-900 text-white dark:bg-[#E8F1FA] dark:text-[#0F1923]
            shadow-lg pointer-events-none
            animate-in fade-in zoom-in-95 duration-150
          `}
        >
          {config.tooltip}
          <span className="ml-1 opacity-60 text-[10px]">(Ctrl+Shift+L)</span>
          {/* Flèche */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
            border-4 border-transparent border-t-gray-900 dark:border-t-[#E8F1FA]" />
        </div>
      )}
    </div>
  );
}

// ─── Variante dropdown (3 options) ────────────────────────────────────────────
export function ThemeDropdown({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  const options = [
    { value: 'light',  label: 'Thème clair',       icon: SunIcon,    iconClass: 'text-amber-500' },
    { value: 'dark',   label: 'Thème sombre',       icon: MoonIcon,   iconClass: 'text-purple-400' },
    { value: 'system', label: 'Automatique (système)', icon: SystemIcon, iconClass: 'text-gray-400' },
  ];

  const current = THEME_CONFIG[theme] || THEME_CONFIG.system;
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choisir le thème"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm
          text-gray-600 dark:text-[#A8C0D6]
          hover:bg-gray-100 dark:hover:bg-[#1A2A3A]
          border border-gray-200 dark:border-[#2A3F55]
          transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <CurrentIcon className={`w-4 h-4 ${current.iconClass}`} />
        <span>{theme === 'light' ? 'Clair' : theme === 'dark' ? 'Sombre' : 'Auto'}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Thème"
          className="absolute right-0 top-full mt-1 w-52 z-50 rounded-xl overflow-hidden
            bg-white dark:bg-[#1E2D40]
            border border-gray-200 dark:border-[#2A3F55]
            shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.55)]
            py-1 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {options.map(opt => {
            const OptIcon = opt.icon;
            const selected = theme === opt.value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => { setTheme(opt.value); setOpen(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm
                  transition-colors
                  ${selected
                    ? 'bg-purple-50 dark:bg-[#162230] text-purple-700 dark:text-purple-400'
                    : 'text-gray-700 dark:text-[#A8C0D6] hover:bg-gray-50 dark:hover:bg-[#243447]'
                  }`}
              >
                <OptIcon className={`w-4 h-4 ${opt.iconClass}`} />
                <span className="flex-1">{opt.label}</span>
                {selected && (
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
export { ThemeToggle };
