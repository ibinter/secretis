/**
 * RH/Conges/Index.jsx — Gestion des congés SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * La logique métier est strictement inchangée : mêmes props Inertia, mêmes
 * noms de routes (`rh.conges.*`), mêmes appels axios / router.
 *
 * Fonctionnalités :
 *   - Vue "Mes demandes"  → historique de l'employé connecté
 *   - Vue "À approuver"   → selon rôle (manager N+1 / RH)
 *   - Calendrier mensuel  → barres colorées par employé (absences équipe)
 *   - Formulaire création  → type, dates, motif, calcul jours auto
 *   - Workflow visuel      → En attente → Approuvé N+1 → Validé RH
 *
 * Props Inertia :
 *   - myLeaves      : LengthAwarePaginator | null
 *   - toApproveN1   : LeaveRequest[] | null
 *   - toApproveHR   : LeaveRequest[] | null
 *   - teamAbsences  : array
 *   - currentMonth  : 'YYYY-MM'
 *   - employee      : { id, leave_balance, available } | null
 *   - filters       : { month, status, type }
 */

import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Calendar, CalendarDays, PlusCircle, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, AlertCircle, Ban, Users, Inbox,
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isWeekend, parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, SURFACE, SURFACE_SUNK, BORDER, DIVIDE, CONTROL,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM, FOCUS_RING,
} from '@/Components/UI';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/**
 * Types de congé. `color` sert exclusivement aux barres du calendrier d'équipe
 * (encodage de donnée) : palette sobre, aucun dégradé.
 */
const LEAVE_TYPES = {
  annual:        { label: 'Congé annuel',       color: '#0284C7' },
  sick:          { label: 'Congé maladie',      color: '#D97706' },
  maternity:     { label: 'Maternité',          color: '#9333EA' },
  paternity:     { label: 'Paternité',          color: '#7C3AED' },
  compassionate: { label: 'Événement familial', color: '#E11D48' },
  unpaid:        { label: 'Sans solde',         color: '#6B7280' },
  other:         { label: 'Autre',              color: '#059669' },
};

/**
 * Les 5 états du workflow à deux niveaux, chacun avec un ton sémantique
 * distinct — jamais l'accent violet, qui reste réservé aux actions.
 */
const STATUS_CONFIG = {
  pending:     { label: 'En attente',   tone: 'warning', icon: Clock },
  approved_n1: { label: 'Approuvé N+1', tone: 'info',    icon: CheckCircle2 },
  approved_hr: { label: 'Validé RH',    tone: 'success', icon: CheckCircle2 },
  rejected:    { label: 'Refusé',       tone: 'danger',  icon: XCircle },
  cancelled:   { label: 'Annulé',       tone: 'neutral', icon: Ban },
};

// ---------------------------------------------------------------------------
// Badge statut
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <Badge variant={cfg.tone} icon={cfg.icon}>{cfg.label}</Badge>;
}

StatusBadge.propTypes = { status: PropTypes.string.isRequired };

// ---------------------------------------------------------------------------
// Workflow visuel — 3 jalons, ligne fine, sans bandeau coloré
// ---------------------------------------------------------------------------

const WORKFLOW_STEPS = [
  { id: 'pending',     label: 'Demandé' },
  { id: 'approved_n1', label: 'Approuvé N+1' },
  { id: 'approved_hr', label: 'Validé RH' },
];

