/**
 * SECRETIS ERP — Design tokens (classes Tailwind partagées)
 *
 * Source unique de vérité pour les surfaces, bordures, rayons et couleurs
 * sémantiques du système de composants `Components/UI`.
 *
 * Principes :
 *   - Accent violet (#9333EA / purple-600) réservé aux actions principales
 *     et à l'état actif. JAMAIS pour un statut métier.
 *   - Couleurs sémantiques (emerald / amber / red / sky / slate) réservées
 *     aux statuts — volontairement distinctes de l'accent.
 *   - Rayons : rounded-xl pour les conteneurs, rounded-lg pour les contrôles.
 *   - Ombres légères uniquement (shadow-sm), jamais d'ombre lourde.
 *   - Dark mode : surfaces #162032 (carte) / #0F1923 (fond), bordure #1E3048.
 */

import clsx from 'clsx';

/** Concaténation conditionnelle de classes. */
export const cx = (...args) => clsx(...args);

/* ─── Surfaces ─────────────────────────────────────────────────────────────── */

export const SURFACE       = 'bg-white dark:bg-[#162032]';
export const SURFACE_SUNK  = 'bg-gray-50 dark:bg-[#0F1923]';
export const SURFACE_HOVER = 'hover:bg-gray-50 dark:hover:bg-white/[0.04]';

/* ─── Bordures & séparateurs ───────────────────────────────────────────────── */

export const BORDER = 'border-gray-200 dark:border-[#1E3048]';
export const DIVIDE = 'divide-gray-100 dark:divide-[#1E3048]';

/* ─── Typographie ──────────────────────────────────────────────────────────── */

export const TEXT_TITLE  = 'text-gray-900 dark:text-white';
export const TEXT_BODY   = 'text-gray-700 dark:text-gray-300';
export const TEXT_MUTED  = 'text-gray-500 dark:text-gray-400';
export const TEXT_FAINT  = 'text-gray-400 dark:text-gray-500';

/** En-tête de colonne de tableau — 11px, majuscules, interlettrage large. */
export const TH = 'text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400';

/** Chiffres et montants : chasse fixe pour alignement vertical. */
export const NUM = 'tabular-nums';

/* ─── Rayons ───────────────────────────────────────────────────────────────── */

export const RADIUS_CONTAINER = 'rounded-xl';
export const RADIUS_CONTROL   = 'rounded-lg';

/* ─── Focus ────────────────────────────────────────────────────────────────── */

export const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ' +
  'focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#0F1923]';

/* ─── Compositions courantes ───────────────────────────────────────────────── */

export const CARD    = cx(SURFACE, 'border', BORDER, RADIUS_CONTAINER, 'shadow-sm');
export const CONTROL = cx(
  'w-full px-3 py-2 text-sm', RADIUS_CONTROL, 'border', BORDER,
  SURFACE, TEXT_TITLE, 'placeholder-gray-400 dark:placeholder-gray-500',
  'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
  'transition-colors',
);

/* ─── Tons sémantiques ─────────────────────────────────────────────────────── */
/**
 * Chaque ton fournit : fond doux (soft), texte, bordure, aplat (solid) et
 * teinte d'icône. `accent` = violet de marque, à réserver aux actions.
 */
export const TONES = {
  accent: {
    soft:   'bg-purple-50 dark:bg-purple-500/10',
    text:   'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-500/30',
    solid:  'bg-purple-600',
    icon:   'text-purple-600 dark:text-purple-400',
  },
  success: {
    soft:   'bg-emerald-50 dark:bg-emerald-500/10',
    text:   'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    solid:  'bg-emerald-600',
    icon:   'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    soft:   'bg-amber-50 dark:bg-amber-500/10',
    text:   'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-500/30',
    solid:  'bg-amber-500',
    icon:   'text-amber-600 dark:text-amber-400',
  },
  danger: {
    soft:   'bg-red-50 dark:bg-red-500/10',
    text:   'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-500/30',
    solid:  'bg-red-600',
    icon:   'text-red-600 dark:text-red-400',
  },
  info: {
    soft:   'bg-sky-50 dark:bg-sky-500/10',
    text:   'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-500/30',
    solid:  'bg-sky-600',
    icon:   'text-sky-600 dark:text-sky-400',
  },
  neutral: {
    soft:   'bg-gray-100 dark:bg-white/[0.06]',
    text:   'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-[#1E3048]',
    solid:  'bg-gray-500',
    icon:   'text-gray-500 dark:text-gray-400',
  },
};

/** Alias hérités (ancienne API `color=`) vers les tons sémantiques. */
export const TONE_ALIASES = {
  primary: 'accent',
  purple:  'accent',
  green:   'success',
  emerald: 'success',
  amber:   'warning',
  orange:  'warning',
  red:     'danger',
  blue:    'info',
  sky:     'info',
  gray:    'neutral',
  grey:    'neutral',
  default: 'neutral',
};

/** Résout un nom de ton (avec alias) vers une entrée de TONES. */
export const resolveTone = (name) =>
  TONES[TONE_ALIASES[name] ?? name] ?? TONES.neutral;

export default {
  cx, SURFACE, SURFACE_SUNK, SURFACE_HOVER, BORDER, DIVIDE,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM,
  RADIUS_CONTAINER, RADIUS_CONTROL, FOCUS_RING, CARD, CONTROL,
  TONES, TONE_ALIASES, resolveTone,
};
