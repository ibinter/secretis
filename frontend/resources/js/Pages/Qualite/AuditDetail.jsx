import { Head, Link } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  ArrowLeft, ClipboardCheck, Calendar, User, Target,
  AlertTriangle, CheckCircle2, Clock, FileText, Layers
} from 'lucide-react';

const AUDIT_STATUS = {
  planifie:            { label: 'Planifié',          color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300', icon: Calendar },
  en_cours:            { label: 'En cours',          color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300', icon: Clock },
  rapport_en_attente:  { label: 'Rapport en attente', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300', icon: FileText },
  clos:                { label: 'Clos',              color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300', icon: CheckCircle2 },
};

const FINDING_SEVERITY = {
  mineure:       { label: 'Mineure',        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  majeure:       { label: 'Majeure',        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  critique:      { label: 'Critique',       color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  observation:   { label: 'Observation',    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  point_fort:    { label: 'Point fort',     color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
};

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function StatusBadge({ status }) {
  const cfg = AUDIT_STATUS[status] ?? AUDIT_STATUS.planifie;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <Icon size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <div className="text-sm text-gray-700 dark:text-gray-300">{children}</div>
      </div>
    </div>
  );
}

export default function AuditDetail({ audit = {}, processes = [] }) {
  const findings = audit.findings ?? [];

  return (
    <AuthLayout>
      <Head title={audit.reference ? `Audit ${audit.reference}` : 'Audit qualité'} />

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href={route('qualite.audits')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> Audits
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">{audit.reference ?? audit.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <div className="lg:col-span-2 space-y-5">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">{audit.title}</h1>
                    {audit.reference && <p className="text-xs text-gray-400 font-mono mt-0.5">{audit.reference}</p>}
                  </div>
                </div>
                <StatusBadge status={audit.status} />
              </div>
              {audit.scope && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Périmètre</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{audit.scope}</p>
                </div>
              )}
            </div>

            {/* Constats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <AlertTriangle size={15} className="text-orange-500" /> Constats ({findings.length})
              </h2>
              {findings.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400">Aucun constat enregistré pour cet audit.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {findings.map(f => {
                    const sev = FINDING_SEVERITY[f.severity] ?? FINDING_SEVERITY.observation;
                    return (
                      <div key={f.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${sev.color}`}>{sev.label}</span>
                          {f.process && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <Layers size={11} /> {f.process.code} — {f.process.name}
                            </span>
                          )}
                        </div>
                        {f.description && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{f.description}</p>}
                        {f.recommendation && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pl-2 border-l-2 border-indigo-200 dark:border-indigo-700">
                            <span className="font-medium">Recommandation :</span> {f.recommendation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar infos */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Détails de l'audit</h2>
              <InfoRow icon={Target} label="Type">{audit.audit_type ?? '—'}</InfoRow>
              <InfoRow icon={User} label="Auditeur">{audit.auditor_name ?? '—'}</InfoRow>
              <InfoRow icon={Calendar} label="Début">{fmt(audit.audit_date_start)}</InfoRow>
              <InfoRow icon={Calendar} label="Fin">{fmt(audit.audit_date_end)}</InfoRow>
              <InfoRow icon={Clock} label="Prochain audit">{fmt(audit.next_audit_date)}</InfoRow>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Processus concernés ({processes.length})</h2>
              {processes.length === 0
                ? <p className="text-sm text-gray-400">Aucun processus.</p>
                : (
                  <div className="flex flex-wrap gap-1.5">
                    {processes.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
                        {p.code}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
