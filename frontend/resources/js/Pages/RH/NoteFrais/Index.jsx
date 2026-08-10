/**
 * RH/NoteFrais/Index.jsx — Liste des notes de frais
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique inchangée : mêmes props Inertia, mêmes noms de routes
 * (`rh.notes-de-frais.*`), même filtre serveur par statut.
 */

import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Receipt, Plus, Clock, CheckCircle2, XCircle, Send, Banknote,
} from 'lucide-react';
import { formatAmount } from '@/hooks/useCurrency';
import {
  PageHeader, Button, Badge, DataTable, EmptyState,
  cx, SURFACE, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

/**
 * Statuts métier — tons sémantiques, jamais l'accent violet.
 * Les clés servent aussi de valeur au filtre serveur : ne pas les renommer.
 */
const STATUSES = {
  draft:     { label: 'Brouillon', tone: 'neutral', icon: Clock },
  submitted: { label: 'Soumise',   tone: 'warning', icon: Send },
  approved:  { label: 'Approuvée', tone: 'info',    icon: CheckCircle2 },
  rejected:  { label: 'Refusée',   tone: 'danger',  icon: XCircle },
  paid:      { label: 'Payée',     tone: 'success', icon: Banknote },
};

function StatusBadge({ status }) {
  const cfg = STATUSES[status] ?? STATUSES.draft;
  return <Badge variant={cfg.tone} icon={cfg.icon}>{cfg.label}</Badge>;
}

function employeeName(emp) {
  if (!emp) return '—';
  return emp.name ?? (`${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || '—');
}

const reportTotal = (r) => Number(r.items_sum_amount ?? r.total_amount ?? 0);

export default function NoteFraisIndex({ reports = {}, employee = null, filters = {} }) {
  const [status, setStatus] = useState(filters.status ?? '');

  const items = reports.data ?? [];
  const meta  = reports.meta ?? reports;

  function applyFilter(newStatus) {
    setStatus(newStatus);
    router.get(route('rh.notes-de-frais.index'), { status: newStatus || undefined }, { preserveScroll: true });
  }

  // Total affiché sur la page courante
  const pageTotal = items.reduce((sum, r) => sum + reportTotal(r), 0);
  const currency  = items[0]?.currency ?? 'XOF';

  const columns = [
    {
      key: 'title',
      label: 'Note de frais',
      render: (_v, r) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
            <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link
              href={route('rh.notes-de-frais.show', r.id)}
              className={cx('block truncate font-medium rounded transition-colors',
                TEXT_TITLE, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING)}
            >
              {r.title || 'Sans titre'}
            </Link>
            <p className={cx('truncate text-xs', TEXT_MUTED)}>{employeeName(r.employee)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'period_month',
      label: 'Période',
      nowrap: true,
      className: NUM,
      render: (v) => v || <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'items_sum_amount',
      label: 'Montant',
      numeric: true,
      nowrap: true,
      render: (_v, r) => formatAmount(reportTotal(r), r.currency ?? 'XOF', 'fr'),
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => <StatusBadge status={v} />,
    },
  ];

  const isFiltered = Boolean(status);

  return (
    <AuthLayout>
      <Head title="Notes de frais" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={Receipt}
          title="Notes de frais"
          breadcrumbs={[
            { label: 'Ressources Humaines', href: route('rh.index') },
            { label: 'Notes de frais' },
          ]}
          subtitle={
            items.length > 0
              ? `${items.length} note${items.length > 1 ? 's' : ''} affichée${items.length > 1 ? 's' : ''} · ${formatAmount(pageTotal, currency, 'fr')}`
              : 'Remboursements et justificatifs de dépenses'
          }
          actions={
            <Button as={Link} href={route('rh.notes-de-frais.index')} variant="primary" icon={Plus}>
              Nouvelle note
            </Button>
          }
        />

        {/* Filtres par statut */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[['', 'Toutes'], ...Object.entries(STATUSES).map(([s, cfg]) => [s, cfg.label])].map(([value, label]) => {
            const isActive = status === value;
            return (
              <button
                key={value || 'all'}
                type="button"
                onClick={() => applyFilter(value)}
                aria-pressed={isActive}
                className={cx(
                  'inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-transparent bg-purple-600 text-white'
                    : cx(BORDER, SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                  FOCUS_RING,
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tableau */}
        <DataTable
          columns={columns}
          data={items}
          rowKey="id"
          pageSize={items.length || 15}
          totalItems={items.length}
          onRowClick={(r) => router.visit(route('rh.notes-de-frais.show', r.id))}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucune note pour ce statut"
                description="Aucune note de frais ne correspond au filtre sélectionné."
                action={<Button variant="secondary" onClick={() => applyFilter('')}>Voir toutes les notes</Button>}
              />
            ) : (
              <EmptyState
                icon={Receipt}
                title="Aucune note de frais"
                description="Déclarez ici vos dépenses professionnelles : transport, hébergement, repas. Chaque ligne peut porter son justificatif."
                hints={[
                  'Une note reste modifiable tant qu’elle est en brouillon.',
                  'La soumission déclenche la validation par votre responsable.',
                ]}
                action={
                  <Button as={Link} href={route('rh.notes-de-frais.index')} variant="primary" icon={Plus}>
                    Créer une première note
                  </Button>
                }
              />
            )
          }
          footer={
            (meta.links ?? []).filter(l => l.label !== '...' && l.url).length > 2 ? (
              <div className="flex flex-wrap items-center justify-center gap-1 px-4 py-3">
                {(meta.links ?? []).map((link, i) => (
                  <Link
                    key={i}
                    href={link.url ?? '#'}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    className={cx(
                      'min-w-[32px] rounded-lg border px-2.5 py-1.5 text-center text-xs font-medium transition-colors',
                      link.active
                        ? 'border-transparent bg-purple-600 text-white'
                        : cx(BORDER, SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                      !link.url && 'pointer-events-none opacity-40',
                      FOCUS_RING,
                    )}
                  />
                ))}
              </div>
            ) : null
          }
        />
      </div>
    </AuthLayout>
  );
}
