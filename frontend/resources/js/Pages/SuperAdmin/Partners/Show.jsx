/**
 * SuperAdmin/Partners/Show.jsx — Fiche d'un partenaire IBIG PARTNERS
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes routes Ziggy, mêmes props Inertia
 * (`partner`, `referrals`, `commissions`), mêmes états locaux.
 *
 * Correction majeure : la page importait `@/Layouts/SuperAdminLayout`, un
 * composant bouchon sans navigation. Elle utilise désormais
 * `@/Components/Layout/SuperAdminLayout`.
 *
 * Le `StatCard` local masquait celui du système de composants : il est
 * remplacé par le `StatCard` partagé.
 */

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Handshake, ArrowLeft, Pencil, X } from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable,
  cx, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const STATUS_META = {
  active:     { label: 'Actif',      tone: 'success' },
  pending:    { label: 'En attente', tone: 'warning' },
  suspended:  { label: 'Suspendu',   tone: 'danger' },
  terminated: { label: 'Résilié',    tone: 'neutral' },
};

const COMM_STATUS_META = {
  pending:  { label: 'En attente', tone: 'warning' },
  approved: { label: 'Approuvée',  tone: 'info' },
  paid:     { label: 'Payée',      tone: 'success' },
};

const REFERRAL_STATUS_META = {
  active:     { label: 'Actif',      tone: 'success' },
  pending:    { label: 'En attente', tone: 'warning' },
  terminated: { label: 'Résilié',    tone: 'neutral' },
};

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);

