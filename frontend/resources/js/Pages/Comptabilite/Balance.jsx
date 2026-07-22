/**
 * Comptabilite/Balance.jsx — Balance générale SYSCOHADA
 *
 * Props Inertia :
 *   balance      : { accounts, totals }
 *   fiscalYears  : exercices
 *   dateRange    : { start, end }
 */

import { Head, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { ArrowDownTrayIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';

const OHADA_CLASSES = [
  { value: '', label: 'Toutes classes' },
  { value: '1', label: 'Classe 1 — Ressources durables' },
  { value: '2', label: 'Classe 2 — Actif immobilisé' },
  { value: '3', label: 'Classe 3 — Stocks' },
  { value: '4', label: 'Classe 4 — Tiers' },
  { value: '5', label: 'Classe 5 — Trésorerie' },
  { value: '6', label: 'Classe 6 — Charges' },
  { value: '7', label: 'Classe 7 — Produits' },
  { value: '8', label: 'Classe 8 — Spéciaux' },
];

const TYPES = [
  { value: '', label: 'Tous types' },
  { value: 'actif', label: 'Actif' },
  { value: 'passif', label: 'Passif' },
  { value: 'capitaux', label: 'Capitaux' },
  { value: 'charge', label: 'Charges' },
  { value: 'produit', label: 'Produits' },
];

const fcfa = (v) =>
  v == null || v === 0 ? '—' :
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.abs(Number(v)));

export default function Balance({ balance, fiscalYears, dateRange }) {
  const [search, setSearch]       = useState('');
  const [classFilter, setClass]   = useState('');
  const [typeFilter, setType]     = useState('');
  const [start, setStart]         = useState(dateRange.start);
  const [end, setEnd]             = useState(dateRange.end);

  const accounts = balance?.accounts || [];
  const totals   = balance?.totals   || {};

  const filtered = useMemo(() => {
    return accounts.filter(a => {
      if (classFilter && String(a.ohada_class) !== classFilter) return false;
      if (typeFilter  && a.account_type !== typeFilter)          return false;
      if (search && !a.account_number.includes(search) &&
          !a.account_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [accounts, classFilter, typeFilter, search]);

  const applyDate = () => {
    router.get('/comptabilite/generale/balance', { start, end }, { preserveState: true });
  };

  const exportCsv = () => {
    const BOM = '﻿';
    const header = 'N° Compte;Libellé;Débit cumul;Crédit cumul;Solde débiteur;Solde créditeur\n';
    const rows = filtered.map(a =>
      `${a.account_number};"${a.account_name}";${a.debit_total};${a.credit_total};${a.solde_debiteur};${a.solde_crediteur}`
    ).join('\n');

    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `balance-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openLedger = (accountNumber) => {
    router.get('/comptabilite/generale/grand-livre', {
      account: accountNumber, start, end,
    });
  };

  const typeColor = (type) => ({
    actif:    'text-blue-600 dark:text-blue-400',
    passif:   'text-orange-600 dark:text-orange-400',
    capitaux: 'text-purple-600 dark:text-purple-400',
    charge:   'text-red-600 dark:text-red-400',
    produit:  'text-green-600 dark:text-green-400',
  })[type] || 'text-gray-600';

  return (
    <AuthLayout>
      <Head title="Balance générale SYSCOHADA" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Balance générale</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Plan comptable SYSCOHADA 2017</p>
          </div>
          <button onClick={exportCsv}
            className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <input type="date" className="input-sm" value={start} onChange={e => setStart(e.target.value)} />
            <input type="date" className="input-sm" value={end}   onChange={e => setEnd(e.target.value)} />
            <button onClick={applyDate} className="btn-primary text-sm flex items-center gap-1">
              <ArrowPathIcon className="w-4 h-4" /> Actualiser
            </button>
            <select className="input-sm" value={classFilter} onChange={e => setClass(e.target.value)}>
              {OHADA_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select className="input-sm" value={typeFilter} onChange={e => setType(e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-sm pl-7" placeholder="N° ou libellé…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Résumé KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total Débit',      value: totals.debit_total,     color: 'text-blue-600' },
            { label: 'Total Crédit',     value: totals.credit_total,    color: 'text-orange-600' },
            { label: 'Soldes débiteurs', value: totals.solde_debiteur,  color: 'text-green-600' },
            { label: 'Soldes créditeurs',value: totals.solde_crediteur, color: 'text-red-600' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-xl font-bold mt-1 font-mono ${kpi.color}`}>{fcfa(kpi.value)}</p>
            </div>
          ))}
        </div>

        {/* Table balance */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left w-28">N° Compte</th>
                  <th className="px-4 py-3 text-left">Libellé</th>
                  <th className="px-4 py-3 text-center w-24">Classe</th>
                  <th className="px-4 py-3 text-right">Débit cumulé</th>
                  <th className="px-4 py-3 text-right">Crédit cumulé</th>
                  <th className="px-4 py-3 text-right bg-blue-50 dark:bg-blue-900/10">Solde D</th>
                  <th className="px-4 py-3 text-right bg-orange-50 dark:bg-orange-900/10">Solde C</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      Aucun mouvement sur la période sélectionnée
                    </td>
                  </tr>
                ) : filtered.map(acc => (
                  <tr key={acc.account_number}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                    onClick={() => openLedger(acc.account_number)}
                    title={`Ouvrir le grand livre du compte ${acc.account_number}`}
                  >
                    <td className="px-4 py-2.5 font-mono font-semibold text-blue-700 dark:text-blue-400">
                      {acc.account_number}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={typeColor(acc.account_type) + ' font-medium'}>{acc.account_name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                        Cl. {acc.ohada_class}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                      {fcfa(acc.debit_total)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                      {fcfa(acc.credit_total)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/5">
                      {acc.solde_debiteur > 0 ? fcfa(acc.solde_debiteur) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-orange-700 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-900/5">
                      {acc.solde_crediteur > 0 ? fcfa(acc.solde_crediteur) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Ligne totaux */}
              {filtered.length > 0 && (
                <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td className="px-4 py-3 text-sm uppercase text-gray-600 dark:text-gray-400" colSpan={3}>
                      Totaux ({filtered.length} comptes)
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {fcfa(filtered.reduce((s, a) => s + a.debit_total, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {fcfa(filtered.reduce((s, a) => s + a.credit_total, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-700 dark:text-blue-400">
                      {fcfa(filtered.reduce((s, a) => s + a.solde_debiteur, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-orange-700 dark:text-orange-400">
                      {fcfa(filtered.reduce((s, a) => s + a.solde_crediteur, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
          Cliquer sur un compte pour ouvrir son grand livre
        </p>
      </div>
    </AuthLayout>
  );
}
