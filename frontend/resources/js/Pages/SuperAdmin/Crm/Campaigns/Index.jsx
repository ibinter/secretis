/**
 * SuperAdmin/Crm/Campaigns/Index.jsx — Campagnes de prospection
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST /superadmin/crm/campaigns`, `POST …/{id}/send`), mêmes états
 * locaux, mêmes props Inertia (`campaigns`, `templates`).
 *
 * Le bouton « Nouveau modèle » de l'onglet Modèles n'a toujours aucun
 * gestionnaire : il est conservé tel quel et signalé dans le rapport.
 */

import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import { Send, Plus, Mail, MessageSquare, AlertTriangle, Megaphone } from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const STATUS_META = {
  draft:     { label: 'Brouillon', tone: 'neutral' },
  scheduled: { label: 'Planifiée', tone: 'info' },
  running:   { label: 'En cours',  tone: 'warning' },
  done:      { label: 'Terminée',  tone: 'success' },
  paused:    { label: 'En pause',  tone: 'warning' },
}

const MOCK_CAMPAIGNS = [
  { id: 1, name: 'Relance prospects qualifiés — Juillet 2026', target: 'stage:qualified', type: 'email', start_date: '2026-07-20', end_date: '2026-07-31', status: 'done', sent: 24, opens: 18, clicks: 9, conversions: 3 },
  { id: 2, name: 'Offre estivale Plan Pro −20%', target: 'all', type: 'email', start_date: '2026-08-01', end_date: '2026-08-15', status: 'scheduled', sent: 0, opens: 0, clicks: 0, conversions: 0 },
  { id: 3, name: 'Relance WhatsApp essais expirés', target: 'stage:to_retry', type: 'whatsapp', start_date: '2026-07-15', end_date: '2026-07-23', status: 'running', sent: 12, opens: 0, clicks: 0, conversions: 1 },
  { id: 4, name: 'Séquence onboarding nouveaux prospects', target: 'stage:new', type: 'email', start_date: '2026-07-01', end_date: '2026-09-30', status: 'running', sent: 45, opens: 31, clicks: 14, conversions: 5 },
]

const MOCK_TEMPLATES = [
  { id: 1, name: 'Bienvenue prospect', type: 'email', subject: 'Bienvenue dans l\'univers SECRETIS' },
  { id: 2, name: 'Relance J+3', type: 'email', subject: 'Avez-vous des questions sur SECRETIS ?' },
  { id: 3, name: 'Offre commerciale', type: 'email', subject: 'Votre offre personnalisée SECRETIS' },
  { id: 4, name: 'Rappel essai', type: 'whatsapp', subject: 'Bonjour ! Votre essai se termine bientôt.' },
]

const TABS = [['campaigns', 'Campagnes'], ['templates', 'Modèles de messages']]

const ChannelIcon = ({ type, className }) =>
  type === 'email'
    ? <Mail className={className} aria-hidden="true" />
    : <MessageSquare className={className} aria-hidden="true" />

/* ─── Métrique ─────────────────────────────────────────────────────────────── */

