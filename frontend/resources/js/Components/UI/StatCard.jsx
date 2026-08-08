/**
 * SECRETIS ERP — StatCard
 *
 * Tuile d'indicateur (KPI). Sobre : icône dans un carré teinté, valeur en
 * chiffres tabulaires, variation optionnelle en couleur sémantique.
 * Pas de dégradé, pas d'ombre lourde — c'est un outil de travail.
 *
 * Props :
 *   label      string     — libellé de l'indicateur
 *   value      ReactNode  — valeur principale
 *   unit       string     — suffixe discret (FCFA, %, j…)
 *   icon       Component  — icône lucide-react
 *   tone       'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
 *   delta      number     — variation ; le signe détermine la couleur
 *   deltaLabel string     — texte affiché à la place de `delta` formaté
 *   deltaGood  'up' | 'down'  — sens considéré comme positif (défaut 'up')
 *   hint       string     — précision sous la valeur
 *   onClick    fn         — rend la tuile cliquable (filtre rapide)
 *   active     boolean    — état sélectionné (anneau violet)
 *   loading    boolean    — squelette
 */

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cx, SURFACE, BORDER, TEXT_TITLE, TEXT_MUTED, NUM, FOCUS_RING, TONES } from './tokens';

export default function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  tone       = 'neutral',
  delta,
  deltaLabel,
  deltaGood  = 'up',
  hint,
  onClick,
  active     = false,
  loading    = false,
  className  = '',
  ...rest
}) {
  const t   = TONES[tone] ?? TONES.neutral;
  const Tag = onClick ? 'button' : 'div';

  const hasDelta  = delta !== undefined && delta !== null && !Number.isNaN(Number(delta));
  const isUp      = hasDelta && Number(delta) > 0;
  const isDown    = hasDelta && Number(delta) < 0;
  const isGood    = deltaGood === 'up' ? isUp : isDown;
  const isBad     = deltaGood === 'up' ? isDown : isUp;
  const DeltaIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  const deltaClass = isGood
    ? 'text-emerald-600 dark:text-emerald-400'
    : isBad
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-500 dark:text-gray-400';

  return (
    <Tag
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={cx(
        SURFACE, 'border rounded-xl p-4 shadow-sm text-left w-full transition-colors',
        active
          ? 'border-purple-300 dark:border-purple-500/50 ring-1 ring-purple-500/30'
          : BORDER,
        onClick && cx('hover:bg-gray-50 dark:hover:bg-white/[0.04]', FOCUS_RING),
        className,
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cx('text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>{label}</p>
        {Icon && (
          <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', t.soft)}>
            <Icon className={cx('h-4 w-4', t.icon)} aria-hidden="true" />
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 h-7 w-20 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
      ) : (
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={cx('text-2xl font-semibold tracking-tight', TEXT_TITLE, NUM)}>
            {value ?? '—'}
          </span>
          {unit && <span className={cx('text-sm font-medium', TEXT_MUTED)}>{unit}</span>}
        </div>
      )}

      {(hasDelta || deltaLabel || hint) && !loading && (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {(hasDelta || deltaLabel) && (
            <span className={cx('inline-flex items-center gap-0.5 font-medium', NUM, deltaClass)}>
              <DeltaIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {deltaLabel ?? `${isUp ? '+' : ''}${delta}%`}
            </span>
          )}
          {hint && <span className={TEXT_MUTED}>{hint}</span>}
        </div>
      )}
    </Tag>
  );
}

export { StatCard };