function WorkflowSteps({ status }) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === status);
  const isRejected   = status === 'rejected';
  const isCancelled  = status === 'cancelled';
  const isStopped    = isRejected || isCancelled;

  return (
    <ol className="flex items-center gap-2" aria-label="Avancement de la demande">
      {WORKFLOW_STEPS.map((step, i) => {
        const done   = ! isStopped && currentIndex > i;
        const active = ! isStopped && currentIndex === i;
        const stop   = isStopped && i === 0;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span
                className={cx(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  stop   ? (isRejected ? 'bg-red-500' : 'bg-gray-400')
                    : done   ? 'bg-emerald-500'
                    : active ? 'bg-amber-500'
                    : 'bg-gray-300 dark:bg-gray-600',
                )}
              />
              <span
                className={cx(
                  'text-[11px] font-medium',
                  stop   ? (isRejected ? 'text-red-600 dark:text-red-400' : TEXT_MUTED)
                    : done   ? 'text-emerald-600 dark:text-emerald-400'
                    : active ? 'text-amber-600 dark:text-amber-400'
                    : TEXT_FAINT,
                )}
              >
                {step.label}
              </span>
            </span>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span className={cx('h-px w-4 shrink-0', done ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-gray-200 dark:bg-[#1E3048]')} />
            )}
          </li>
        );
      })}

      {isStopped && (
        <li className={cx('text-[11px] font-medium', isRejected ? 'text-red-600 dark:text-red-400' : TEXT_MUTED)}>
          · {isRejected ? 'Refusé' : 'Annulé'}
        </li>
      )}
    </ol>
  );
}

WorkflowSteps.propTypes = { status: PropTypes.string.isRequired };

// ---------------------------------------------------------------------------
// Carte de demande de congé
// ---------------------------------------------------------------------------

function LeaveCard({ leave, canApproveN1, canApproveHR, onAction }) {
  const start = leave.start_date ? format(parseISO(leave.start_date), 'dd MMM yyyy', { locale: fr }) : '—';
  const end   = leave.end_date   ? format(parseISO(leave.end_date),   'dd MMM yyyy', { locale: fr }) : '—';
  const type  = LEAVE_TYPES[leave.leave_type] || { label: leave.leave_type, color: '#6B7280' };

  const initials = ((leave.employee?.first_name?.[0] ?? '') + (leave.employee?.last_name?.[0] ?? '')).toUpperCase();

  const showN1 = canApproveN1 && leave.status === 'pending';
  const showHR = canApproveHR && leave.status === 'approved_n1';

  return (
    <article className={cx(
      'flex flex-col rounded-xl border p-5 shadow-sm transition-colors',
      SURFACE, BORDER, 'hover:bg-gray-50/60 dark:hover:bg-white/[0.02]',
    )}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {leave.employee && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
              {initials || '?'}
            </span>
          )}
          <div className="min-w-0">
            {leave.employee && (
              <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>
                {leave.employee.first_name} {leave.employee.last_name}
              </p>
            )}
            <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: type.color }} />
              {type.label}
            </span>
          </div>
        </div>
        <StatusBadge status={leave.status} />
      </header>

      <p className={cx('mb-3 flex flex-wrap items-center gap-2 text-sm', TEXT_BODY)}>
        <Calendar className={cx('h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
        <span className={NUM}>{start} → {end}</span>
        <span className={cx('font-medium', TEXT_TITLE, NUM)}>({leave.days_count} j)</span>
      </p>

      {leave.reason && (
        <p className={cx('mb-3 line-clamp-2 text-xs italic', TEXT_MUTED)}>« {leave.reason} »</p>
      )}

      <WorkflowSteps status={leave.status} />

      {/* Actions d'approbation */}
      {showN1 && (
        <div className={cx('mt-4 flex gap-2 border-t pt-3', BORDER)}>
          <Button variant="primary" size="sm" icon={CheckCircle2} className="flex-1"
                  onClick={() => onAction('approve_n1', leave.id)}>
            Approuver
          </Button>
          <Button variant="secondary" size="sm" icon={XCircle} className="flex-1"
                  onClick={() => onAction('reject', leave.id)}>
            Refuser
          </Button>
        </div>
      )}

      {showHR && (
        <div className={cx('mt-4 flex gap-2 border-t pt-3', BORDER)}>
          <Button variant="primary" size="sm" icon={CheckCircle2} className="flex-1"
                  onClick={() => onAction('approve_hr', leave.id)}>
            Valider RH
          </Button>
          <Button variant="secondary" size="sm" iconOnly icon={XCircle} title="Refuser"
                  onClick={() => onAction('reject', leave.id)} />
        </div>
      )}
    </article>
  );
}

