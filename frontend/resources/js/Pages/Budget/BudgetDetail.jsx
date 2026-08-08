import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  ArrowLeft, BarChart2, CheckCircle2, Clock, XCircle, Edit,
  AlertTriangle, User, Calendar, TrendingUp, DollarSign, ChevronDown, ChevronRight
} from 'lucide-react';

const STATUSES = {
  draft:    { label: 'Brouillon', color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',    icon: Clock },
  pending:  { label: 'En attente', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300', icon: AlertTriangle },
  active:   { label: 'Actif',    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300', icon: CheckCircle2 },
  closed:   { label: 'Clôturé', color: 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',       icon: XCircle },
  rejected: { label: 'Refusé',  color: 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',        icon: XCircle },
};

function fmt(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

function StatusBadge({ status }) {
  const cfg = STATUSES[status] ?? STATUSES.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function QuarterBar({ label, amount, total }) {
  const pct = total > 0 ? Math.min(100, (Number(amount) / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{fmt(amount)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BudgetLineRow({ line }) {
  const [expanded, setExpanded] = useState(false);
  const annual = Number(line.annual_amount ?? 0);
  const q1 = Number(line.q1_amount ?? 0);
  const q2 = Number(line.q2_amount ?? 0);
  const q3 = Number(line.q3_amount ?? 0);
  const q4 = Number(line.q4_amount ?? 0);

  return (
    <div className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 dark:text-gray-300">{line.description ?? line.category}</p>
          {line.category && line.description && (
            <p className="text-xs text-gray-400 capitalize mt-0.5">{line.category}</p>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums flex-shrink-0">{fmt(annual)}</span>
      </div>
      {expanded && (
        <div className="px-12 pb-4 space-y-2">
          <QuarterBar label="T1" amount={q1} total={annual} />
          <QuarterBar label="T2" amount={q2} total={annual} />
          <QuarterBar label="T3" amount={q3} total={annual} />
          <QuarterBar label="T4" amount={q4} total={annual} />
        </div>
      )}
    </div>
  );
}

function RevisionRow({ rev }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">R{rev.revision_number ?? ''}</span>
      </div>
      <div className="flex-1 min-w-0">
        {rev.notes && <p className="text-sm text-gray-700 dark:text-gray-300">{rev.notes}</p>}
        <p className="text-xs text-gray-400 mt-0.5">
          {rev.created_at ? new Date(rev.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </p>
      </div>
    </div>
  );
}

export default function BudgetDetail({ budget = {} }) {
  const lines     = budget.lines ?? [];
  const revisions = budget.revisions ?? [];
  const total     = Number(budget.total_amount ?? 0);

  // Totaux par trimestre
  const quarters = lines.reduce(
    (acc, l) => {
      acc.q1 += Number(l.q1_amount ?? 0);
      acc.q2 += Number(l.q2_amount ?? 0);
      acc.q3 += Number(l.q3_amount ?? 0);
      acc.q4 += Number(l.q4_amount ?? 0);
      return acc;
    },
    { q1: 0, q2: 0, q3: 0, q4: 0 }
  );

  return (
    <AuthLayout>
      <Head title={`Budget — ${budget.name ?? ''}`} />

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href={route('budget.index')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> Budgets
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-xs">{budget.name}</span>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-start gap-2">
                <BarChart2 size={20} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                {budget.name}
              </h1>
              {budget.type && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{budget.type}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={budget.status} />
              {budget.status === 'draft' && (
                <Link
                  href={route('budget.show', budget.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <Edit size={13} /> Modifier
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Total annuel</p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">{fmt(total)}</p>
            </div>
            {['T1', 'T2', 'T3', 'T4'].map((q, i) => (
              <div key={q} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-400 mb-1">{q}</p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{fmt(quarters[`q${i + 1}`])}</p>
              </div>
            ))}
          </div>

          {budget.notes && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">{budget.notes}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
            {budget.creator && <span>Créé par <span className="font-medium text-gray-600 dark:text-gray-300">{budget.creator.name}</span></span>}
            {budget.approver && <span>Approuvé par <span className="font-medium text-gray-600 dark:text-gray-300">{budget.approver.name}</span></span>}
            {budget.approved_at && <span>le {new Date(budget.approved_at).toLocaleDateString('fr-FR')}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Lignes budgétaires */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Lignes budgétaires <span className="text-gray-400 font-normal">({lines.length})</span>
                </h2>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{fmt(total)}</span>
              </div>
              {lines.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400 italic">Aucune ligne budgétaire</p>
              ) : (
                lines.map((l, i) => <BudgetLineRow key={l.id ?? i} line={l} />)
              )}
            </div>
          </div>

          {/* Révisions */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <TrendingUp size={14} className="text-gray-400" /> Révisions ({revisions.length})
                </h2>
              </div>
              {revisions.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 italic">Aucune révision</p>
              ) : (
                <div className="px-4">
                  {revisions.map((r, i) => <RevisionRow key={r.id ?? i} rev={r} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
