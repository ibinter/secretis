/**
 * Budget/BudgetForm.jsx — Saisie / édition d'un budget
 *
 * Props Inertia :
 *   budget?          : Budget existant (mode édition)
 *   departments      : [{ id, name }]
 *   fiscalYears      : [{ id, name }]
 *   previousBudgets  : [{ id, name, type }]
 *   editMode?        : boolean
 */

import { Head, router } from '@inertiajs/react';
import { useState, useCallback, useRef } from 'react';
import {
  PlusIcon, TrashIcon, ArrowDownTrayIcon,
  ArrowUpTrayIcon, DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';

// ─── Comptes SYSCOHADA les plus courants (autocomplete) ────────────────────
const SYSCOHADA_ACCOUNTS = [
  { number: '601', name: 'Achats de marchandises' },
  { number: '602', name: 'Achats de matières premières et fournitures' },
  { number: '604', name: 'Achats d\'études et prestations de services' },
  { number: '605', name: 'Achats de matériels, équipements et travaux' },
  { number: '608', name: 'Autres achats' },
  { number: '611', name: 'Transports sur achats' },
  { number: '613', name: 'Locations et charges locatives' },
  { number: '614', name: 'Charges locatives et de copropriété' },
  { number: '616', name: 'Assurances' },
  { number: '621', name: 'Personnel extérieur à l\'entreprise' },
  { number: '622', name: 'Rémunérations d\'intermédiaires et honoraires' },
  { number: '624', name: 'Publicité, publications, relations publiques' },
  { number: '625', name: 'Déplacements, missions et réceptions' },
  { number: '627', name: 'Services bancaires' },
  { number: '631', name: 'Impôts et taxes sur rémunérations' },
  { number: '632', name: 'Autres impôts et taxes' },
  { number: '641', name: 'Charges de personnel — Salaires bruts' },
  { number: '644', name: 'Charges sociales patronales' },
  { number: '661', name: 'Charges d\'intérêts' },
  { number: '681', name: 'Dotations aux amortissements' },
  { number: '701', name: 'Ventes de marchandises' },
  { number: '706', name: 'Services vendus' },
  { number: '707', name: 'Produits des activités annexes' },
  { number: '731', name: 'Subventions d\'exploitation reçues' },
  { number: '754', name: 'Produits divers' },
  { number: '791', name: 'Transferts de charges d\'exploitation' },
];

const CATEGORIES = [
  { value: 'personnel',        label: 'Personnel' },
  { value: 'fonctionnement',   label: 'Fonctionnement' },
  { value: 'investissement',   label: 'Investissement' },
  { value: 'impots',           label: 'Impôts & Taxes' },
  { value: 'autres',           label: 'Autres' },
];

const emptyLine = () => ({
  _key:           Math.random().toString(36).slice(2),
  account_number: '',
  account_name:   '',
  department_id:  '',
  project_id:     '',
  description:    '',
  q1_amount:      0,
  q2_amount:      0,
  q3_amount:      0,
  q4_amount:      0,
  is_income:      false,
  category:       'fonctionnement',
});

const num = (v) => parseFloat(v) || 0;
const fcfa = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);

