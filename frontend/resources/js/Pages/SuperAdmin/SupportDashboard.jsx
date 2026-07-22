import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Mock ─────────────────────────────────────────────────────────────────────
const MOCK_TICKETS = [
  { id: 1, ticket_number: 'TKT-2026-00001', title: 'Impossible d\'exporter les rapports PDF', category: 'bug', priority: 'urgent', status: 'open', organization_name: 'ITIC Formations', assigned_to: null, assignee_name: null, created_by_email: 'admin@itic.ci', age_hours: 3, messages: [{ id: 1, author_type: 'client', author_name: 'admin@itic.ci', content: 'Bonjour, l\'export PDF des rapports ne fonctionne plus depuis ce matin. Le bouton déclenche un loader mais rien ne se télécharge.', created_at: '2026-07-22T08:00:00Z' }] },
  { id: 2, ticket_number: 'TKT-2026-00002', title: 'Demande d\'ajout d\'un module CRM', category: 'feature_request', priority: 'normal', status: 'in_progress', organization_name: 'Banque Nationale CI', assigned_to: 1, assignee_name: 'Patrice Kouakou', created_by_email: 'dsi@banquenacionale.ci', age_hours: 26, messages: [{ id: 1, author_type: 'client', author_name: 'dsi@banquenacionale.ci', content: 'Nous souhaitons intégrer un module CRM pour la gestion des contacts clients.', created_at: '2026-07-21T06:00:00Z' }] },
  { id: 3, ticket_number: 'TKT-2026-00003', title: 'Facturation : montant erroné sur la dernière facture', category: 'billing', priority: 'high', status: 'waiting_customer', organization_name: 'Pharmaci Pro', assigned_to: 1, assignee_name: 'Patrice Kouakou', created_by_email: 'compta@pharmaci.ci', age_hours: 48, messages: [] },
  { id: 4, ticket_number: 'TKT-2026-00004', title: 'Comment configurer les notifications email ?', category: 'how_to', priority: 'low', status: 'resolved', organization_name: 'ONG Green Africa', assigned_to: 1, assignee_name: 'Patrice Kouakou', created_by_email: 'admin@greenafrique.org', age_hours: 72, messages: [] },
];

const MOCK_STATS = { open: 3, resolved: 15, this_week: 7, urgent: 1, mttr_hours: 6.5, csat: 4.3, by_status: { open: 1, in_progress: 1, waiting_customer: 1, resolved: 1 }, by_priority: { urgent: 1, high: 1, normal: 1 } };

