/**
 * IBIG SECRETIS — darkModeClasses.js
 * Helpers pour construire des classes Tailwind dark: mode-aware
 *
 * @example
 *   import { dark, cx } from '@/utils/darkModeClasses';
 *
 *   // Combinaison light / dark
 *   const cardClass = dark('bg-white', 'bg-gray-800')
 *   // → "bg-white dark:bg-gray-800"
 *
 *   // Fusion conditionnelle
 *   const btnClass = cx(
 *     'px-4 py-2 rounded',
 *     dark('bg-blue-600 text-white', 'bg-blue-500 text-white'),
 *     isActive && 'ring-2 ring-blue-400'
 *   )
 */

// ─── Utilitaire principal ──────────────────────────────────────────────────────
/**
 * Génère une paire de classes light / dark Tailwind.
 * @param {string} lightClass  — classes pour le mode clair
 * @param {string} darkClass   — classes pour le mode sombre (sans préfixe dark:)
 * @returns {string}
 */
export const dark = (lightClass, darkClass) => {
  const darkPrefixed = darkClass
    .trim()
    .split(/\s+/)
    .map(cls => cls ? `dark:${cls}` : '')
    .join(' ');
  return `${lightClass} ${darkPrefixed}`.trim();
};

// ─── Fusion de classes conditionnelles ────────────────────────────────────────
/**
 * Fusionne des classes en filtrant les valeurs falsy.
 * @param {...(string|boolean|null|undefined)} classes
 * @returns {string}
 */
export const cx = (...classes) =>
  classes.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

// ─── Tokens sémantiques prédéfinis ────────────────────────────────────────────

/** Backgrounds de surface */
export const bgPrimary   = dark('bg-white',     'bg-[#0F1923]');
export const bgSecondary = dark('bg-gray-50',   'bg-[#1A2A3A]');
export const bgCard      = dark('bg-white',     'bg-[#1E2D40]');
export const bgTertiary  = dark('bg-gray-100',  'bg-[#243447]');
export const bgInput     = dark('bg-white',     'bg-[#162230]');
export const bgHover     = dark('hover:bg-gray-50', 'hover:bg-[#1A2A3A]');

/** Textes */
export const textPrimary   = dark('text-gray-900', 'text-[#E8F1FA]');
export const textSecondary = dark('text-gray-600', 'text-[#A8C0D6]');
export const textMuted     = dark('text-gray-400', 'text-[#6B8BA4]');

/** Bordures */
export const borderDefault = dark('border-gray-200', 'border-[#2A3F55]');
export const borderLight   = dark('border-gray-100', 'border-[#1F3144]');

/** Dividers */
export const divideDefault = dark('divide-gray-100', 'divide-[#2A3F55]');

/** Inputs */
export const inputBase = cx(
  dark('bg-white border-gray-200 text-gray-900 placeholder-gray-400',
       'bg-[#162230] border-[#2A3F55] text-[#E8F1FA] placeholder-[#6B8BA4]'),
  'border rounded-lg px-3 py-2 w-full transition-colors',
  dark('focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
       'focus:border-[#2E86C1] focus:ring-2 focus:ring-[#2E86C1]/30'),
  'outline-none'
);

/** Cards */
export const cardBase = cx(
  bgCard,
  borderDefault,
  'border rounded-2xl shadow-sm'
);

/** Sidebar */
export const sidebarBg = 'bg-[--sidebar-bg]';

/** Header */
export const headerBg = cx(
  dark('bg-white border-gray-200', 'bg-[#0D1820] border-[#1F3144]'),
  'border-b'
);

/** Tables */
export const tableHeaderBg = dark('bg-gray-50', 'bg-[#162230]');
export const tableRowHover  = dark('hover:bg-gray-50', 'hover:bg-[#1A2A3A]');
export const tableRowEven   = dark('even:bg-gray-50/50', 'even:bg-[#182535]');
export const tableDivide    = dark('divide-gray-100', 'divide-[#2A3F55]');
export const tableBorder    = dark('border-gray-100', 'border-[#2A3F55]');

/** Modals */
export const modalBg      = dark('bg-white', 'bg-[#1E2D40]');
export const modalOverlay = dark('bg-black/50', 'bg-black/75');

/** Badges */
export const badgeSuccess = dark('bg-green-100 text-green-800', 'bg-[#0d2b1a] text-[#6fcf97]');
export const badgeWarning = dark('bg-orange-100 text-orange-800', 'bg-[#2b1a0d] text-[#f2994a]');
export const badgeDanger  = dark('bg-red-100 text-red-800', 'bg-[#2b0d0d] text-[#eb5757]');
export const badgeInfo    = dark('bg-blue-100 text-blue-800', 'bg-[#0a1a2e] text-[#64b5f6]');

/** Boutons */
export const btnPrimary = cx(
  'bg-blue-600 hover:bg-blue-700 text-white',
  'dark:bg-blue-700 dark:hover:bg-blue-600',
  'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  'dark:focus:ring-offset-[#0F1923]',
  'rounded-lg px-4 py-2 font-medium transition-colors'
);

export const btnSecondary = cx(
  dark('bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
       'bg-[#162230] border-[#2A3F55] text-[#A8C0D6] hover:bg-[#1A2A3A]'),
  'border rounded-lg px-4 py-2 font-medium transition-colors'
);

export const btnGhost = cx(
  dark('text-gray-600 hover:bg-gray-100', 'text-[#A8C0D6] hover:bg-[#1A2A3A]'),
  'rounded-lg px-3 py-2 font-medium transition-colors'
);

/** Skeleton loading */
export const skeleton = dark('bg-gray-200 animate-pulse', 'bg-[#2A3F55] animate-pulse');

/** Dropdown */
export const dropdownBase = cx(
  bgCard,
  borderDefault,
  'border rounded-xl shadow-lg overflow-hidden'
);

export const dropdownItem = cx(
  dark('hover:bg-gray-50 text-gray-700', 'hover:bg-[#1A2A3A] text-[#E8F1FA]'),
  'px-4 py-2 text-sm cursor-pointer transition-colors'
);

/** Formulaires */
export const formLabel = cx(
  dark('text-gray-700', 'text-[#A8C0D6]'),
  'block text-sm font-medium mb-1'
);

export const formError = cx(
  dark('text-red-600', 'text-[#eb5757]'),
  'text-xs mt-1'
);

export const formHelp = cx(
  dark('text-gray-500', 'text-[#6B8BA4]'),
  'text-xs mt-1'
);

// ─── Export groupé ────────────────────────────────────────────────────────────
export default {
  dark,
  cx,
  bg: { primary: bgPrimary, secondary: bgSecondary, card: bgCard, input: bgInput },
  text: { primary: textPrimary, secondary: textSecondary, muted: textMuted },
  border: { default: borderDefault, light: borderLight },
  input: inputBase,
  card: cardBase,
  table: { header: tableHeaderBg, rowHover: tableRowHover, divide: tableDivide },
  modal: { bg: modalBg, overlay: modalOverlay },
  badge: { success: badgeSuccess, warning: badgeWarning, danger: badgeDanger, info: badgeInfo },
  btn: { primary: btnPrimary, secondary: btnSecondary, ghost: btnGhost },
  skeleton,
  dropdown: { base: dropdownBase, item: dropdownItem },
  form: { label: formLabel, error: formError, help: formHelp },
};