LeaveCard.propTypes = {
  leave:         PropTypes.object.isRequired,
  canApproveN1:  PropTypes.bool,
  canApproveHR:  PropTypes.bool,
  onAction:      PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Calendrier mensuel des absences
// ---------------------------------------------------------------------------

function TeamCalendar({ teamAbsences = [], currentMonth, onChangeMonth }) {
  const monthDate = parseISO(currentMonth + '-01');
  const days      = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });

  // Regrouper les absences par employé
  const byEmployee = {};
  teamAbsences.forEach(a => {
    if (! byEmployee[a.employee_id]) {
      byEmployee[a.employee_id] = { name: a.name, avatar: a.avatar, department: a.department, leaves: [] };
    }
    byEmployee[a.employee_id].leaves.push(a);
  });

  const employees = Object.entries(byEmployee);

  // Vérifier si un employé est absent un jour donné
  const isAbsent = (leaves, day) => {
    const d = format(day, 'yyyy-MM-dd');
    return leaves.find(l => l.start <= d && l.end >= d);
  };

  return (
    <Card
      padded={false}
      icon={Users}
      title={`Calendrier des absences — ${format(monthDate, 'MMMM yyyy', { locale: fr })}`}
      actions={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" iconOnly icon={ChevronLeft} title="Mois précédent"
                  onClick={() => onChangeMonth(format(subMonths(monthDate, 1), 'yyyy-MM'))} />
          <Button variant="ghost" size="sm" iconOnly icon={ChevronRight} title="Mois suivant"
                  onClick={() => onChangeMonth(format(addMonths(monthDate, 1), 'yyyy-MM'))} />
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {Object.entries(LEAVE_TYPES).map(([type, cfg]) => (
            <span key={type} className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </span>
          ))}
          <span className={cx('ml-auto inline-flex items-center gap-1.5 text-xs', TEXT_FAINT)}>
            <span className="h-2.5 w-2.5 rounded-sm bg-gray-400 opacity-50" />
            Demande non encore validée
          </span>
        </div>
      }
    >
      {employees.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucune absence ce mois-ci"
          description="Personne n'est absent sur la période affichée. Changez de mois pour explorer le planning de l'équipe."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">Absences de l'équipe par jour</caption>
            <thead>
              <tr>
                <th scope="col" className={cx('sticky left-0 z-10 min-w-36 px-3 py-2.5 text-left', TH, SURFACE_SUNK)}>
                  Employé
                </th>
                {days.map(day => (
                  <th
                    key={day.toISOString()}
                    scope="col"
                    className={cx(
                      'min-w-7 px-1 py-2 text-center font-medium', NUM,
                      isWeekend(day) ? cx(SURFACE_SUNK, TEXT_FAINT) : TEXT_MUTED,
                    )}
                  >
                    <div className="uppercase tracking-wide">{format(day, 'EEE', { locale: fr }).slice(0, 2)}</div>
                    <div>{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cx('divide-y', DIVIDE)}>
              {employees.map(([empId, emp]) => (
                <tr key={empId}>
                  <td className={cx('sticky left-0 z-10 px-3 py-2 font-medium', SURFACE, TEXT_BODY)}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-50 text-[10px] font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                        {emp.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </span>
                      <span className="max-w-24 truncate">{emp.name}</span>
                    </div>
                  </td>
                  {days.map(day => {
                    const leave = isAbsent(emp.leaves, day);
                    const isWE  = isWeekend(day);

                    return (
                      <td
                        key={day.toISOString()}
                        className={cx('px-0.5 py-1 text-center', isWE && SURFACE_SUNK)}
                        title={leave ? `${leave.type_label} (${leave.status === 'approved_hr' ? 'validé' : 'en attente'})` : undefined}
                      >
                        {leave && ! isWE && (
                          <div
                            className="mx-0.5 h-5 rounded-sm"
                            style={{
                              backgroundColor: LEAVE_TYPES[leave.type]?.color || '#6B7280',
                              opacity: leave.status === 'approved_hr' ? 1 : 0.5,
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

TeamCalendar.propTypes = {
  teamAbsences:  PropTypes.array,
  currentMonth:  PropTypes.string.isRequired,
  onChangeMonth: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Formulaire de création de congé
// ---------------------------------------------------------------------------

function LeaveForm({ employee, onSuccess }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    leave_type:  'annual',
    start_date:  '',
    end_date:    '',
    reason:      '',
  });

  const [daysCount, setDaysCount] = useState(0);

  const recalcDays = (start, end) => {
    if (! start || ! end) { setDaysCount(0); return; }
    const s = new Date(start), e = new Date(end);
    if (s > e) { setDaysCount(0); return; }
    let count = 0, cur = new Date(s);
    while (cur <= e) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    setDaysCount(count);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('rh.conges.store'), {
      onSuccess: () => { toast.success('Demande de congé envoyée !'); reset(); setDaysCount(0); onSuccess?.(); },
      onError:   (errs) => toast.error(Object.values(errs)[0] || 'Erreur'),
    });
  };

  const available    = employee?.available?.[data.leave_type] ?? 0;
  const insufficient = ! ['sick', 'unpaid'].includes(data.leave_type) && daysCount > available;

  const fieldError = (msg) => msg
    ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{msg}</p>
    : null;

  return (
    <Card icon={PlusCircle} title="Nouvelle demande de congé"
          subtitle="Le décompte ne retient que les jours ouvrés.">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Type */}
        <div>
          <label htmlFor="leave_type" className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
            Type de congé
          </label>
          <select
            id="leave_type"
            value={data.leave_type}
            onChange={e => setData('leave_type', e.target.value)}
            className={cx(CONTROL, 'h-10')}
          >
            {Object.entries(LEAVE_TYPES).map(([v, t]) => (
              <option key={v} value={v}>
                {t.label} {employee && `(${employee.available?.[v] ?? 0} j dispo.)`}
              </option>
            ))}
          </select>
          {fieldError(errors.leave_type)}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="start_date" className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
              Date de début
            </label>
            <input
              id="start_date"
              type="date"
              value={data.start_date}
              onChange={e => { setData('start_date', e.target.value); recalcDays(e.target.value, data.end_date); }}
              className={cx(CONTROL, 'h-10', NUM)}
            />
            {fieldError(errors.start_date)}
          </div>
          <div>
            <label htmlFor="end_date" className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
              Date de fin
            </label>
            <input
              id="end_date"
              type="date"
              value={data.end_date}
              min={data.start_date}
              onChange={e => { setData('end_date', e.target.value); recalcDays(data.start_date, e.target.value); }}
              className={cx(CONTROL, 'h-10', NUM)}
            />
            {fieldError(errors.end_date)}
          </div>
        </div>

        {/* Indicateur jours */}
        {daysCount > 0 && (
          <div className={cx(
            'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
            insufficient
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
              : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-[#1E3048] dark:bg-white/[0.04] dark:text-gray-300',
          )}>
            <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={cx('font-medium', NUM)}>
              {daysCount} jour{daysCount > 1 ? 's' : ''} ouvré{daysCount > 1 ? 's' : ''}
            </span>
            {insufficient && (
              <span className="inline-flex items-center gap-1 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Solde insuffisant ({available} j disponible{available > 1 ? 's' : ''})
              </span>
            )}
          </div>
        )}
        {fieldError(errors.leave)}

        {/* Motif */}
        <div>
          <label htmlFor="reason" className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
            Motif (optionnel)
          </label>
          <textarea
            id="reason"
            value={data.reason}
            onChange={e => setData('reason', e.target.value)}
            rows={3}
            placeholder="Décrivez brièvement la raison de votre absence…"
            className={cx(CONTROL, 'resize-none')}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          block
          loading={processing}
          disabled={! data.start_date || ! data.end_date || insufficient}
        >
          {processing ? 'Envoi en cours…' : 'Soumettre la demande'}
        </Button>
      </form>
    </Card>
  );
}

LeaveForm.propTypes = {
  employee:  PropTypes.object,
  onSuccess: PropTypes.func,
};

// ---------------------------------------------------------------------------
// Modal refus avec motif
// ---------------------------------------------------------------------------

function RejectModal({ leaveId, onClose }) {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) { toast.error('Le motif doit comporter au moins 10 caractères.'); return; }
    setLoading(true);
    try {
      await axios.post(route('rh.conges.reject', leaveId), { rejection_reason: reason });
      toast.success('Demande refusée.');
      onClose();
      router.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <Card
          className="shadow-xl"
          title="Motif de refus"
          subtitle="Ce motif sera communiqué à l'employé."
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button type="submit" variant="danger" loading={loading} disabled={reason.trim().length < 10}>
                Confirmer le refus
              </Button>
            </div>
          }
        >
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="Expliquez pourquoi cette demande est refusée…"
            className={cx(CONTROL, 'resize-none')}
            autoFocus
          />
          <p className={cx('mt-2 text-xs', TEXT_FAINT, NUM)}>
            {reason.trim().length}/10 caractères minimum
          </p>
        </Card>
      </form>
    </div>
  );
}

RejectModal.propTypes = {
  leaveId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Barre d'onglets
// ---------------------------------------------------------------------------

function Tabs({ tabs, active, onChange }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto rounded-xl p-1', SURFACE_SUNK, 'border', BORDER)}>
      {tabs.map(({ id, label, count }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={isActive ? 'page' : undefined}
            className={cx(
              'inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors',
              isActive
                ? cx(SURFACE, 'text-purple-700 dark:text-purple-300 shadow-sm')
                : cx(TEXT_MUTED, 'hover:text-gray-800 dark:hover:text-gray-200'),
              FOCUS_RING,
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <Badge variant={isActive ? 'accent' : 'neutral'} className={NUM}>{count}</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

Tabs.propTypes = {
  tabs:     PropTypes.array.isRequired,
  active:   PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function CongesIndex({
  myLeaves,
  toApproveN1,
  toApproveHR,
  teamAbsences = [],
  currentMonth,
  employee,
  filters,
}) {
  const [activeTab, setActiveTab]         = useState('mes-demandes');
  const [month, setMonth]                 = useState(currentMonth);
  const [rejectLeaveId, setRejectLeaveId] = useState(null);

  const hasApproveN1 = toApproveN1 !== null && toApproveN1 !== undefined;
  const hasApproveHR = toApproveHR !== null && toApproveHR !== undefined;

  const tabs = [
    { id: 'mes-demandes',  label: 'Mes demandes',     count: myLeaves?.total },
    { id: 'a-approuver',   label: 'À approuver N+1',  count: toApproveN1?.length, hidden: ! hasApproveN1 },
    { id: 'validation-rh', label: 'Validation RH',    count: toApproveHR?.length, hidden: ! hasApproveHR },
    { id: 'calendrier',    label: 'Calendrier équipe' },
    { id: 'nouvelle',      label: 'Nouvelle demande', hidden: ! employee },
  ].filter(t => ! t.hidden);

  const handleAction = async (action, leaveId) => {
    if (action === 'reject') { setRejectLeaveId(leaveId); return; }

    const routeName = action === 'approve_n1' ? 'rh.conges.approve-n1' : 'rh.conges.approve-hr';
    try {
      await axios.post(route(routeName, leaveId));
      toast.success(action === 'approve_n1' ? 'Demande approuvée (N+1).' : 'Congé validé par le RH.');
      router.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'action.');
    }
  };

  const handleMonthChange = (newMonth) => {
    setMonth(newMonth);
    router.get(route('rh.conges.index'), { month: newMonth }, { preserveState: true, replace: true });
  };

  const myLeaveRows = myLeaves?.data ?? [];
  const pendingBalance = employee?.available?.annual;

  return (
    <AuthLayout>
      <Head title="Congés & Absences — RH" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={CalendarDays}
          title="Congés & Absences"
          breadcrumbs={[
            { label: 'Ressources Humaines', href: route('rh.index') },
            { label: 'Congés & Absences' },
          ]}
          subtitle="Gérez vos demandes et validez celles de votre équipe."
          meta={
            employee && pendingBalance !== undefined
              ? <Badge variant="info" size="md" className={NUM}>{pendingBalance} j de congé annuel disponibles</Badge>
              : undefined
          }
          actions={
            employee && activeTab !== 'nouvelle' ? (
              <Button variant="primary" icon={PlusCircle} onClick={() => setActiveTab('nouvelle')}>
                Nouvelle demande
              </Button>
            ) : undefined
          }
        />

        {/* Onglets */}
        <div className="mb-6">
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Mes demandes */}
        {activeTab === 'mes-demandes' && (
          myLeaveRows.length === 0 ? (
            <EmptyState
              bordered
              icon={CalendarDays}
              title="Aucune demande de congé"
              description="Vous n'avez encore soumis aucune demande. Créez-en une : elle suivra le circuit de validation N+1 puis RH."
              hints={[
                'Le décompte ne retient que les jours ouvrés.',
                'Votre responsable est notifié dès la soumission.',
              ]}
              action={employee
                ? <Button variant="primary" icon={PlusCircle} onClick={() => setActiveTab('nouvelle')}>Créer une demande</Button>
                : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myLeaveRows.map(leave => (
                <LeaveCard
                  key={leave.id}
                  leave={leave}
                  canApproveN1={false}
                  canApproveHR={false}
                  onAction={() => {}}
                />
              ))}
            </div>
          )
        )}

        {/* À approuver N+1 */}
        {activeTab === 'a-approuver' && toApproveN1 && (
          toApproveN1.length === 0 ? (
            <EmptyState
              bordered
              icon={CheckCircle2}
              title="Rien à approuver"
              description="Aucune demande de votre équipe n'attend votre validation de niveau 1."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {toApproveN1.map(leave => (
                <LeaveCard
                  key={leave.id}
                  leave={leave}
                  canApproveN1={true}
                  canApproveHR={false}
                  onAction={handleAction}
                />
              ))}
            </div>
          )
        )}

        {/* Validation RH */}
        {activeTab === 'validation-rh' && toApproveHR && (
          toApproveHR.length === 0 ? (
            <EmptyState
              bordered
              icon={Inbox}
              title="Aucune validation RH en attente"
              description="Les demandes déjà approuvées par les responsables N+1 apparaîtront ici pour validation définitive."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {toApproveHR.map(leave => (
                <LeaveCard
                  key={leave.id}
                  leave={leave}
                  canApproveN1={false}
                  canApproveHR={true}
                  onAction={handleAction}
                />
              ))}
            </div>
          )
        )}

        {/* Calendrier */}
        {activeTab === 'calendrier' && (
          <TeamCalendar
            teamAbsences={teamAbsences}
            currentMonth={month}
            onChangeMonth={handleMonthChange}
          />
        )}

        {/* Nouvelle demande */}
        {activeTab === 'nouvelle' && employee && (
          <div className="max-w-lg">
            <LeaveForm employee={employee} onSuccess={() => setActiveTab('mes-demandes')} />
          </div>
        )}
      </div>

      {/* Modal refus */}
      {rejectLeaveId && (
        <RejectModal leaveId={rejectLeaveId} onClose={() => { setRejectLeaveId(null); router.reload(); }} />
      )}
    </AuthLayout>
  );
}

CongesIndex.propTypes = {
  myLeaves:     PropTypes.object,
  toApproveN1:  PropTypes.array,
  toApproveHR:  PropTypes.array,
  teamAbsences: PropTypes.array,
  currentMonth: PropTypes.string.isRequired,
  employee:     PropTypes.object,
  filters:      PropTypes.object,
};
export { CongesIndex };
