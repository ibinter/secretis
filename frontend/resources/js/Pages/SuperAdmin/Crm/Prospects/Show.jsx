/**
 * SuperAdmin/Crm/Prospects/Show.jsx — Fiche prospect
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST …/move-stage`, `POST …/interactions`, `POST …/convert-to-trial`),
 * mêmes états locaux, mêmes props Inertia (`prospect`, `timeline`).
 *
 * Nettoyage sans effet fonctionnel : constante `STAGES` déclarée et jamais
 * utilisée, supprimée. Le bouton « Marquer perdu » reste sans gestionnaire :
 * il est conservé tel quel et signalé dans le rapport.
 */

import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  ArrowLeft, ArrowRight, Phone, Mail, Calendar, FileText, Check, X, Plus,
  User, MessageSquare,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card,
  cx, SURFACE_SUNK, BORDER, CONTROL, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Étapes ───────────────────────────────────────────────────────────────── */

const STAGE_LABELS = {
  new: 'Nouveau', to_contact: 'À contacter', contacted: 'Contacté', qualified: 'Qualifié',
  demo_scheduled: 'Démo prévue', demo_done: 'Démo réalisée', offer_sent: 'Offre envoyée',
  negotiation: 'Négociation', won: 'Gagné', lost: 'Perdu', to_retry: 'À relancer',
}

const STAGE_NEXT = {
  new: 'to_contact', to_contact: 'contacted', contacted: 'qualified',
  qualified: 'demo_scheduled', demo_scheduled: 'demo_done', demo_done: 'offer_sent',
  offer_sent: 'negotiation', negotiation: 'won',
}

const STAGE_TONE = {
  won: 'success', lost: 'danger', to_retry: 'neutral',
  negotiation: 'warning', offer_sent: 'warning', demo_done: 'accent',
  demo_scheduled: 'accent', qualified: 'info', contacted: 'info',
  to_contact: 'info', new: 'neutral',
}

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */

const MOCK_PROSPECT = {
  id: 1,
  first_name: 'Awa', last_name: 'Diallo',
  company: 'MediaGroup CI', function: 'Directrice Administrative',
  email: 'a.diallo@mediagroup.ci', phone: '+225 07 12 34 56', whatsapp: '+225 07 12 34 56',
  country: 'CI', sector: 'Médias / Communication',
  software: 'SECRETIS', stage: 'demo_scheduled',
  score: 78,
  bant: { budget: 70, authority: 90, need: 85, timeline: 65 },
  source: 'linkedin', assigned_to: 'Kouassi A.',
  next_action: 'Préparer démo SECRETIS', next_action_at: new Date(Date.now() + 86400000 * 2).toISOString(),
  notes: 'Organisation de 50 personnes, budget confirmé. Décision prévue fin juillet.',
  created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
}

const MOCK_TIMELINE = [
  { id: 1, type: 'call', desc: 'Appel de qualification — intérêt confirmé', author: 'Kouassi A.', at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 2, type: 'email', desc: 'Email de présentation SECRETIS envoyé', author: 'Kouassi A.', at: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 3, type: 'stage', desc: 'Étape : Contacté → Qualifié', author: 'Système', at: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: 4, type: 'demo', desc: 'Démo planifiée pour le 25 juillet', author: 'Kouassi A.', at: new Date(Date.now() - 86400000 * 2).toISOString() },
]

