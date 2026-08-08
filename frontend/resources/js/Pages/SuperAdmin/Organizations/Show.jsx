/**
 * SuperAdmin/Organizations/Show.jsx — Fiche d'une organisation cliente
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST /superadmin/organisations/{id}/{action}` avec justification,
 *  `POST …/send-message`, `POST …/impersonate`, export RGPD),
 * mêmes onglets, mêmes états locaux, mêmes props Inertia.
 *
 * Nettoyage : les composants locaux `Card` et `Modal` masquaient ceux du
 * système de composants ; ils sont remplacés par `Card` de `@/Components/UI`
 * et un conteneur modal local nommé `ActionDialog`.
 */

import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  ArrowLeft, ShieldCheck, Ban, Gift, Mail, Download, Eye, Clock, User,
  AlertTriangle, X, KeyRound,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, DataTable,
  cx, BORDER, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */

const MOCK_ORG = {
  id: 1,
  name: 'Banque Nationale CI',
  email: 'admin@bnci.ci',
  country: 'CI',
  sector: 'Finance / Banque',
  language: 'fr',
  status: 'active',
  plan: { name: 'Enterprise', slug: 'enterprise' },
  users_count: 85,
  created_at: '2025-01-15T10:00:00Z',
  trial_ends_at: null,
  license_expires_at: '2027-01-15T00:00:00Z',
  settings: { modules: ['rh', 'compta', 'ged', 'crm', 'fleet'] },
  users: Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: ['Kouadio N\'Goran', 'Amenan Konaté', 'Brice Koffi', 'Aya Diallo', 'Jean-Marc Ettien'][i],
    email: [`user${i + 1}@bnci.ci`],
    role: ['admin', 'manager', 'user', 'user', 'comptable'][i],
    last_login_at: new Date(Date.now() - i * 86400000).toISOString(),
    mfa_enabled: i < 3,
  })),
  payments: Array.from({ length: 4 }, (_, i) => ({
    id: i + 1,
    amount: [850000, 850000, 750000, 750000][i],
    status: ['validated', 'validated', 'validated', 'pending'][i],
    created_at: new Date(Date.now() - i * 90 * 86400000).toISOString(),
    proof_file: `receipt_${i + 1}.pdf`,
  })),
}

const MOCK_AUDIT = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  action: ['user.login', 'invoice.created', 'document.uploaded', 'employee.created', 'report.exported'][i % 5],
  user_name: ['Kouadio N\'Goran', 'Amenan Konaté', 'Brice Koffi'][i % 3],
  ip_address: `41.66.${i}.${(i * 7) % 255}`,
  created_at: new Date(Date.now() - i * 3600000).toISOString(),
}))

const TABS = ['Profil', 'Licence', 'Utilisateurs', 'Paiements', 'Activité', 'Actions admin']

const STATUS_META = {
  active:    { label: 'Actif',    tone: 'success' },
  trial:     { label: 'Essai',    tone: 'info' },
  suspended: { label: 'Suspendu', tone: 'danger' },
  expired:   { label: 'Expiré',   tone: 'neutral' },
}

const ACTION_LABELS = {
  extend:      'Prolonger la licence',
  grace:       'Accorder une période de grâce',
  suspend:     "Suspendre l'organisation",
  revoke:      'Révoquer la licence',
  'reset-mfa': "Réinitialiser l'authentification à deux facteurs",
}

/* ─── Sous-composants ──────────────────────────────────────────────────────── */

function Row({ label, value }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 border-b py-2.5 last:border-0', 'border-gray-100 dark:border-[#1E3048]')}>
      <span className={cx('text-xs font-medium', TEXT_MUTED)}>{label}</span>
      <span className={cx('text-sm text-right', TEXT_BODY)}>{value ?? '—'}</span>
    </div>
  )
}

function AdminAction({ icon: Icon, label, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        BORDER, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]', FOCUS_RING,
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
        <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={cx('block text-sm font-medium', TEXT_TITLE)}>{label}</span>
        <span className={cx('mt-0.5 block text-xs', TEXT_MUTED)}>{desc}</span>
      </span>
    </button>
  )
}

