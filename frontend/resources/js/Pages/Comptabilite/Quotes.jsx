/**
 * Comptabilite/Quotes.jsx — Devis SECRETIS ERP
 *
 * Props Inertia :
 *   quotes  : Paginator<Quote with client>
 *   clients : AccountingClient[]
 *   filters : { status, client_id }
 */

import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
  DocumentArrowDownIcon, EnvelopeIcon, ArrowRightCircleIcon,
  PlusIcon, CheckBadgeIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v ?? 0) + ' FCFA';

const STATUS_CONFIG = {
  draft:    { label: 'Brouillon', classes: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Envoyé',    classes: 'bg-purple-100 text-purple-700' },
  accepted: { label: 'Accepté',   classes: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Refusé',    classes: 'bg-red-100 text-red-700' },
  expired:  { label: 'Expiré',    classes: 'bg-orange-100 text-orange-700' },
};

// =============================================================================

export default function Quotes({ quotes, clients, filters }) {
  const [loading, setLoading] = useState({});

  const setLoaderKey = (key, val) => setLoading((p) => ({ ...p, [key]: val }));

  const handleSend = async (id, number) => {
    setLoaderKey(`send-${id}`, true);
    try {
      await axios.post(`/comptabilite/quotes/${id}/send`);
      toast.success(`Devis ${number} envoyé.`);
      router.reload({ only: ['quotes'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Erreur lors de l\'envoi.');
    } finally {
      setLoaderKey(`send-${id}`, false);
    }
  };

  const handleConvert = async (id, number) => {
    if (! confirm(`Convertir le devis ${number} en facture ?`)) return;
    setLoaderKey(`convert-${id}`, true);
    try {
      const { data } = await axios.get(`/comptabilite/quotes/${id}/convert`);
      toast.success(data.message);
      router.reload({ only: ['quotes'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Erreur lors de la conversion.');
    } finally {
      setLoaderKey(`convert-${id}`, false);
    }
  };

  const applyFilter = (key, value) => {
    router.get('/comptabilite/quotes', { ...filters, [key]: value || undefined }, {
      preserveState: true, replace: true,
    });
  };

  return (
    <AuthLayout>
      <Head title="Devis" />

      <div className="p-6 space-y-5">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
          <button
            onClick={() => router.visit('/comptabilite/quotes/create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9333EA] text-white rounded-lg text-sm hover:bg-[#16324e] transition"
          >
            <PlusIcon className="h-4 w-4" />
            Nouveau devis
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <select
            defaultValue={filters.status}
            onChange={(e) => applyFilter('status', e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            defaultValue={filters.client_id}
            onChange={(e) => applyFilter('client_id', e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Devis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Objet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Émis le</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Valide jusqu'au</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total TTC</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotes.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                      Aucun devis trouvé.
                    </td>
                  </tr>
                )}
                {quotes.data.map((quote) => {
                  const statusCfg = STATUS_CONFIG[quote.status] ?? { label: quote.status, classes: '' };
                  return (
                    <tr key={quote.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono font-semibold text-[#9333EA] text-xs">
                        {quote.quote_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{quote.client?.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{quote.title}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {quote.issue_date ? format(parseISO(quote.issue_date), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {quote.valid_until ? (
                          <span className={quote.status === 'expired' ? 'text-orange-600 font-semibold' : 'text-gray-500'}>
                            {format(parseISO(quote.valid_until), 'dd/MM/yyyy')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {fcfa(quote.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.classes}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* PDF */}
                          <button
                            onClick={() => window.open(`/comptabilite/quotes/${quote.id}/pdf`, '_blank')}
                            title="Télécharger PDF"
                            className="p-1.5 text-gray-400 hover:text-[#9333EA] hover:bg-purple-50 rounded-lg transition"
                          >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                          </button>

                          {/* Envoyer */}
                          {['draft', 'sent'].includes(quote.status) && (
                            <button
                              onClick={() => handleSend(quote.id, quote.quote_number)}
                              disabled={loading[`send-${quote.id}`]}
                              title="Envoyer par email"
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-40"
                            >
                              <EnvelopeIcon className="h-4 w-4" />
                            </button>
                          )}

                          {/* Convertir en facture */}
                          {['sent', 'accepted'].includes(quote.status) && (
                            <button
                              onClick={() => handleConvert(quote.id, quote.quote_number)}
                              disabled={loading[`convert-${quote.id}`]}
                              title="Convertir en facture"
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-40"
                            >
                              <ArrowRightCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {quotes.last_page > 1 && (
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100">
              {quotes.links.map((link, i) => (
                <button
                  key={i}
                  disabled={!link.url}
                  onClick={() => link.url && router.get(link.url)}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                  className={`px-3 py-1 rounded-lg text-xs transition ${
                    link.active ? 'bg-[#9333EA] text-white'
                    : link.url ? 'bg-white border border-gray-200 hover:bg-gray-50'
                    : 'opacity-40 cursor-not-allowed'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
export { Quotes };
