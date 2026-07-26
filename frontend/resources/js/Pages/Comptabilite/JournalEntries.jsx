/**
 * Comptabilite/JournalEntries.jsx — Saisie et liste des écritures SYSCOHADA
 *
 * Props Inertia :
 *   entries      : paginé — liste des écritures
 *   fiscalYears  : exercices fiscaux disponibles
 *   chartAccounts: plan comptable (comptes feuilles)
 *   filters      : filtres actifs
 */

import { Head, router, usePage } from '@inertiajs/react';
import { useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PlusIcon, CheckIcon, TrashIcon, LockClosedIcon,
  LockOpenIcon, MagnifyingGlassIcon, FunnelIcon,
  DocumentTextIcon, ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';

// ============================================================
// Constantes
// ============================================================
const JOURNAL_TYPES = [
  { value: 'OD', label: 'Opérations diverses' },
  { value: 'VE', label: 'Ventes' },
  { value: 'AC', label: 'Achats' },
  { value: 'BQ', label: 'Banque' },
  { value: 'SA', label: 'Salaires' },
  { value: 'CA', label: 'Caisse' },
  { value: 'AN', label: 'À-nouveaux' },
];

const fcfa = (v) =>
  v == null ? '—' :
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(v)) + ' FCFA';

const emptyLine = () => ({
  account_number: '',
  debit_amount: '',
  credit_amount: '',
  description: '',
  analytic_code: '',
  _key: Math.random(),
});

