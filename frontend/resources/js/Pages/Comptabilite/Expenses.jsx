/**
 * Comptabilite/Expenses.jsx — Dépenses SECRETIS ERP
 *
 * Props Inertia :
 *   expenses       : Paginator<Expense with category, creator>
 *   categories     : ExpenseCategory[]
 *   budgetOverview : { id, name, color, icon, budget_monthly, current_spend, usage_percent }[]
 *   filters        : { status, category_id }
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  PlusIcon, CheckCircleIcon, XCircleIcon,
  PaperClipIcon, ReceiptPercentIcon, FunnelIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v ?? 0) + ' FCFA';

const STATUS_CONFIG = {
  pending:  { label: 'En attente', classes: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approuvée',  classes: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Refusée',    classes: 'bg-red-100 text-red-700' },
};

const EMPTY_FORM = {
  category_id:  '',
  title:        '',
  amount:       '',
  expense_date: new Date().toISOString().slice(0, 10),
  vendor:       '',
  notes:        '',
  receipt:      null,
};

// =============================================================================

export default function Expenses({ expenses, categories, budgetOverview, filters }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [approving, setApproving] = useState(null);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});

    const payload = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== '') payload.append(k, v);
    });

    try {
      await axios.post('/comptabilite/expenses', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Dépense créée.');
      setShowForm(false);
      setForm(EMPTY_FORM);
      router.reload({ only: ['expenses', 'budgetOverview'] });
    } catch (e) {
      if (e.response?.status === 422) {
        setErrors(e.response.data.errors ?? {});
      } else {
        toast.error('Une erreur est survenue.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    setApproving(id + '-approve');
    try {
      await axios.post(`/comptabilite/expenses/${id}/approve`);
      toast.success('Dépense approuvée.');
      router.reload({ only: ['expenses'] });
    } catch {
      toast.error('Erreur lors de l\'approbation.');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id) => {
    setApproving(id + '-reject');
    try {
      await axios.post(`/comptabilite/expenses/${id}/reject`);
      toast.success('Dépense refusée.');
      router.reload({ only: ['expenses'] });
    } catch {
      toast.error('Erreur lors du refus.');
    } finally {
      setApproving(null);
    }
  };

  const applyFilter = (key, value) => {
    router.get('/comptabilite/expenses', { ...filters, [key]: value || undefined }, {
      preserveState: true, replace: true,
    });
  };

  // Total dépenses approuvées du mois
  const totalMonthApproved = budgetOverview.reduce((acc, c) => acc + c.current_spend, 0);

  return (
    <AuthLayout>
      <Head title="Dépenses" />

      <div className="p-6 space-y-6">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Total du mois (approuvé) : <strong>{fcfa(totalMonthApproved)}</strong>
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9333EA] text-white rounded-lg text-sm hover:bg-[#16324e] transition"
          >
            <PlusIcon className="h-4 w-4" />
            Nouvelle dépense
          </button>
        </div>

        {/* Budget par catégorie */}
        {budgetOverview.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgetOverview.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{ background: cat.color }}
                    >
                      <ReceiptPercentIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{cat.name}</div>
                      <div className="text-xs text-gray-400">
                        {cat.budget_monthly ? `Budget : ${fcfa(cat.budget_monthly)}` : 'Pas de budget défini'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: cat.color }}>
                      {fcfa(cat.current_spend)}
                    </div>
                    <div className="text-xs text-gray-400">ce mois</div>
                  </div>
                </div>
                {cat.budget_monthly > 0 && (
                  <div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(cat.usage_percent, 100)}%`,
                          background: cat.usage_percent >= 90
                            ? '#E74C3C'
                            : cat.usage_percent >= 70
                            ? '#F39C12'
                            : cat.color,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{cat.usage_percent}% utilisé</span>
                      <span>Reste : {fcfa(Math.max(0, cat.budget_monthly - cat.current_spend))}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
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
              defaultValue={filters.category_id}
              onChange={(e) => applyFilter('category_id', e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste dépenses */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Titre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fournisseur</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Pièce</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                      Aucune dépense enregistrée.
                    </td>
                  </tr>
                )}
                {expenses.data.map((exp) => {
                  const statusCfg = STATUS_CONFIG[exp.status] ?? { label: exp.status, classes: 'bg-gray-100 text-gray-500' };
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">{exp.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {exp.category && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                            style={{ background: exp.category.color }}
                          >
                            {exp.category.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {exp.expense_date
                          ? format(parseISO(exp.expense_date), 'dd MMM yyyy', { locale: fr })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{exp.vendor ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {fcfa(exp.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exp.receipt_path ? (
                          <a
                            href={`/storage/${exp.receipt_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1 text-purple-500 hover:text-purple-700"
                            title="Voir le justificatif"
                          >
                            <PaperClipIcon className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.classes}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {exp.status === 'pending' && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleApprove(exp.id)}
                              disabled={approving === exp.id + '-approve'}
                              title="Approuver"
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-40"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(exp.id)}
                              disabled={approving === exp.id + '-reject'}
                              title="Refuser"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {expenses.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              <span>{expenses.from}–{expenses.to} sur {expenses.total}</span>
              <div className="flex gap-2">
                {expenses.links.map((link, i) => (
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
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ===== Drawer création dépense ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Nouvelle dépense</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setField('category_id', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30 ${errors.category_id ? 'border-red-400' : 'border-gray-200'}`}
                >
                  <option value="">— Sélectionner une catégorie —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Titre / Libellé <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="Ex: Achat fournitures bureau"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30 ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Montant (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(e) => setField('amount', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30 ${errors.amount ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setField('expense_date', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fournisseur</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) => setField('vendor', e.target.value)}
                  placeholder="Nom du fournisseur / prestataire"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30 resize-none"
                />
              </div>

              {/* Upload justificatif */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Justificatif (reçu, facture)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <div className="flex flex-col items-center text-gray-400">
                    <CloudArrowUpIcon className="h-6 w-6 mb-1" />
                    <span className="text-xs">
                      {form.receipt ? form.receipt.name : 'Cliquer pour uploader (PDF, JPG, PNG — max 5 Mo)'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setField('receipt', e.target.files[0] || null)}
                  />
                </label>
                {errors.receipt && <p className="text-xs text-red-500 mt-1">{errors.receipt[0]}</p>}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#9333EA] text-white rounded-lg text-sm font-medium hover:bg-[#16324e] disabled:opacity-50 transition"
              >
                {saving ? 'Enregistrement...' : 'Créer la dépense'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AuthLayout>
  );
}
export { Expenses };
