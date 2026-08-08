/**
 * SuperAdmin/Organizations/Index.jsx — Parc des organisations clientes
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia (`organizations`, `stats`,
 * `filters`), mêmes navigations `router.get('/superadmin/organisations', …)`,
 * même export CSV serveur, même recherche avec anti-rebond de 500 ms.
 *
 * Nettoyage sans effet fonctionnel : import `axios` et états `loading` /
 * `setPage` jamais utilisés supprimés.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Head, router, Link } from '@inertiajs/react'
import { Building2, Search, Download, Eye, KeyRound, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, DataTable, EmptyState,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI'

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const STATUS_META = {
  active:    { label: 'Actif',    tone: 'success' },
  trial:     { label: 'Essai',    tone: 'info' },
  suspended: { label: 'Suspendu', tone: 'danger' },
  expired:   { label: 'Expiré',   tone: 'neutral' },
}

const PLAN_TONE = { starter: 'neutral', pro: 'info', enterprise: 'accent' }

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */

const MOCK_ORGS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: ['Banque Nationale CI', 'Cabinet Konan & Assoc.', 'ONG Green Africa', 'Hôtel Ivoire Palace', 'TechCorp Dakar', 'Pharmacie Pro', 'Media Group Abidjan', 'Energie Solaire RDC', 'Logistique Express', 'Cabinet Dentaire Cotonou'][i % 10],
  country: ['CI', 'SN', 'CM', 'BJ', 'TG', 'BF', 'ML', 'GN', 'CD', 'MG'][i % 10],
  plan: ['Starter', 'Pro', 'Enterprise'][i % 3],
  status: ['active', 'trial', 'suspended', 'expired'][i % 4],
  users_count: [85, 12, 5, 28, 42, 15, 7, 33, 19, 60][i % 10],
  storage_mb: [2048, 512, 128, 4096, 1024, 256, 384, 768, 1536, 3072][i % 10],
  last_login_at: new Date(Date.now() - i * 3600000 * 6).toISOString(),
  created_at: new Date(Date.now() - i * 86400000 * 30).toISOString(),
}))

