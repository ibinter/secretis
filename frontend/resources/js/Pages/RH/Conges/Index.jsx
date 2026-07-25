/**
 * RH/Conges/Index.jsx — Gestion des congés SECRETIS ERP
 *
 * Fonctionnalités :
 *   - Vue "Mes demandes"  → historique de l'employé connecté
 *   - Vue "À approuver"   → selon rôle (manager N+1 / RH)
 *   - Calendrier mensuel  → barres colorées par employé (absences équipe)
 *   - Formulaire création  → type, dates, motif, calcul jours auto
 *   - Workflow visuel      → En attente → Approuvé N1 → Approuvé RH
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

import { useState, useCallback } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Calendar, PlusCircle, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, AlertCircle,
  ArrowRight, Users, FileText, BarChart2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
         eachDayOfInterval, isSameMonth, isWeekend, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const LEAVE_TYPES = {
  annual:    { label: 'Congé annuel',        color: '#3b82f6', tailwind: 'bg-purple-500' },
  sick:      { label: 'Congé maladie',       color: '#f59e0b', tailwind: 'bg-amber-500' },
  maternity: { label: 'Maternité/Paternité', color: '#8b5cf6', tailwind: 'bg-purple-500' },
  unpaid:    { label: 'Sans solde',          color: '#6b7280', tailwind: 'bg-gray-500' },
  recovery:  { label: 'Récupération',        color: '#10b981', tailwind: 'bg-emerald-500' },
};

const STATUS_CONFIG = {
  pending:     { label: 'En attente',   icon: Clock,        color: 'text-amber-600 dark:text-amber-400',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved_n1: { label: 'Approuvé N+1', icon: CheckCircle2, color: 'text-purple-600 dark:text-purple-400',   badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'   },
  approved_hr: { label: 'Approuvé RH',  icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  rejected:    { label: 'Refusé',       icon: XCircle,      color: 'text-red-600 dark:text-red-400',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'       },
};

// ---------------------------------------------------------------------------
// Badge statut
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${cfg.badge}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

StatusBadge.propTypes = { status: PropTypes.string.isRequired };

// ---------------------------------------------------------------------------
// Workflow visuel
// ---------------------------------------------------------------------------

function WorkflowSteps({ status }) {
  const steps = [
    { id: 'pending',     label: 'Demandé' },
    { id: 'approved_n1', label: 'Approuvé N+1' },
    { id: 'approved_hr', label: 'Validé RH' },
  ];

  const currentIndex = steps.findIndex(s => s.id === status);
  const isRejected   = status === 'rejected';

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done    = currentIndex > i;
        const active  = currentIndex === i && ! isRejected;
        const rejected = isRejected && i <= 0;

        return (
          <div key={step.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium transition-all ${
              isRejected && i === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
              active  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
              done    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
            }`}>
              {done && ! isRejected && <CheckCircle2 className="w-3 h-3" />}
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            )}
          </div>
        );
      })}
      {isRejected && (
        <span className="ml-1 text-xs text-red-600 dark:text-red-400 font-medium">→ Refusé</span>
      )}
    </div>
  );
}

WorkflowSteps.propTypes = { status: PropTypes.string.isRequired };

// ---------------------------------------------------------------------------
// Carte de demande de congé
// ---------------------------------------------------------------------------

function LeaveCard({ leave, canApproveN1, canApproveHR, onAction }) {
  const start = format(parseISO(leave.start_date), 'dd MMM yyyy', { locale: fr });
  const end   = format(parseISO(leave.end_date), 'dd MMM yyyy', { locale: fr });
  const type  = LEAVE_TYPES[leave.leave_type] || { label: leave.leave_type, tailwind: 'bg-gray-500' };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {leave.employee && (
            <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {leave.employee.first_name?.[0]}{leave.employee.last_name?.[0]}
            </div>
          )}
          <div>
            {leave.employee && (
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {leave.employee.first_name} {leave.employee.last_name}
              </p>
            )}
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full text-white ${type.tailwind}`}>
              {type.label}
            </span>
          </div>
        </div>
        <StatusBadge status={leave.status} />
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <Calendar className="w-4 h-4" />
        <span>{start} → {end}</span>
        <span className="font-medium text-gray-900 dark:text-white">({leave.days_count} j)</span>
      </div>

      {leave.reason && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3 line-clamp-2">"{leave.reason}"</p>
      )}

      <WorkflowSteps status={leave.status} />

      {/* Actions d'approbation */}
      {(canApproveN1 || canApproveHR) && leave.status === 'pending' && canApproveN1 && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onAction('approve_n1', leave.id)}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
          </button>
          <button
            onClick={() => onAction('reject', leave.id)}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Refuser
          </button>
        </div>
      )}

      {canApproveHR && leave.status === 'approved_n1' && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onAction('approve_hr', leave.id)}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Valider RH
          </button>
          <button
            onClick={() => onAction('reject', leave.id)}
            className="flex items-center justify-center gap-1 py-2 px-3 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
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