// ─── Autocomplete compte SYSCOHADA ─────────────────────────────────────────
function AccountAutocomplete({ value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const filtered = SYSCOHADA_ACCOUNTS.filter(
    (a) => a.number.startsWith(value) || a.name.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="N° compte"
        className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 top-full left-0 mt-0.5 w-72 bg-white border border-gray-200 rounded-lg shadow-lg text-xs max-h-48 overflow-y-auto">
          {filtered.map((a) => (
            <button
              key={a.number}
              type="button"
              onMouseDown={() => { onSelect(a); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex gap-2"
            >
              <span className="font-mono font-semibold text-[#9333EA] w-10 shrink-0">{a.number}</span>
              <span className="text-gray-600 truncate">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────
export default function BudgetForm({ budget, departments, fiscalYears, previousBudgets, editMode }) {
  const [form, setForm] = useState({
    name:           budget?.name ?? '',
    fiscal_year_id: budget?.fiscal_year_id ?? '',
    type:           budget?.type ?? 'operationnel',
    notes:          budget?.notes ?? '',
  });

  const [lines, setLines] = useState(
    budget?.lines?.map((l) => ({ ...l, _key: l.id })) ?? [emptyLine()]
  );

  const [submitting, setSubmitting] = useState(false);
  const [importPct,  setImportPct]  = useState(0);
  const [prevBudget, setPrevBudget] = useState('');
  const fileRef = useRef(null);

  // ── Calculs totaux ──────────────────────────────────────────────────────
  const charges = lines.filter((l) => !l.is_income);
  const produits = lines.filter((l) => l.is_income);

  const totalCharges  = charges.reduce((s, l) => s + num(l.q1_amount) + num(l.q2_amount) + num(l.q3_amount) + num(l.q4_amount), 0);
  const totalProduits = produits.reduce((s, l) => s + num(l.q1_amount) + num(l.q2_amount) + num(l.q3_amount) + num(l.q4_amount), 0);
  const resultat      = totalProduits - totalCharges;

  // ── Mise à jour ligne ────────────────────────────────────────────────────
  const updateLine = useCallback((key, field, value) => {
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, [field]: value } : l));
  }, []);

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l._key !== key));

  // ── Import depuis budget précédent ───────────────────────────────────────
  const importFromPrevious = async () => {
    if (!prevBudget) return toast.error('Sélectionnez un budget source.');
    try {
      const { data } = await axios.get(`/budget/${prevBudget}/lines`);
      const pct = importPct ? (1 + importPct / 100) : 1;
      const imported = data.lines.map((l) => ({
        ...emptyLine(),
        account_number: l.account_number,
        account_name:   l.account_name,
        department_id:  l.department_id ?? '',
        project_id:     l.project_id ?? '',
        description:    l.description ?? '',
        q1_amount:      parseFloat((num(l.q1_amount) * pct).toFixed(0)),
        q2_amount:      parseFloat((num(l.q2_amount) * pct).toFixed(0)),
        q3_amount:      parseFloat((num(l.q3_amount) * pct).toFixed(0)),
        q4_amount:      parseFloat((num(l.q4_amount) * pct).toFixed(0)),
        is_income:      l.is_income,
        category:       l.category,
      }));
      setLines(imported);
      toast.success(`${imported.length} lignes importées depuis le budget précédent.`);
    } catch {
      toast.error('Impossible de charger les lignes du budget sélectionné.');
    }
  };

  // ── Import CSV ────────────────────────────────────────────────────────────
  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await axios.post('/budget/import', fd);
      toast.success(data.message);
      router.visit(`/budget/${data.budget.id}/edit`);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur d\'import CSV.');
    }
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      lines: lines.map(({ _key, ...rest }) => ({
        ...rest,
        q1_amount: num(rest.q1_amount),
        q2_amount: num(rest.q2_amount),
        q3_amount: num(rest.q3_amount),
        q4_amount: num(rest.q4_amount),
        is_income: Boolean(rest.is_income),
      })),
    };
    try {
      if (editMode && budget?.id) {
        await axios.put(`/budget/${budget.id}`, payload);
        toast.success('Budget mis à jour.');
        router.visit(`/budget/${budget.id}`);
      } else {
        const { data } = await axios.post('/budget', payload);
        toast.success('Budget créé avec succès.');
        router.visit(`/budget/${data.budget.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Head title={editMode ? 'Modifier le budget' : 'Nouveau budget'} />

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ===== En-tête ===== */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {editMode ? 'Modifier le budget' : 'Nouveau budget'}
            </h1>
            <p className="text-sm text-gray-500">Saisissez les informations générales et les lignes budgétaires.</p>
          </div>
          <a href="/budget" className="text-sm text-gray-500 hover:text-gray-700">← Retour</a>
        </div>

        {/* ===== Informations générales ===== */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Nom du budget *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex : Budget opérationnel 2026"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Exercice fiscal</label>
            <select
              value={form.fiscal_year_id}
              onChange={(e) => setForm({ ...form, fiscal_year_id: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
            >
              <option value="">— Sélectionner —</option>
              {fiscalYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Type de budget *</label>
            <select
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
            >
              <option value="operationnel">Opérationnel</option>
              <option value="investissement">Investissement</option>
              <option value="projet">Projet</option>
              <option value="departement">Département</option>
            </select>
          </div>

          <div className="lg:col-span-4">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes / Contexte</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Contexte, hypothèses de construction du budget..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA] resize-none"
            />
          </div>
        </div>

        {/* ===== Import depuis budget précédent ===== */}
        {!editMode && (
          <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-purple-700 mb-1 block">
                <DocumentDuplicateIcon className="h-4 w-4 inline mr-1" />
                Importer depuis un budget précédent
              </label>
              <select
                value={prevBudget}
                onChange={(e) => setPrevBudget(e.target.value)}
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                <option value="">— Choisir un budget source —</option>
                {previousBudgets?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-purple-700 mb-1 block">Ajustement (%)</label>
              <input
                type="number"
                value={importPct}
                onChange={(e) => setImportPct(parseFloat(e.target.value) || 0)}
                placeholder="+/- %"
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:outline-none bg-white"
              />
            </div>
            <button
              type="button"
              onClick={importFromPrevious}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition whitespace-nowrap"
            >
              Importer les lignes
            </button>

            {/* Import CSV */}
            <div className="border-l border-purple-200 pl-3 flex items-end gap-2">
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvImport} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-purple-200 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                Import CSV
              </button>
              <a
                href="/budget/template.csv"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-purple-200 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Modèle
              </a>
            </div>
          </div>
        )}

        {/* ===== Tableau des lignes budgétaires ===== */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">
              Lignes budgétaires ({lines.length})
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9333EA] text-white text-xs rounded-lg hover:bg-[#16324e] transition"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Ajouter une ligne
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-3 py-2 font-medium w-28">N° Compte</th>
                  <th className="px-3 py-2 font-medium w-44">Libellé</th>
                  <th className="px-3 py-2 font-medium w-24">Catégorie</th>
                  <th className="px-3 py-2 font-medium w-32">Département</th>
                  <th className="px-3 py-2 font-medium w-20">Q1</th>
                  <th className="px-3 py-2 font-medium w-20">Q2</th>
                  <th className="px-3 py-2 font-medium w-20">Q3</th>
                  <th className="px-3 py-2 font-medium w-20">Q4</th>
                  <th className="px-3 py-2 font-medium w-24 text-right">Total annuel</th>
                  <th className="px-3 py-2 font-medium w-16 text-center">Produit</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const annual = num(line.q1_amount) + num(line.q2_amount) + num(line.q3_amount) + num(line.q4_amount);
                  return (
                    <tr key={line._key} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-1.5">
                        <AccountAutocomplete
                          value={line.account_number}
                          onChange={(v) => updateLine(line._key, 'account_number', v)}
                          onSelect={(acc) => {
                            setLines((prev) => prev.map((l) => l._key === line._key
                              ? { ...l, account_number: acc.number, account_name: acc.name }
                              : l
                            ));
                          }}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={line.account_name}
                          onChange={(e) => updateLine(line._key, 'account_name', e.target.value)}
                          placeholder="Libellé"
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          value={line.category}
                          onChange={(e) => updateLine(line._key, 'category', e.target.value)}
                          className="w-full rounded border border-gray-200 px-1.5 py-1.5 text-xs focus:outline-none"
                        >
                          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          value={line.department_id}
                          onChange={(e) => updateLine(line._key, 'department_id', e.target.value)}
                          className="w-full rounded border border-gray-200 px-1.5 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="">—</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      {['q1_amount', 'q2_amount', 'q3_amount', 'q4_amount'].map((q) => (
                        <td key={q} className="px-3 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={line[q]}
                            onChange={(e) => updateLine(line._key, q, e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-right font-semibold text-gray-700">
                        {fcfa(annual)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(line.is_income)}
                          onChange={(e) => updateLine(line._key, 'is_income', e.target.checked)}
                          className="h-4 w-4 text-[#9333EA] rounded"
                          title="Ligne de produit (revenu)"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeLine(line._key)}
                          className="text-gray-300 hover:text-red-500 transition"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== Totaux ===== */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Produits', value: totalProduits, color: 'text-green-600' },
            { label: 'Total Charges',  value: totalCharges,  color: 'text-red-500' },
            {
              label:   'Résultat prévu',
              value:   resultat,
              color:   resultat >= 0 ? 'text-green-600' : 'text-red-500',
              prefix:  resultat >= 0 ? '+ ' : '− ',
            },
          ].map(({ label, value, color, prefix = '' }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>
                {prefix}{fcfa(Math.abs(value))} FCFA
              </div>
            </div>
          ))}
        </div>

        {/* ===== Actions ===== */}
        <div className="flex items-center justify-end gap-3">
          <a href="/budget" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
            Annuler
          </a>
          <button
            type="submit"
            disabled={submitting || lines.length === 0}
            className="px-6 py-2 bg-[#9333EA] text-white text-sm rounded-lg hover:bg-[#16324e] disabled:opacity-50 transition font-medium"
          >
            {submitting ? 'Enregistrement...' : editMode ? 'Mettre à jour' : 'Créer le budget'}
          </button>
        </div>

      </form>
    </AuthLayout>
  );
}
export { BudgetForm };
