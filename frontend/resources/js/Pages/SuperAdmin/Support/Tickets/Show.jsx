/**
 * SuperAdmin/Support/Tickets/Show.jsx — Fil de discussion d'un ticket
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST /superadmin/support/tickets/{id}/reply`,
 *  `PATCH /superadmin/support/tickets/{id}`), mêmes états locaux,
 * mêmes props Inertia (`ticket`, `messages`).
 *
 * Nettoyage sans effet fonctionnel : import `router` inutilisé supprimé.
 */

import React, { useState, useRef } from 'react'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import {
  ArrowLeft, Clock, Lock, Send, AlertTriangle, ExternalLink,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */

const MOCK_TICKET = {
  id: 1042,
  subject: 'Impossible de générer la fiche de paie — module RH',
  category: 'technique',
  priority: 'haute',
  status: 'open',
  org_name: 'Banque Nationale CI',
  org_id: 1,
  user_name: 'Kouadio N\'Goran',
  user_email: 'k.ngoran@bnci.ci',
  module: 'RH / Paie',
  browser: 'Chrome 124',
  os: 'Windows 11',
  secretis_version: '1.0.0',
  agent: 'Brice K.',
  created_at: new Date(Date.now() - 7200000).toISOString(),
  sla_breach_at: new Date(Date.now() + 3600000).toISOString(),
}

const MOCK_MESSAGES = [
  { id: 1, from: 'client', author: 'Kouadio N\'Goran', body: 'Bonjour,\n\nDepuis ce matin, je ne peux plus générer les fiches de paie. Le bouton "Générer" reste grisé même si j\'ai les droits.\n\nPouvez-vous m\'aider ?', created_at: new Date(Date.now() - 7200000).toISOString(), internal: false },
  { id: 2, from: 'agent', author: 'Brice K.', body: 'Bonjour Kouadio,\n\nMerci pour votre signalement. Pouvez-vous me confirmer votre rôle dans l\'application et si le problème est apparu suite à une mise à jour ?', created_at: new Date(Date.now() - 5400000).toISOString(), internal: false },
  { id: 3, from: 'agent', author: 'Brice K.', body: 'Note interne : vérifier si la migration 00115 a bien été appliquée sur le tenant bnci. Contacter l\'équipe dev si nécessaire.', created_at: new Date(Date.now() - 5000000).toISOString(), internal: true },
  { id: 4, from: 'client', author: 'Kouadio N\'Goran', body: 'Je suis administrateur de l\'espace. Le problème a commencé après la mise à jour de ce week-end.', created_at: new Date(Date.now() - 3600000).toISOString(), internal: false },
]

const TEMPLATES = [
  { label: 'Accusé de réception', body: 'Bonjour,\n\nNous avons bien reçu votre demande et notre équipe technique la traite en priorité. Nous vous répondrons dans les plus brefs délais.\n\nCordialement, L\'équipe IBIG Soft' },
  { label: "Demande d'information", body: 'Bonjour,\n\nPour mieux vous aider, pourriez-vous nous fournir les informations suivantes :\n- Capture d\'écran de l\'erreur\n- Étapes exactes pour reproduire le problème\n\nMerci d\'avance.' },
  { label: 'Résolution', body: 'Bonjour,\n\nNous avons identifié et résolu le problème. La correction sera déployée dans les prochaines heures.\n\nN\'hésitez pas à nous recontacter si le problème persiste.\n\nCordialement.' },
]

const PRIORITY_TONE = { critique: 'danger', haute: 'warning', normale: 'info', basse: 'neutral' }
const STATUS_META = {
  open:     { label: 'Ouvert',     tone: 'info' },
  pending:  { label: 'En attente', tone: 'warning' },
  resolved: { label: 'Résolu',     tone: 'success' },
  closed:   { label: 'Fermé',      tone: 'neutral' },
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function TicketShow({ ticket: propTicket, messages: propMsgs }) {
  const ticket   = propTicket ?? MOCK_TICKET
  const messages = propMsgs ?? MOCK_MESSAGES

  const [reply, setReply]         = useState('')
  const [internal, setInternal]   = useState(false)
  const [sending, setSending]     = useState(false)
  const [status, setStatus]       = useState(ticket.status)
  const [priority, setPriority]   = useState(ticket.priority)
  const [agent, setAgent]         = useState(ticket.agent ?? '')
  const [localMsgs, setLocalMsgs] = useState(messages)
  const textRef = useRef(null)

  const fmtDate = d =>
    new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const sendReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await axios.post(`/superadmin/support/tickets/${ticket.id}/reply`, { body: reply, internal })
      setLocalMsgs(m => [
        ...m,
        res.data.message ?? {
          id: Date.now(), from: 'agent', author: 'Vous',
          body: reply, created_at: new Date().toISOString(), internal,
        },
      ])
      setReply('')
    } catch {
      alert('Erreur envoi')
    } finally {
      setSending(false)
    }
  }

  const updateTicket = async (field, value) => {
    try { await axios.patch(`/superadmin/support/tickets/${ticket.id}`, { [field]: value }) }
    catch { alert('Erreur mise à jour') }
  }

  const insertTemplate = (t) => { setReply(t.body); textRef.current?.focus() }

  const statusMeta = STATUS_META[status] ?? { label: status, tone: 'neutral' }

  const INFO_ROWS = [
    ['Organisation', ticket.org_name],
    ['Utilisateur', ticket.user_name],
    ['Email', ticket.user_email],
    ['Module', ticket.module],
    ['Navigateur', ticket.browser],
    ['Système', ticket.os],
    ['Version', ticket.secretis_version],
  ]

  return (
    <SuperAdminLayout title={`Ticket #${ticket.id}`}>
      <Head title={`Ticket #${ticket.id} — Support`} />

      <PageHeader
        title={ticket.subject}
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'Support', href: '/superadmin/support/tickets' },
          { label: `Ticket #${ticket.id}` },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={PRIORITY_TONE[ticket.priority] ?? 'neutral'} dot>{ticket.priority}</Badge>
            <Badge variant={statusMeta.tone} dot>{statusMeta.label}</Badge>
            <span className={cx('text-xs', TEXT_MUTED, NUM)}>#{ticket.id} · {ticket.org_name}</span>
            <Link
              href={`/superadmin/organisations/${ticket.org_id}`}
              className={cx('inline-flex items-center gap-1 rounded text-xs text-purple-700 hover:underline dark:text-purple-300', FOCUS_RING)}
            >
              Voir l'organisation <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        }
        actions={
          <Button as={Link} href="/superadmin/support/tickets" variant="ghost" icon={ArrowLeft}>
            Retour aux tickets
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Fil de discussion ───────────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">

          <ol className="space-y-4">
            {localMsgs.map(msg => (
              <li
                key={msg.id}
                className={cx(
                  'rounded-xl border p-4 shadow-sm',
                  msg.internal
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                    : msg.from === 'client'
                      ? cx(SURFACE, BORDER)
                      : cx('ml-0 border-purple-200 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10 sm:ml-8'),
                )}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={cx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    msg.internal
                      ? 'bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-200'
                      : msg.from === 'client'
                        ? 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-200'
                        : 'bg-purple-600 text-white',
                  )}>
                    {String(msg.author ?? '?')[0].toUpperCase()}
                  </span>
                  <span className={cx('text-sm font-medium', TEXT_TITLE)}>{msg.author}</span>
                  {msg.internal && <Badge variant="warning" icon={Lock}>Note interne</Badge>}
                  <span className={cx('ml-auto flex items-center gap-1 text-xs', TEXT_FAINT, NUM)}>
                    <Clock className="h-3 w-3" /> {fmtDate(msg.created_at)}
                  </span>
                </div>
                <p className={cx('whitespace-pre-wrap text-sm leading-relaxed', TEXT_BODY)}>{msg.body}</p>
              </li>
            ))}
          </ol>

          {/* Éditeur de réponse */}
          <Card
            title={internal ? 'Ajouter une note interne' : 'Répondre au client'}
            subtitle="Les notes internes ne sont jamais visibles par l'organisation cliente."
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={cx('text-xs', TEXT_MUTED)}>Modèles :</span>
              {TEMPLATES.map(t => (
                <Button key={t.label} variant="secondary" size="xs" onClick={() => insertTemplate(t)}>
                  {t.label}
                </Button>
              ))}
            </div>

            <textarea
              ref={textRef}
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={5}
              placeholder={internal ? 'Note interne (invisible pour le client)…' : 'Répondre au client…'}
              aria-label={internal ? 'Note interne' : 'Réponse au client'}
              className={cx(
                CONTROL, 'resize-none',
                internal && 'border-amber-300 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/[0.07]',
              )}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={e => setInternal(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#0F1923]"
                />
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Note interne (invisible pour le client)</span>
              </label>

              <Button
                variant="primary"
                icon={Send}
                loading={sending}
                disabled={!reply.trim()}
                onClick={sendReply}
              >
                {internal ? 'Ajouter la note' : 'Envoyer'}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Panneau latéral ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          <Card title="Informations">
            <dl className="space-y-0">
              {INFO_ROWS.map(([label, val]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-3 border-b border-gray-100 py-2.5 last:border-0 dark:border-[#1E3048]"
                >
                  <dt className={cx('text-xs', TEXT_MUTED)}>{label}</dt>
                  <dd className={cx('max-w-[60%] text-right text-xs font-medium', TEXT_BODY)}>{val ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Gestion du ticket">
            <div className="space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Statut</span>
                <select
                  value={status}
                  onChange={e => { setStatus(e.target.value); updateTicket('status', e.target.value) }}
                  className={cx(CONTROL, 'h-10')}
                >
                  <option value="open">Ouvert</option>
                  <option value="pending">En attente</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Fermé</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Priorité</span>
                <select
                  value={priority}
                  onChange={e => { setPriority(e.target.value); updateTicket('priority', e.target.value) }}
                  className={cx(CONTROL, 'h-10')}
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="critique">Critique</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Agent assigné</span>
                <select
                  value={agent}
                  onChange={e => { setAgent(e.target.value); updateTicket('agent', e.target.value) }}
                  className={cx(CONTROL, 'h-10')}
                >
                  <option value="">Non assigné</option>
                  <option value="Brice K.">Brice K.</option>
                  <option value="Amenan D.">Amenan D.</option>
                  <option value="Jean-Marc E.">Jean-Marc E.</option>
                </select>
              </label>

              <Button
                variant="secondary"
                icon={AlertTriangle}
                block
                className="text-amber-700 dark:text-amber-400"
                onClick={() => { if (confirm('Escalader ce ticket ?')) updateTicket('escalated', true) }}
              >
                Escalader le ticket
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  )
}

export { TicketShow };
