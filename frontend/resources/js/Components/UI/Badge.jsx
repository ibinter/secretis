/**
 * SECRETIS ERP — Badge
 *
 * Pastille de statut. Les couleurs sémantiques sont volontairement
 * distinctes de l'accent violet de la marque : un statut ne doit jamais
 * être confondu avec une action.
 *
 * Props :
 *   variant   'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'
 *   color     alias historique de `variant` (accepte aussi 'primary', 'gray'…)
 *   size      'sm' | 'md'                       (défaut 'sm')
 *   dot       boolean — pastille colorée devant le libellé
 *             (sans children : rend uniquement le point)
 *   icon      Component lucide-react à gauche du libellé
 *   pill      boolean — coins pleinement arrondis (défaut true)
 *   outline   boolean — style contour au lieu du fond doux
 */

import React from 'react';
import { cx, TONES, resolveTone } from './tokens';

const DOTS = {
  accent:  'bg-purple-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-sky-500',
  neutral: 'bg-gray-400',
};

const SIZES = {
  sm: 'px-2   py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1   text-xs     gap-1.5',
};

/** Retourne la clé de ton normalisée (variant > color > 'neutral'). */
function toneKey(variant, color) {
  const raw = variant ?? color ?? 'neutral';
  const resolved = resolveTone(raw);
  return Object.keys(TONES).find(k => TONES[k] === resolved) ?? 'neutral';
}

export default function Badge({
  variant,
  color,
  size    = 'sm',
  dot     = false,
  icon: Icon,
  pill    = true,
  outline = false,
  className = '',
  children,
  ...rest
}) {
  const key  = toneKey(variant, color);
  const tone = TONES[key];

  if (dot && children === undefined) {
    return <span className={cx('inline-block w-2 h-2 rounded-full', DOTS[key], className)} {...rest} />;
  }

  return (
    <span
      className={cx(
        'inline-flex items-center font-medium whitespace-nowrap border',
        pill ? 'rounded-full' : 'rounded-md',
        SIZES[size] ?? SIZES.sm,
        outline
          ? cx('bg-transparent', tone.text, tone.border)
          : cx(tone.soft, tone.text, 'border-transparent'),
        className,
      )}
      {...rest}
    >
      {dot && <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', DOTS[key])} />}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}

export { Badge };
