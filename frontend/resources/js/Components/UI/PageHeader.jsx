/**
 * SECRETIS ERP — PageHeader
 *
 * En-tête de page unique pour tout l'ERP. Remplace les hero dégradés, les
 * `text-3xl font-extrabold` et les `text-xl font-bold` qui variaient d'une
 * page à l'autre.
 *
 * Hiérarchie : fil d'ariane (11px) → titre (text-xl/2xl semibold) →
 * sous-titre (sm muted). Actions alignées à droite, alignées sur la ligne
 * du titre en desktop, repliées en dessous en mobile.
 *
 * Props :
 *   title        ReactNode  — obligatoire
 *   subtitle     ReactNode  — une ligne de contexte (compteurs, périmètre…)
 *   icon         Component  — icône lucide-react dans un carré teinté
 *   breadcrumbs  [{ label, href? }]
 *   actions      ReactNode  — boutons (utiliser <Button/>)
 *   meta         ReactNode  — badges / chips placés sous le sous-titre
 *   tabs         ReactNode  — barre d'onglets rattachée au bas de l'en-tête
 *   bordered     boolean    — trait de séparation bas (défaut true)
 */

import { Link } from '@inertiajs/react'
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, FOCUS_RING } from './tokens';

function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Fil d'ariane" className="mb-1.5">
      <ol className="flex flex-wrap items-center gap-1 text-[11px] font-medium">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className={cx('h-3 w-3', TEXT_FAINT)} aria-hidden="true" />}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className={cx(
                    'rounded px-0.5 transition-colors hover:text-purple-600 dark:hover:text-purple-400',
                    TEXT_MUTED, FOCUS_RING,
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={last ? cx('text-gray-700 dark:text-gray-300') : TEXT_MUTED}
                      aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs,
  actions,
  meta,
  tabs,
  bordered  = true,
  className = '',
}) {
  return (
    <header className={cx('mb-6', bordered && cx('border-b pb-5', BORDER), className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {breadcrumbs?.length > 0 && <Breadcrumbs items={breadcrumbs} />}

          <div className="flex items-center gap-3">
            {Icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
                <Icon className="h-[18px] w-[18px] text-purple-600 dark:text-purple-400" aria-hidden="true" />
              </span>
            )}
            <h1 className={cx('text-xl sm:text-2xl font-semibold tracking-tight truncate', TEXT_TITLE)}>
              {title}
            </h1>
          </div>

          {subtitle && (
            <p className={cx('mt-1.5 text-sm leading-5', TEXT_MUTED)}>{subtitle}</p>
          )}

          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:shrink-0">
            {actions}
          </div>
        )}
      </div>

      {tabs && <div className="mt-4 -mb-5">{tabs}</div>}
    </header>
  );
}

export { PageHeader };
