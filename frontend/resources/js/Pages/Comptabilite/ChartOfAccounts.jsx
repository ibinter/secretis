/**
 * Comptabilite/ChartOfAccounts.jsx — Plan comptable SYSCOHADA
 *
 * Props Inertia :
 *   accounts : paginé
 *   filters  : filtres actifs
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon,
  ArrowUpTrayIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';

const CLASSES = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `Classe ${i + 1}`,
}));

const TYPES = [
  { value: 'actif',    label: 'Actif' },
  { value: 'passif',   label: 'Passif' },
  { value: 'capitaux', label: 'Capitaux' },
  { value: 'charge',   label: 'Charges' },
  { value: 'produit',  label: 'Produits' },
];

const typeColors = {
  actif:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  passif:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  capitaux: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  charge:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  produit:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

// ============================================================
// Formulaire d'ajout de compte
// ============================================================
function AddAccountForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    account_number: '',
    account_name:   '',
    account_type:   'actif',
    parent_account_number: '',
    ohada_class:    '1',
    is_leaf:        true,
  });
  const [saving, setSaving] = useState(false);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/comptabilite/generale/plan-comptable', {
        ...form,
        ohada_class: parseInt(form.ohada_class),
        is_leaf:     form.is_leaf === true || form.is_leaf === 'true',
      });
      toast.success(`Compte ${form.account_number} créé`);
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Ajouter un compte</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-sm">N° compte *</label>
                <input className="input-sm" placeholder="ex : 4112" required
                  value={form.account_number} onChange={e => setF('account_number', e.target.value)} />
              </div>
              <div>
                <label className="label-sm">Classe OHADA *</label>
                <select className="input-sm" value={form.ohada_class}
                  onChange={e => setF('ohada_class', e.target.value)}>
                  {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label-sm">Libellé *</label>
              <input className="input-sm" placeholder="ex : Clients particuliers" required
                value={form.account_name} onChange={e => setF('account_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-sm">Type *</label>
                <select className="input-sm" value={form.account_type}
                  onChange={e => setF('account_type', e.target.value)}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-sm">Compte parent</label>
                <input className="input-sm" placeholder="ex : 411"
                  value={form.parent_account_number}
                  onChange={e => setF('parent_account_number', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_leaf" className="rounded"
                checked={form.is_leaf}
                onChange={e => setF('is_leaf', e.target.checked)} />
              <label htmlFor="is_leaf" className="text-sm text-gray-600 dark:text-gray-400">
                Compte feuille (peut recevoir des écritures directes)
              </label>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Création…' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Export CSV
// ============================================================
function exportCsv(accounts) {
  const BOM = '﻿';
  const header = 'N° Compte;Libellé;Type;Classe;Compte parent;Feuille;Système\n';
  const rows   = accounts.map(a =>
    `${a.account_number};"${a.account_name}";${a.account_type};${a.ohada_class};${a.parent_account_number || ''};${a.is_leaf ? 'Oui' : 'Non'};${a.is_system ? 'SYSCOHADA' : 'Personnalisé'}`
  ).join('\n');
  const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plan-comptable-syscohada.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Page principale
// ============================================================
export default function ChartOfAccounts({ accounts, filters }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState(filters.search || '');
  const [cls, setCls]           = useState(filters.class || '');
  const [type, setType]         = useState(filters.type  || '');

  const applyFilters = () => {
    router.get('/comptabilite/generale/plan-comptable', { search, class: cls, type }, { preserveState: true });
  };

  const handleSaved = () => {
    router.reload({ only: ['accounts'] });
  };

  const handleDelete = async (id, number) => {
    if (!confirm(`Supprimer le compte ${number} ?`)) return;
    try {
      await axios.delete(`/comptabilite/generale/plan-comptable/${id}`);
      toast.success('Compte supprimé');
      router.reload({ only: ['accounts'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const allAccounts = accounts?.data || [];

  return (
    <AuthLayout>
      <Head title="Plan comptable SYSCOHADA" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Plan comptable</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">SYSCOHADA Révisé 2017 — Classes 1 à 8</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportCsv(allAccounts)}
              className="btn-secondary flex items-center gap-1 text-sm">
              <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Ajouter un compte
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative col-span-2">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-sm pl-7 w-full" placeholder="Rechercher N° ou libellé…"
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()} />
            </div>
            <select className="input-sm" value={cls} onChange={e => setCls(e.target.value)}>
              <option value="">Toutes classes</option>
              {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select className="input-sm" value={type} onChange={e => setType(e.target.value)}>
              <option value="">Tous types</option>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={applyFilters} className="btn-primary text-sm">Filtrer</button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left w-28">N° Compte</th>
                  <th className="px-4 py-3 text-left">Libellé</th>
                  <th className="px-4 py-3 text-center w-24">Classe</th>
                  <th className="px-4 py-3 text-center w-28">Type</th>
                  <th className="px-4 py-3 text-center w-24">Parent</th>
                  <th className="px-4 py-3 text-center w-20">Feuille</th>
                  <th className="px-4 py-3 text-center w-32">Origine</th>
                  <th className="px-4 py-3 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {allAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      Aucun compte trouvé
                    </td>
                  </tr>
                ) : allAccounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-2.5 font-mono font-semibold text-purple-700 dark:text-purple-400">
                      {acc.account_number}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{acc.account_name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                        Cl. {acc.ohada_class}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[acc.account_type] || ''}`}>
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-gray-500 dark:text-gray-400 text-xs">
                      {acc.parent_account_number || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs ${acc.is_leaf ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {acc.is_leaf ? '✓ Oui' : 'Non'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {acc.is_system ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                          <ShieldCheckIcon className="w-3 h-3" /> SYSCOHADA
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          Personnalisé
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!acc.is_system && (
                        <button onClick={() => handleDelete(acc.id, acc.account_number)}
                          className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">
                          Suppr.
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {accounts.last_page > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{accounts.total} comptes — Page {accounts.current_page}/{accounts.last_page}</span>
              <div className="flex gap-2">
                {accounts.prev_page_url && (
                  <button onClick={() => router.visit(accounts.prev_page_url)} className="btn-secondary text-xs">←</button>
                )}
                {accounts.next_page_url && (
                  <button onClick={() => router.visit(accounts.next_page_url)} className="btn-secondary text-xs">→</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <AddAccountForm onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </AuthLayout>
  );
}
export { ChartOfAccounts };
