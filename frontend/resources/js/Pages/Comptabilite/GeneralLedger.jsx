/**
 * Comptabilite/GeneralLedger.jsx — Grand livre par compte SYSCOHADA
 *
 * Props Inertia :
 *   ledger       : résultat generateGeneralLedger() | null
 *   chartAccounts: comptes disponibles (autocomplétion)
 *   filters      : { account, start, end }
 *   dateRange    : { start, end }
 */

import { Head, router } from '@inertiajs/react';
import { useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowDownTrayIcon, MagnifyingGlassIcon, TagIcon } from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) => {
  if (v == null || v === 0) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.abs(Number(v)));
};

const fmtDate = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: fr }); }
  catch { return d; }
};

// Autocomplétion compte
function AccountPicker({ accounts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');

  const filtered = useMemo(() =>
    search.length < 1
      ? accounts.slice(0, 15)
      : accounts.filter(a =>
          a.account_number.startsWith(search) ||
          a.account_name.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 15),
    [search, accounts]
  );

  const select = (acc) => {
    onChange(acc.account_number);
    setSearch(acc.account_number + ' — ' + acc.account_name);
    setOpen(false);
  };

  return (
    <div className="relative flex-1">
      <MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        className="input-sm pl-7 w-full"
        placeholder="Saisir N° ou libellé de compte…"
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value.split(' ')[0]); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-xl max-h-56 overflow-auto text-sm">
          {filtered.map(acc => (
            <li key={acc.account_number}
              className="px-3 py-2 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 flex gap-2"
              onMouseDown={() => select(acc)}>
              <span className="font-mono text-purple-700 dark:text-purple-400 w-16 shrink-0">{acc.account_number}</span>
              <span className="text-gray-700 dark:text-gray-300 truncate">{acc.account_name}</span>
              <span className={`ml-auto text-xs ${
                { actif: 'text-purple-500', passif: 'text-orange-500', charge: 'text-red-500', produit: 'text-green-500', capitaux: 'text-purple-500' }[acc.account_type] || ''
              }`}>{acc.account_type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Lettrage badge
function LetterBadge({ code }) {
  if (!code) return null;
  return (
    <span className="inline-block text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">
      {code}
    </span>
  );
}

// Export PDF
const handlePdf = (accountNumber, start, end) => {
  window.open(`/comptabilite/generale/grand-livre/pdf?account=${accountNumber}&start=${start}&end=${end}`, '_blank');
};

// Export CSV grand livre
const exportCsv = (ledger, dateRange) => {
  if (!ledger) return;
  const BOM  = '﻿';
  const head = 'Date;N° Écriture;Journal;Libellé;Réf;Débit;Crédit;Solde;Lettrage\n';
  const rows = ledger.lines.map(l =>
    `${l.entry_date};${l.entry_number};${l.journal_type};"${l.description || ''}";${l.reference || ''};${l.debit_amount || 0};${l.credit_amount || 0};${l.solde_cumul};${l.lettering_code || ''}`
  ).join('\n');
  const blob = new Blob([BOM + head + rows], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `grand-livre-${ledger.account_number}-${dateRange.start}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ============================================================
// Lettrage automatique
// ============================================================
const handleLetter = async (accountNumber, onDone) => {
  try {
    const res = await axios.post(`/comptabilite/generale/lettrage/${accountNumber}`);
    toast.success(res.data.message || 'Lettrage effectué');
    onDone?.();
  } catch (err) {
    toast.error(err.response?.data?.message || 'Erreur lors du lettrage');
  }
};

// ============================================================
// Page principale
// ============================================================
export default function GeneralLedger({ ledger, chartAccounts, filters, dateRange }) {
  const [account, setAccount] = useState(filters.account || '');
  const [start,   setStart]   = useState(dateRange.start);
  const [end,     setEnd]     = useState(dateRange.end);
  const [lettering, setLettering] = useState(false);

  const search = () => {
    if (!account) { toast.error('Sélectionnez un compte'); return; }
    router.get('/comptabilite/generale/grand-livre', { account, start, end });
  };

  const journalBadge = (type) => ({
    VE: 'bg-green-100 text-green-700',
    AC: 'bg-orange-100 text-orange-700',
    BQ: 'bg-purple-100 text-purple-700',
    SA: 'bg-purple-100 text-purple-700',
    CA: 'bg-yellow-100 text-yellow-700',
    OD: 'bg-gray-100 text-gray-600',
    AN: 'bg-indigo-100 text-indigo-700',
  })[type] || 'bg-gray-100 text-gray-600';

  return (
    <AuthLayout>
      <Head title={`Grand livre${ledger ? ` — ${ledger.account_number}` : ''}`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Grand livre</h1>
            {ledger && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Compte <span className="font-mono font-semibold text-purple-700 dark:text-purple-400">{ledger.account_number}</span>
                {' '}— {ledger.account_name}
              </p>
            )}
          </div>
          {ledger && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLettering(true);
                  handleLetter(ledger.account_number, () => {
                    setLettering(false);
                    router.reload({ only: ['ledger'] });
                  });
                }}
                disabled={lettering}
                className="btn-secondary flex items-center gap-1 text-sm">
                <TagIcon className="w-4 h-4" />
                {lettering ? 'Lettrage…' : 'Lettrage auto'}
              </button>
              <button onClick={() => exportCsv(ledger, { start, end })}
                className="btn-secondary flex items-center gap-1 text-sm">
                <ArrowDownTrayIcon className="w-4 h-4" /> CSV
              </button>
            </div>
          )}
        </div>

        {/* Sélecteur compte + période */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <AccountPicker accounts={chartAccounts} value={account} onChange={setAccount} />
            <input type="date" className="input-sm" value={start} onChange={e => setStart(e.target.value)} />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" className="input-sm" value={end}   onChange={e => setEnd(e.target.value)} />
            <button onClick={search} className="btn-primary text-sm px-5">Afficher</button>
          </div>
        </div>

        {/* KPI résumé */}
        {ledger && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Report à nouveau',  value: ledger.report_a_nouveau, sign: true },
              { label: 'Total Débit',       value: ledger.total_debit },
              { label: 'Total Crédit',      value: ledger.total_credit },
              {
                label: 'Solde final',
                value: ledger.solde_final,
                sign: true,
                bold: true,
                color: ledger.solde_final >= 0 ? 'text-purple-600' : 'text-red-600',
              },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{kpi.label}</p>
                <p className={`text-xl font-bold mt-1 font-mono ${kpi.color || 'text-gray-900 dark:text-gray-100'}`}>
                  {kpi.sign && kpi.value !== 0 ? (kpi.value >= 0 ? '+' : '-') : ''}
                  {fcfa(kpi.value)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Grand livre */}
        {!ledger ? (
          <div className="text-center py-24 text-gray-400 dark:text-gray-500">
            Sélectionnez un compte et une période pour afficher le grand livre
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left w-24">Date</th>
                    <th className="px-4 py-3 text-left w-36">Écriture</th>
                    <th className="px-4 py-3 text-center w-16">Jnl</th>
                    <th className="px-4 py-3 text-left">Libellé</th>
                    <th className="px-4 py-3 text-right w-32">Débit</th>
                    <th className="px-4 py-3 text-right w-32">Crédit</th>
                    <th className="px-4 py-3 text-right w-36">Solde cumulé</th>
                    <th className="px-4 py-3 text-center w-16">Ltr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {/* Ligne Report à nouveau */}
                  <tr className="bg-gray-50 dark:bg-gray-800/50 italic text-gray-500 dark:text-gray-400">
                    <td className="px-4 py-2" colSpan={4}>Report à nouveau</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {ledger.report_a_nouveau >= 0 ? fcfa(ledger.report_a_nouveau) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {ledger.report_a_nouveau < 0 ? fcfa(Math.abs(ledger.report_a_nouveau)) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">
                      {fcfa(ledger.report_a_nouveau)}
                    </td>
                    <td></td>
                  </tr>

                  {ledger.lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                        Aucun mouvement sur la période
                      </td>
                    </tr>
                  ) : ledger.lines.map((line, idx) => (
                    <tr key={line.line_id || idx}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 ${line.lettering_code ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {fmtDate(line.entry_date)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-purple-700 dark:text-purple-400 text-xs">
                        {line.entry_number}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${journalBadge(line.journal_type)}`}>
                          {line.journal_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 max-w-xs truncate">
                        {line.description || line.reference || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-purple-700 dark:text-purple-400">
                        {parseFloat(line.debit_amount) > 0 ? fcfa(line.debit_amount) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-orange-700 dark:text-orange-400">
                        {parseFloat(line.credit_amount) > 0 ? fcfa(line.credit_amount) : '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${
                        line.solde_cumul >= 0 ? 'text-purple-700 dark:text-purple-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {fcfa(Math.abs(line.solde_cumul))}
                        <span className="text-xs ml-1">{line.solde_cumul >= 0 ? 'D' : 'C'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <LetterBadge code={line.lettering_code} />
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totaux */}
                {ledger.lines.length > 0 && (
                  <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <tr>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm uppercase" colSpan={4}>Totaux période</td>
                      <td className="px-4 py-3 text-right font-mono text-purple-700 dark:text-purple-400">{fcfa(ledger.total_debit)}</td>
                      <td className="px-4 py-3 text-right font-mono text-orange-700 dark:text-orange-400">{fcfa(ledger.total_credit)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold text-lg ${
                        ledger.solde_final >= 0 ? 'text-purple-700 dark:text-purple-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {fcfa(Math.abs(ledger.solde_final))} {ledger.solde_final >= 0 ? 'D' : 'C'}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
export { GeneralLedger };
