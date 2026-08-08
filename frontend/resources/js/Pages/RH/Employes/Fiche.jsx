/**
 * RH/Employes/Fiche.jsx — Fiche complète d'un employé
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * La logique métier est strictement inchangée : mêmes props Inertia, mêmes
 * noms de routes (`rh.employes.*`, `rh.conges.store`, `rh.frais.*`, `ged.index`).
 *
 * Onglets :
 *   1. Informations    — identité, poste, contrat, contacts d'urgence
 *   2. Congés          — solde par type (jauge circulaire), historique, nouvelle demande
 *   3. Notes de frais  — tableau avec statuts
 *   4. Documents RH    — (renvoi vers le module GED)
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
  Phone, Mail, Briefcase, Building2,
  Edit, CheckCircle2, XCircle, Clock, AlertCircle, Ban,
  PlusCircle, Coffee, ChevronRight, X,
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatAmount } from '@/hooks/useCurrency';
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, SURFACE, SURFACE_SUNK, BORDER, DIVIDE, CONTROL,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM, FOCUS_RING,
} from '@/Components/UI';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const CONTRACT_LABELS = {
  cdi: 'CDI', cdd: 'CDD', internship: 'Stage', freelance: 'Freelance', other: 'Autre',
};

const CONTRACT_TONE = {
  cdi: 'info', cdd: 'warning', internship: 'accent', freelance: 'success', other: 'neutral',
};

/** `color` sert au tracé SVG des jauges — palette sobre, sans dégradé. */
const LEAVE_TYPES = {
  annual:    { label: 'Congé annuel',        color: '#0284C7' },
  sick:      { label: 'Congé maladie',       color: '#D97706' },
  maternity: { label: 'Maternité/Paternité', color: '#9333EA' },
  unpaid:    { label: 'Sans solde',          color: '#6B7280' },
  recovery:  { label: 'Récupération',        color: '#059669' },
};

/** Les 5 états du workflow congés à deux niveaux. */
const LEAVE_STATUS = {
  pending:     { label: 'En attente',   tone: 'warning', icon: Clock },
  approved_n1: { label: 'Approuvé N+1', tone: 'info',    icon: CheckCircle2 },
  approved_hr: { label: 'Validé RH',    tone: 'success', icon: CheckCircle2 },
  rejected:    { label: 'Refusé',       tone: 'danger',  icon: XCircle },
  cancelled:   { label: 'Annulé',       tone: 'neutral', icon: Ban },
};

const EXPENSE_STATUS = {
  draft:     { label: 'Brouillon', tone: 'neutral' },
  submitted: { label: 'Soumise',   tone: 'warning' },
  approved:  { label: 'Approuvée', tone: 'info'    },
  rejected:  { label: 'Refusée',   tone: 'danger'  },
  paid:      { label: 'Payée',     tone: 'success' },
};

const EMPLOYEE_STATUS = {
  active:   { label: 'Actif',    tone: 'success' },
  inactive: { label: 'Inactif',  tone: 'neutral' },
  on_leave: { label: 'En congé', tone: 'warning' },
};

const money = (n) => formatAmount(Number(n ?? 0), 'XOF', 'fr');

// ---------------------------------------------------------------------------
// Jauge circulaire SVG
// ---------------------------------------------------------------------------

