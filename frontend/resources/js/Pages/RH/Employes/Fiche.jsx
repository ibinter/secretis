/**
 * RH/Employes/Fiche.jsx — Fiche complète d'un employé
 *
 * Onglets :
 *   1. Informations    — identité, poste, contrat, contacts d'urgence
 *   2. Congés          — solde par type (jauge circulaire), historique, nouvelle demande
 *   3. Notes de frais  — tableau avec statuts
 *   4. Documents RH    — (placeholder module documentaire)
 *
 * Props Inertia :
 *   - employee       : Employee complet
 *   - leaveBalance   : { annual, sick, maternity, unpaid, recovery }
 *   - availableDays  : { annual, sick, maternity, unpaid, recovery }
 *   - recentLeaves   : LeaveRequest[]
 *   - expenseReports : ExpenseReport[]
 */

import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  ArrowLeft, User, Calendar, FileText, Folder,
  Phone, Mail, MapPin, Briefcase, Building2,
  Edit, CheckCircle2, XCircle, Clock, AlertCircle,
  PlusCircle, Coffee, ChevronRight, TrendingDown
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const CONTRACT_LABELS = {
  cdi: 'CDI', cdd: 'CDD', internship: 'Stage', freelance: 'Freelance', other: 'Autre',
};

const LEAVE_TYPES = {
  annual:    { label: 'Congé annuel',      color: '#3b82f6', bg: 'bg-purple-500' },
  sick:      { label: 'Congé maladie',     color: '#f59e0b', bg: 'bg-amber-500' },
  maternity: { label: 'Maternité/Paternité', color: '#8b5cf6', bg: 'bg-purple-500' },
  unpaid:    { label: 'Sans solde',        color: '#6b7280', bg: 'bg-gray-500' },
  recovery:  { label: 'Récupération',      color: '#10b981', bg: 'bg-emerald-500' },
};

