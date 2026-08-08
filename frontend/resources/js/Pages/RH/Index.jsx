/**
 * RH/Index.jsx — Tableau de bord RH SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique inchangée : mêmes props Inertia, mêmes noms de routes.
 *
 * Props Inertia : stats { total_employees, total_departments, pending_leaves }
 */

import { Head, Link } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Users, Building2, Calendar, ClipboardList,
  TreePine, Receipt, ChevronRight, UserCheck, AlertCircle,
} from 'lucide-react';
import {
  PageHeader, StatCard, Badge,
  cx, SURFACE, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, FOCUS_RING,
} from '@/Components/UI';

/** Carte de navigation vers un sous-module RH. */
function ModuleCard({ href, icon: Icon, title, description, badge }) {
  return (
    <Link
      href={href}
      className={cx(
        'group flex items-start gap-4 rounded-xl border p-5 shadow-sm transition-colors',
        SURFACE, BORDER,
        'hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-gray-50 dark:hover:bg-white/[0.04]',
        FOCUS_RING,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
        <Icon className="h-[18px] w-[18px] text-purple-600 dark:text-purple-400" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>{title}</h3>
          {badge != null && badge > 0 && (
            <Badge variant="warning">{badge}</Badge>
          )}
        </div>
        <p className={cx('mt-1 text-xs leading-snug', TEXT_MUTED)}>{description}</p>
      </div>

      <ChevronRight
        className={cx('mt-0.5 h-4 w-4 shrink-0 transition-colors', TEXT_FAINT,
          'group-hover:text-purple-600 dark:group-hover:text-purple-400')}
        aria-hidden="true"
      />
    </Link>
  );
}

export default function RhIndex({ stats = {} }) {
  const MODULES = [
    {
      href:        route('rh.personnel.index'),
      icon:        Users,
      title:       'Personnel',
      description: 'Liste des employés, fiches de poste, coordonnées',
    },
    {
      href:        route('rh.organigramme'),
      icon:        TreePine,
      title:       'Organigramme',
      description: 'Hiérarchie et structure de l\'organisation',
    },
    {
      href:        route('rh.conges.index'),
      icon:        Calendar,
      title:       'Congés & Absences',
      description: 'Demandes, approbations et suivi du planning',
      badge:       stats.pending_leaves,
    },
    {
      href:        route('rh.notes-de-frais.index'),
      icon:        Receipt,
      title:       'Notes de frais',
      description: 'Remboursements et justificatifs de dépenses',
    },
    {
      href:        route('rh.planning'),
      icon:        ClipboardList,
      title:       'Planning RH',
      description: 'Vue calendaire des congés et présences',
    },
  ];

  const pending = stats.pending_leaves ?? 0;

  return (
    <AuthLayout>
      <Head title="Ressources Humaines" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={Users}
          title="Ressources Humaines"
          breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Ressources Humaines' }]}
          subtitle="Gestion du personnel, des congés et des notes de frais"
        />

        {/* Indicateurs */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Employés actifs"
            value={stats.total_employees ?? 0}
            icon={UserCheck}
            tone="info"
          />
          <StatCard
            label="Départements"
            value={stats.total_departments ?? 0}
            icon={Building2}
            tone="neutral"
          />
          <StatCard
            label="Congés en attente"
            value={pending}
            icon={AlertCircle}
            tone={pending > 0 ? 'warning' : 'neutral'}
            hint={pending > 0 ? 'À traiter' : 'Rien à traiter'}
          />
        </div>

        {/* Modules */}
        <section>
          <h2 className={cx('mb-3 text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
            Modules
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MODULES.map(m => <ModuleCard key={m.href} {...m} />)}
          </div>
        </section>
      </div>
    </AuthLayout>
  );
}
