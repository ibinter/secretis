/**
 * Budget/BudgetList.jsx — Liste des budgets SECRETIS ERP
 *
 * Props Inertia :
 *   budgets     : Paginator<Budget>
 *   fiscalYears : [{ id, name }]
 *   filters     : { status, type, fiscal_year_id }
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  PlusIcon, PencilIcon, CheckCircleIcon, DocumentDuplicateIcon,
  ArchiveBoxIcon, EyeIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);

const STATUS_LABELS = {
  draft:    { label: 'Brouillon',  color: 'bg-gray-100 text-gray-600' },
  approved: { label: 'Approuvé',   color: 'bg-blue-100 text-blue-700' },
  active:   { label: 'Actif',      color: 'bg-green-100 text-green-700' },
  closed:   { label: 'Clôturé',    color: 'bg-orange-100 text-orange-700' },
};

const TYPE_LABELS = {
  operationnel:  'Opérationnel',
  investissement:'Investissement',
  projet:        'Projet',
  departement:   'Département',
};

function StatusBadge({ status }) {
  const { label, color } = STATUS_LABELS[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}

function ExecutionBar({ pct }) {
  const p = Math.min(pct ?? 0, 120);
  const color = p >= 100 ? '#E74C3C' : p >= 80 ? '#F39C12' : '#27AE60';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(p, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{(pct ?? 0).toFixed(0)}%</span>
    </div>
  );
}

export default function BudgetList({ budgets, fiscalYears, filters }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading]             = useState(null);

  const updateFilter = (key, val) => {
    router.get('/budget', { ...filters, [key]: val || undefined }, { preserveState: true });
  };

  const handleApprove = async (b) => {
    if (!window.confirm(`Approuver et activer le budget "${b.name}" ?`)) return;
    setLoading(b.id + '-approve');
    try {
      await axios.post(`/budget/${b.id}/approve`);
      toast.success('Budget approuvé et activé.');
      router.reload();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de l\'approbation.');
    } finally {
      setLoading(null);
    }
  };

  const handleDuplicate = async (b) => {
    setLoading(b.id + '-dup');
    try {
      const { data } = await axios.post(`/budget/${b.id}/duplicate`);
      toast.success('Budget dupliqué.');
      router.visit(`/budget/${data.budget.id}/edit`);
    } catch {
      toast.error('Erreur lors de la duplication.');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (b) => {
    setLoading(b.id + '-del');
    try {
      await axios.delete(`/budget/${b.id}`);
      toast.success('Budget supprimé.');
      setConfirmDelete(null);
      router.reload();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de la suppression.');
    } finally {
      setLoading(null);
    }
  };

  const items = budgets?.data ?? [];

  return (
    <AuthLayout>
      <Head title="Gestion budgétaire" />

      <div className="p-6 space-y-6">

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion budgétaire</h1>
            <p className="text-sm text-gray-500">{budgets?.total ?? 0} budget(s) enregistré(s)</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/budget/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Tableau de bord
            </a>
            <a
              href="/budget/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A3A5C] text-white rounded-lg text-sm hover:bg-[#16324e] transition"
            >
              <PlusIcon className="h-4 w-4" /> Nouveau budget
            </a>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
          <select
            value={filters?.fiscal_year_id ?? ''}
            onChange={(e) => updateFilter('fiscal_year_id', e.target.value)}
            className="rounded-lg border border-gray-200 text-sm px-3 py-2 focus:outline-none"
          >
            <option value="">Tous les exercices</option>
            {fiscalYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}</option>)}
          </select>

          <select
            value={filters?.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="rounded-lg border border-gray-200 text-sm px-3 py-2 focus:outline-none"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>

          <select
            value={filters?.type ?? ''}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="rounded-lg border border-gray-200 text-sm px-3 py-2 focus:outline-none"
          >
            <option value="">Tous les types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Nom du budget</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Montant total</th>
                  <th className="px-4 py-3 font-medium w-36">% Exécution</th>
                  <th className="px-4 py-3 font-medium">Approuvé par</th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      Aucun budget trouvé. <a href="/budget/create" className="text-[#1A3A5C] hover:underline">Créer le premier budget →</a>
                    </td>
                  </tr>
                )}
                {items.map((b) => (
                  <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{b.name}</div>
                      {b.notes && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">{b.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600 text-xs">
                      {TYPE_LABELS[b.type] ?? b.type}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {fcfa(b.total_amount)} FCFA
                    </td>
                    <td className="px-4 py-3 w-36">
                      <ExecutionBar pct={b.execution_pct} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {b.approver?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Voir */}
                        <a
                          href={`/budget/${b.id}/variance`}
                          title="Analyse des écarts"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#1A3A5C] hover:bg-gray-100 transition"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </a>

                        {/* Éditer (draft seulement) */}
                        {b.status === 'draft' && (
                          <a
                            href={`/budget/${b.id}/edit`}
                            title="Modifier"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </a>
                        )}

                        {/* Approuver (draft) */}
                        {b.status === 'draft' && (
                          <button
                            onClick={() => handleApprove(b)}
                            disabled={loading === b.id + '-approve'}
                            title="Approuver"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}

                        {/* Réviser (active) */}
                        {b.status === 'active' && (
                          <a
                            href={`/budget/${b.id}/revise`}
                            title="Réviser"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"
                          >
                            <ExclamationTriangleIcon className="h-4 w-4" />
                          </a>
                        )}

                        {/* Dupliquer */}
                        <button
                          onClick={() => handleDuplicate(b)}
                          disabled={loading === b.id + '-dup'}
                          title="Dupliquer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition disabled:opacity-50"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>

                        {/* Archiver/Supprimer (draft) */}
                        {b.status === 'draft' && (
                          <button
                            onClick={() => setConfirmDelete(b)}
                            title="Supprimer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                          >
                            <ArchiveBoxIcon className="h-4 w-4" />
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
          {budgets?.last_page > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
              <span className="text-xs text-gray-400">
                Page {budgets.current_page} sur {budgets.last_page}
              </span>
              <div className="flex gap-2">
                {budgets.prev_page_url && (
                  <button
                    onClick={() => router.visit(budgets.prev_page_url)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    ← Précédent
                  </button>
                )}
                {budgets.next_page_url && (
                  <button
                    onClick={() => router.visit(budgets.next_page_url)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    Suivant →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Supprimer ce budget ?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Le budget <strong>{confirmDelete.name}</strong> et toutes ses lignes seront définitivement supprimés.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={loading === confirmDelete.id + '-del'}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading === confirmDelete.id + '-del' ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