const LEAVE_STATUS = {
  pending:     { label: 'En attente',   icon: Clock,         color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20'  },
  approved_n1: { label: 'Approuvé N+1', icon: CheckCircle2,  color: 'text-purple-600 dark:text-purple-400',    bg: 'bg-purple-50 dark:bg-purple-900/20'    },
  approved_hr: { label: 'Approuvé RH',  icon: CheckCircle2,  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20'  },
  rejected:    { label: 'Refusé',       icon: XCircle,       color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20'      },
};

const EXPENSE_STATUS = {
  draft:     { label: 'Brouillon',  color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  submitted: { label: 'Soumise',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  approved:  { label: 'Approuvée', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  rejected:  { label: 'Refusée',   color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  paid:      { label: 'Payée',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

// ---------------------------------------------------------------------------
// Jauge circulaire SVG
// ---------------------------------------------------------------------------

function CircularGauge({ used, total, color, label }) {
  const radius   = 36;
  const circumference = 2 * Math.PI * radius;
  const pct      = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const offset   = circumference - (pct / 100) * circumference;
  const available = Math.max(0, total - used);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
          <circle
            cx="44" cy="44" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white">{available}</span>
          <span className="text-xs text-gray-400">/ {total}</span>
        </div>
      </div>
      <span className="text-xs text-center text-gray-600 dark:text-gray-400 leading-tight max-w-16">{label}</span>
    </div>
  );
}

CircularGauge.propTypes = {
  used:  PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

// ---------------------------------------------------------------------------
// Modal Nouvelle demande de congé
// ---------------------------------------------------------------------------

function LeaveRequestModal({ employee, availableDays, onClose }) {
  const { data, setData, post, processing, errors } = useForm({
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
      onSuccess: () => { toast.success('Demande de congé envoyée !'); onClose(); router.reload(); },
      onError:   (errs) => toast.error(Object.values(errs)[0]),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nouvelle demande de congé</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de congé</label>
            <select
              value={data.leave_type}
              onChange={e => setData('leave_type', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
            >
              {Object.entries(LEAVE_TYPES).map(([v, t]) => (
                <option key={v} value={v}>{t.label} ({availableDays[v] ?? 0} j dispo.)</option>
              ))}
            </select>
            {errors.leave_type && <p className="text-xs text-red-500 mt-1">{errors.leave_type}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date début</label>
              <input
                type="date"
                value={data.start_date}
                onChange={e => { setData('start_date', e.target.value); recalcDays(e.target.value, data.end_date); }}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
              {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date fin</label>
              <input
                type="date"
                value={data.end_date}
                min={data.start_date}
                onChange={e => { setData('end_date', e.target.value); recalcDays(data.start_date, e.target.value); }}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
              {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
            </div>
          </div>

          {/* Calcul jours */}
          {daysCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                {daysCount} jour{daysCount > 1 ? 's' : ''} ouvré{daysCount > 1 ? 's' : ''}
              </span>
              {availableDays[data.leave_type] < daysCount && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Solde insuffisant
                </span>
              )}
            </div>
          )}

          {/* Motif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif (optionnel)</label>
            <textarea
              value={data.reason}
              onChange={e => setData('reason', e.target.value)}
              rows={3}
              placeholder="Précisez le motif de votre absence…"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={processing || ! data.start_date || ! data.end_date}
              className="flex-1 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {processing ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

LeaveRequestModal.propTypes = {
  employee:      PropTypes.object.isRequired,
  availableDays: PropTypes.object.isRequired,
  onClose:       PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Onglet Informations
// ---------------------------------------------------------------------------

function TabInfos({ employee }) {
  const hireDate   = employee.hire_date ? format(new Date(employee.hire_date), 'dd MMMM yyyy', { locale: fr }) : '—';
  const seniority  = employee.hire_date ? differenceInYears(new Date(), new Date(employee.hire_date)) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Informations personnelles */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-500" /> Informations personnelles
        </h3>
        <dl className="space-y-3">
          {[
            { label: 'Matricule', value: employee.employee_number },
            { label: 'Email pro', value: employee.email, icon: Mail },
            { label: 'Téléphone', value: employee.phone || '—', icon: Phone },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 w-28">{label}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Poste et contrat */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-purple-500" /> Poste et contrat
        </h3>
        <dl className="space-y-3">
          {[
            { label: 'Poste', value: employee.position },
            { label: 'Département', value: employee.department?.name || '—' },
            { label: 'Contrat', value: CONTRACT_LABELS[employee.contract_type] || '—' },
            { label: 'Embauche', value: hireDate },
            { label: 'Ancienneté', value: seniority !== null ? `${seniority} an${seniority > 1 ? 's' : ''}` : '—' },
            { label: 'Manager', value: employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 w-28">{label}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Contact d'urgence */}
      {employee.emergency_contact && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-red-500" /> Contact d'urgence
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Nom</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">{employee.emergency_contact.name || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Téléphone</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">{employee.emergency_contact.phone || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Relation</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">{employee.emergency_contact.relation || '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Notes RH */}
      {employee.notes && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700 p-6">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Notes RH (confidentielles)
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 whitespace-pre-wrap">{employee.notes}</p>
        </div>
      )}
    </div>
  );
}

TabInfos.propTypes = { employee: PropTypes.object.isRequired };

// ---------------------------------------------------------------------------
// Onglet Congés
// ---------------------------------------------------------------------------

function TabConges({ employee, leaveBalance, availableDays, recentLeaves }) {
  const [showModal, setShowModal] = useState(false);

  const types = Object.entries(LEAVE_TYPES);

  return (
    <div className="space-y-6">
      {/* Soldes de congés */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Soldes de congés</h3>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Nouvelle demande
          </button>
        </div>
        <div className="flex flex-wrap justify-around gap-6">
          {types.map(([type, config]) => (
            <CircularGauge
              key={type}
              used={(leaveBalance[type] || 0) - (availableDays[type] || 0)}
              total={leaveBalance[type] || 0}
              color={config.color}
              label={config.label}
            />
          ))}
        </div>
      </div>

      {/* Historique des absences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Historique des absences (3 derniers mois)</h3>
        </div>
        {recentLeaves.length === 0 ? (
          <div className="py-12 text-center">
            <Coffee className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Aucune absence récente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentLeaves.map(leave => {
              const st     = LEAVE_STATUS[leave.status] || LEAVE_STATUS.pending;
              const Icon   = st.icon;
              const start  = format(new Date(leave.start_date), 'dd MMM yyyy', { locale: fr });
              const end    = format(new Date(leave.end_date), 'dd MMM yyyy', { locale: fr });

              return (
                <div key={leave.id} className={`flex items-center gap-4 px-5 py-4 ${st.bg}`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${st.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {LEAVE_TYPES[leave.leave_type]?.label || leave.leave_type}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {start} → {end} ({leave.days_count} j)
                    </p>
                    {leave.reason && <p className="text-xs text-gray-400 italic truncate mt-0.5">{leave.reason}</p>}
                  </div>
                  <span className={`text-xs font-medium ${st.color} flex-shrink-0`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <LeaveRequestModal employee={employee} availableDays={availableDays} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

TabConges.propTypes = {
  employee:      PropTypes.object.isRequired,
  leaveBalance:  PropTypes.object.isRequired,
  availableDays: PropTypes.object.isRequired,
  recentLeaves:  PropTypes.array.isRequired,
};

// ---------------------------------------------------------------------------
// Onglet Notes de frais
// ---------------------------------------------------------------------------

function TabFrais({ employee, expenseReports }) {
  const fmtAmount = (n) => new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(n) + ' FCFA';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">Notes de frais</h3>
        <Link
          href={route('rh.frais.store')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Nouvelle note
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {expenseReports.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Aucune note de frais</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Titre', 'Période', 'Lignes', 'Montant', 'Statut', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {expenseReports.map(report => {
                  const st     = EXPENSE_STATUS[report.status] || EXPENSE_STATUS.draft;
                  const total  = fmtAmount(report.items_sum_amount || 0);
                  const period = report.period_month
                    ? format(new Date(report.period_month + '-01'), 'MMMM yyyy', { locale: fr })
                    : '—';

                  return (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{report.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">{period}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{report.items_count}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{total}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={route('rh.frais.show', report.id)} className="text-purple-600 dark:text-purple-400 hover:underline text-xs">
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

TabFrais.propTypes = {
  employee:       PropTypes.object.isRequired,
  expenseReports: PropTypes.array.isRequired,
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'infos',   label: 'Informations',    icon: User     },
  { id: 'conges',  label: 'Congés & Absences', icon: Calendar },
  { id: 'frais',   label: 'Notes de frais',  icon: FileText },
  { id: 'docs',    label: 'Documents RH',    icon: Folder   },
];

export default function EmployeeFiche({ employee, leaveBalance, availableDays, recentLeaves, expenseReports }) {
  const [activeTab, setActiveTab] = useState('infos');
  const statusConfig = {
    active:   { label: 'Actif',    dot: 'bg-green-500' },
    inactive: { label: 'Inactif',  dot: 'bg-gray-400'  },
    on_leave: { label: 'En congé', dot: 'bg-amber-500' },
  }[employee.status] || { label: employee.status, dot: 'bg-gray-400' };

  return (
    <AuthLayout>
      <Head title={`${employee.first_name} ${employee.last_name} — RH`} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Retour */}
        <Link href={route('rh.employes.index')} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux employés
        </Link>

        {/* En-tête employé */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar grande taille */}
            <div className="w-20 h-20 rounded-2xl bg-purple-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
              {employee.avatar
                ? <img src={employee.avatar} alt="" className="w-full h-full object-cover" />
                : `${employee.first_name[0]}${employee.last_name[0]}`
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employee.first_name} {employee.last_name}
                </h1>
                <span className="flex items-center gap-1.5 text-sm">
                  <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                  <span className="text-gray-500 dark:text-gray-400">{statusConfig.label}</span>
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{employee.position}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                {employee.department && (
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {employee.department.name}</span>
                )}
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {CONTRACT_LABELS[employee.contract_type]}</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {employee.email}</span>
              </div>
            </div>

            <Link
              href={route('rh.employes.update', employee.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              <Edit className="w-4 h-4" /> Modifier
            </Link>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Contenu onglet */}
        {activeTab === 'infos'  && <TabInfos employee={employee} />}
        {activeTab === 'conges' && (
          <TabConges
            employee={employee}
            leaveBalance={leaveBalance}
            availableDays={availableDays}
            recentLeaves={recentLeaves}
          />
        )}
        {activeTab === 'frais'  && <TabFrais employee={employee} expenseReports={expenseReports} />}
        {activeTab === 'docs'   && (
          <div className="text-center py-16">
            <Folder className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Gestion documentaire</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Module GED — accéder aux documents de {employee.first_name}</p>
            <Link href={route('ged.index')} className="mt-4 inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline">
              Ouvrir la GED <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

EmployeeFiche.propTypes = {
  employee:       PropTypes.object.isRequired,
  leaveBalance:   PropTypes.object.isRequired,
  availableDays:  PropTypes.object.isRequired,
  recentLeaves:   PropTypes.array.isRequired,
  expenseReports: PropTypes.array.isRequired,
};
export { EmployeeFiche };