function CircularGauge({ used, total, color, label }) {
  const radius        = 36;
  const circumference = 2 * Math.PI * radius;
  const pct           = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const offset        = circumference - (pct / 100) * circumference;
  const available     = Math.max(0, total - used);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90" role="img"
             aria-label={`${label} : ${available} jours disponibles sur ${total}`}>
          <circle cx="44" cy="44" r={radius} fill="none" strokeWidth="8"
                  className="stroke-gray-200 dark:stroke-[#1E3048]" />
          <circle
            cx="44" cy="44" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cx('text-lg font-semibold', TEXT_TITLE, NUM)}>{available}</span>
          <span className={cx('text-xs', TEXT_FAINT, NUM)}>/ {total}</span>
        </div>
      </div>
      <span className={cx('max-w-20 text-center text-xs leading-tight', TEXT_MUTED)}>{label}</span>
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

  const insufficient = daysCount > 0 && (availableDays[data.leave_type] ?? 0) < daysCount;

  const fieldError = (msg) => msg
    ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{msg}</p>
    : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <Card
          className="shadow-xl"
          title="Nouvelle demande de congé"
          subtitle={`Pour ${employee.first_name} ${employee.last_name}`}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button type="submit" variant="primary" loading={processing}
                      disabled={! data.start_date || ! data.end_date}>
                Envoyer la demande
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Type */}
            <div>
              <label htmlFor="fiche-leave-type" className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
                Type de congé
              </label>
              <select
                id="fiche-leave-type"
                value={data.leave_type}
                onChange={e => setData('leave_type', e.target.value)}
                className={cx(CONTROL, 'h-10')}
              >
                {Object.entries(LEAVE_TYPES).map(([v, t]) => (
                  <option key={v} value={v}>{t.label} ({availableDays[v] ?? 0} j dispo.)</option>
                ))}
              </select>
              {fieldError(errors.leave_type)}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fiche-start" className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
                  Date de début
                </label>
                <input
                  id="fiche-start"
                  type="date"
                  value={data.start_date}
                  onChange={e => { setData('start_date', e.target.value); recalcDays(e.target.value, data.end_date); }}
                  className={cx(CONTROL, 'h-10', NUM)}
                />
                {fieldError(errors.start_date)}
              </div>
              <div>
                <label htmlFor="fiche-end" className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
                  Date de fin
                </label>
                <input
                  id="fiche-end"
                  type="date"
                  value={data.end_date}
                  min={data.start_date}
                  onChange={e => { setData('end_date', e.target.value); recalcDays(data.start_date, e.target.value); }}
                  className={cx(CONTROL, 'h-10', NUM)}
                />
                {fieldError(errors.end_date)}
              </div>
            </div>

            {/* Calcul des jours */}
            {daysCount > 0 && (
              <div className={cx(
                'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
                insufficient
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                  : cx(BORDER, SURFACE_SUNK, TEXT_BODY),
              )}>
                <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={cx('font-medium', NUM)}>
                  {daysCount} jour{daysCount > 1 ? 's' : ''} ouvré{daysCount > 1 ? 's' : ''}
                </span>
                {insufficient && (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Solde insuffisant
                  </span>
                )}
              </div>
            )}

            {/* Motif */}
            <div>
              <label htmlFor="fiche-reason" className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
                Motif (optionnel)
              </label>
              <textarea
                id="fiche-reason"
                value={data.reason}
                onChange={e => setData('reason', e.target.value)}
                rows={3}
                placeholder="Précisez le motif de votre absence…"
                className={cx(CONTROL, 'resize-none')}
              />
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

LeaveRequestModal.propTypes = {
  employee:      PropTypes.object.isRequired,
  availableDays: PropTypes.object.isRequired,
  onClose:       PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Ligne « libellé / valeur »
// ---------------------------------------------------------------------------

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className={cx('w-32 shrink-0 text-sm', TEXT_MUTED)}>{label}</dt>
      <dd className={cx('min-w-0 text-right text-sm font-medium', TEXT_TITLE)}>{children}</dd>
    </div>
  );
}

const orDash = (v) => (v || v === 0 ? v : <span className={TEXT_FAINT}>—</span>);

// ---------------------------------------------------------------------------
// Onglet Informations
// ---------------------------------------------------------------------------

