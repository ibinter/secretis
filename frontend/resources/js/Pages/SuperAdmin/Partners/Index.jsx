/**
 * SuperAdmin/Partners/Index.jsx — Programme IBIG PARTNERS
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes routes Ziggy
 * (`superadmin.partners.index|show|approve|suspend|commissions`),
 * mêmes props Inertia (`partners`, `filters`, `stats`), mêmes filtres serveur.
 *
 * Correction majeure : la page importait `@/Layouts/SuperAdminLayout`, qui
 * n'est qu'un composant bouchon rendant `children` sans navigation. Elle
 * utilise désormais `@/Components/Layout/SuperAdminLayout`, comme le reste
 * de la console.
 */

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Handshake, Wallet, Search } from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable, EmptyState,
  cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const STATUS_META = {
  active:     { label: 'Actif',      tone: 'success' },
  pending:    { label: 'En attente', tone: 'warning' },
  suspended:  { label: 'Suspendu',   tone: 'danger' },
  terminated: { label: 'Résilié',    tone: 'neutral' },
};

const TYPE_TONE = {
  reseller: 'accent', integrator: 'info', consultant: 'warning',
  trainer: 'success', affiliate: 'neutral',
};

const TYPE_LABELS = {
  reseller: 'Revendeur', integrator: 'Intégrateur',
  consultant: 'Consultant', trainer: 'Formateur', affiliate: 'Affilié',
};