function StatCell({ label, value, pct }) {
  return (
    <div className="text-center">
      <p className={cx('text-lg font-semibold', TEXT_TITLE, NUM)}>{value ?? 0}</p>
      {pct !== undefined && <p className={cx('text-xs', TEXT_FAINT, NUM)}>{pct} %</p>}
      <p className={cx('text-xs', TEXT_MUTED)}>{label}</p>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function CampaignsIndex({ campaigns: propCampaigns, templates: propTemplates }) {
  const [campaigns, setCampaigns] = useState(propCampaigns ?? MOCK_CAMPAIGNS)
  const [templates]               = useState(propTemplates ?? MOCK_TEMPLATES)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ name: '', target: 'all', type: 'email', start_date: '', end_date: '' })
  const [saving, setSaving]       = useState(false)
  const [activeTab, setActiveTab] = useState('campaigns')

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const sendCampaign = async (id) => {
    if (!confirm('Lancer la campagne maintenant ?')) return
    try {
      await axios.post(`/superadmin/crm/campaigns/${id}/send`)
      setCampaigns(c => c.map(x => (x.id === id ? { ...x, status: 'running' } : x)))
    } catch {
      alert('Erreur lancement')
    }
  }

  const save = async () => {
    if (!form.name || !form.start_date) { alert('Nom et date de début obligatoires.'); return }
    setSaving(true)
    try {
      const res = await axios.post('/superadmin/crm/campaigns', form)
      setCampaigns(c => [...c, res.data])
      setShowForm(false)
      setForm({ name: '', target: 'all', type: 'email', start_date: '', end_date: '' })
    } catch {
      alert('Erreur sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const fmtDate = d => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—')

  return (
    <SuperAdminLayout title="Campagnes commerciales">
      <Head title="Campagnes — CRM Super Admin" />

      <PageHeader
        icon={Megaphone}
        title="Campagnes commerciales"
        subtitle="Séquences de prospection par email et messagerie, et modèles associés."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'CRM' }, { label: 'Campagnes' }]}
        actions={
          activeTab === 'campaigns'
            ? <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>Nouvelle campagne</Button>
            : <Button variant="primary" icon={Plus}>Nouveau modèle</Button>
        }
        tabs={
          <nav className="-mb-px flex gap-1" aria-label="Sections des campagnes">
            {TABS.map(([k, l]) => {
              const active = activeTab === k
              return (
                <button
                  key={k}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveTab(k)}
                  className={cx(
                    'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                      : cx('border-transparent', TEXT_MUTED, 'hover:text-gray-700 dark:hover:text-gray-200'),
                    FOCUS_RING,
                  )}
                >
                  {l}
                </button>
              )
            })}
          </nav>
        }
      />

      {activeTab === 'campaigns' && (
        <div className="space-y-4">

          <p className={cx('text-sm', TEXT_MUTED, NUM)}>
            {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''}
          </p>

          {/* ── Formulaire de création ────────────────────────────────────── */}
          {showForm && (
            <Card
              title="Nouvelle campagne"
              subtitle="Le ciblage s'appuie sur les étapes du pipeline de prospection."
              footer={
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
                  <Button variant="primary" loading={saving} onClick={save}>Créer la campagne</Button>
                </div>
              }
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5 md:col-span-2">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Nom de la campagne</span>
                  <input
                    value={form.name}
                    onChange={e => setF('name', e.target.value)}
                    placeholder="Ex. Relance des prospects qualifiés"
                    className={cx(CONTROL, 'h-10')}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Cible</span>
                  <select value={form.target} onChange={e => setF('target', e.target.value)} className={cx(CONTROL, 'h-10')}>
                    <option value="all">Tous les prospects</option>
                    <option value="stage:new">Étape : nouveaux</option>
                    <option value="stage:qualified">Étape : qualifiés</option>
                    <option value="stage:to_retry">Étape : à relancer</option>
                    <option value="stage:demo_done">Étape : démo réalisée</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Canal</span>
                  <select value={form.type} onChange={e => setF('type', e.target.value)} className={cx(CONTROL, 'h-10')}>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Date de début</span>
                  <input type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Date de fin</span>
                  <input type="date" value={form.end_date} onChange={e => setF('end_date', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </label>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Protection anti-spam : délai minimum de 7 jours entre deux contacts,
                  désinscriptions respectées automatiquement.
                </p>
              </div>
            </Card>
          )}

          {/* ── Liste des campagnes ──────────────────────────────────────── */}
          {campaigns.length === 0 ? (
            <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm')}>
              <EmptyState
                icon={Megaphone}
                title="Aucune campagne"
                description="Créez une campagne pour relancer automatiquement une partie du pipeline."
                action={<Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>Créer une campagne</Button>}
              />
            </div>
          ) : campaigns.map(c => {
            const meta      = STATUS_META[c.status] ?? { label: c.status, tone: 'neutral' }
            const openRate  = c.sent > 0 ? Math.round((c.opens / c.sent) * 100) : 0
            const clickRate = c.opens > 0 ? Math.round((c.clicks / c.opens) * 100) : 0
            const convRate  = c.sent > 0 ? Math.round((c.conversions / c.sent) * 100) : 0

            return (
              <article key={c.id} className={cx(SURFACE, 'rounded-xl border p-5 shadow-sm', BORDER)}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className={cx('text-sm font-semibold', TEXT_TITLE)}>{c.name}</h3>
                      <Badge variant={meta.tone} dot>{meta.label}</Badge>
                      <Badge variant="neutral" icon={c.type === 'email' ? Mail : MessageSquare}>
                        {c.type === 'email' ? 'Email' : 'WhatsApp'}
                      </Badge>
                    </div>
                    <p className={cx('text-xs', TEXT_FAINT)}>
                      Cible : <span className={cx('font-medium', TEXT_MUTED)}>{c.target}</span>
                      {' · '}
                      <span className={NUM}>{fmtDate(c.start_date)} &rarr; {fmtDate(c.end_date)}</span>
                    </p>
                  </div>

                  {c.status === 'scheduled' && (
                    <Button variant="primary" size="sm" icon={Send} onClick={() => sendCampaign(c.id)}>
                      Lancer
                    </Button>
                  )}
                </div>

                <div className={cx('grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4', BORDER)}>
                  <StatCell label="Envois"      value={c.sent} />
                  <StatCell label="Ouvertures"  value={c.opens} pct={openRate} />
                  <StatCell label="Clics"       value={c.clicks} pct={clickRate} />
                  <StatCell label="Conversions" value={c.conversions} pct={convRate} />
                </div>
              </article>
            )
          })}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.length === 0 ? (
            <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm md:col-span-2')}>
              <EmptyState
                icon={Mail}
                title="Aucun modèle de message"
                description="Les modèles réutilisables pour vos campagnes apparaîtront ici."
              />
            </div>
          ) : templates.map(t => (
            <article key={t.id} className={cx(SURFACE, 'rounded-xl border p-4 shadow-sm', BORDER)}>
              <div className="mb-2 flex items-center gap-2">
                <ChannelIcon type={t.type} className={cx('h-4 w-4 shrink-0', TEXT_MUTED)} />
                <h3 className={cx('text-sm font-medium', TEXT_TITLE)}>{t.name}</h3>
                <Badge variant={t.type === 'email' ? 'info' : 'success'} className="ml-auto">
                  {t.type === 'email' ? 'Email' : 'WhatsApp'}
                </Badge>
              </div>
              <p className={cx('text-xs', TEXT_MUTED)}>{t.subject}</p>
            </article>
          ))}
        </div>
      )}
    </SuperAdminLayout>
  )
}

export { CampaignsIndex };