function TabInfos({ employee }) {
  const hireDate  = employee.hire_date ? format(new Date(employee.hire_date), 'dd MMMM yyyy', { locale: fr }) : null;
  const seniority = employee.hire_date ? differenceInYears(new Date(), new Date(employee.hire_date)) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

      <Card icon={User} title="Informations personnelles">
        <dl className={cx('divide-y', DIVIDE)}>
          <Row label="Matricule"><span className={NUM}>{orDash(employee.employee_number)}</span></Row>
          <Row label="Email pro">
            {employee.email ? (
              <a href={`mailto:${employee.email}`}
                 className={cx('inline-flex items-center gap-1.5 rounded transition-colors',
                   'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING)}>
                <Mail className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                {employee.email}
              </a>
            ) : orDash(null)}
          </Row>
          <Row label="Téléphone">
            {employee.phone ? (
              <span className={cx('inline-flex items-center gap-1.5', NUM)}>
                <Phone className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                {employee.phone}
              </span>
            ) : orDash(null)}
          </Row>
        </dl>
      </Card>

      <Card icon={Briefcase} title="Poste et contrat">
        <dl className={cx('divide-y', DIVIDE)}>
          <Row label="Poste">{orDash(employee.position)}</Row>
          <Row label="Département">{orDash(employee.department?.name)}</Row>
          <Row label="Contrat">
            <Badge variant={CONTRACT_TONE[employee.contract_type] ?? 'neutral'}>
              {CONTRACT_LABELS[employee.contract_type] || 'N/A'}
            </Badge>
          </Row>
          <Row label="Embauche"><span className={NUM}>{orDash(hireDate)}</span></Row>
          <Row label="Ancienneté">
            <span className={NUM}>
              {seniority !== null ? `${seniority} an${seniority > 1 ? 's' : ''}` : orDash(null)}
            </span>
          </Row>
          <Row label="Manager">
            {employee.manager
              ? `${employee.manager.first_name} ${employee.manager.last_name}`
              : orDash(null)}
          </Row>
        </dl>
      </Card>

      {employee.emergency_contact && (
        <Card icon={Phone} title="Contact d'urgence">
          <dl className={cx('divide-y', DIVIDE)}>
            <Row label="Nom">{orDash(employee.emergency_contact.name)}</Row>
            <Row label="Téléphone">
              <span className={NUM}>{orDash(employee.emergency_contact.phone)}</span>
            </Row>
            <Row label="Relation">{orDash(employee.emergency_contact.relation)}</Row>
          </dl>
        </Card>
      )}

      {employee.notes && (
        <Card title="Notes RH (confidentielles)">
          <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <p className="whitespace-pre-wrap text-sm text-amber-800 dark:text-amber-200">{employee.notes}</p>
          </div>
        </Card>
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

  const types  = Object.entries(LEAVE_TYPES);
  const leaves = recentLeaves ?? [];

  return (
    <div className="space-y-6">

      {/* Soldes de congés */}
      <Card
        title="Soldes de congés"
        subtitle="Jours restants par type, sur le solde annuel attribué."
        actions={
          <Button variant="primary" icon={PlusCircle} onClick={() => setShowModal(true)}>
            Nouvelle demande
          </Button>
        }
      >
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
      </Card>

      {/* Historique des absences */}
      <Card padded={false} title="Historique des absences" subtitle="Trois derniers mois">
        {leaves.length === 0 ? (
          <EmptyState
            icon={Coffee}
            title="Aucune absence récente"
            description="Aucun congé n'a été posé sur les trois derniers mois."
            action={
              <Button variant="secondary" icon={PlusCircle} onClick={() => setShowModal(true)}>
                Poser une demande
              </Button>
            }
          />
        ) : (
          <ul className={cx('divide-y', DIVIDE)}>
            {leaves.map(leave => {
              const st    = LEAVE_STATUS[leave.status] || LEAVE_STATUS.pending;
              const Icon  = st.icon;
              const start = leave.start_date ? format(new Date(leave.start_date), 'dd MMM yyyy', { locale: fr }) : '—';
              const end   = leave.end_date   ? format(new Date(leave.end_date),   'dd MMM yyyy', { locale: fr }) : '—';

              return (
                <li key={leave.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                  <Icon
                    className={cx('mt-0.5 h-4 w-4 shrink-0', {
                      warning: 'text-amber-600 dark:text-amber-400',
                      info:    'text-sky-600 dark:text-sky-400',
                      success: 'text-emerald-600 dark:text-emerald-400',
                      danger:  'text-red-600 dark:text-red-400',
                      neutral: TEXT_FAINT,
                    }[st.tone])}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-sm font-medium', TEXT_TITLE)}>
                      {LEAVE_TYPES[leave.leave_type]?.label || leave.leave_type}
                    </p>
                    <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                      {start} → {end} ({leave.days_count} j)
                    </p>
                    {leave.reason && (
                      <p className={cx('mt-0.5 truncate text-xs italic', TEXT_FAINT)}>« {leave.reason} »</p>
                    )}
                  </div>
                  <Badge variant={st.tone}>{st.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

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
  recentLeaves:  PropTypes.array,
};

// ---------------------------------------------------------------------------
// Onglet Notes de frais
// ---------------------------------------------------------------------------

function TabFrais({ expenseReports }) {
  const reports = expenseReports ?? [];

  return (
    <Card
      padded={false}
      title="Notes de frais"
      subtitle={`${reports.length} note${reports.length > 1 ? 's' : ''}`}
      actions={
        <Button as={Link} href={route('rh.frais.store')} variant="primary" icon={PlusCircle}>
          Nouvelle note
        </Button>
      }
    >
      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune note de frais"
          description="Les dépenses professionnelles déclarées par ce collaborateur apparaîtront ici."
          action={
            <Button as={Link} href={route('rh.frais.store')} variant="primary" icon={PlusCircle}>
              Créer une note
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className={cx(SURFACE_SUNK, 'border-b', BORDER)}>
              <tr>
                <th scope="col" className={cx('px-4 py-3 text-left', TH)}>Titre</th>
                <th scope="col" className={cx('px-4 py-3 text-left whitespace-nowrap', TH)}>Période</th>
                <th scope="col" className={cx('px-4 py-3 text-right whitespace-nowrap', TH)}>Lignes</th>
                <th scope="col" className={cx('px-4 py-3 text-right whitespace-nowrap', TH)}>Montant</th>
                <th scope="col" className={cx('px-4 py-3 text-left whitespace-nowrap', TH)}>Statut</th>
                <th scope="col" className={cx('px-4 py-3 text-right', TH)}>Actions</th>
              </tr>
            </thead>
            <tbody className={cx('divide-y', DIVIDE)}>
              {reports.map(report => {
                const st     = EXPENSE_STATUS[report.status] || EXPENSE_STATUS.draft;
                const period = report.period_month
                  ? format(new Date(report.period_month + '-01'), 'MMMM yyyy', { locale: fr })
                  : null;

                return (
                  <tr key={report.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                    <td className={cx('px-4 py-3 font-medium', TEXT_TITLE)}>{report.title}</td>
                    <td className={cx('px-4 py-3 capitalize whitespace-nowrap', TEXT_MUTED, NUM)}>
                      {period ?? <span className={TEXT_FAINT}>—</span>}
                    </td>
                    <td className={cx('px-4 py-3 text-right', TEXT_BODY, NUM)}>{report.items_count}</td>
                    <td className={cx('px-4 py-3 text-right font-medium whitespace-nowrap', TEXT_TITLE, NUM)}>
                      {money(report.items_sum_amount || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={st.tone}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button as={Link} href={route('rh.frais.show', report.id)} variant="ghost" size="sm">
                        Voir
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

TabFrais.propTypes = {
  expenseReports: PropTypes.array,
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'infos',  label: 'Informations',      icon: User     },
  { id: 'conges', label: 'Congés & Absences', icon: Calendar },
  { id: 'frais',  label: 'Notes de frais',    icon: FileText },
  { id: 'docs',   label: 'Documents RH',      icon: Folder   },
];

export default function EmployeeFiche({ employee, leaveBalance, availableDays, recentLeaves, expenseReports }) {
  const [activeTab, setActiveTab] = useState('infos');

  const status   = EMPLOYEE_STATUS[employee.status] ?? { label: employee.status, tone: 'neutral' };
  const initials = `${employee.first_name?.[0] ?? ''}${employee.last_name?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <AuthLayout>
      <Head title={`${employee.first_name} ${employee.last_name} — RH`} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          title={`${employee.first_name} ${employee.last_name}`}
          breadcrumbs={[
            { label: 'Ressources Humaines', href: route('rh.index') },
            { label: 'Personnel', href: route('rh.employes.index') },
            { label: `${employee.first_name} ${employee.last_name}` },
          ]}
          subtitle={employee.position}
          meta={
            <>
              <Badge variant={status.tone} size="md" dot>{status.label}</Badge>
              <Badge variant={CONTRACT_TONE[employee.contract_type] ?? 'neutral'} size="md">
                {CONTRACT_LABELS[employee.contract_type] || 'N/A'}
              </Badge>
              {employee.department && (
                <span className={cx('inline-flex items-center gap-1.5 text-sm', TEXT_MUTED)}>
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {employee.department.name}
                </span>
              )}
              {employee.email && (
                <a href={`mailto:${employee.email}`}
                   className={cx('inline-flex items-center gap-1.5 rounded text-sm transition-colors',
                     TEXT_MUTED, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING)}>
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {employee.email}
                </a>
              )}
            </>
          }
          actions={
            <>
              <Button as={Link} href={route('rh.employes.edit', employee.id)} variant="secondary" icon={Edit}>
                Modifier
              </Button>
              <Button as={Link} href={route('rh.employes.index')} variant="ghost" icon={ArrowLeft}>
                Retour
              </Button>
            </>
          }
        />

        {/* Bandeau identité */}
        <div className={cx('mb-6 flex items-center gap-4 rounded-xl border p-4 shadow-sm', SURFACE, BORDER)}>
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-purple-50 text-xl font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
            {employee.avatar
              ? <img src={employee.avatar} alt="" className="h-full w-full object-cover" />
              : initials}
          </span>
          <div className="min-w-0">
            <p className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>
              {employee.first_name} {employee.last_name}
            </p>
            <p className={cx('truncate text-xs', TEXT_MUTED)}>
              {employee.position || <span className={TEXT_FAINT}>Poste non renseigné</span>}
            </p>
            {employee.employee_number && (
              <p className={cx('truncate text-xs', TEXT_FAINT, NUM)}>Matricule {employee.employee_number}</p>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className={cx('mb-6 flex gap-1 overflow-x-auto rounded-xl border p-1', SURFACE_SUNK, BORDER)}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={cx(
                  'inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors',
                  isActive
                    ? cx(SURFACE, 'text-purple-700 shadow-sm dark:text-purple-300')
                    : cx(TEXT_MUTED, 'hover:text-gray-800 dark:hover:text-gray-200'),
                  FOCUS_RING,
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenu de l'onglet */}
        {activeTab === 'infos'  && <TabInfos employee={employee} />}
        {activeTab === 'conges' && (
          <TabConges
            employee={employee}
            leaveBalance={leaveBalance}
            availableDays={availableDays}
            recentLeaves={recentLeaves}
          />
        )}
        {activeTab === 'frais'  && <TabFrais expenseReports={expenseReports} />}
        {activeTab === 'docs'   && (
          <Card padded={false}>
            <EmptyState
              icon={Folder}
              title="Documents RH"
              description={`Les pièces administratives de ${employee.first_name} sont conservées dans la gestion électronique de documents.`}
              hints={[
                'Contrats, avenants, attestations et bulletins y sont classés.',
                "L'accès reste soumis aux droits du module GED.",
              ]}
              action={
                <Button as={Link} href={route('ged.index')} variant="primary" iconRight={ChevronRight}>
                  Ouvrir la GED
                </Button>
              }
            />
          </Card>
        )}
      </div>
    </AuthLayout>
  );
}

EmployeeFiche.propTypes = {
  employee:       PropTypes.object.isRequired,
  leaveBalance:   PropTypes.object.isRequired,
  availableDays:  PropTypes.object.isRequired,
  recentLeaves:   PropTypes.array,
  expenseReports: PropTypes.array,
};
export { EmployeeFiche };
