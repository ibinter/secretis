/**
 * SECRETIS ERP — Skeleton
 *
 * États de chargement. Toujours préférer un squelette à un « Chargement… »
 * centré : la page garde sa forme, l'utilisateur ne perd pas ses repères.
 *
 * <Skeleton className="h-4 w-32" />
 * <SkeletonText lines={3} />
 * <SkeletonTableRows rows={5} cols={6} />
 * <SkeletonStatCards count={4} />
 */

import React from 'react';
import { cx, SURFACE, BORDER } from './tokens';

const BASE = 'animate-pulse bg-gray-200 dark:bg-white/[0.08]';

export default function Skeleton({ className = '', rounded = 'rounded', ...rest }) {
  return <div className={cx(BASE, rounded, className)} aria-hidden="true" {...rest} />;
}

/** Paragraphe : n lignes, la dernière plus courte. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={cx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cx(BASE, 'h-3 rounded')}
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

/** Lignes de tableau — à insérer dans un <tbody>. */
export function SkeletonTableRows({ rows = 5, cols = 4, className = '' }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className={className}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <div className={cx(BASE, 'h-3.5 rounded')} style={{ width: c === 0 ? '70%' : '45%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Grille de tuiles KPI en chargement. */
export function SkeletonStatCards({ count = 4, className = '' }) {
  return (
    <div className={cx('grid grid-cols-2 xl:grid-cols-4 gap-4', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 shadow-sm')}>
          <div className="flex items-start justify-between gap-3">
            <div className={cx(BASE, 'h-3 w-20 rounded')} />
            <div className={cx(BASE, 'h-8 w-8 rounded-lg')} />
          </div>
          <div className={cx(BASE, 'mt-3 h-6 w-16 rounded')} />
        </div>
      ))}
    </div>
  );
}

/** Bloc carte générique. */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 sm:p-6 shadow-sm', className)} aria-hidden="true">
      <div className={cx(BASE, 'h-4 w-1/3 rounded')} />
      <div className="mt-4"><SkeletonText lines={3} /></div>
    </div>
  );
}

export { Skeleton };
