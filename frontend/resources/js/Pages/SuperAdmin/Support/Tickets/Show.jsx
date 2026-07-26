import React, { useState, useRef } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  ArrowLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>,
  User: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Clock: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Lock: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  Send: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  AlertTriangle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  ExternalLink: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>,
}

// ─── Données mock ─────────────────────────────────────────────────────────────
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
  { label: 'Demande d\'info complémentaire', body: 'Bonjour,\n\nPour mieux vous aider, pourriez-vous nous fournir les informations suivantes :\n- Capture d\'écran de l\'erreur\n- Étapes exactes pour reproduire le problème\n\nMerci d\'avance.' },
  { label: 'Résolution', body: 'Bonjour,\n\nNous avons identifié et résolu le problème. La correction sera déployée dans les prochaines heures.\n\nN\'hésitez pas à nous recontacter si le problème persiste.\n\nCordialement.' },
]

const PRIORITY_MAP = { critique: 'bg-red-100 text-red-700', haute: 'bg-orange-100 text-orange-700', normale: 'bg-purple-100 text-purple-700', basse: 'bg-gray-100 text-gray-600' }
const STATUS_MAP   = { open: 'bg-purple-100 text-purple-700', pending: 'bg-amber-100 text-amber-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-500' }

export default function TicketShow({ ticket: propTicket, messages: propMsgs }) {
  const ticket   = propTicket ?? MOCK_TICKET
  const messages = propMsgs ?? MOCK_MESSAGES

  const [reply, setReply]     = useState('')
  const [internal, setInternal] = useState(false)
  const [sending, setSending]   = useState(false)
  const [status, setStatus]     = useState(ticket.status)
  const [priority, setPriority] = useState(ticket.priority)
  const [agent, setAgent]       = useState(ticket.agent ?? '')
  const [localMsgs, setLocalMsgs] = useState(messages)
  const textRef = useRef()

  const fmtDate = d => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const sendReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await axios.post(`/superadmin/support/tickets/${ticket.id}/reply`, { body: reply, internal })
      setLocalMsgs(m => [...m, res.data.message ?? { id: Date.now(), from: 'agent', author: 'Vous', body: reply, created_at: new Date().toISOString(), internal }])
      setReply('')
    } catch { alert('Erreur envoi') }
    finally { setSending(false) }
  }

  const updateTicket = async (field, value) => {
    try { await axios.patch(`/superadmin/support/tickets/${ticket.id}`, { [field]: value }) }
    catch { alert('Erreur mise à jour') }
  }

  const insertTemplate = (t) => { setReply(t.body); textRef.current?.focus() }

  return (
    <SuperAdminLayout title={`Ticket #${ticket.id}`}>
      <Head title={`Ticket #${ticket.id} — Support`} />

      {/* En-tête */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/superadmin/support/tickets" className="mt-1 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-400">
          <Ic.ArrowLeft />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{ticket.subject}</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_MAP[ticket.priority] ?? 'bg-gray-100 text-gray-600'}`}>{ticket.priority}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_MAP[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
            <span className="text-xs text-gray-400">#{ticket.id} · {ticket.org_name}</span>
            <Link href={`/superadmin/organisations/${ticket.org_id}`} className="text-xs text-[#9333EA] dark:text-purple-400 hover:underline flex items-center gap-1">
              Voir l'organisation <Ic.ExternalLink />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Thread ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Messages */}
          <div className="space-y-4">
            {localMsgs.map(msg => (
              <div key={msg.id} className={`rounded-xl p-4 shadow-sm border ${
                msg.internal
                  ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30'
                  : msg.from === 'client'
                    ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                    : 'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/30 ml-8'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    msg.internal ? 'bg-amber-200 text-amber-800' : msg.from === 'client' ? 'bg-gray-200 text-gray-700' : 'bg-[#9333EA] text-white'
                  }`}>
                    {msg.author[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{msg.author}</span>
                  {msg.internal && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Ic.Lock /> Note interne
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-400 flex items-center gap-1"><Ic.Clock /> {fmtDate(msg.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
              </div>
            ))}
          </div>

          {/* Éditeur réponse */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            {/* Modèles */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">Modèles :</span>
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => insertTemplate(t)} className="px-2.5 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              ref={textRef}
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={5}
              placeholder={internal ? 'Note interne (invisible pour le client)…' : 'Répondre au client…'}
              className={`w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-[#9333EA]/30 outline-none dark:bg-gray-700 dark:text-white transition-colors ${
                internal ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-600'
              }`}
            />

            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} className="rounded" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Note interne (invisible client)</span>
              </label>
              <button
                disabled={sending || !reply.trim()}
                onClick={sendReply}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] disabled:opacity-50 transition-colors"
              >
                <Ic.Send /> {sending ? 'Envoi…' : internal ? 'Ajouter note' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Panneau latéral ───────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Informations ticket */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations</h3>
            <div className="space-y-3">
              {[
                ['Organisation', ticket.org_name],
                ['Utilisateur', ticket.user_name],
                ['Email', ticket.user_email],
                ['Module', ticket.module],
                ['Navigateur', ticket.browser],
                ['OS', ticket.os],
                ['Version', ticket.secretis_version],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 dark:border-gray-700/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right max-w-[60%]">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gestion */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gestion</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Statut</label>
              <select value={status} onChange={e => { setStatus(e.target.value); updateTicket('status', e.target.value) }} className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-[#9333EA]/30 outline-none">
                <option value="open">Ouvert</option>
                <option value="pending">En attente</option>
                <option value="resolved">Résolu</option>
                <option value="closed">Fermé</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priorité</label>
              <select value={priority} onChange={e => { setPriority(e.target.value); updateTicket('priority', e.target.value) }} className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-[#9333EA]/30 outline-none">
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Agent assigné</label>
              <select value={agent} onChange={e => { setAgent(e.target.value); updateTicket('agent', e.target.value) }} className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-[#9333EA]/30 outline-none">
                <option value="">Non assigné</option>
                <option value="Brice K.">Brice K.</option>
                <option value="Amenan D.">Amenan D.</option>
                <option value="Jean-Marc E.">Jean-Marc E.</option>
              </select>
            </div>

            <button
              onClick={() => { if (confirm('Escalader ce ticket ?')) updateTicket('escalated', true) }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Ic.AlertTriangle /> Escalader
            </button>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
export { TicketShow };