// ============================================================
// Composant AccountCombobox
// ============================================================
function AccountCombobox({ value, onChange, accounts, placeholder = 'N° compte' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const ref = useRef(null);

  const filtered = useMemo(() =>
    search.length < 1
      ? accounts.slice(0, 20)
      : accounts
          .filter(a =>
            a.account_number.startsWith(search) ||
            a.account_name.toLowerCase().includes(search.toLowerCase())
          )
          .slice(0, 20),
    [search, accounts]
  );

  const select = (acc) => {
    onChange(acc.account_number);
    setSearch(acc.account_number);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <input
        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-purple-500 outline-none"
        value={search}
        placeholder={placeholder}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-52 overflow-auto text-sm">
          {filtered.map(acc => (
            <li
              key={acc.account_number}
              className="px-3 py-1.5 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 flex gap-2"
              onMouseDown={() => select(acc)}
            >
              <span className="font-mono text-purple-700 dark:text-purple-400 w-14 shrink-0">{acc.account_number}</span>
              <span className="text-gray-700 dark:text-gray-300 truncate">{acc.account_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// Formulaire de saisie d'écriture
// ============================================================
function JournalForm({ accounts, fiscalYears, onClose, onSaved }) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    entry_date: today,
    description: '',
    reference: '',
    journal_type: 'OD',
    fiscal_year_id: fiscalYears.find(f => f.status === 'open')?.id || '',
    lines: [emptyLine(), emptyLine()],
  });
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setLine = (idx, k, v) =>
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, i) => i === idx ? { ...l, [k]: v } : l),
    }));

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeLine = (idx) =>
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));

  const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit_amount)  || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!balanced) { toast.error('Écriture déséquilibrée — Débit ≠ Crédit'); return; }

    const payload = {
      ...form,
      lines: form.lines.map(l => ({
        account_number: l.account_number,
        debit_amount:   parseFloat(l.debit_amount)  || 0,
        credit_amount:  parseFloat(l.credit_amount) || 0,
        description:    l.description || null,
        analytic_code:  l.analytic_code || null,
      })),
    };

    setSaving(true);
    try {
      await axios.post('/comptabilite/generale/journal', payload);
      toast.success('Écriture créée');
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Nouvelle écriture comptable
            </h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold">×</button>
          </div>

          {/* En-tête écriture */}
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label-sm">Date</label>
              <input type="date" className="input-sm" value={form.entry_date}
                onChange={e => setField('entry_date', e.target.value)} required />
            </div>
            <div>
              <label className="label-sm">Journal</label>
              <select className="input-sm" value={form.journal_type}
                onChange={e => setField('journal_type', e.target.value)}>
                {JOURNAL_TYPES.map(j => <option key={j.value} value={j.value}>{j.value} – {j.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-sm">Exercice</label>
              <select className="input-sm" value={form.fiscal_year_id}
                onChange={e => setField('fiscal_year_id', e.target.value)}>
                <option value="">Sans exercice</option>
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id} disabled={fy.status === 'closed'}>
                    {fy.name} {fy.status === 'closed' ? '(clôturé)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-sm">Référence pièce</label>
              <input type="text" className="input-sm" placeholder="FAC-2026-001…"
                value={form.reference} onChange={e => setField('reference', e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className="label-sm">Libellé de l'écriture *</label>
              <input type="text" className="input-sm" required
                placeholder="Ex : Règlement facture client XYZ…"
                value={form.description} onChange={e => setField('description', e.target.value)} />
            </div>
          </div>

          {/* Lignes d'écriture */}
          <div className="px-6">
            <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-2 py-2 text-left w-40">Compte</th>
                    <th className="px-2 py-2 text-left">Libellé ligne</th>
                    <th className="px-2 py-2 text-right w-32">Débit</th>
                    <th className="px-2 py-2 text-right w-32">Crédit</th>
                    <th className="px-2 py-2 w-24">Analytique</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {form.lines.map((line, idx) => (
                    <tr key={line._key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-2 py-1.5">
                        <AccountCombobox
                          accounts={accounts}
                          value={line.account_number}
                          onChange={v => setLine(idx, 'account_number', v)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="Libellé…"
                          value={line.description}
                          onChange={e => setLine(idx, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" step="0.01" min="0"
                          className="w-full text-sm text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-purple-500"
                          value={line.debit_amount}
                          onChange={e => setLine(idx, 'debit_amount', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" step="0.01" min="0"
                          className="w-full text-sm text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-purple-500"
                          value={line.credit_amount}
                          onChange={e => setLine(idx, 'credit_amount', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
                          placeholder="CC-01…"
                          value={line.analytic_code}
                          onChange={e => setLine(idx, 'analytic_code', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {form.lines.length > 2 && (
                          <button type="button" onClick={() => removeLine(idx)}
                            className="text-red-400 hover:text-red-600">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totaux */}
                <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold text-sm">
                  <tr>
                    <td className="px-2 py-2 text-gray-500 dark:text-gray-400" colSpan={2}>Totaux</td>
                    <td className="px-2 py-2 text-right font-mono">{fcfa(totalDebit)}</td>
                    <td className="px-2 py-2 text-right font-mono">{fcfa(totalCredit)}</td>
                    <td colSpan={2} className="px-2 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        balanced
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      }`}>
                        {balanced ? <CheckIcon className="w-3.5 h-3.5" /> : '≠'}
                        {balanced ? 'Équilibrée' : `Écart ${fcfa(Math.abs(totalDebit - totalCredit))}`}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button type="button" onClick={addLine}
              className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              <PlusIcon className="w-4 h-4" /> Ajouter une ligne
            </button>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving || !balanced}
              className="btn-primary flex items-center gap-2">
              {saving ? 'Enregistrement…' : 'Enregistrer l\'écriture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Page principale
// ============================================================
export default function JournalEntries({ entries, fiscalYears, chartAccounts, filters }) {
  const [showForm, setShowForm]   = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters || {});

  const applyFilters = () => {
    router.get('/comptabilite/generale/journal', localFilters, { preserveState: true });
  };

  const handleSaved = () => {
    router.reload({ only: ['entries'] });
  };

  const handleValidate = async (id) => {
    if (!confirm('Valider et verrouiller cette écriture ?')) return;
    try {
      await axios.post(`/comptabilite/generale/journal/${id}/validate`);
      toast.success('Écriture validée');
      router.reload({ only: ['entries'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de validation');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette écriture ?')) return;
    try {
      await axios.delete(`/comptabilite/generale/journal/${id}`);
      toast.success('Écriture supprimée');
      router.reload({ only: ['entries'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const journalBadge = (type) => {
    const colors = {
      VE: 'bg-green-100 text-green-700',
      AC: 'bg-orange-100 text-orange-700',
      BQ: 'bg-purple-100 text-purple-700',
      SA: 'bg-purple-100 text-purple-700',
      CA: 'bg-yellow-100 text-yellow-700',
      OD: 'bg-gray-100 text-gray-600',
      AN: 'bg-indigo-100 text-indigo-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  return (
    <AuthLayout>
      <Head title="Journal comptable SYSCOHADA" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Journal comptable</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">SYSCOHADA Révisé 2017</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" /> Nouvelle écriture
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select className="input-sm" value={localFilters.journal_type || ''}
              onChange={e => setLocalFilters(f => ({ ...f, journal_type: e.target.value }))}>
              <option value="">Tous les journaux</option>
              {JOURNAL_TYPES.map(j => <option key={j.value} value={j.value}>{j.value} – {j.label}</option>)}
            </select>
            <input type="date" className="input-sm" value={localFilters.date_from || ''}
              onChange={e => setLocalFilters(f => ({ ...f, date_from: e.target.value }))}
              placeholder="Du" />
            <input type="date" className="input-sm" value={localFilters.date_to || ''}
              onChange={e => setLocalFilters(f => ({ ...f, date_to: e.target.value }))}
              placeholder="Au" />
            <select className="input-sm" value={localFilters.locked ?? ''}
              onChange={e => setLocalFilters(f => ({ ...f, locked: e.target.value }))}>
              <option value="">Tous statuts</option>
              <option value="1">Validées</option>
              <option value="0">Non validées</option>
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
                  <th className="px-4 py-3 text-left">N° Écriture</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Journal</th>
                  <th className="px-4 py-3 text-left">Libellé</th>
                  <th className="px-4 py-3 text-left">Référence</th>
                  <th className="px-4 py-3 text-right">Lignes</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {entries.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      Aucune écriture enregistrée
                    </td>
                  </tr>
                ) : entries.data.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-purple-700 dark:text-purple-400 font-medium">
                      {entry.entry_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {format(new Date(entry.entry_date), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${journalBadge(entry.journal_type)}`}>
                        {entry.journal_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {entry.description}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {entry.reference || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {entry.lines_count} ligne{entry.lines_count !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.is_locked ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                          <LockClosedIcon className="w-3 h-3" /> Validée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                          <LockOpenIcon className="w-3 h-3" /> Brouillon
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!entry.is_locked && (
                          <>
                            <button onClick={() => handleValidate(entry.id)}
                              title="Valider"
                              className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400">
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(entry.id)}
                              title="Supprimer"
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {entries.last_page > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Page {entries.current_page} / {entries.last_page} — {entries.total} écritures</span>
              <div className="flex gap-2">
                {entries.prev_page_url && (
                  <button onClick={() => router.visit(entries.prev_page_url)} className="btn-secondary text-xs">← Précédent</button>
                )}
                {entries.next_page_url && (
                  <button onClick={() => router.visit(entries.next_page_url)} className="btn-secondary text-xs">Suivant →</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formulaire modal */}
      {showForm && (
        <JournalForm
          accounts={chartAccounts}
          fiscalYears={fiscalYears}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </AuthLayout>
  );
}
export { JournalEntries };