const TIMELINE_META = {
  call:  { icon: Phone,         cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  email: { icon: Mail,          cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
  stage: { icon: ArrowRight,    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  demo:  { icon: Calendar,      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  offer: { icon: FileText,      cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
  note:  { icon: MessageSquare, cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' },
}

/* ─── Barre BANT ───────────────────────────────────────────────────────────── */

function BantBar({ label, value }) {
  const bar = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className={cx('w-20 text-xs font-medium', TEXT_MUTED)}>{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className={cx('h-full rounded-full', bar)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className={cx('w-8 text-right text-xs font-semibold', TEXT_BODY, NUM)}>{value}</span>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function ProspectShow({ prospect: propP, timeline: propT }) {
  const prospect = propP ?? MOCK_PROSPECT

  const [timeline, setTimeline]     = useState(propT ?? MOCK_TIMELINE)
  const [stage, setStage]           = useState(prospect.stage)
  const [note, setNote]             = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [saving, setSaving]         = useState(false)

  const fmtDate = d =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtDateTime = d =>
    new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const nextStage = STAGE_NEXT[stage]

  const advance = async () => {
    if (!nextStage) return
    setSaving(true)
    try {
      await axios.post(`/superadmin/crm/prospects/${prospect.id}/move-stage`, { stage: nextStage })
      setTimeline(t => [...t, {
        id: Date.now(), type: 'stage',
        desc: `Étape : ${STAGE_LABELS[stage]} → ${STAGE_LABELS[nextStage]}`,
        author: 'Vous', at: new Date().toISOString(),
      }])
      setStage(nextStage)
    } catch {
      alert('Erreur')
    } finally {
      setSaving(false)
    }
  }

  const addNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    try {
      await axios.post(`/superadmin/crm/prospects/${prospect.id}/interactions`, { type: 'note', desc: note })
      setTimeline(t => [...t, { id: Date.now(), type: 'note', desc: note, author: 'Vous', at: new Date().toISOString() }])
      setNote(''); setAddingNote(false)
    } catch {
      alert('Erreur')
    } finally {
      setSaving(false)
    }
  }

  const convertToTrial = () => router.post(`/superadmin/crm/prospects/${prospect.id}/convert-to-trial`)

  const bant = prospect.bant ?? {}
  const totalBant = Math.round(Object.values(bant).reduce((a, b) => a + b, 0) / (Object.keys(bant).length || 1))

  const CONTACT_ROWS = [
    { icon: Mail,          value: prospect.email,    scheme: 'mailto' },
    { icon: Phone,         value: prospect.phone,    scheme: 'tel' },
    { icon: User,          value: prospect.function },
    { icon: MessageSquare, value: prospect.whatsapp },
  ]

  const QUICK_ACTIONS = [
    { icon: Mail,     label: 'Envoyer un email',  href: `/superadmin/crm/prospects/${prospect.id}?action=email` },
    { icon: Calendar, label: 'Planifier une démo', href: `/superadmin/crm/demonstrations/create?prospect=${prospect.id}` },
    { icon: FileText, label: 'Créer une offre',    href: `/superadmin/crm/offers/create?prospect=${prospect.id}` },
    { icon: Check,    label: 'Marquer gagné',      onClick: () => advance() },
    { icon: X,        label: 'Marquer perdu',      onClick: () => {} },
  ]

  return (
    <SuperAdminLayout title={`${prospect.first_name} ${prospect.last_name}`}>
      <Head title={`${prospect.first_name} ${prospect.last_name} — Prospect CRM`} />

      <PageHeader
        title={`${prospect.first_name} ${prospect.last_name}`}
        subtitle={`${prospect.function} · ${prospect.company} · ${prospect.country}`}
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'CRM' },
          { label: 'Prospects', href: '/superadmin/crm/prospects' },
          { label: `${prospect.first_name} ${prospect.last_name}` },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STAGE_TONE[stage] ?? 'neutral'} size="md" dot>{STAGE_LABELS[stage] ?? stage}</Badge>
            <span className={cx('text-xs', TEXT_MUTED)}>
              Score BANT : <span className={cx('font-semibold', TEXT_BODY, NUM)}>{totalBant}/100</span>
            </span>
          </div>
        }
        actions={
          <>
            <Button as={Link} href="/superadmin/crm/prospects" variant="ghost" icon={ArrowLeft}>
              Retour
            </Button>
            {nextStage && (
              <Button variant="secondary" iconRight={ArrowRight} loading={saving} onClick={advance}>
                {STAGE_LABELS[nextStage]}
              </Button>
            )}
            <Button variant="primary" icon={Check} onClick={convertToTrial}>
              Convertir en essai
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Colonne latérale ────────────────────────────────────────────── */}
        <div className="space-y-4">

          <Card title="Contact">
            <ul className="space-y-2.5">
              {CONTACT_ROWS.filter(r => r.value).map((r, i) => {
                const Icon = r.icon
                return (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <Icon className={cx('h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                    {r.scheme ? (
                      <a
                        href={`${r.scheme}:${r.value}`}
                        className={cx('rounded text-purple-700 hover:underline dark:text-purple-300', FOCUS_RING)}
                      >
                        {r.value}
                      </a>
                    ) : (
                      <span className={TEXT_BODY}>{r.value}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card title="Score BANT">
            <div className="space-y-2.5">
              <BantBar label="Budget"    value={bant.budget ?? 0} />
              <BantBar label="Décision"  value={bant.authority ?? 0} />
              <BantBar label="Besoin"    value={bant.need ?? 0} />
              <BantBar label="Échéance"  value={bant.timeline ?? 0} />
            </div>
            <div className={cx('mt-3 flex items-center justify-between border-t pt-3', BORDER)}>
              <span className={cx('text-xs', TEXT_MUTED)}>Score global</span>
              <span className={cx(
                'text-lg font-semibold', NUM,
                totalBant >= 70 ? 'text-emerald-600 dark:text-emerald-400'
                  : totalBant >= 40 ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400',
              )}>
                {totalBant}/100
              </span>
            </div>
          </Card>

          <Card title="Informations">
            {[
              ['Logiciel', prospect.software],
              ['Source', prospect.source],
              ['Commercial', prospect.assigned_to ?? '—'],
              ['Secteur', prospect.sector],
              ['Créé le', fmtDate(prospect.created_at)],
            ].map(([l, v]) => (
              <div
                key={l}
                className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-[#1E3048]"
              >
                <span className={cx('text-xs', TEXT_MUTED)}>{l}</span>
                <span className={cx('text-xs font-medium', TEXT_BODY)}>{v ?? '—'}</span>
              </div>
            ))}
          </Card>

          <Card title="Actions rapides">
            <div className="space-y-2">
              {QUICK_ACTIONS.map((a, i) => {
                const Icon = a.icon
                const classes = cx(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                  BORDER, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]', FOCUS_RING,
                )
                return a.href ? (
                  <Link key={i} href={a.href} className={classes}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {a.label}
                  </Link>
                ) : (
                  <button key={i} type="button" onClick={a.onClick} className={classes}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {a.label}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* ── Historique ──────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">

          {prospect.notes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Notes
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">{prospect.notes}</p>
            </div>
          )}

          <Card
            title="Historique des interactions"
            actions={
              <Button variant="subtle" size="sm" icon={Plus} onClick={() => setAddingNote(v => !v)}>
                Ajouter
              </Button>
            }
          >
            {addingNote && (
              <div className={cx(SURFACE_SUNK, 'mb-4 rounded-lg p-3')}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Note, compte rendu…"
                  aria-label="Nouvelle note"
                  className={cx(CONTROL, 'resize-none')}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setAddingNote(false); setNote('') }}>
                    Annuler
                  </Button>
                  <Button variant="primary" size="sm" loading={saving} disabled={!note.trim()} onClick={addNote}>
                    Ajouter
                  </Button>
                </div>
              </div>
            )}

            <ol className="relative space-y-4">
              <span className="absolute bottom-0 left-2.5 top-0 w-px bg-gray-200 dark:bg-[#1E3048]" aria-hidden="true" />
              {[...timeline].reverse().map(item => {
                const meta = TIMELINE_META[item.type] ?? TIMELINE_META.note
                const Icon = meta.icon
                return (
                  <li key={item.id} className="relative flex gap-4 pl-9">
                    <span className={cx(
                      'absolute left-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                      meta.cls,
                    )}>
                      <Icon className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-sm', TEXT_BODY)}>{item.desc}</p>
                      <p className={cx('mt-0.5 text-xs', TEXT_FAINT, NUM)}>
                        {item.author} · {fmtDateTime(item.at)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  )
}

export { ProspectShow };
