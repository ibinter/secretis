/**
 * Comptabilite/Invoices.jsx — Liste des factures SECRETIS ERP
 *
 * Props Inertia :
 *   invoices : Paginator<Invoice with client>
 *   clients  : AccountingClient[]
 *   filters  : { status, client_id, date_from, date_to, search }
 */

import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
  DocumentArrowDownIcon, EnvelopeIcon, CheckCircleIcon,
  DocumentDuplicateIcon, MagnifyingGlassIcon, FunnelIcon,
  PlusIcon, EyeIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import AuthLayout from '@/Layouts/AuthLayout';
import debounce from 'lodash/debounce';

// Formateur FCFA
const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v ?? 0) + ' FCFA';

// Badges statut
const STATUS_CONFIG = {
  draft:     { label: 'Brouillon',  classes: 'bg-gray-100 text-gray-600' },
  sent:      { label: 'Envoyée',    classes: 'bg-purple-100 text-purple-700' },
  paid:      { label: 'Payée',      classes: 'bg-emerald-100 text-emerald-700' },
  overdue:   { label: 'En retard',  classes: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulée',    classes: 'bg-orange-100 text-orange-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

// =============================================================================

export default function Invoices({ invoices, clients, filters }) {
  const [loading, setLoading] = useState({});
  const [payModal, setPayModal] = useState(null);
  const [payData, setPayData] = useState({
    amount: '', payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'virement', reference: '',
  });

  const setLoaderKey = (key, val) => setLoading((prev) => ({ ...prev, [key]: val }));

  // Filtrage
  const applyFilter = debounce((key, value) => {
    router.get('/comptabilite/invoices', { ...filters, [key]: value || undefined }, {
      preserveState: true, replace: true,
    });
  }, 350);

  // Actions
  const handleSend = async (id, number) => {
    setLoaderKey(`send-${id}`, true);
    try {
      await axios.post(`/comptabilite/invoices/${id}/send`);
      toast.success(`Facture ${number} envoyée.`);
      router.reload({ only: ['invoices'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Erreur lors de l\'envoi.');
    } finally {
      setLoaderKey(`send-${id}`, false);
    }
  };

  const handlePdfDownload = (id, number) => {
    window.open(`/comptabilite/invoices/${id}/pdf`, '_blank');
  };

  const handlePaySubmit = async () => {
    if (!payModal) return;
    setLoaderKey('pay', true);
    try {
      await axios.post(`/comptabilite/invoices/${payModal.id}/pay`, payData);
      toast.success('Paiement enregistré.');
      setPayModal(null);
      router.reload({ only: ['invoices'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Erreur lors du paiement.');
    } finally {
      setLoaderKey('pay', false);
    }
  };

  const handleDelete = async (id, number) => {
    if (! confirm(`Supprimer la facture ${number} ?`)) return;
    try {
      await axios.delete(`/comptabilite/invoices/${id}`);
      toast.success('Facture supprimée.');
      router.reload({ only: ['invoices'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Impossible de supprimer.');
    }
  };

  return (
    <AuthLayout>
      <Head title="Factures" />

      <div className="p-6 space-y-5">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <Link
            href="/comptabilite/invoices/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9333EA] text-white rounded-lg text-sm hover:bg-[#16324e] transition"
          >
            <PlusIcon className="h-4 w-4" />
            Nouvelle facture
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {/* Recherche */}
            <div className="relative col-span-2 lg:col-span-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Numéro, objet..."
                defaultValue={filters.search}
                onChange={(e) => applyFilter('search', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
              />
            </div>

            {/* Statut */}
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

            {/* Client */}
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

            {/* Date de */}
            <input
              type="date"
              defaultValue={filters.date_from}
              onChange={(e) => applyFilter('date_from', e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
            />
            <input
              type="date"
              defaultValue={filters.date_to}
              onChange={(e) => applyFilter('date_to', e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Objet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Échéance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total TTC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Solde dû</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                      Aucune facture trouvée.
                    </td>
                  </tr>
                )}
                {invoices.data.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-[#9333EA] text-xs">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{inv.client?.name}</div>
                      <div className="text-xs text-gray-400">{inv.client?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{inv.title}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {inv.issue_date ? format(parseISO(inv.issue_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {inv.due_date ? (
                        <span className={inv.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          {format(parseISO(inv.due_date), 'dd/MM/yyyy')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {fcfa(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.balance_due > 0 ? (
                        <span className="font-semibold text-red-600">{fcfa(inv.balance_due)}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Soldé</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* PDF */}
                        <button
                          onClick={() => handlePdfDownload(inv.id, inv.invoice_number)}
                          title="Télécharger PDF"
                          className="p-1.5 text-gray-400 hover:text-[#9333EA] hover:bg-purple-50 rounded-lg transition"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>

                        {/* Envoyer email */}
                        {['draft', 'sent'].includes(inv.status) && (
                          <button
                            onClick={() => handleSend(inv.id, inv.invoice_number)}
                            disabled={loading[`send-${inv.id}`]}
                            title="Envoyer par email"
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-40"
                          >
                            <EnvelopeIcon className="h-4 w-4" />
                          </button>
                        )}

                        {/* Marquer payée */}
                        {['sent', 'overdue'].includes(inv.status) && (
                          <button
                            onClick={() => {
                              setPayData((p) => ({ ...p, amount: inv.balance_due }));
                              setPayModal(inv);
                            }}
                            title="Enregistrer un paiement"
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}

                        {/* Éditer */}
                        {inv.status === 'draft' && (
                          <Link
                            href={`/comptabilite/invoices/${inv.id}/edit`}
                            title="Modifier"
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                        )}

                        {/* Supprimer */}
                        {['draft', 'cancelled'].includes(inv.status) && (
                          <button
                            onClick={() => handleDelete(inv.id, inv.invoice_number)}
                            title="Supprimer"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {invoices.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>
                {invoices.from}–{invoices.to} sur {invoices.total} factures
              </span>
              <div className="flex gap-2">
                {invoices.links.map((link, i) => (
                  <button
                    key={i}
                    disabled={!link.url}
                    onClick={() => link.url && router.get(link.url)}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    className={`px-3 py-1 rounded-lg text-xs transition ${
                      link.active
                        ? 'bg-[#9333EA] text-white'
                        : link.url
                        ? 'bg-white border border-gray-200 hover:bg-gray-50'
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Modal paiement ===== */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Enregistrer un paiement
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Facture {payModal.invoice_number} — solde dû :{' '}
              <strong className="text-red-600">{fcfa(payModal.balance_due)}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Montant (FCFA) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={payModal.balance_due}
                  value={payData.amount}
                  onChange={(e) => setPayData((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date de paiement *
                </label>
                <input
                  type="date"
                  value={payData.payment_date}
                  onChange={(e) => setPayData((p) => ({ ...p, payment_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mode de paiement *
                </label>
                <select
                  value={payData.payment_method}
                  onChange={(e) => setPayData((p) => ({ ...p, payment_method: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
                >
                  <option value="virement">Virement bancaire</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="especes">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="carte">Carte bancaire</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Référence (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="N° virement, transaction..."
                  value={payData.reference}
                  onChange={(e) => setPayData((p) => ({ ...p, reference: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPayModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handlePaySubmit}
                disabled={loading.pay || !payData.amount}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {loading.pay ? 'Enregistrement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AuthLayout>
  );
}
export { Invoices };