const COUNTRIES = ['BJ', 'BF', 'CM', 'CF', 'CI', 'CG', 'CD', 'GA', 'GN', 'GQ', 'GW', 'ML', 'NE', 'SN', 'TD', 'TG', 'MG', 'KM'];

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function PartnersIndex({ partners, filters = {}, stats = {} }) {
  const { flash } = usePage().props;
  const [search, setSearch] = useState(filters.search ?? '');
  const [activeTab, setActiveTab] = useState('all');

  function applyFilters(extra = {}) {
    router.get(route('superadmin.partners.index'), { ...filters, search, ...extra }, {
      preserveState: true,
      replace: true,
    });
  }

  const rows = partners?.data ?? [];

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'company_name',
      label: 'Partenaire',
      render: (v, p) => (
        <div className="min-w-0">
          <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{v}</p>
          <p className={cx('truncate text-xs', TEXT_FAINT)}>{p.email}</p>
        </div>
      ),
    },
    {
      key: 'partner_type',
      label: 'Type',
      nowrap: true,
      render: (v, p) => (
        <Badge variant={TYPE_TONE[v] ?? 'neutral'}>
          {p.partner_type_label ?? TYPE_LABELS[v] ?? v}
        </Badge>
      ),
    },
    { key: 'country', label: 'Pays', nowrap: true, className: cx('font-mono text-xs', TEXT_MUTED) },
    { key: 'total_clients', label: 'Clients', numeric: true, nowrap: true },
    { key: 'total_revenue', label: 'MRR généré', numeric: true, nowrap: true, render: (v) => fmt(v) },
    {
      key: 'pending_commissions',
      label: 'Commissions dues',
      numeric: true,
      nowrap: true,
      render: (v) => (v > 0
        ? <span className="font-semibold text-red-600 dark:text-red-400">{fmt(v)}</span>
        : <span className={TEXT_FAINT}>—</span>),
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const meta = STATUS_META[v] ?? { label: v, tone: 'neutral' };
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>;
      },
    },
  ];

  const TABS = [
    { key: 'all',     label: 'Tous les partenaires', count: stats.total_partners },
    { key: 'pending', label: "En attente d'approbation", count: stats.pending_partners },
  ];

  return (
    <SuperAdminLayout title="Partenaires">
      <Head title="Partenaires IBIG PARTNERS" />

      <PageHeader
        icon={Handshake}
        title="Programme IBIG PARTNERS"
        subtitle="Revendeurs, intégrateurs, consultants et formateurs du réseau."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Partenaires' }]}
        actions={
          <Button
            as={Link} href={route('superadmin.partners.commissions')}
            variant="primary" icon={Wallet}
          >
            Commissions
          </Button>
        }
        tabs={
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Filtrer les partenaires">
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    setActiveTab(tab.key);
                    applyFilters({ status: tab.key === 'pending' ? 'pending' : undefined });
                  }}
                  className={cx(
                    'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                      : cx('border-transparent', TEXT_MUTED, 'hover:text-gray-700 dark:hover:text-gray-200'),
                    FOCUS_RING,
                  )}
                >
                  {tab.label}
                  {tab.count > 0 && <Badge variant={active ? 'accent' : 'neutral'}>{tab.count}</Badge>}
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
        {flash?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {flash.error}
          </div>
        )}

        {/* ── Indicateurs ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            tone="success" label="Partenaires actifs"
            value={stats.active_partners ?? 0}
            hint={`sur ${stats.total_partners ?? 0} au total`}
          />
          <StatCard
            tone={(stats.pending_partners ?? 0) > 0 ? 'warning' : 'neutral'}
            label="En attente"
            value={stats.pending_partners ?? 0}
            hint="à approuver"
          />
          <StatCard
            tone="danger" label="Commissions dues"
            value={fmt(stats.commissions_pending)}
            hint="en attente et approuvées"
          />
          <StatCard
            tone="accent" label="MRR généré"
            value={fmt(stats.total_mrr_generated)}
            hint={`${stats.active_referrals ?? 0} clients référés actifs`}
          />
        </section>

        {/* ── Filtres ─────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="Rechercher un partenaire…"
                aria-label="Rechercher un partenaire"
                className={cx(CONTROL, 'h-10 pl-9')}
              />
            </div>

            <select
              value={filters.type ?? ''}
              onChange={e => applyFilters({ type: e.target.value || undefined })}
              aria-label="Filtrer par type de partenaire"
              className={cx(CONTROL, 'h-10 w-auto min-w-[160px]')}
            >
              <option value="">Tous les types</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <select
              value={filters.country ?? ''}
              onChange={e => applyFilters({ country: e.target.value || undefined })}
              aria-label="Filtrer par pays"
              className={cx(CONTROL, 'h-10 w-auto min-w-[140px]')}
            >
              <option value="">Tous les pays</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <Button variant="secondary" onClick={() => applyFilters()}>Filtrer</Button>
          </div>
        </Card>

        {/* ── Tableau ─────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={rows}
          rowKey="id"
          pageSize={partners?.per_page ?? 25}
          totalItems={partners?.total ?? rows.length}
          actions={(p) => (
            <>
              <Button
                as={Link} href={route('superadmin.partners.show', p.id)}
                variant="secondary" size="xs"
              >
                Voir
              </Button>
              {p.status === 'pending' && (
                <Link
                  href={route('superadmin.partners.approve', p.id)}
                  method="post"
                  as="button"
                  className={cx(
                    'inline-flex h-7 items-center rounded-lg border border-transparent bg-purple-600 px-2.5',
                    'text-xs font-medium text-white shadow-sm transition-colors hover:bg-purple-700',
                    FOCUS_RING,
                  )}
                >
                  Approuver
                </Link>
              )}
              {p.status === 'active' && (
                <Link
                  href={route('superadmin.partners.suspend', p.id)}
                  method="post"
                  as="button"
                  className={cx(
                    'inline-flex h-7 items-center rounded-lg border border-transparent px-2.5 text-xs font-medium',
                    'text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
                    FOCUS_RING,
                  )}
                >
                  Suspendre
                </Link>
              )}
            </>
          )}
          empty={
            <EmptyState
              icon={Handshake}
              title="Aucun partenaire"
              description="Les candidatures au programme partenaire apparaîtront ici."
            />
          }
          footer={partners?.last_page > 1 ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className={cx('text-xs', TEXT_MUTED, NUM)}>
                {partners.from}–{partners.to} sur {partners.total} partenaires
              </span>
              <div className="flex gap-2">
                {partners.prev_page_url && (
                  <Button as={Link} href={partners.prev_page_url} variant="secondary" size="sm">
                    Précédent
                  </Button>
                )}
                {partners.next_page_url && (
                  <Button as={Link} href={partners.next_page_url} variant="secondary" size="sm">
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

export { PartnersIndex };