const MOCK_STATS = { total: 47, active: 31, trial: 8, suspended: 5, expired: 3 }

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function OrganizationsIndex({ organizations: propOrgs, stats: propStats, filters: propFilters }) {
  const [orgs]                = useState(propOrgs?.data ?? MOCK_ORGS)
  const [stats]               = useState(propStats ?? MOCK_STATS)
  const [search, setSearch]   = useState(propFilters?.search ?? '')
  const [status, setStatus]   = useState(propFilters?.status ?? '')
  const [plan, setPlan]       = useState(propFilters?.plan ?? '')
  const [country, setCountry] = useState(propFilters?.country ?? '')

  const page       = propOrgs?.current_page ?? 1
  const totalPages = propOrgs?.last_page ?? Math.ceil(MOCK_ORGS.length / 20)

  const exportCsv = () => {
    const params = new URLSearchParams({ search, status, plan, country }).toString()
    window.open(`/superadmin/organisations/export?${params}`)
  }

  const applyFilters = useCallback(() => {
    router.get('/superadmin/organisations', { search, status, plan, country, page: 1 }, { preserveState: true })
  }, [search, status, plan, country])

  // Recherche avec anti-rebond (uniquement quand les données viennent du serveur)
  useEffect(() => {
    if (!propOrgs) return
    const t = setTimeout(applyFilters, 500)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmtDate = d =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const fmtStorage = mb => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} Go` : `${mb} Mo`)

  const isFiltered = Boolean(search || status || plan || country)

  const resetFilters = () => {
    setSearch(''); setStatus(''); setPlan(''); setCountry('')
    router.get('/superadmin/organisations', {}, { preserveState: true })
  }

  const goToPage = (target) =>
    router.get('/superadmin/organisations', { search, status, plan, country, page: target }, { preserveState: true })

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'name',
      label: 'Organisation',
      render: (v, org) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
            {String(v ?? '?')[0].toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className={cx('max-w-[200px] truncate font-medium', TEXT_TITLE)}>{v}</p>
            <p className={cx('text-xs', TEXT_FAINT, NUM)}>#{org.id}</p>
          </div>
        </div>
      ),
    },
    { key: 'country', label: 'Pays', nowrap: true, className: cx('font-mono text-xs', TEXT_MUTED) },
    {
      key: 'plan',
      label: 'Plan',
      nowrap: true,
      render: (v) => <Badge variant={PLAN_TONE[v?.toLowerCase()] ?? 'neutral'}>{v ?? '—'}</Badge>,
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const meta = STATUS_META[v] ?? { label: v, tone: 'neutral' }
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>
      },
    },
    { key: 'users_count', label: 'Utilisateurs', numeric: true, nowrap: true },
    {
      key: 'storage_mb',
      label: 'Stockage',
      numeric: true,
      nowrap: true,
      render: (v) => fmtStorage(v ?? 0),
    },
    {
      key: 'last_login_at',
      label: 'Dernière connexion',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (v) => fmtDate(v),
    },
  ]

  return (
    <SuperAdminLayout title="Organisations">
      <Head title="Organisations — Super Admin" />

      <PageHeader
        icon={Building2}
        title="Organisations"
        subtitle="Parc complet des organisations clientes de la plateforme."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Organisations' }]}
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv}>
            Exporter CSV
          </Button>
        }
      />

      <div className="space-y-6">

        {/* ── Répartition ───────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Total',      value: stats.total,     cls: TEXT_TITLE },
            { label: 'Actives',    value: stats.active,    cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'En essai',   value: stats.trial,     cls: 'text-sky-600 dark:text-sky-400' },
            { label: 'Suspendues', value: stats.suspended, cls: 'text-red-600 dark:text-red-400' },
            { label: 'Expirées',   value: stats.expired,   cls: TEXT_MUTED },
          ].map(s => (
            <div key={s.label} className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 shadow-sm')}>
              <p className={cx('text-xs font-medium', TEXT_MUTED)}>{s.label}</p>
              <p className={cx('mt-0.5 text-2xl font-semibold tracking-tight', NUM, s.cls)}>{s.value ?? 0}</p>
            </div>
          ))}
        </section>

        {/* ── Filtres ───────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nom, email ou identifiant…"
                aria-label="Rechercher une organisation"
                className={cx(CONTROL, 'h-10 pl-9')}
              />
            </div>

            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value)
                router.get('/superadmin/organisations', { search, status: e.target.value, plan, country }, { preserveState: true })
              }}
              aria-label="Filtrer par statut"
              className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="trial">Essai</option>
              <option value="suspended">Suspendu</option>
              <option value="expired">Expiré</option>
            </select>

            <select
              value={plan}
              onChange={e => {
                setPlan(e.target.value)
                router.get('/superadmin/organisations', { search, status, plan: e.target.value, country }, { preserveState: true })
              }}
              aria-label="Filtrer par plan"
              className={cx(CONTROL, 'h-10 w-auto min-w-[160px]')}
            >
              <option value="">Tous les plans</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>

            <input
              value={country}
              onChange={e => setCountry(e.target.value)}
              onBlur={applyFilters}
              placeholder="Pays (CI, SN…)"
              aria-label="Filtrer par pays"
              className={cx(CONTROL, 'h-10 w-32')}
            />

            {isFiltered && (
              <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
            )}
          </div>
        </Card>

        {/* ── Tableau ───────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={orgs}
          rowKey="id"
          pageSize={propOrgs?.per_page ?? 20}
          totalItems={propOrgs?.total ?? orgs.length}
          actions={(org) => (
            <>
              <Button
                as={Link} href={`/superadmin/organisations/${org.id}`}
                variant="ghost" size="sm" iconOnly icon={Eye}
                title="Voir le détail"
              />
              <Button
                as={Link} href={`/superadmin/organisations/${org.id}?tab=licence`}
                variant="ghost" size="sm" iconOnly icon={KeyRound}
                title="Gérer la licence"
              />
              <Button
                as={Link} href={`/superadmin/organisations/${org.id}?action=message`}
                variant="ghost" size="sm" iconOnly icon={Mail}
                title="Envoyer un message"
              />
            </>
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucune organisation ne correspond"
                description="Aucun résultat pour cette recherche ou cette combinaison de filtres."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={Building2}
                title="Aucune organisation"
                description="Les organisations clientes de la plateforme apparaîtront ici dès leur création."
              />
            )
          }
          footer={totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                Page {page} sur {totalPages} · {stats.total} organisations
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                  title="Page précédente"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                />
                <Button
                  variant="secondary" size="sm" iconOnly icon={ChevronRight}
                  title="Page suivante"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                />
              </div>
            </div>
          ) : null}
        />

      </div>
    </SuperAdminLayout>
  )
}

export { OrganizationsIndex };