function TeamCalendar({ teamAbsences, currentMonth, onChangeMonth }) {
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* En-tête mois */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-500" />
          Calendrier des absences — {format(monthDate, 'MMMM yyyy', { locale: fr })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangeMonth(format(subMonths(monthDate, 1), 'yyyy-MM'))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeMonth(format(addMonths(monthDate, 1), 'yyyy-MM'))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="py-12 text-center">
          <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Aucune absence ce mois-ci</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium min-w-36">
                  Employé
                </th>
                {days.map(day => (
                  <th
                    key={day.toISOString()}
                    className={`px-1 py-2 text-center font-medium min-w-7 ${
                      isWeekend(day) ? 'bg-gray-50 dark:bg-gray-700/30 text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <div>{format(day, 'EEE', { locale: fr }).slice(0, 2)}</div>
                    <div>{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(([empId, emp]) => (
                <tr key={empId} className="border-t border-gray-100 dark:border-gray-700/50">
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
                        {emp.name?.charAt(0)}
                      </div>
                      <span className="truncate max-w-24">{emp.name}</span>
                    </div>
                  </td>
                  {days.map(day => {
                    const leave = isAbsent(emp.leaves, day);
                    const isWE  = isWeekend(day);

                    return (
                      <td
                        key={day.toISOString()}
                        className={`px-0.5 py-1 text-center ${isWE ? 'bg-gray-50/50 dark:bg-gray-700/20' : ''}`}
                        title={leave ? `${leave.type_label} (${leave.status === 'approved_hr' ? 'validé' : 'en attente'})` : ''}
                      >
                        {leave && ! isWE && (
                          <div
                            className="h-5 rounded-sm mx-0.5"
                            style={{
                              backgroundColor: LEAVE_TYPES[leave.type]?.color || '#6b7280',
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

      {/* Légende */}
      <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20">
        {Object.entries(LEAVE_TYPES).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
            {cfg.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 ml-auto">
          <span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600 opacity-50" />
          En attente (50% opacité)
        </div>
      </div>
    </div>
  );
}

TeamCalendar.propTypes = {
  teamAbsences:  PropTypes.array.isRequired,
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

  const available = employee?.available?.[data.leave_type] ?? 0;
  const insufficient = ! ['sick','unpaid'].includes(data.leave_type) && daysCount > available;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
        <PlusCircle className="w-4 h-4 text-purple-500" /> Nouvelle demande de congé
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de congé</label>
          <select
            value={data.leave_type}
            onChange={e => setData('leave_type', e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition"
          >
            {Object.entries(LEAVE_TYPES).map(([v, t]) => (
              <option key={v} value={v}>
                {t.label} {employee && `(${employee.available?.[v] ?? 0} j dispo.)`}
              </option>
            ))}
          </select>
          {errors.leave_type && <p className="text-xs text-red-500 mt-1">{errors.leave_type}</p>}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de début</label>
            <input
              type="date"
              value={data.start_date}
              onChange={e => { setData('start_date', e.target.value); recalcDays(e.target.value, data.end_date); }}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
            {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de fin</label>
            <input
              type="date"
              value={data.end_date}
              min={data.start_date}
              onChange={e => { setData('end_date', e.target.value); recalcDays(data.start_date, e.target.value); }}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
            {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
          </div>
        </div>

        {/* Indicateur jours */}
        {daysCount > 0 && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${
            insufficient ? 'bg-red-50 dark:bg-red-900/20' : 'bg-purple-50 dark:bg-purple-900/20'
          }`}>
            <Calendar className={`w-4 h-4 ${insufficient ? 'text-red-500' : 'text-purple-500'}`} />
            <span className={`text-sm font-medium ${insufficient ? 'text-red-700 dark:text-red-300' : 'text-purple-700 dark:text-purple-300'}`}>
              {daysCount} jour{daysCount > 1 ? 's' : ''} ouvré{daysCount > 1 ? 's' : ''}
            </span>
            {insufficient && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Solde insuffisant ({available} j disponible{available > 1 ? 's' : ''})
              </span>
            )}
          </div>
        )}
        {errors.leave && <p className="text-xs text-red-500">{errors.leave}</p>}

        {/* Motif */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif (optionnel)</label>
          <textarea
            value={data.reason}
            onChange={e => setData('reason', e.target.value)}
            rows={3}
            placeholder="Décrivez brièvement la raison de votre absence…"
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none resize-none transition"
          />
        </div>

        <button
          type="submit"
          disabled={processing || ! data.start_date || ! data.end_date || insufficient}
          className="w-full py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Envoi en cours…' : 'Soumettre la demande'}
        </button>
      </form>
    </div>
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
  const [reason, setReason] = useState('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">Motif de refus</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ce motif sera communiqué à l'employé.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="Expliquez pourquoi cette demande est refusée…"
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            autoFocus
          />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading || reason.trim().length < 10} className="flex-1 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Refus en cours…' : 'Confirmer le refus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

RejectModal.propTypes = {
  leaveId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function CongesIndex({ myLeaves, toApproveN1, toApproveHR, teamAbsences, currentMonth, employee, filters }) {
  const { auth } = usePage().props;
  const [activeTab, setActiveTab] = useState('mes-demandes');
  const [month, setMonth]         = useState(currentMonth);
  const [rejectLeaveId, setRejectLeaveId] = useState(null);

  const hasApproveN1 = toApproveN1 !== null;
  const hasApproveHR = toApproveHR !== null;

  const tabs = [
    { id: 'mes-demandes',  label: 'Mes demandes',    count: myLeaves?.total },
    { id: 'a-approuver',   label: 'À approuver N+1', count: toApproveN1?.length, hidden: ! hasApproveN1 },
    { id: 'validation-rh', label: 'Validation RH',   count: toApproveHR?.length, hidden: ! hasApproveHR },
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

  return (
    <AuthLayout>
      <Head title="Congés & Absences — RH" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Congés & Absences</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Gérez vos demandes et validez celles de votre équipe
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === id ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Mes demandes */}
        {activeTab === 'mes-demandes' && (
          <div>
            {! myLeaves || myLeaves.data.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune demande de congé</p>
                {employee && (
                  <button onClick={() => setActiveTab('nouvelle')} className="mt-4 text-sm text-purple-600 dark:text-purple-400 hover:underline">
                    Créer une demande
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myLeaves.data.map(leave => (
                  <LeaveCard
                    key={leave.id}
                    leave={leave}
                    canApproveN1={false}
                    canApproveHR={false}
                    onAction={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* À approuver N+1 */}
        {activeTab === 'a-approuver' && toApproveN1 && (
          <div>
            {toApproveN1.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune demande en attente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            )}
          </div>
        )}

        {/* Validation RH */}
        {activeTab === 'validation-rh' && toApproveHR && (
          <div>
            {toApproveHR.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun congé en attente de validation RH</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            )}
          </div>
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
  teamAbsences: PropTypes.array.isRequired,
  currentMonth: PropTypes.string.isRequired,
  employee:     PropTypes.object,
  filters:      PropTypes.object,
};
export { CongesIndex };