function ActionDialog({ title, onClose, children, footer }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
        <Card
          padded={false}
          className="shadow-xl"
          title={title}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={footer}
        >
          <div className="px-4 py-5 sm:px-6">{children}</div>
        </Card>
      </div>
    </div>
  )
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function OrganizationShow({ organization: propOrg, auditLogs: propLogs }) {
  const org       = propOrg ?? MOCK_ORG
  const auditLogs = propLogs ?? MOCK_AUDIT

  const [tab, setTab]                     = useState('Profil')
  const [justification, setJustification] = useState('')
  const [actionModal, setActionModal]     = useState(null)
  const [msgSubject, setMsgSubject]       = useState('')
  const [msgBody, setMsgBody]             = useState('')
  const [saving, setSaving]               = useState(false)
  const [alert, setAlert]                 = useState(null)

  const fmtDate = d =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const fmtAmount = v =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v ?? 0)

  const closeAction = () => { setActionModal(null); setJustification(''); setAlert(null) }

  const doAction = async (action) => {
    if (!justification.trim()) { setAlert('Justification obligatoire.'); return }
    setSaving(true)
    try {
      await axios.post(`/superadmin/organisations/${org.id}/${action}`, { justification })
      setAlert(null)
      setActionModal(null)
      setJustification('')
      router.reload()
    } catch (e) {
      setAlert(e.response?.data?.message ?? 'Erreur serveur')
    } finally {
      setSaving(false)
    }
  }

  const sendMessage = async () => {
    if (!msgSubject || !msgBody) { setAlert('Objet et message obligatoires.'); return }
    setSaving(true)
    try {
      await axios.post(`/superadmin/organisations/${org.id}/send-message`, { subject: msgSubject, body: msgBody })
      setActionModal(null); setMsgSubject(''); setMsgBody(''); setAlert(null)
    } catch {
      setAlert('Erreur envoi')
    } finally {
      setSaving(false)
    }
  }

  const impersonate = () => {
    if (!confirm("Démarrer une prise en main ? L'administrateur de l'organisation sera notifié par email.")) return
    router.post(`/superadmin/organisations/${org.id}/impersonate`)
  }

  const statusMeta = STATUS_META[org.status] ?? { label: org.status, tone: 'neutral' }

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const userColumns = [
    { key: 'name', label: 'Nom', className: cx('font-medium', TEXT_TITLE) },
    {
      key: 'email',
      label: 'Email',
      className: cx('text-xs', TEXT_MUTED),
      render: (v) => (Array.isArray(v) ? v[0] : v),
    },
    { key: 'role', label: 'Rôle', nowrap: true, render: (v) => <Badge variant="neutral">{v}</Badge> },
    {
      key: 'last_login_at',
      label: 'Dernière connexion',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (v) => fmtDate(v),
    },
    {
      key: 'mfa_enabled',
      label: 'MFA',
      align: 'center',
      nowrap: true,
      render: (v) => (v
        ? <Badge variant="success" dot>Actif</Badge>
        : <span className={TEXT_FAINT}>—</span>),
    },
  ]

  const paymentColumns = [
    { key: 'id', label: '#', width: '70px', numeric: true, render: (v) => <span className={TEXT_FAINT}>#{v}</span> },
    { key: 'amount', label: 'Montant', numeric: true, nowrap: true, render: (v) => fmtAmount(v) },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => (v === 'validated'
        ? <Badge variant="success" dot>Validé</Badge>
        : <Badge variant="warning" dot>En attente</Badge>),
    },
    {
      key: 'created_at',
      label: 'Date',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (v) => fmtDate(v),
    },
    {
      key: 'proof_file',
      label: 'Preuve',
      render: (v, p) => (v ? (
        <a
          href={`/superadmin/payments/${p.id}/proof`}
          className={cx('text-xs text-purple-700 hover:underline dark:text-purple-300 rounded', FOCUS_RING)}
        >
          {v}
        </a>
      ) : <span className={TEXT_FAINT}>—</span>),
    },
  ]

  return (
    <SuperAdminLayout title={org.name}>
      <Head title={`${org.name} — Super Admin`} />

      <PageHeader
        title={org.name}
        subtitle={`${org.email} · ${org.country} · créée le ${fmtDate(org.created_at)}`}
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'Organisations', href: '/superadmin/organisations' },
          { label: org.name },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusMeta.tone} size="md" dot>{statusMeta.label}</Badge>
            {org.plan?.name && <Badge variant="accent" size="md">{org.plan.name}</Badge>}
          </div>
        }
        actions={
          <>
            <Button
              as={Link} href="/superadmin/organisations"
              variant="ghost" icon={ArrowLeft}
            >
              Retour
            </Button>
            <Button variant="secondary" icon={Mail} onClick={() => setActionModal('message')}>
              Email
            </Button>
            <Button variant="primary" icon={Eye} onClick={impersonate}>
              Prise en main
            </Button>
          </>
        }
        tabs={
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Sections de la fiche">
            {TABS.map(t => (
              <button
                key={t}
                type="button"
                aria-current={tab === t ? 'page' : undefined}
                onClick={() => setTab(t)}
                className={cx(
                  'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === t
                    ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                    : cx('border-transparent', TEXT_MUTED, 'hover:text-gray-700 dark:hover:text-gray-200'),
                  FOCUS_RING,
                )}
              >
                {t}
              </button>
            ))}
          </nav>
        }
      />

      {/* ── Profil ────────────────────────────────────────────────────────── */}
      {tab === 'Profil' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="Informations de l'organisation">
            <Row label="Nom" value={org.name} />
            <Row label="Email" value={org.email} />
            <Row label="Pays" value={org.country} />
            <Row label="Secteur" value={org.sector} />
            <Row label="Langue" value={org.language?.toUpperCase()} />
            <Row label="Statut" value={<Badge variant={statusMeta.tone} dot>{statusMeta.label}</Badge>} />
          </Card>

          <Card title="Modules actifs">
            <div className="flex flex-wrap gap-2">
              {(org.settings?.modules ?? []).length === 0 ? (
                <p className={cx('text-sm', TEXT_MUTED)}>Aucun module activé.</p>
              ) : (org.settings?.modules ?? []).map(m => (
                <Badge key={m} variant="accent" size="md">{m.toUpperCase()}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Licence ───────────────────────────────────────────────────────── */}
      {tab === 'Licence' && (
        <div className="space-y-6">
          <Card title="Licence en cours">
            <Row label="Plan" value={org.plan?.name} />
            <Row label="Début" value={fmtDate(org.created_at)} />
            <Row label="Expiration" value={fmtDate(org.license_expires_at)} />
            <Row label="Utilisateurs actifs" value={<span className={NUM}>{org.users_count}</span>} />
          </Card>

          <Card title="Actions sur la licence" subtitle="Chaque action est journalisée et requiert une justification.">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={Gift} onClick={() => setActionModal('extend')}>
                Prolonger
              </Button>
              <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={() => setActionModal('grace')}>
                Période de grâce
              </Button>
              <Button variant="secondary" size="sm" icon={Ban} onClick={() => setActionModal('suspend')}>
                Suspendre
              </Button>
              <Button variant="danger" size="sm" icon={AlertTriangle} onClick={() => setActionModal('revoke')}>
                Révoquer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Utilisateurs ──────────────────────────────────────────────────── */}
      {tab === 'Utilisateurs' && (
        <div className="space-y-3">
          <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>
            Utilisateurs ({org.users?.length ?? 0})
          </h2>
          <DataTable
            columns={userColumns}
            data={org.users ?? []}
            rowKey="id"
            pageSize={25}
            emptyMessage="Aucun utilisateur rattaché à cette organisation."
          />
        </div>
      )}

      {/* ── Paiements ─────────────────────────────────────────────────────── */}
      {tab === 'Paiements' && (
        <div className="space-y-3">
          <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>Historique des paiements</h2>
          <DataTable
            columns={paymentColumns}
            data={org.payments ?? []}
            rowKey="id"
            pageSize={25}
            emptyMessage="Aucun paiement enregistré."
          />
        </div>
      )}

      {/* ── Activité ──────────────────────────────────────────────────────── */}
      {tab === 'Activité' && (
        <Card title="Journal d'activité" subtitle="50 dernières actions enregistrées">
          <ul className="divide-y divide-gray-100 dark:divide-[#1E3048]">
            {auditLogs.map(log => (
              <li key={log.id} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-500/10">
                  <User className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx('text-sm', TEXT_BODY)}>
                    <span className={cx('font-medium', TEXT_TITLE)}>{log.user_name}</span>
                    {' · '}
                    <code className={cx('rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-white/[0.06]', TEXT_MUTED)}>
                      {log.action}
                    </code>
                  </p>
                  <p className={cx('mt-0.5 flex items-center gap-1 text-xs', TEXT_FAINT, NUM)}>
                    <Clock className="h-3 w-3" /> {fmtDate(log.created_at)} · {log.ip_address}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Actions admin ─────────────────────────────────────────────────── */}
      {tab === 'Actions admin' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="Actions rapides">
            <div className="space-y-3">
              <AdminAction
                icon={Eye}
                label="Démarrer une prise en main sécurisée"
                desc="Vous serez connecté en tant qu'administrateur principal ; un email d'alerte est envoyé."
                onClick={impersonate}
              />
              <AdminAction
                icon={Mail}
                label="Envoyer un email personnalisé"
                desc="Adresser un message à l'administrateur de l'organisation."
                onClick={() => setActionModal('message')}
              />
              <AdminAction
                icon={KeyRound}
                label="Forcer la réinitialisation MFA"
                desc="L'utilisateur devra reconfigurer son authentification à deux facteurs."
                onClick={() => setActionModal('reset-mfa')}
              />
              <AdminAction
                icon={Download}
                label="Exporter toutes les données (RGPD)"
                desc="Archive ZIP de l'intégralité des données de l'organisation."
                onClick={() => window.open(`/superadmin/organisations/${org.id}/export-data`)}
              />
            </div>
          </Card>

          <Card title="État de la licence">
            <Row label="Statut" value={<Badge variant={statusMeta.tone} dot>{statusMeta.label}</Badge>} />
            <Row label="Expiration" value={fmtDate(org.license_expires_at)} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={Gift} onClick={() => setActionModal('extend')}>
                Prolonger
              </Button>
              <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={() => setActionModal('grace')}>
                Période de grâce
              </Button>
              <Button variant="danger" size="sm" icon={Ban} onClick={() => setActionModal('suspend')}>
                Suspendre
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Confirmation avec justification ───────────────────────────────── */}
      {actionModal && actionModal !== 'message' && (
        <ActionDialog
          title={ACTION_LABELS[actionModal] ?? `Confirmer l'action : ${actionModal}`}
          onClose={closeAction}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeAction}>Annuler</Button>
              <Button variant="primary" loading={saving} onClick={() => doAction(actionModal)}>
                Confirmer
              </Button>
            </div>
          }
        >
          {alert && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {alert}
            </p>
          )}
          <label className="flex flex-col gap-1.5">
            <span className={cx('text-xs font-medium', TEXT_MUTED)}>Justification (obligatoire)</span>
            <textarea
              rows={3}
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Motif de l'action…"
              className={cx(CONTROL, 'resize-none')}
            />
          </label>
        </ActionDialog>
      )}

      {/* ── Envoi d'un email ──────────────────────────────────────────────── */}
      {actionModal === 'message' && (
        <ActionDialog
          title="Envoyer un email à l'organisation"
          onClose={() => setActionModal(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setActionModal(null)}>Annuler</Button>
              <Button variant="primary" loading={saving} onClick={sendMessage}>Envoyer</Button>
            </div>
          }
        >
          {alert && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {alert}
            </p>
          )}
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Objet</span>
              <input
                value={msgSubject}
                onChange={e => setMsgSubject(e.target.value)}
                placeholder="Objet du message"
                className={cx(CONTROL, 'h-10')}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Message</span>
              <textarea
                rows={5}
                value={msgBody}
                onChange={e => setMsgBody(e.target.value)}
                placeholder="Corps du message…"
                className={cx(CONTROL, 'resize-none')}
              />
            </label>
          </div>
        </ActionDialog>
      )}
    </SuperAdminLayout>
  )
}

export { OrganizationShow };
