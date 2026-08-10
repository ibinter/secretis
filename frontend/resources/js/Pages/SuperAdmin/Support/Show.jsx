/**
 * SECRETIS ERP — SuperAdmin/Support/Show.jsx
 * Vue détail ticket — timeline, notes internes, sidebar client
 */

import React, { useState, useRef } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes inline ───────────────────────────────────────────────────────────
const Ic = {
  Back:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>,
  Send:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  Lock:    () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  User:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Clock:   () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Org:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
  Tag:     () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
  Ticket:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  Alert:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
}

// ─── Données mock ─────────────────────────────────────────────────────────────
const MOCK_TICKET = {
  id: 1042,
  number: 'TK-1042',
  subject: 'Impossible de générer la fiche de paie — module RH',
  category: 'technique',
  priority: 'haute',
  status: 'open',
  created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
  sla_breach_at: new Date(Date.now() + 6 * 3600000).toISOString(),
  organization: {
    id: 12,
    name: 'Banque Nationale CI',
    plan: 'Enterprise',
    license_status: 'active',
    registered_at: '2024-03-15',
    tickets_total: 8,
    last_login: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  user: {
    name: "Kouadio N'Goran",
    email: 'k.ngoran@bnci.ci',
    role: 'Admin RH',
  },
  env: { module: 'RH / Paie', browser: 'Chrome 124', os: 'Windows 11' },
  agent: 'Brice K.',
  messages: [
    { id: 1, author: "Kouadio N'Goran", role: 'client', content: "Bonjour, depuis ce matin le bouton 'Générer fiche de paie' ne fonctionne plus. Le spinner tourne indéfiniment puis une erreur 500 apparaît. J'ai essayé sur Chrome et Firefox.", created_at: new Date(Date.now() - 18 * 3600000).toISOString(), is_internal: false },
    { id: 2, author: 'Brice K.', role: 'agent', content: "Bonjour Kouadio, merci pour votre signalement. Je prends le ticket en charge. Pouvez-vous me fournir une capture d'écran de l'erreur dans la console développeur ?", created_at: new Date(Date.now() - 15 * 3600000).toISOString(), is_internal: false },
    { id: 3, author: 'Brice K.', role: 'agent', content: 'Note interne : problème probablement lié au job de calcul de paie qui timeout. Vérifier les logs Redis côté org_id=12.', created_at: new Date(Date.now() - 14 * 3600000).toISOString(), is_internal: true },
    { id: 4, author: "Kouadio N'Goran", role: 'client', content: "Voici la capture — TypeError: Cannot read properties of undefined (reading 'salary_base'). Cela concerne 3 employés qui ont été transférés d'une direction à l'autre.", created_at: new Date(Date.now() - 10 * 3600000).toISOString(), is_internal: false },
  ],
  previous_tickets: [
    { id: 998, number: 'TK-0998', subject: 'Problème import CSV employés', status: 'resolved', created_at: '2024-12-10' },
    { id: 1021, number: 'TK-1021', subject: 'Accès module rapport refusé', status: 'closed', created_at: '2025-01-05' },
  ],
}

const AGENTS = ['Brice K.', 'Amenan D.', 'Koffi T.', 'Raissa M.']

const PRIORITY_STYLE = {
  critique: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  haute:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  normale:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  basse:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const STATUS_STYLE = {
  open:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  resolved: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  closed:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function Avatar({ name, size = 8, textSize = 'text-xs' }) {
  const initials = name ? name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?'
  const colors = ['bg-purple-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500']
  const color = colors[name ? name.charCodeAt(0) % colors.length : 0]
  return (
    <span className={`inline-flex items-center justify-center w-${size} h-${size} rounded-full ${color} text-white ${textSize} font-bold flex-shrink-0`}>
      {initials}
    </span>
  )
}

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 60000
  if (diff < 1) return 'à l\'instant'
  if (diff < 60) return `il y a ${Math.round(diff)} min`
  if (diff < 1440) return `il y a ${Math.round(diff / 60)}h`
  return `il y a ${Math.round(diff / 1440)}j`
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SupportShow({ ticket = MOCK_TICKET, auth }) {
  const [messages, setMessages] = useState(ticket.messages)
  const [reply, setReply]       = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending]   = useState(false)
  const [agent, setAgent]       = useState(ticket.agent ?? '')
  const [priority, setPriority] = useState(ticket.priority)
  const [status, setStatus]     = useState(ticket.status)
  const textRef = useRef(null)

  const sendReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await axios.post(`/superadmin/support/tickets/${ticket.id}/reply`, {
        content: reply, is_internal: isInternal,
      })
      setMessages(prev => [...prev, {
        id: Date.now(), author: auth?.user?.name ?? 'Support',
        role: 'agent', content: reply,
        created_at: new Date().toISOString(), is_internal: isInternal,
      }])
      setReply('')
    } finally {
      setSending(false)
    }
  }

  const updateTicket = (field, value) => {
    axios.patch(`/superadmin/support/tickets/${ticket.id}`, { [field]: value })
  }

  const hoursLeft = (new Date(ticket.sla_breach_at) - Date.now()) / 3600000
  const slaColor = hoursLeft < 0 ? 'text-red-600' : hoursLeft < 8 ? 'text-green-600' : hoursLeft < 24 ? 'text-orange-500' : 'text-red-600'

  return (
    <SuperAdminLayout>
      <Head title={`${ticket.number} — Support SECRETIS`} />

      <div className="p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/superadmin/support" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7e22ce] dark:text-gray-400 dark:hover:text-purple-400 transition-colors">
            <Ic.Back />
            Tous les tickets
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-mono font-semibold text-[#9333EA] dark:text-purple-300">{ticket.number}</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Colonne principale ────────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-5">

            {/* Header ticket */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{ticket.subject}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="font-mono text-xs text-gray-400">{ticket.number}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[status]}`}>
                      {status === 'open' ? 'Ouvert' : status === 'pending' ? 'En attente' : status === 'resolved' ? 'Résolu' : 'Fermé'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLE[priority]}`}>
                      {priority}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${slaColor}`}>
                      <Ic.Clock />
                      {hoursLeft < 0 ? `SLA dépassé de ${Math.abs(Math.round(hoursLeft))}h` : `SLA : ${Math.round(hoursLeft)}h restantes`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Ic.Tag /> {ticket.category}</span>
                    <span className="flex items-center gap-1"><Ic.User /> {ticket.user.name} ({ticket.user.role})</span>
                    <span className="flex items-center gap-1"><Ic.Clock /> Créé {timeAgo(ticket.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Env technique */}
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(ticket.env).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">{k} : {v}</span>
                ))}
              </div>
            </div>

            {/* Timeline messages */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Conversation ({messages.length} messages)</h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-5 ${msg.is_internal ? 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={msg.author} size={8} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">{msg.author}</span>
                          {msg.role === 'agent' && (
                            <span className="px-1.5 py-0.5 bg-[#9333EA] text-white rounded text-xs">
                              {auth?.user?.name === msg.author ? 'Vous' : 'Support'}
                            </span>
                          )}
                          {msg.is_internal && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                              <Ic.Lock /> Note interne
                            </span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{timeAgo(msg.created_at)}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Zone de réponse */}
              <div className={`p-5 border-t border-gray-200 dark:border-gray-700 ${isInternal ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="internal"
                    checked={isInternal}
                    onChange={e => setIsInternal(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
                  />
                  <label htmlFor="internal" className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <Ic.Lock />
                    Note interne (visible uniquement par le support)
                  </label>
                </div>
                <textarea
                  ref={textRef}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply() }}
                  rows={4}
                  placeholder={isInternal ? 'Note interne — non visible par le client...' : 'Répondre au client... (Ctrl+Entrée pour envoyer)'}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[#7e22ce] focus:outline-none placeholder-gray-400"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{reply.length} caractères</span>
                  <button
                    onClick={sendReply}
                    disabled={!reply.trim() || sending}
                    className="flex items-center gap-2 px-4 py-2 bg-[#7e22ce] hover:bg-[#9333EA] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Ic.Send />
                    {sending ? 'Envoi...' : isInternal ? 'Ajouter la note' : 'Envoyer la réponse'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sidebar droite ────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Actions</h3>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Assigner à</label>
                <select
                  value={agent}
                  onChange={e => { setAgent(e.target.value); updateTicket('agent', e.target.value) }}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7e22ce] focus:outline-none"
                >
                  <option value="">Non assigné</option>
                  {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Priorité</label>
                <select
                  value={priority}
                  onChange={e => { setPriority(e.target.value); updateTicket('priority', e.target.value) }}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7e22ce] focus:outline-none"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="critique">Critique</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Statut</label>
                <select
                  value={status}
                  onChange={e => { setStatus(e.target.value); updateTicket('status', e.target.value) }}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7e22ce] focus:outline-none"
                >
                  <option value="open">Ouvert</option>
                  <option value="pending">En attente</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Fermé</option>
                </select>
              </div>
            </div>

            {/* Profil organisation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Ic.Org />
                Organisation cliente
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Nom</span>
                  <span className="font-medium text-gray-900 dark:text-white text-right max-w-40 truncate">{ticket.organization.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Plan</span>
                  <span className="px-2 py-0.5 bg-[#9333EA] text-white rounded text-xs font-medium">{ticket.organization.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Licence</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                    {ticket.organization.license_status === 'active' ? 'Active' : 'Expirée'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Client depuis</span>
                  <span className="text-gray-900 dark:text-white">{ticket.organization.registered_at}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Tickets totaux</span>
                  <span className="text-gray-900 dark:text-white">{ticket.organization.tickets_total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Dernière connexion</span>
                  <span className="text-gray-900 dark:text-white">{timeAgo(ticket.organization.last_login)}</span>
                </div>
              </div>

              <Link
                href={`/superadmin/organizations/${ticket.organization.id}`}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 mt-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Voir l'organisation
              </Link>
            </div>

            {/* Tickets précédents */}
            {ticket.previous_tickets?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <Ic.Ticket />
                  Tickets précédents
                </h3>
                <div className="space-y-2">
                  {ticket.previous_tickets.map(pt => (
                    <Link
                      key={pt.id}
                      href={`/superadmin/support/tickets/${pt.id}`}
                      className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-xs text-[#7e22ce] dark:text-purple-400">{pt.number}</span>
                        <span className="text-xs text-gray-400">{pt.created_at}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{pt.subject}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
export { SupportShow };
