/**
 * Comptabilite/Balance.jsx — Balance générale SYSCOHADA
 *
 * Props Inertia :
 *   balance      : { accounts, totals }
 *   fiscalYears  : exercices
 *   dateRange    : { start, end }
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Le tableau reste écrit à la main (et non en `DataTable`) parce qu'une
 * balance exige un vrai `<tfoot>` aligné sur les colonnes Débit / Crédit.
 * Aucun calcul n'a été modifié.
 */

import { Head, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import {
  ArrowDownTrayIcon, MagnifyingGlassIcon, ArrowPathIcon, ScaleIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, StatCard, EmptyState,
  cx, CONTROL, TEXT_MUTED, TEXT_FAINT, TEXT_TITLE,
} from '@/Components/UI';
import {
  amount, DebitCredit, AccountTypeBadge, ACCOUNT_TYPES, OHADA_CLASSES,
  TABLE_CARD, TABLE_HEAD, TH_CELL, TD_CELL, NUM_CELL, ROW_HOVER, TFOOT,
} from '@/Components/Comptabilite/accounting';

const CLASS_OPTIONS = [{ value: '', label: 'Toutes classes' }, ...OHADA_CLASSES];
const TYPE_OPTIONS  = [{ value: '', label: 'Tous types' }, ...ACCOUNT_TYPES];

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
    router.get('/comptabilite/balance', { start, end }, { preserveState: true });
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
    router.get('/comptabilite/grand-livre', {
      account: accountNumber, start, end,
    });
  };

  const isFiltered = Boolean(search || classFilter || typeFilter);

  const resetFilters = () => { setSearch(''); setClass(''); setType(''); };

  const totalDebit    = filtered.reduce((s, a) => s + a.debit_total, 0);
  const totalCredit   = filtered.reduce((s, a) => s + a.credit_total, 0);
  const totalSoldeD   = filtered.reduce((s, a) => s + a.solde_debiteur, 0);
  const totalSoldeC   = filtered.reduce((s, a) => s + a.solde_crediteur, 0);

  return (
    <AuthLayout>
      <Head title="Balance générale SYSCOHADA" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={ScaleIcon}
          title="Balance générale"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Balance' }]}
          subtitle="Plan comptable SYSCOHADA Révisé 2017 — montants en FCFA (XOF)"
          actions={
            <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={exportCsv}>
              Export CSV
            </Button>
          }
        />

        {/* Filtres */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6">
          <input
            type="date" aria-label="Du"
            className={cx(CONTROL, 'h-10')}
            value={start} onChange={e => setStart(e.target.value)}
          />
          <input
            type="date" aria-label="Au"
            className={cx(CONTROL, 'h-10')}
            value={end} onChange={e => setEnd(e.target.value)}
          />
          <Button variant="primary" icon={ArrowPathIcon} onClick={applyDate}>
            Actualiser
          </Button>
          <select
            className={cx(CONTROL, 'h-10')}
            value={classFilter} onChange={e => setClass(e.target.value)}
          >
            {CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            className={cx(CONTROL, 'h-10')}
            value={typeFilter} onChange={e => setType(e.target.value)}
          >
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="relative">
            <MagnifyingGlassIcon className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
            <input
              className={cx(CONTROL, 'h-10 pl-9')}
              placeholder="N° ou libellé…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Résumé */}
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total débit"       value={amount(totals.debit_total)}     unit="FCFA" />
          <StatCard label="Total crédit"      value={amount(totals.credit_total)}    unit="FCFA" />
          <StatCard label="Soldes débiteurs"  value={amount(totals.solde_debiteur)}  unit="FCFA" />
          <StatCard label="Soldes créditeurs" value={amount(totals.solde_crediteur)} unit="FCFA" />
        </div>

        {/* Table balance */}
        <div className={TABLE_CARD}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full border-collapse text-sm">
              <thead className={TABLE_HEAD}>
                <tr>
                  <th scope="col" className={cx(TH_CELL, 'text-left w-28')}>N° Compte</th>
                  <th scope="col" className={cx(TH_CELL, 'text-left')}>Libellé</th>
                  <th scope="col" className={cx(TH_CELL, 'text-center w-28')}>Type</th>
                  <th scope="col" className={cx(TH_CELL, 'text-center w-20')}>Classe</th>
                  <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Débit cumulé</th>
                  <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Crédit cumulé</th>
                  <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Solde débiteur</th>
                  <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Solde créditeur</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      {isFiltered ? (
                        <EmptyState
                          variant="no-results"
                          title="Aucun compte ne correspond"
                          description="Aucun compte ne satisfait ces critères. Élargissez la classe, le type ou la recherche."
                          action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
                        />
                      ) : (
                        <EmptyState
                          icon={ScaleIcon}
                          title="Aucun mouvement sur la période"
                          description="La balance se construit à partir des écritures validées. Saisissez une écriture ou élargissez la période."
                          action={
                            <Button variant="primary" onClick={() => router.visit('/comptabilite/journal')}>
                              Ouvrir le journal
                            </Button>
                          }
                        />
                      )}
                    </td>
                  </tr>
                ) : filtered.map(acc => (
                  <tr
                    key={acc.account_number}
                    className={cx(ROW_HOVER, 'cursor-pointer')}
                    onClick={() => openLedger(acc.account_number)}
                    title={`Ouvrir le grand livre du compte ${acc.account_number}`}
                  >
                    <td className={cx(TD_CELL, 'font-mono text-xs font-semibold text-purple-700 dark:text-purple-400')}>
                      {acc.account_number}
                    </td>
                    <td className={cx(TD_CELL, 'font-medium', TEXT_TITLE)}>
                      {acc.account_name}
                    </td>
                    <td className={cx(TD_CELL, 'text-center')}>
                      <AccountTypeBadge type={acc.account_type} />
                    </td>
                    <td className={cx(TD_CELL, 'text-center')}>
                      <Badge variant="neutral" pill={false}>Cl. {acc.ohada_class}</Badge>
                    </td>
                    <td className={NUM_CELL}><DebitCredit value={acc.debit_total} /></td>
                    <td className={NUM_CELL}><DebitCredit value={acc.credit_total} /></td>
                    <td className={cx(NUM_CELL, 'font-semibold', TEXT_TITLE)}>
                      <DebitCredit value={acc.solde_debiteur} />
                    </td>
                    <td className={cx(NUM_CELL, 'font-semibold', TEXT_TITLE)}>
                      <DebitCredit value={acc.solde_crediteur} />
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Ligne de totaux */}
              {filtered.length > 0 && (
                <tfoot className={TFOOT}>
                  <tr>
                    <td className={cx('px-4 py-3 text-xs uppercase tracking-wider', TEXT_MUTED)} colSpan={4}>
                      Totaux — {filtered.length} compte{filtered.length > 1 ? 's' : ''}
                    </td>
                    <td className={cx(NUM_CELL, 'py-3')}>{amount(totalDebit)}</td>
                    <td className={cx(NUM_CELL, 'py-3')}>{amount(totalCredit)}</td>
                    <td className={cx(NUM_CELL, 'py-3')}>{amount(totalSoldeD)}</td>
                    <td className={cx(NUM_CELL, 'py-3')}>{amount(totalSoldeC)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p className={cx('mt-3 text-center text-xs', TEXT_MUTED)}>
          Cliquez sur un compte pour ouvrir son grand livre.
        </p>
      </div>
    </AuthLayout>
  );
}
export { Balance };