// ─── Badges ───────────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const map = {
    urgent: 'bg-red-100 text-red-700 border-red-200',
    high:   'bg-orange-100 text-orange-700 border-orange-200',
    normal: 'bg-blue-100 text-blue-700 border-blue-200',
    low:    'bg-gray-100 text-gray-600 border-gray-200',
  };
  const labels = { urgent: 'Urgent', high: 'Haute', normal: 'Normale', low: 'Faible' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[priority] || map.normal}`}>
      {labels[priority] || priority}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    open:             'bg-red-50 text-red-700',
    in_progress:      'bg-blue-50 text-blue-700',
    waiting_customer: 'bg-amber-50 text-amber-700',
    resolved:         'bg-green-50 text-green-700',
    closed:           'bg-gray-50 text-gray-500',
  };
  const labels = {
    open: 'Ouvert', in_progress: 'En cours', waiting_customer: 'Attente client',
    resolved: 'Résolu', closed: 'Fermé',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-50 text-gray-500'}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Thread de messages ───────────────────────────────────────────────────────
function MessageThread({ ticket, onSend, onResolve }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await onSend(ticket.id, reply);
      setReply('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0 max-h-80">
        {(ticket.messages || []).map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.author_type === 'agent' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${msg.author_type === 'agent' ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {msg.author_name.charAt(0).toUpperCase()}
            </div>
            <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${msg.author_type === 'agent' ? 'bg-blue-900 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
              <p className={`text-xs mb-1 font-semibold ${msg.author_type === 'agent' ? 'text-blue-200' : 'text-gray-500'}`}>{msg.author_name}</p>
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {(!ticket.messages || ticket.messages.length === 0) && (
          <p className="text-center text-gray-400 text-sm py-8">Aucun message dans ce ticket.</p>
        )}
      </div>

      {/* Zone de réponse */}
      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            placeholder="Votre réponse..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900 resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className="px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
              Envoyer
            </button>
            <button
              onClick={() => onResolve(ticket.id)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
            >
              Marquer résolu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SupportDashboard({ tickets: propTickets, stats: propStats }) {
  const [tickets, setTickets] = useState(propTickets || MOCK_TICKETS);
  const [stats, setStats]     = useState(propStats   || MOCK_STATS);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [notification, setNotification] = useState(null);

  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const filtered = tickets.filter(t => {
    if (filters.status   && t.status   !== filters.status)   return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.category && t.category !== filters.category) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) && !t.ticket_number.includes(filters.search)) return false;
    return true;
  });

  const handleSend = async (ticketId, content) => {
    try {
      const res = await axios.post(`/superadmin/support/tickets/${ticketId}/message`, { content });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...res.data.ticket } : t));
      if (selected?.id === ticketId) setSelected(res.data.ticket);
      notify('success', 'Réponse envoyée.');
    } catch {
      notify('error', 'Erreur lors de l\'envoi.');
    }
  };

  const handleResolve = async (ticketId) => {
    try {
      const res = await axios.post(`/superadmin/support/tickets/${ticketId}/resolve`);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...res.data.ticket } : t));
      if (selected?.id === ticketId) setSelected(res.data.ticket);
      notify('success', 'Ticket résolu.');
    } catch {
      notify('error', 'Erreur lors de la résolution.');
    }
  };

  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedFiltered = [...filtered].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  return (
    <>
      <Head title="Support — SuperAdmin IBIG Soft" />

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.message}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <header className="bg-blue-900 text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center gap-3">
            <button onClick={() => router.visit('/superadmin/saas-dashboard')} className="text-blue-200 hover:text-white text-sm">← Dashboard</button>
            <span className="text-blue-400">/</span>
            <h1 className="text-lg font-bold">Centre de support</h1>
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

          {/* Métriques support */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Tickets ouverts', value: stats.open,       color: stats.open > 10 ? 'text-red-700' : 'text-blue-900' },
              { label: 'Urgents',         value: stats.urgent,     color: stats.urgent > 0 ? 'text-red-700' : 'text-gray-700' },
              { label: 'Cette semaine',   value: stats.this_week,  color: 'text-gray-700' },
              { label: 'MTTR moyen',      value: stats.mttr_hours ? `${stats.mttr_hours}h` : 'N/A', color: 'text-blue-900' },
              { label: 'CSAT',            value: stats.csat ? `${stats.csat}/5` : 'N/A', color: stats.csat >= 4 ? 'text-green-700' : 'text-amber-700' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                <p className="text-xs text-gray-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Layout : Liste + Détail */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6" style={{ minHeight: 600 }}>

            {/* Liste des tickets */}
            <div className="xl:col-span-2 flex flex-col gap-4">
              {/* Filtres */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Rechercher un ticket..."
                  value={filters.search}
                  onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-900">
                    <option value="">Tous les statuts</option>
                    <option value="open">Ouvert</option>
                    <option value="in_progress">En cours</option>
                    <option value="waiting_customer">Attente client</option>
                    <option value="resolved">Résolu</option>
                  </select>
                  <select value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-900">
                    <option value="">Toutes priorités</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">Haute</option>
                    <option value="normal">Normale</option>
                    <option value="low">Faible</option>
                  </select>
                </div>
              </div>

              {/* Liste */}
              <div className="space-y-2">
                {sortedFiltered.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
                    <p className="text-sm">Aucun ticket trouvé</p>
                  </div>
                )}
                {sortedFiltered.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelected(ticket)}
                    className={`w-full text-left bg-white rounded-xl shadow-sm border transition-all p-4 ${selected?.id === ticket.id ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <PriorityBadge priority={ticket.priority} />
                        <StatusBadge status={ticket.status} />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{ticket.age_hours}h</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{ticket.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{ticket.ticket_number} · {ticket.organization_name}</p>
                    {!ticket.assigned_to && ticket.status !== 'resolved' && (
                      <p className="text-xs text-amber-600 font-medium mt-1">Non assigné</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Détail ticket */}
            <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              {!selected ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                  <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <p className="font-medium">Sélectionnez un ticket</p>
                  <p className="text-sm mt-1">Cliquez sur un ticket à gauche pour voir le détail et répondre</p>
                </div>
              ) : (
                <>
                  {/* Header ticket */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs font-mono text-gray-400">{selected.ticket_number}</span>
                          <PriorityBadge priority={selected.priority} />
                          <StatusBadge status={selected.status} />
                        </div>
                        <h3 className="font-semibold text-gray-900">{selected.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{selected.organization_name}</span>
                          <span>·</span>
                          <span>{selected.created_by_email}</span>
                          {selected.assignee_name && <><span>·</span><span>Assigné à : {selected.assignee_name}</span></>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thread */}
                  <div className="flex-1 overflow-hidden">
                    <MessageThread
                      ticket={selected}
                      onSend={handleSend}
                      onResolve={handleResolve}
                    />
                  </div>
                </>
              )}
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
