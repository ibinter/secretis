/**
 * SECRETIS ERP — EmptyState
 *
 * Beaucoup de listes de l'ERP sont vides au démarrage : l'état vide doit
 * être élégant et guider l'utilisateur vers la première action, jamais
 * afficher un simple « Aucune donnée ».
 *
 * Props :
 *   variant      'no-data' | 'no-results' | 'error' | 'loading' | 'locked'
 *   icon         Component lucide-react (prioritaire sur `variant`)
 *   title        string
 *   description  string
 *   action       ReactNode — bouton principal (<Button variant="primary" …/>)
 *   secondary    ReactNode — action secondaire (ex. « Réinitialiser les filtres »)
 *   hints        string[]  — 2-3 puces pédagogiques sous la description
 *   compact      boolean   — padding réduit (dans une carte déjà dense)
 *   inTable      boolean   — rend un <tr><td colSpan> (usage direct en tbody)
 *   colSpan      number    — utilisé avec `inTable`
 */

import React from 'react';
import { Inbox, SearchX, AlertTriangle, Loader2, Lock } from 'lucide-react';
import { cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER } from './tokens';

const VARIANTS = {
  'no-data':    { icon: Inbox,         wrap: 'bg-gray-100 dark:bg-white/[0.06]',  tint: 'text-gray-400 dark:text-gray-500' },
  'no-results': { icon: SearchX,       wrap: 'bg-purple-50 dark:bg-purple-500/10', tint: 'text-purple-500 dark:text-purple-400' },
  'error':      { icon: AlertTriangle, wrap: 'bg-red-50 dark:bg-red-500/10',       tint: 'text-red-500 dark:text-red-400' },
  'loading':    { icon: Loader2,       wrap: 'bg-purple-50 dark:bg-purple-500/10', tint: 'text-purple-600 dark:text-purple-400', spin: true },
  'locked':     { icon: Lock,          wrap: 'bg-amber-50 dark:bg-amber-500/10',   tint: 'text-amber-500 dark:text-amber-400' },
};

function Body({ variant, icon: CustomIcon, title, description, action, secondary, hints, compact }) {
  const meta = VARIANTS[variant] ?? VARIANTS['no-data'];
  const Icon = CustomIcon ?? meta.icon;

  return (
    <div className={cx('flex flex-col items-center text-center px-6', compact ? 'py-8' : 'py-14')}>
      <div className={cx('flex items-center justify-center rounded-xl', meta.wrap, compact ? 'h-11 w-11' : 'h-14 w-14')}>
        <Icon
          className={cx(meta.tint, compact ? 'h-5 w-5' : 'h-6 w-6', meta.spin && 'animate-spin')}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </div>

      {title && (
        <h3 className={cx('mt-4 text-sm font-semibold', TEXT_TITLE)}>{title}</h3>
      )}

      {description && (
        <p className={cx('mt-1 text-sm max-w-sm leading-relaxed', TEXT_MUTED)}>{description}</p>
      )}

      {hints?.length > 0 && (
        <ul className={cx('mt-4 space-y-1 text-xs text-left', TEXT_FAINT)}>
          {hints.map((h, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}

      {(action || secondary) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}

export default function EmptyState({
  variant     = 'no-data',
  icon,
  title       = 'Aucune donnée',
  description = '',
  action,
  secondary,
  hints,
  compact     = false,
  inTable     = false,
  colSpan     = 1,
  bordered    = false,
  className   = '',
}) {
  const body = (
    <Body
      variant={variant} icon={icon} title={title} description={description}
      action={action} secondary={secondary} hints={hints} compact={compact}
    />
  );

  if (inTable) {
    return (
      <tr>
        <td colSpan={colSpan} className={className}>{body}</td>
      </tr>
    );
  }

  return (
    <div className={cx(bordered && cx('border border-dashed rounded-xl', BORDER), className)}>
      {body}
    </div>
  );
}

export { EmptyState };