/* ─── Ligne d'information ──────────────────────────────────────────────────── */

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-[#1E3048]">
      <span className={cx('text-xs', TEXT_MUTED)}>{label}</span>
      <span className={cx('text-right text-sm font-medium', TEXT_BODY, mono && 'font-mono')}>{value ?? '—'}</span>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function PartnersShow({ partner, referrals = [], commissions = [] }) {
  const { flash } = usePage().props;
  const [commissionRate, setCommissionRate] = useState(partner.commission_rate);
  const [editRate, setEditRate]             = useState(false);
  const [activeSection, setActiveSection]   = useState('referrals');

  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const conversionRate  = referrals.length > 0 ? Math.round((activeReferrals / referrals.length) * 100) : 0;

  const statusMeta = STATUS_META[partner.status] ?? { label: partner.status, tone: 'neutral' };

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const referralColumns = [
    { key: 'organization', label: 'Organisation', className: cx('font-medium', TEXT_TITLE) },
    { key: 'plan', label: 'Plan', nowrap: true, render: (v) => <Badge variant="info">{v}</Badge> },
    { key: 'monthly_amount', label: 'MRR', numeric: true, nowrap: true, render: (v) => fmt(v) },
    {
      key: 'commission_monthly',
      label: 'Commission / mois',
      numeric: true,
      nowrap: true,
      render: (v) => <span className="text-emerald-600 dark:text-emerald-400">{fmt(v)}</span>,
    },
    { key: 'referred_at', label: 'Référé le', nowrap: true, className: cx('text-xs', TEXT_MUTED, NUM) },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const meta = REFERRAL_STATUS_META[v] ?? { label: v, tone: 'neutral' };
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>;
      },
    },
  ];

  const commissionColumns = [
    { key: 'period_month', label: 'Période', nowrap: true, className: cx('font-mono', TEXT_TITLE) },
    { key: 'amount', label: 'Montant', numeric: true, nowrap: true, render: (v) => fmt(v) },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const meta = COMM_STATUS_META[v] ?? { label: v, tone: 'neutral' };
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

  const SECTIONS = [
    { key: 'referrals',   label: `Clients référés (${referrals.length})` },
    { key: 'commissions', label: `Commissions (${commissions.length})` },
  ];

  return (
    <SuperAdminLayout title={partner.company_name}>
      <Head title={`Partenaire — ${partner.company_name}`} />

      <PageHeader
        icon={Handshake}
        title={partner.company_name}
        subtitle={`${partner.partner_type_label} · ${partner.country}`}
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'Partenaires', href: route('superadmin.partners.index') },
          { label: partner.company_name },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusMeta.tone} size="md" dot>{statusMeta.label}</Badge>
            <span className={cx('text-xs', TEXT_MUTED)}>
              Code de parrainage :{' '}
              <code className={cx('rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-white/[0.06]', TEXT_BODY)}>
                {partner.referral_code}
              </code>
            </span>
          </div>
        }
        actions={
          <>
            <Button as={Link} href={route('superadmin.partners.index')} variant="ghost" icon={ArrowLeft}>
              Retour
            </Button>
            {partner.status === 'pending' && (
              <Link
                href={route('superadmin.partners.approve', partner.id)}
                method="post"
                as="button"
                className={cx(
                  'inline-flex h-10 items-center rounded-lg border border-transparent bg-purple-600 px-4',
                  'text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700',
                  FOCUS_RING,
                )}
              >
                Approuver
              </Link>
            )}
            {(partner.status === 'active' || partner.status === 'pending') && (
              <Link
                href={route('superadmin.partners.suspend', partner.id)}
                method="post"
                as="button"
                className={cx(
                  'inline-flex h-10 items-center rounded-lg border border-transparent bg-red-600 px-4',
                  'text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700',
                  FOCUS_RING,
                )}
              >
                Suspendre
              </Link>
            )}
          </>
        }
        tabs={
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Sections de la fiche">
            {SECTIONS.map(tab => {
              const active = activeSection === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveSection(tab.key)}
                  className={cx(
                    'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                      : cx('border-transparent', TEXT_MUTED, 'hover:text-gray-700 dark:hover:text-gray-200'),
                    FOCUS_RING,
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        }
      />

      <div className="space-y-6">

        {flash?.success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            {flash.success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Colonne d'identité ────────────────────────────────────────── */}
          <div className="space-y-4 lg:col-span-1">

            <Card title="Informations partenaire">
              {[
                ['Contact', partner.contact_name],
                ['Email', partner.email],
                ['Téléphone', partner.phone],
                ['Pays', partner.country],
                ['Type', partner.partner_type_label],
                ['Compte SECRETIS', partner.user_name ?? 'Aucun'],
                ['Approuvé le', partner.approved_at],
                ['Approuvé par', partner.approved_by_name],
                ['Membre depuis', partner.created_at],
              ].map(([k, v]) => <Row key={k} label={k} value={v} />)}
            </Card>

            <Card
              title="Taux de commission"
              actions={
                <Button
                  variant="ghost" size="xs"
                  icon={editRate ? X : Pencil}
                  onClick={() => setEditRate(v => !v)}
                >
                  {editRate ? 'Annuler' : 'Modifier'}
                </Button>
              }
            >
              {editRate ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    router.patch(route('superadmin.partners.show', partner.id), { commission_rate: commissionRate });
                    setEditRate(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="number" min="0" max="50" step="0.5"
                    value={commissionRate}
                    onChange={e => setCommissionRate(e.target.value)}
                    aria-label="Taux de commission en pourcentage"
                    className={cx(CONTROL, 'h-10 w-24', NUM)}
                  />
                  <span className={cx('text-sm', TEXT_MUTED)}>%</span>
                  <Button type="submit" variant="primary" size="sm">Enregistrer</Button>
                </form>
              ) : (
                <p className={cx('text-3xl font-semibold tracking-tight', TEXT_TITLE, NUM)}>
                  {partner.commission_rate} %
                </p>
              )}
            </Card>

            <Card title="Coordonnées bancaires">
              {[
                ['Banque', partner.bank_name],
                ['Compte', partner.bank_account_masked],
                ['IBAN', partner.bank_iban_masked],
              ].map(([k, v]) => <Row key={k} label={k} value={v} mono />)}
            </Card>
          </div>

          {/* ── Colonne d'activité ────────────────────────────────────────── */}
          <div className="space-y-4 lg:col-span-2">

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard tone="success" label="Clients actifs"   value={activeReferrals} />
              <StatCard tone="accent"  label="Taux conversion"  value={conversionRate} unit="%" />
              <StatCard tone="info"    label="MRR généré"       value={fmt(partner.total_revenue)} />
              <StatCard tone="warning" label="Commissions versées" value={fmt(partner.total_commissions)} />
            </div>

            <StatCard
              tone={partner.pending_commissions > 0 ? 'danger' : 'neutral'}
              label="Commissions en attente"
              value={fmt(partner.pending_commissions)}
              hint="en attente et approuvées"
            />

            {partner.notes && (
              <Card title="Notes et dossier de candidature">
                <pre className={cx('whitespace-pre-wrap font-sans text-xs leading-relaxed', TEXT_BODY)}>
                  {partner.notes}
                </pre>
              </Card>
            )}
          </div>
        </div>

        {/* ── Sections ────────────────────────────────────────────────────── */}
        {activeSection === 'referrals' && (
          <DataTable
            columns={referralColumns}
            data={referrals}
            rowKey="id"
            pageSize={25}
            emptyMessage="Aucun client référé par ce partenaire."
          />
        )}

        {activeSection === 'commissions' && (
          <DataTable
            columns={commissionColumns}
            data={commissions}
            rowKey="id"
            pageSize={25}
            emptyMessage="Aucune commission enregistrée."
          />
        )}

      </div>
    </SuperAdminLayout>
  );
}

export { PartnersShow };
