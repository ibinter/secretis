/**
 * SuperAdmin/Partners/Commissions.jsx — Commissions du réseau partenaire
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes routes Ziggy
 * (`superadmin.partners.commissions`, `superadmin.partners.commission.pay`,
 *  `superadmin.partners.show|index`), mêmes props Inertia, même export CSV.
 *
 * Correction majeure : la page importait `@/Layouts/SuperAdminLayout`, un
 * composant bouchon sans navigation. Elle utilise désormais
 * `@/Components/Layout/SuperAdminLayout`.
 */

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Wallet, ArrowLeft, Download, X } from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable, EmptyState,
  cx, CONTROL, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const STATUS_META = {
  pending:  { label: 'En attente', tone: 'warning' },
  approved: { label: 'Approuvée',  tone: 'info' },
  paid:     { label: 'Payée',      tone: 'success' },
};

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);

/* ─── Marquer comme payée ──────────────────────────────────────────────────── */

function PayModal({ commission, onClose, onPay }) {
  const [ref, setRef] = useState('');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
        <Card
          padded={false}
          className="shadow-xl"
          title="Marquer la commission comme payée"
          subtitle={`${fmt(commission.amount)} — ${commission.partner_name} · ${commission.period_month}`}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              <Button variant="primary" disabled={!ref.trim()} onClick={() => ref.trim() && onPay(ref.trim())}>
                Confirmer le paiement
              </Button>
            </div>
          }
        >
          <div className="px-4 py-5 sm:px-6">
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Référence de paiement *</span>
              <input
                type="text"
                value={ref}
                onChange={e => setRef(e.target.value)}
                placeholder="ex. VIR-20260701-001"
                className={cx(CONTROL, 'h-10 font-mono')}
              />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function PartnersCommissions({ commissions, filters = {}, summary = {} }) {
  const { flash } = usePage().props;
  const [paying, setPaying] = useState(null);

  function applyFilter(extra = {}) {
    router.get(route('superadmin.partners.commissions'), { ...filters, ...extra }, {
      preserveState: true,
      replace: true,
    });
  }

  function handlePay(ref) {
    router.post(route('superadmin.partners.commission.pay', paying.id), { payment_reference: ref }, {
      onSuccess: () => setPaying(null),
    });
  }

  function exportCsv() {
    window.location.href = `${route('superadmin.partners.commissions')}?export=csv&${new URLSearchParams(filters).toString()}`;
  }

  const rows = commissions?.data ?? [];

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'partner_name',
      label: 'Partenaire',
      render: (v, c) => (
        <Link
          href={route('superadmin.partners.show', c.partner_id)}
          className={cx('rounded text-sm font-medium text-purple-700 hover:underline dark:text-purple-300', FOCUS_RING)}
        >
          {v}
        </Link>
      ),
    },
    { key: 'partner_type', label: 'Type', nowrap: true, className: cx('text-xs', TEXT_MUTED) },
    { key: 'organization', label: 'Organisation' },
    { key: 'period_month', label: 'Période', nowrap: true, className: cx('font-mono text-xs', TEXT_MUTED) },
    { key: 'amount', label: 'Montant', numeric: true, nowrap: true, render: (v) => fmt(v) },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const meta = STATUS_META[v] ?? { label: v, tone: 'neutral' };
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>;
      },
    },
    {
      key: 'paid_at',
      label: 'Payée le',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (v) => v ?? <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'payment_reference',
      label: 'Référence',
      nowrap: true,
      className: cx('font-mono text-xs', TEXT_MUTED),
      render: (v) => v ?? <span className={TEXT_FAINT}>—</span>,
    },
  ];

  return (
    <SuperAdminLayout title="Commissions partenaires">
      <Head title="Commissions partenaires" />

      {paying && <PayModal commission={paying} onClose={() => setPaying(null)} onPay={handlePay} />}

      <PageHeader
        icon={Wallet}
        title="Commissions partenaires"
        subtitle="Suivi et règlement des commissions du réseau."
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'Partenaires', href: route('superadmin.partners.index') },
          { label: 'Commissions' },
        ]}
        actions={
          <>
            <Button as={Link} href={route('superadmin.partners.index')} variant="ghost" icon={ArrowLeft}>
              Retour
            </Button>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Exporter CSV
            </Button>
          </>
        }
      />

      <div className="space-y-6">

        {flash?.success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            {flash.success}
          </div>
        )}

        {/* ── Indicateurs ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard tone="warning" label="En attente"        value={fmt(summary.pending_total)} />
          <StatCard tone="danger"  label="Approuvées à payer" value={fmt(summary.approved_total)} />
          <StatCard tone="success" label="Payées ce mois"     value={fmt(summary.paid_this_month)} />
        </section>

        {/* ── Filtres ─────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.status ?? ''}
              onChange={e => applyFilter({ status: e.target.value || undefined })}
              aria-label="Filtrer par statut"
              className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="paid">Payées</option>
            </select>
          </div>
        </Card>

        {/* ── Tableau ─────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={rows}
          rowKey="id"
          pageSize={commissions?.per_page ?? 25}
          totalItems={commissions?.total ?? rows.length}
          actions={(c) => (
            c.status !== 'paid'
              ? <Button variant="primary" size="xs" onClick={() => setPaying(c)}>Payer</Button>
              : <span className={TEXT_FAINT}>—</span>
          )}
          empty={
            <EmptyState
              icon={Wallet}
              title="Aucune commission"
              description="Les commissions générées par les clients référés apparaîtront ici."
            />
          }
          footer={commissions?.last_page > 1 ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className={cx('text-xs', TEXT_MUTED, NUM)}>
                {commissions.from}–{commissions.to} sur {commissions.total} commissions
              </span>
              <div className="flex gap-2">
                {commissions.prev_page_url && (
                  <Button as={Link} href={commissions.prev_page_url} variant="secondary" size="sm">
                    Précédent
                  </Button>
                )}
                {commissions.next_page_url && (
                  <Button as={Link} href={commissions.next_page_url} variant="secondary" size="sm">
                    Suivant
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        />

      </div>
    </SuperAdminLayout>
  );
}

export { PartnersCommissions };
