/**
 * Comptabilite/GeneralLedger.jsx — Grand livre par compte SYSCOHADA
 *
 * Props Inertia :
 *   ledger       : résultat generateGeneralLedger() | null
 *   chartAccounts: comptes disponibles (autocomplétion)
 *   filters      : { account, start, end }
 *   dateRange    : { start, end }
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Tableau écrit à la main : le grand livre a besoin d'un `<tfoot>` aligné
 * sur les colonnes Débit / Crédit / Solde. Aucun calcul modifié.
 */

import { Head, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowDownTrayIcon, MagnifyingGlassIcon, TagIcon, BookOpenIcon, PrinterIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, StatCard, EmptyState,
  cx, CONTROL, SURFACE, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';
import {
  amount, DebitCredit, balanceTone, JournalBadge, accountTone,
  TABLE_CARD, TABLE_HEAD, TH_CELL, TD_CELL, NUM_CELL, ROW_HOVER, TFOOT,
} from '@/Components/Comptabilite/accounting';

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
    <div className="relative min-w-[260px] flex-1">
      <MagnifyingGlassIcon className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
      <input
        className={cx(CONTROL, 'h-10 pl-9')}
        placeholder="Saisir N° ou libellé de compte…"
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value.split(' ')[0]); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && filtered.length > 0 && (
        <ul className={cx(
          'absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border shadow-lg',
          BORDER, SURFACE, 'text-sm',
        )}>
          {filtered.map(acc => (
            <li
              key={acc.account_number}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              onMouseDown={() => select(acc)}
            >
              <span className="w-16 shrink-0 font-mono text-xs font-semibold text-purple-700 dark:text-purple-400">
                {acc.account_number}
              </span>
              <span className={cx('truncate', TEXT_TITLE)}>{acc.account_name}</span>
              <Badge variant={accountTone(acc.account_type)} className="ml-auto shrink-0">
                {acc.account_type}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Export PDF — conservé tel quel : aucun bouton ne l'appelle aujourd'hui
// (code mort d'origine, signalé plutôt que branché sans validation métier).
const handlePdf = (accountNumber, start, end) => {
  window.open(`/comptabilite/grand-livre/pdf?account=${accountNumber}&start=${start}&end=${end}`, '_blank');
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
    const res = await axios.post(`/comptabilite/lettrage/${accountNumber}`);
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
    router.get('/comptabilite/grand-livre', { account, start, end });
  };

  /** Montant signé : « + 1 250 000 » / « - 340 000 », « — » si nul. */
  const signed = (v) => {
    if (v == null || Number.isNaN(Number(v)) || Number(v) === 0) return '—';
    return (Number(v) > 0 ? '+' : '-') + amount(Math.abs(Number(v)));
  };

  return (
    <AuthLayout>
      <Head title={`Grand livre${ledger ? ` — ${ledger.account_number}` : ''}`} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={BookOpenIcon}
          title="Grand livre"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Grand livre' }]}
          subtitle={
            ledger
              ? `Compte ${ledger.account_number} — ${ledger.account_name}`
              : 'Sélectionnez un compte et une période — montants en FCFA (XOF)'
          }
          actions={ledger && (
            <>
              <Button
                variant="secondary" icon={TagIcon} loading={lettering}
                onClick={() => {
                  setLettering(true);
                  handleLetter(ledger.account_number, () => {
                    setLettering(false);
                    router.reload({ only: ['ledger'] });
                  });
                }}
              >
                Lettrage auto
              </Button>
              <Button
                variant="secondary" icon={ArrowDownTrayIcon}
                onClick={() => exportCsv(ledger, { start, end })}
              >
                CSV
              </Button>
              <Button
                variant="secondary" icon={PrinterIcon}
                onClick={() => handlePdf(ledger.account_number, start, end)}
              >
                PDF
              </Button>
            </>
          )}
        />

        {/* Sélecteur compte + période */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AccountPicker accounts={chartAccounts} value={account} onChange={setAccount} />
          <input
            type="date" aria-label="Du"
            className={cx(CONTROL, 'h-10 w-auto')}
            value={start} onChange={e => setStart(e.target.value)}
          />
          <span className={cx('text-sm', TEXT_FAINT)}>→</span>
          <input
            type="date" aria-label="Au"
            className={cx(CONTROL, 'h-10 w-auto')}
            value={end} onChange={e => setEnd(e.target.value)}
          />
          <Button variant="primary" onClick={search}>Afficher</Button>
        </div>

        {/* KPI résumé */}
        {ledger && (
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Report à nouveau" value={signed(ledger.report_a_nouveau)} unit="FCFA" />
            <StatCard label="Total débit"      value={amount(ledger.total_debit)}      unit="FCFA" />
            <StatCard label="Total crédit"     value={amount(ledger.total_credit)}     unit="FCFA" />
            <StatCard
              label="Solde final"
              unit="FCFA"
              tone={ledger.solde_final < 0 ? 'danger' : 'neutral'}
              value={
                <span className={balanceTone(ledger.solde_final)}>
                  {signed(ledger.solde_final)}
                </span>
              }
            />
          </div>
        )}

        {/* Grand livre */}
        {!ledger ? (
          <EmptyState
            bordered
            icon={BookOpenIcon}
            title="Aucun compte sélectionné"
            description="Choisissez un compte du plan comptable et une période pour afficher ses mouvements."
            hints={[
              'La recherche accepte le numéro (ex. 411) ou le libellé.',
              'Le lettrage automatique rapproche les débits et crédits soldés.',
            ]}
          />
        ) : (
          <div className={TABLE_CARD}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full border-collapse text-sm">
                <thead className={TABLE_HEAD}>
                  <tr>
                    <th scope="col" className={cx(TH_CELL, 'text-left w-28')}>Date</th>
                    <th scope="col" className={cx(TH_CELL, 'text-left w-40')}>Écriture</th>
                    <th scope="col" className={cx(TH_CELL, 'text-center w-20')}>Journal</th>
                    <th scope="col" className={cx(TH_CELL, 'text-left')}>Libellé</th>
                    <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Débit</th>
                    <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Crédit</th>
                    <th scope="col" className={cx(TH_CELL, 'text-right w-40')}>Solde cumulé</th>
                    <th scope="col" className={cx(TH_CELL, 'text-center w-20')}>Lettrage</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                  {/* Ligne Report à nouveau */}
                  <tr className="bg-gray-50 dark:bg-[#0F1923]">
                    <td className={cx(TD_CELL, 'text-xs uppercase tracking-wider', TEXT_MUTED)} colSpan={4}>
                      Report à nouveau
                    </td>
                    <td className={NUM_CELL}>
                      <DebitCredit value={ledger.report_a_nouveau >= 0 ? ledger.report_a_nouveau : 0} />
                    </td>
                    <td className={NUM_CELL}>
                      <DebitCredit value={ledger.report_a_nouveau < 0 ? Math.abs(ledger.report_a_nouveau) : 0} />
                    </td>
                    <td className={cx(NUM_CELL, 'font-semibold', balanceTone(ledger.report_a_nouveau))}>
                      {amount(Math.abs(ledger.report_a_nouveau ?? 0))}
                    </td>
                    <td className={TD_CELL} />
                  </tr>

                  {ledger.lines.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          variant="no-results"
                          title="Aucun mouvement sur la période"
                          description="Ce compte n'a enregistré aucune écriture entre ces deux dates. Élargissez la période."
                        />
                      </td>
                    </tr>
                  ) : ledger.lines.map((line, idx) => (
                    <tr
                      key={line.line_id || idx}
                      className={cx(ROW_HOVER, line.lettering_code && 'bg-amber-50/40 dark:bg-amber-500/[0.06]')}
                    >
                      <td className={cx(TD_CELL, 'whitespace-nowrap tabular-nums text-xs', TEXT_MUTED)}>
                        {fmtDate(line.entry_date)}
                      </td>
                      <td className={cx(TD_CELL, 'font-mono text-xs font-semibold text-purple-700 dark:text-purple-400')}>
                        {line.entry_number}
                      </td>
                      <td className={cx(TD_CELL, 'text-center')}>
                        <JournalBadge type={line.journal_type} />
                      </td>
                      <td className={cx(TD_CELL, TEXT_TITLE)}>
                        <span className="block max-w-xs truncate">
                          {line.description || line.reference || <span className={TEXT_FAINT}>—</span>}
                        </span>
                      </td>
                      <td className={NUM_CELL}><DebitCredit value={line.debit_amount} /></td>
                      <td className={NUM_CELL}><DebitCredit value={line.credit_amount} /></td>
                      <td className={cx(NUM_CELL, 'font-semibold', balanceTone(line.solde_cumul))}>
                        {amount(Math.abs(line.solde_cumul))}
                        <span className={cx('ml-1 text-xs font-normal', TEXT_MUTED)}>
                          {line.solde_cumul >= 0 ? 'D' : 'C'}
                        </span>
                      </td>
                      <td className={cx(TD_CELL, 'text-center')}>
                        {line.lettering_code
                          ? <Badge variant="warning" pill={false} className="font-mono">{line.lettering_code}</Badge>
                          : <span className={TEXT_FAINT}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totaux */}
                {ledger.lines.length > 0 && (
                  <tfoot className={TFOOT}>
                    <tr>
                      <td className={cx('px-4 py-3 text-xs uppercase tracking-wider', TEXT_MUTED)} colSpan={4}>
                        Totaux période
                      </td>
                      <td className={cx(NUM_CELL, 'py-3')}>{amount(ledger.total_debit)}</td>
                      <td className={cx(NUM_CELL, 'py-3')}>{amount(ledger.total_credit)}</td>
                      <td className={cx(NUM_CELL, 'py-3 text-base', NUM, balanceTone(ledger.solde_final))}>
                        {amount(Math.abs(ledger.solde_final))}
                        <span className={cx('ml-1 text-xs font-normal', TEXT_MUTED)}>
                          {ledger.solde_final >= 0 ? 'D' : 'C'}
                        </span>
                      </td>
                      <td className={TD_CELL} />
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
