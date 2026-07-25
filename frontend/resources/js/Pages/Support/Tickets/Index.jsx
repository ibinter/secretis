import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const STATUS_CONFIG = {
  open:           { label: 'Ouvert',           color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  in_progress:    { label: 'En cours',         color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  waiting_client: { label: 'Attente client',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  resolved:       { label: 'Résolu',           color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  closed:         { label: 'Clôturé',          color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};
const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  color: 'bg-gray-100 text-gray-500 dark:bg-gray-700' },
  medium: { label: 'Moyen',   color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
  high:   { label: 'Élevé',   color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
  urgent: { label: 'Urgent',  color: 'bg-red-100 text-red-600 dark:bg-red-900/30' },
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TicketsIndex({ tickets, filters = {}, isAdmin = false, stats = {} }) {
  const { data, setData, get } = useForm({
    status: filters.status || '',
    priority: filters.priority || '',
    category: filters.category || '',
    date_from: filters.date_from || '',
    date_to: filters.date_to || '',
  });

  function applyFilters() {
    router.get(route('support.tickets.index'), data, { preserveState: true });
  }
  function resetFilters() {
    router.get(route('support.tickets.index'));
  }

  return (
    <AppLayout>
      <Head title="Mes tickets support" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets support</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Suivez vos demandes d'assistance</p>
          </div>
          <Link href={route('support.tickets.create')}
            className="flex items-center gap-2 bg-[#7e22ce] hover:bg-[#9333EA] text-white font-semibold
              px-5 py-2.5 rounded-xl transition-colors shadow">
            🎫 Nouveau ticket
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Ouverts', value: stats.open || 0, color: 'text-purple-600' },
            { label: 'En cours', value: stats.in_progress || 0, color: 'text-orange-600' },
            { label: 'Résolus', value: stats.resolved || 0, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <select value={data.status} onChange={e => setData('status', e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700
                text-gray-900 dark:text-white text-sm outline-none focus:border-[#7e22ce]">
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <select value={data.priority} onChange={e => setData('priority', e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700
                text-gray-900 dark:text-white text-sm outline-none focus:border-[#7e22ce]">
              <option value="">Toutes priorités</option>
              {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <select value={data.category} onChange={e => setData('category', e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700
                text-gray-900 dark:text-white text-sm outline-none focus:border-[#7e22ce]">
              <option value="">Toutes catégories</option>
              {[['technical','Technique'],['billing','Facturation'],['feature_request','Fonctionnalité'],['training','Formation'],['other','Autre']].map(([v,l]) =>
                <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="date" value={data.date_from} onChange={e => setData('date_from', e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700
                text-gray-900 dark:text-white text-sm outline-none focus:border-[#7e22ce]" />
            <div className="flex gap-2">
              <button onClick={applyFilters}
                className="flex-1 bg-[#7e22ce] text-white text-sm rounded-lg px-3 py-2 hover:bg-[#9333EA] transition-colors">
                Filtrer
              </button>
              <button onClick={resetFilters}
                className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {tickets.data && tickets.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-4 py-3 text-left">Numéro</th>
                      <th className="px-4 py-3 text-left">Sujet</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                      <th className="px-4 py-3 text-left">Priorité</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      {isAdmin && <th className="px-4 py-3 text-left">Assigné</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {tickets.data.map(ticket => {
                      const status = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: 'bg-gray-100 text-gray-600' };
                      const priority = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, color: 'bg-gray-100 text-gray-500' };
                      return (
                        <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={route('support.tickets.show', ticket.id)}
                              className="font-mono text-sm text-[#7e22ce] hover:underline">
                              {ticket.ticket_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link href={route('support.tickets.show', ticket.id)}
                              className="text-sm text-gray-900 dark:text-white hover:text-[#7e22ce] line-clamp-1 max-w-xs block">
                              {ticket.subject}
                              {ticket.is_overdue && <span className="ml-2 text-xs text-red-500 font-medium">⚠ En retard</span>}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>{priority.label}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatDate(ticket.created_at)}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {ticket.assigned_to?.name || <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {tickets.links && tickets.links.length > 3 && (
                <div className="flex justify-center gap-2 p-4 border-t border-gray-100 dark:border-gray-700">
                  {tickets.links.map((link, i) => (
                    <Link key={i} href={link.url || '#'}
                      className={`px-3 py-2 rounded-lg text-sm ${link.active
                        ? 'bg-[#7e22ce] text-white'
                        : link.url ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-400'
                        : 'text-gray-300 cursor-not-allowed'}`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🎫</p>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Aucun ticket</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Vous n'avez pas encore de ticket support.</p>
              <Link href={route('support.tickets.create')}
                className="inline-flex items-center gap-2 bg-[#7e22ce] hover:bg-[#9333EA] text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                Créer mon premier ticket
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* FAB mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <Link href={route('support.tickets.create')}
          className="flex items-center justify-center w-14 h-14 bg-[#7e22ce] hover:bg-[#9333EA] text-white rounded-full shadow-xl transition-colors text-2xl">
          +
        </Link>
      </div>
    </AppLayout>
  );
}
export { TicketsIndex };
