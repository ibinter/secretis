/**
 * SECRETIS ERP — Card
 *
 * Conteneur de section standard : surface, bordure subtile, rounded-xl,
 * ombre légère. Deux modes d'utilisation :
 *
 *   1. API compacte (recommandée) :
 *      <Card title="Filtres" subtitle="…" actions={<Button …/>}>…</Card>
 *
 *   2. API composée (compatible shadcn/ui, déjà utilisée par
 *      Pages/BI/CurrencyReport.jsx et Pages/Parametres/Localisation.jsx) :
 *      <Card><CardHeader><CardTitle/></CardHeader><CardContent/></Card>
 *
 * Props (API compacte) :
 *   title, subtitle   ReactNode
 *   icon              Component lucide-react affiché près du titre
 *   actions           ReactNode aligné à droite de l'en-tête
 *   footer            ReactNode dans un pied séparé
 *   padded            boolean — padding interne du corps (défaut true)
 *   flush             boolean — corps sans padding (tableaux pleine largeur)
 *   bodyClassName     string
 */

import React from 'react';
import { cx, SURFACE, BORDER, TEXT_TITLE, TEXT_MUTED, SURFACE_SUNK } from './tokens';

export default function Card({
  title,
  subtitle,
  icon: Icon,
  actions,
  footer,
  padded = true,
  flush  = false,
  className     = '',
  bodyClassName = '',
  children,
  ...rest
}) {
  const hasHeader = Boolean(title || subtitle || actions);
  const bodyPad   = flush ? '' : padded ? 'p-4 sm:p-6' : '';

  return (
    <section
      className={cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm overflow-hidden', className)}
      {...rest}
    >
      {hasHeader && (
        <header className={cx(
          'flex flex-wrap items-start justify-between gap-3 px-4 sm:px-6 py-4',
          'border-b', BORDER,
        )}>
          <div className="min-w-0 flex items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
                <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className={cx('text-base font-semibold leading-6 truncate', TEXT_TITLE)}>
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className={cx('text-sm mt-0.5', TEXT_MUTED)}>{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}

      <div className={cx(bodyPad, bodyClassName)}>{children}</div>

      {footer && (
        <footer className={cx('px-4 sm:px-6 py-3 border-t', BORDER, SURFACE_SUNK)}>
          {footer}
        </footer>
      )}
    </section>
  );
}

/* ─── API composée (compatibilité shadcn/ui) ───────────────────────────────── */

export const CardHeader = ({ className = '', ...p }) => (
  <div className={cx('px-4 sm:px-6 py-4 border-b', BORDER, className)} {...p} />
);

export const CardTitle = ({ className = '', ...p }) => (
  <h3 className={cx('text-base font-semibold leading-6', TEXT_TITLE, className)} {...p} />
);

export const CardDescription = ({ className = '', ...p }) => (
  <p className={cx('text-sm mt-0.5', TEXT_MUTED, className)} {...p} />
);

export const CardContent = ({ className = '', ...p }) => (
  <div className={cx('px-4 sm:px-6 py-4', className)} {...p} />
);

export const CardFooter = ({ className = '', ...p }) => (
  <div className={cx('px-4 sm:px-6 py-3 border-t', BORDER, SURFACE_SUNK, className)} {...p} />
);

export { Card };
