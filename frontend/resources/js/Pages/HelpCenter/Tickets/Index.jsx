/**
 * SECRETIS ERP — HelpCenter/Tickets/Index.jsx
 * Liste des tickets support de l'utilisateur
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// ─── Configuration statuts ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open:              { label: 'Ouvert',          color: 'bg-purple-100 text-purple-700' },
  waiting_customer:  { label: 'En attente',       color: 'bg-yellow-100 text-yellow-700' },
  waiting_support:   { label: 'En cours',          color: 'bg-orange-100 text-orange-700' },
  in_progress:       { label: 'En traitement',     color: 'bg-purple-100 text-purple-700' },
  resolved:          { label: 'Résolu',            color: 'bg-green-100 text-green-700' },
  closed:            { label: 'Fermé',             color: 'bg-gray-100 text-gray-500' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Basse',    color: 'text-gray-400', dot: 'bg-gray-300' },
  normal: { label: 'Normale',  color: 'text-purple-500', dot: 'bg-purple-400' },
  high:   { label: 'Haute',    color: 'text-orange-500', dot: 'bg-orange-400' },
  urgent: { label: 'Urgente',  color: 'text-red-500',  dot: 'bg-red-500' },
};

const CATEGORY_LABELS = {
  technical:       'Problème technique',
  billing:         'Facturation',
  question:        'Question',
  feature_request: 'Suggestion',
};

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Ticket: () => (
    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
};

export default function TicketsIndex() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', period: '90' });
  const [pagination, setPagination] = useState({ current: 1, total: 1, perPage: 15 });

  const fetchTickets = (page = 1) => {
    setLoading(true);
    const params = { page, per_page: pagination.perPage };
    if (filters.status)   params.status   = filters.status;
    if (filters.priority) params.priority  = filters.priority;
    if (filters.period)   params.days_ago  = filters.period;

    axios.get('/api/v1/help/tickets', { params })
      .then(({ data }) => {
        setTickets(data.data ?? []);
        setPagination(p => ({
          ...p,
          current: data.current_page ?? 1,
          total:   data.last_page ?? 1,
        }));
      })
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(1); }, [filters]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mes tickets support</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Suivez vos demandes d'assistance
            </p>
          </div>
          <Link
            to="/help/tickets/create"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700
                       text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Icon.Plus />
            Nouveau ticket
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Toutes les priorités</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <select
            value={filters.period}
            onChange={e => setFilters(f => ({ ...f, period: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="365">12 derniers mois</option>
            <option value="">Tout l'historique</option>
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center">
              <Icon.Ticket />
              <p className="mt-4 text-gray-500 font-medium">Aucun ticket pour le moment</p>
              <p className="text-sm text-gray-400 mt-1">
                Ouvrez un ticket si vous rencontrez un problème.
              </p>
              <Link
                to="/help/tickets/create"
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm
                           hover:bg-purple-700 transition-colors"
              >
                Ouvrir un ticket
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    N°
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Objet
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase
                                hidden sm:table-cell">
                    Catégorie
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Priorité
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase
                                hidden md:table-cell">
                    Créé le
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase
                                hidden md:table-cell">
                    Dernière réponse
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map(ticket => {
                  const status   = STATUS_CONFIG[ticket.status]   ?? STATUS_CONFIG.open;
                  const priority = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.normal;
                  return (
                    <tr key={ticket.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/help/tickets/${ticket.id}`}
                    >
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {ticket.ticket_number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                          {ticket.subject}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-500">
                          {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
                          <span className={`text-xs ${priority.color}`}>{priority.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell whitespace-nowrap">
                        {formatDate(ticket.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell whitespace-nowrap">
                        {ticket.last_reply_at ? formatDate(ticket.last_reply_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <Icon.ChevronRight />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.total > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {[...Array(pagination.total)].map((_, i) => (
              <button
                key={i}
                onClick={() => fetchTickets(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                            ${pagination.current === i + 1
                              ? 'bg-purple-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export { TicketsIndex };
