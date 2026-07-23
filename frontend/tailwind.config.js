/**
 * SECRETIS ERP — Tailwind CSS v3 Config (frontend)
 * Extension du design-system/ avec support RTL complet
 *
 * Ajoute :
 *   - Plugin RTL (rtl: variant via [dir="rtl"])
 *   - Propriétés logiques : ms-, me-, ps-, pe-
 *   - Classes rtl:space-x-reverse, rtl:rotate-180
 *   - Famille de polices arabes (Cairo, Noto Sans Arabic)
 *   - Imports CSS conditionnels
 */

const baseConfig = require('../design-system/tailwind.config.js');
const plugin     = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Réutiliser la config de base du design system
  ...baseConfig,

  // Hérité de design-system mais déclaré explicitement pour garantie
  darkMode: 'class',

  content: [
    './resources/**/*.{js,jsx,ts,tsx,vue,blade.php}',
    './resources/js/**/*.{js,jsx,ts,tsx}',
    './resources/views/**/*.blade.php',
  ],

  // ─── Safelist étendue (RTL + arabe) ─────────────────────────────────────────
  safelist: [
    ...(baseConfig.safelist || []),
    // Variants RTL
    { pattern: /^rtl:/ },
    // Classes direction
    'dir-rtl', 'dir-ltr',
    // Font arabe
    'font-arabic',
    // Logical properties
    'ms-0', 'ms-1', 'ms-2', 'ms-3', 'ms-4', 'ms-5', 'ms-6', 'ms-8', 'ms-10', 'ms-12', 'ms-16',
    'me-0', 'me-1', 'me-2', 'me-3', 'me-4', 'me-5', 'me-6', 'me-8', 'me-10', 'me-12', 'me-16',
    'ps-0', 'ps-1', 'ps-2', 'ps-3', 'ps-4', 'ps-5', 'ps-6', 'ps-8', 'ps-10', 'ps-12', 'ps-16',
    'pe-0', 'pe-1', 'pe-2', 'pe-3', 'pe-4', 'pe-5', 'pe-6', 'pe-8', 'pe-10', 'pe-12', 'pe-16',
    // RTL space-x
    'rtl:space-x-reverse',
    // RTL rotate
    'rtl:rotate-180', 'rtl:-rotate-180',
    // RTL text
    'rtl:text-right', 'rtl:text-left',
    // RTL flex
    'rtl:flex-row-reverse',
  ],

  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme?.extend,

      // ── Polices étendues (arabe) ─────────────────────────────────────────────
      fontFamily: {
        ...baseConfig.theme?.extend?.fontFamily,
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        arabic: ['Cairo', 'Noto Sans Arabic', 'Arial Unicode MS', 'sans-serif'],
        mono:   ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },

  plugins: [
    // Plugins hérités du design system
    ...(baseConfig.plugins || []),

    // ── Plugin RTL custom ──────────────────────────────────────────────────────
    plugin(function({ addVariant, addUtilities, matchUtilities, theme, e }) {

      // Variant rtl: — appliqué quand [dir="rtl"] est sur un ancêtre
      addVariant('rtl', '[dir="rtl"] &');
      // Variant ltr:
      addVariant('ltr', '[dir="ltr"] &');

      // ── Propriétés logiques (Margin Start/End, Padding Start/End) ────────────
      // ms-* = margin-inline-start  (right en RTL, left en LTR)
      // me-* = margin-inline-end    (left  en RTL, right en LTR)
      // ps-* = padding-inline-start
      // pe-* = padding-inline-end

      const spacingValues = theme('spacing');

      matchUtilities(
        { ms: (value) => ({ 'margin-inline-start': value }) },
        { values: spacingValues, supportsNegativeValues: true }
      );
      matchUtilities(
        { me: (value) => ({ 'margin-inline-end': value }) },
        { values: spacingValues, supportsNegativeValues: true }
      );
      matchUtilities(
        { ps: (value) => ({ 'padding-inline-start': value }) },
        { values: spacingValues }
      );
      matchUtilities(
        { pe: (value) => ({ 'padding-inline-end': value }) },
        { values: spacingValues }
      );

      // ── Utilitaires RTL statiques ─────────────────────────────────────────────
      addUtilities({
        // Inversion de space-x pour RTL
        '.rtl\\:space-x-reverse': {
          '[dir="rtl"] &': {
            '--tw-space-x-reverse': '1',
          },
        },
        // Rotation 180° pour icônes directionnelles
        '.rtl\\:rotate-180': {
          '[dir="rtl"] &': {
            transform: 'rotate(180deg)',
          },
        },
        // Font arabe
        '.font-arabic': {
          fontFamily: "'Cairo', 'Noto Sans Arabic', 'Arial Unicode MS', sans-serif",
        },
        // Direction class helpers
        '.dir-rtl': { direction: 'rtl', textAlign: 'right' },
        '.dir-ltr': { direction: 'ltr', textAlign: 'left' },
        // Text direction utilities
        '.text-start': { textAlign: 'start' },
        '.text-end':   { textAlign: 'end' },
      });

      // ── start: / end: pour border-radius logique ───────────────────────────
      addUtilities({
        '.rounded-s':     { 'border-start-start-radius': '0.375rem', 'border-end-start-radius': '0.375rem' },
        '.rounded-e':     { 'border-start-end-radius':   '0.375rem', 'border-end-end-radius':   '0.375rem' },
        '.rounded-s-md':  { 'border-start-start-radius': '0.5rem',   'border-end-start-radius': '0.5rem' },
        '.rounded-e-md':  { 'border-start-end-radius':   '0.5rem',   'border-end-end-radius':   '0.5rem' },
        '.rounded-s-lg':  { 'border-start-start-radius': '0.75rem',  'border-end-start-radius': '0.75rem' },
        '.rounded-e-lg':  { 'border-start-end-radius':   '0.75rem',  'border-end-end-radius':   '0.75rem' },
        '.rounded-s-none':{ 'border-start-start-radius': '0',        'border-end-start-radius': '0' },
        '.rounded-e-none':{ 'border-start-end-radius':   '0',        'border-end-end-radius':   '0' },
      });

      // ── float logique ──────────────────────────────────────────────────────
      addUtilities({
        '.float-start': { float: 'inline-start' },
        '.float-end':   { float: 'inline-end' },
      });

      // ── inset-inline pour positionnement logique ───────────────────────────
      matchUtilities(
        { 'inset-s': (value) => ({ 'inset-inline-start': value }) },
        { values: spacingValues, supportsNegativeValues: true }
      );
      matchUtilities(
        { 'inset-e': (value) => ({ 'inset-inline-end': value }) },
        { values: spacingValues, supportsNegativeValues: true }
      );
    }),
  ],
};
