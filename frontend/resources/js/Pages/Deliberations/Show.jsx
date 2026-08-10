import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  ArrowLeft, FileText, User, Calendar, Tag, CheckCircle2,
  Clock, XCircle, ChevronRight, AlertTriangle, BookOpen, Gavel
} from 'lucide-react';

const STATUS_LABELS = {
  pending:     { label: 'En attente',  color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: Clock },
  in_progress: { label: 'En cours',   color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',   icon: ChevronRight },
  done:        { label: 'Terminé',    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle2 },
  cancelled:   { label: 'Annulé',     color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',       icon: XCircle },
};

const NEXT_STATUSES = {
  pending:     ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done:        [],
  cancelled:   ['pending'],
};

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] ?? STATUS_LABELS.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <div className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
        <div className="text-sm text-gray-800 dark:text-gray-200">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function DeliberationShow({ deliberation }) {
  const [loading, setLoading] = useState(false);

  const delib = deliberation ?? {};
  const nextStatuses = NEXT_STATUSES[delib.status] ?? [];

  function changeStatus(newStatus) {
    if (loading) return;
    setLoading(true);
    router.post(
      route('deliberations.status', delib.id),
      { status: newStatus },
      {
        preserveScroll: true,
        onFinish: () => setLoading(false),
      }
    );
  }

  const deadlineDate = delib.deadline ? new Date(delib.deadline) : null;
  const isOverdue = deadlineDate && delib.status !== 'done' && delib.status !== 'cancelled' && deadlineDate < new Date();

  return (
    <AuthLayout>
      <Head title={`Délibération ${delib.reference ?? ''}`} />

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href={route('deliberations.index')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> Délibérations
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-xs">{delib.reference}</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{delib.reference}</span>
                {delib.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                    {delib.category}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-snug flex items-start gap-2">
                <Gavel size={20} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                {delib.title}
              </h1>
            </div>
            <StatusBadge status={delib.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-4">

            {delib.body && (
              <Section title="Contexte">
                <div className="prose dark:prose-invert prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {delib.body}
                </div>
              </Section>
            )}

            {delib.decision && (
              <Section title="Décision prise">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 size={16} className="text-green-500" />
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{delib.decision}</p>
                </div>
              </Section>
            )}

            {delib.action_required && (
              <Section title="Action requise">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <AlertTriangle size={16} className="text-amber-500" />
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{delib.action_required}</p>
                </div>
              </Section>
            )}

            {/* Changer le statut */}
            {nextStatuses.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Faire avancer</h2>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map(s => {
                    const cfg = STATUS_LABELS[s];
                    return (
                      <button
                        key={s}
                        onClick={() => changeStatus(s)}
                        disabled={loading}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${cfg.color} border-current/20 hover:opacity-80 disabled:opacity-50`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Section title="Informations">
              <InfoRow icon={User} label="Responsable">
                {delib.responsible ? (
                  <span className="font-medium">{delib.responsible.name}</span>
                ) : (
                  <span className="text-gray-400 italic">Non assigné</span>
                )}
              </InfoRow>

              <InfoRow icon={FileText} label="Créé par">
                {delib.creator?.name ?? '—'}
              </InfoRow>

              <InfoRow icon={Calendar} label="Échéance">
                {deadlineDate ? (
                  <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                    {isOverdue && <AlertTriangle size={12} className="inline mr-1" />}
                    {deadlineDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Non définie</span>
                )}
              </InfoRow>

              {delib.category && (
                <InfoRow icon={Tag} label="Catégorie">
                  <span>{delib.category}</span>
                </InfoRow>
              )}

              {delib.meeting && (
                <InfoRow icon={BookOpen} label="Réunion associée">
                  <span className="font-medium">{delib.meeting.title}</span>
                  {delib.meeting.scheduled_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(delib.meeting.scheduled_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </InfoRow>
              )}

              <InfoRow icon={Calendar} label="Créé le">
                {delib.created_at
                  ? new Date(delib.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                  : '—'}
              </InfoRow>
            </Section>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
