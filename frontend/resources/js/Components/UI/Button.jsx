/**
 * SECRETIS ERP — Button
 *
 * Bouton unique de l'ERP. Remplace les ~40 déclinaisons de
 * `px-4 py-2 bg-purple-600 …` dispersées dans les pages.
 *
 * Props :
 *   variant    'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'   (défaut 'secondary')
 *   size       'xs' | 'sm' | 'md'                                        (défaut 'md')
 *   loading    boolean    — affiche un spinner et désactive le bouton
 *   icon       Component  — icône lucide-react placée à gauche
 *   iconRight  Component  — icône lucide-react placée à droite
 *   iconOnly   boolean    — bouton carré (utiliser `title` pour l'accessibilité)
 *   block      boolean    — largeur 100 %
 *   as         'button' | 'a'  (défaut 'button' ; 'a' si `href` est fourni)
 *   href       string     — transforme le bouton en lien
 *   ...rest    tout attribut natif (onClick, type, disabled, title, form…)
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cx, FOCUS_RING } from './tokens';

const VARIANTS = {
  primary:
    'bg-purple-600 text-white border border-transparent shadow-sm ' +
    'hover:bg-purple-700 active:bg-purple-800',
  secondary:
    'bg-white dark:bg-[#162032] text-gray-700 dark:text-gray-200 ' +
    'border border-gray-200 dark:border-[#1E3048] shadow-sm ' +
    'hover:bg-gray-50 dark:hover:bg-white/[0.05]',
  ghost:
    'bg-transparent text-gray-600 dark:text-gray-300 border border-transparent ' +
    'hover:bg-gray-100 dark:hover:bg-white/[0.06]',
  subtle:
    'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 ' +
    'border border-transparent hover:bg-purple-100 dark:hover:bg-purple-500/20',
  danger:
    'bg-red-600 text-white border border-transparent shadow-sm ' +
    'hover:bg-red-700 active:bg-red-800',
};

const SIZES = {
  xs: { base: 'h-7  px-2.5 text-xs gap-1.5',  only: 'h-7  w-7',  icon: 'w-3.5 h-3.5' },
  sm: { base: 'h-9  px-3   text-sm gap-1.5',  only: 'h-9  w-9',  icon: 'w-4 h-4' },
  md: { base: 'h-10 px-4   text-sm gap-2',    only: 'h-10 w-10', icon: 'w-4 h-4' },
};

export default function Button({
  variant   = 'secondary',
  size      = 'md',
  loading   = false,
  icon: Icon,
  iconRight: IconRight,
  iconOnly  = false,
  block     = false,
  as,
  href,
  className = '',
  disabled  = false,
  type      = 'button',
  children,
  ...rest
}) {
  const s          = SIZES[size] ?? SIZES.md;
  const Tag        = as ?? (href ? 'a' : 'button');
  const isDisabled = disabled || loading;

  const classes = cx(
    'inline-flex items-center justify-center font-medium rounded-lg',
    'transition-colors select-none whitespace-nowrap',
    iconOnly ? s.only : s.base,
    VARIANTS[variant] ?? VARIANTS.secondary,
    FOCUS_RING,
    block && 'w-full',
    isDisabled && 'opacity-50 pointer-events-none cursor-not-allowed',
    className,
  );

  const content = (
    <>
      {loading
        ? <Loader2 className={cx(s.icon, 'animate-spin shrink-0')} aria-hidden="true" />
        : Icon && <Icon className={cx(s.icon, 'shrink-0')} aria-hidden="true" />}
      {!iconOnly && children}
      {!loading && !iconOnly && IconRight && (
        <IconRight className={cx(s.icon, 'shrink-0')} aria-hidden="true" />
      )}
    </>
  );

  // Lien natif, ou composant de navigation fourni via `as` (ex. Inertia <Link/>) :
  // `href` doit être transmis, et `type`/`disabled` n'ont pas de sens sur une ancre.
  if (Tag !== 'button') {
    return (
      <Tag href={href} className={classes} aria-disabled={isDisabled || undefined} {...rest}>
        {content}
      </Tag>
    );
  }

  return (
    <Tag type={type} className={classes} disabled={isDisabled} {...rest}>
      {content}
    </Tag>
  );
}

export { Button };
