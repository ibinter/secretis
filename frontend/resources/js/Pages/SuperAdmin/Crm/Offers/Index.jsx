/**
 * SuperAdmin/Crm/Offers/Index.jsx — Offres commerciales
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST /superadmin/crm/offers/{id}/send`,
 *  `POST /superadmin/crm/offers/{id}/duplicate`), mêmes liens PDF,
 * même prop Inertia `offers`.
 *
 * Correction bloquante : `duplicateOffer` appelait `router.post(…)` alors que
 * `router` n'était pas importé — le bouton « Dupliquer » levait une
 * `ReferenceError`. L'import manquant a été ajouté.
 */

import React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import { FileText, Plus, Mail, Copy, ArrowRight, AlertTriangle } from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, StatCard, DataTable, EmptyState,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI'

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const STATUS_META = {
  draft:    { label: 'Brouillon', tone: 'neutral' },
  sent:     { label: 'Envoyée',   tone: 'info' },
  viewed:   { label: 'Vue',       tone: 'accent' },
  accepted: { label: 'Acceptée',  tone: 'success' },
  refused:  { label: 'Refusée',   tone: 'danger' },
  expired:  { label: 'Expirée',   tone: 'warning' },
}

const PLAN_TONE = { Enterprise: 'accent', Pro: 'info', Starter: 'neutral' }

const MOCK_OFFERS = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  number: `OFF-2026-${String(i + 1).padStart(3, '0')}`,
  prospect_name: ['Awa Diallo', 'Konan N\'Goran', 'Brice Koffi', 'Fatou Touré'][i % 4],
  company: ['MediaGroup CI', 'StartupHub BF', 'TechSN', 'Cabinet RH+'][i % 4],
  software: ['SECRETIS', 'SECRETIS RH'][i % 2],
  plan: ['Starter', 'Pro', 'Enterprise'][i % 3],
  amount: [250000, 750000, 1500000, 450000, 900000, 2000000, 300000, 600000][i],
  currency: 'XOF',
  valid_until: new Date(Date.now() + (30 - i * 5) * 86400000).toISOString(),
  status: ['draft', 'sent', 'viewed', 'accepted', 'refused', 'expired'][i % 6],
  created_at: new Date(Date.now() - i * 86400000 * 4).toISOString(),
}))

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function OffersIndex({ offers: propOffers }) {
  const offers = propOffers ?? MOCK_OFFERS

  const fmtDate = d =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtAmount = v =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v ?? 0)

  const sendOffer = async (id) => {
    try {
      await axios.post(`/superadmin/crm/offers/${id}/send`)
      alert('Offre envoyée par email.')
    } catch {
      alert('Erreur envoi')
    }
  }

  const duplicateOffer = (id) => { router.post(`/superadmin/crm/offers/${id}/duplicate`) }

  const totalDraft      = offers.filter(o => o.status === 'draft').length
  const totalSent       = offers.filter(o => ['sent', 'viewed'].includes(o.status)).length
  const totalAccepted   = offers.filter(o => o.status === 'accepted').length
  const revenuePipeline = offers
    .filter(o => !['refused', 'expired'].includes(o.status))
    .reduce((a, o) => a + (o.amount ?? 0), 0)

  const isExpiringSoon = (o) =>
    new Date(o.valid_until) - Date.now() < 86400000 * 5
    && !['accepted', 'refused', 'expired'].includes(o.status)

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'number',
      label: 'N° d\'offre',
      nowrap: true,
      className: 'font-mono text-xs text-purple-700 dark:text-purple-300',
    },
    {
      key: 'prospect_name',
      label: 'Prospect / client',
      render: (v, o) => (
        <div className="min-w-0">
          <p className={cx('truncate font-medium', TEXT_TITLE)}>{v}</p>
          <p className={cx('truncate text-xs', TEXT_FAINT)}>{o.company}</p>
        </div>
      ),
    },
    { key: 'software', label: 'Logiciel', nowrap: true, className: cx('text-xs', TEXT_MUTED) },
    {
      key: 'plan',
      label: 'Plan',
      nowrap: true,
      render: (v) => <Badge variant={PLAN_TONE[v] ?? 'neutral'}>{v}</Badge>,
    },
    { key: 'amount', label: 'Montant', numeric: true, nowrap: true, render: (v) => fmtAmount(v) },
    {
      key: 'valid_until',
      label: 'Validité',
      nowrap: true,
      render: (v, o) => (
        <span
          className={cx(
            'inline-flex items-center gap-1 text-xs', NUM,
            isExpiringSoon(o) ? 'font-semibold text-red-600 dark:text-red-400' : TEXT_MUTED,
          )}
        >
          {fmtDate(v)}
          {isExpiringSoon(o) && <AlertTriangle className="h-3.5 w-3.5" aria-label="Expire bientôt" />}
        </span>
      ),
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
  ]

  return (
    <SuperAdminLayout title="Offres commerciales">
      <Head title="Offres — CRM Super Admin" />

      <PageHeader
        icon={FileText}
        title="Offres commerciales"
        subtitle="Propositions adressées aux prospects et suivi de leur acceptation."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'CRM' }, { label: 'Offres' }]}
        actions={
          <Button as={Link} href="/superadmin/crm/offers/create" variant="primary" icon={Plus}>
            Nouvelle offre
          </Button>
        }
      />

      <div className="space-y-6">

        {/* ── Indicateurs ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard tone="neutral" label="Brouillons"     value={totalDraft} />
          <StatCard tone="info"    label="En cours"        value={totalSent} />
          <StatCard tone="success" label="Acceptées"       value={totalAccepted} />
          <StatCard tone="accent"  label="Pipeline total"  value={fmtAmount(revenuePipeline)} />
        </section>

        {/* ── Tableau ─────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={offers}
          rowKey="id"
          pageSize={25}
          searchable
          exportable
          filename="offres-commerciales"
          actions={(o) => (
            <>
              <Button
                as="a"
                href={`/superadmin/crm/offers/${o.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost" size="sm" iconOnly icon={FileText}
                title="Ouvrir le PDF"
              />
              {['draft', 'sent', 'viewed'].includes(o.status) && (
                <Button
                  variant="ghost" size="sm" iconOnly icon={Mail}
                  title="Envoyer l'offre par email"
                  onClick={() => sendOffer(o.id)}
                />
              )}
              <Button
                variant="ghost" size="sm" iconOnly icon={Copy}
                title="Dupliquer l'offre"
                onClick={() => duplicateOffer(o.id)}
              />
              {o.status === 'accepted' && (
                <Button
                  as={Link} href={`/superadmin/payments/create?offer=${o.id}`}
                  variant="ghost" size="sm" iconOnly icon={ArrowRight}
                  title="Convertir en commande"
                />
              )}
            </>
          )}
          empty={
            <EmptyState
              icon={FileText}
              title="Aucune offre"
              description="Les propositions commerciales adressées aux prospects apparaîtront ici."
              action={
                <Button as={Link} href="/superadmin/crm/offers/create" variant="primary" icon={Plus}>
                  Créer une offre
                </Button>
              }
            />
          }
        />

      </div>
    </SuperAdminLayout>
  )
}

export { OffersIndex };
