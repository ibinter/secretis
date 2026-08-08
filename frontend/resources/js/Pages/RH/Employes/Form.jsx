/**
 * RH/Employes/Form.jsx — création et édition d'une fiche employé.
 *
 * Écran manquant jusqu'ici : les boutons « Nouvel employé » / « Modifier »
 * pointaient vers des routes POST/PUT utilisées en GET, donc sans effet.
 * Champs alignés sur la validation de EmployeeController@store/update
 * (colonnes réelles : job_title, termination_date, leave_balance).
 */

import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { UserPlus, Save, ArrowLeft, Briefcase, CalendarDays, Wallet } from 'lucide-react';
import {
    PageHeader, Button, Card, cx,
    CONTROL, TEXT_MUTED, TEXT_FAINT,
} from '@/Components/UI';

const CONTRACTS = [
    { value: 'cdi',        label: 'CDI' },
    { value: 'cdd',        label: 'CDD' },
    { value: 'internship', label: 'Stage' },
    { value: 'freelance',  label: 'Prestataire' },
    { value: 'other',      label: 'Autre' },
];

const STATUSES = [
    { value: 'active',     label: 'Actif' },
    { value: 'on_leave',   label: 'En congé' },
    { value: 'suspended',  label: 'Suspendu' },
    { value: 'terminated', label: 'Sorti des effectifs' },
];

const LEAVE_TYPES = [
    { key: 'annual',    label: 'Congés annuels' },
    { key: 'sick',      label: 'Maladie' },
    { key: 'maternity', label: 'Maternité' },
    { key: 'unpaid',    label: 'Sans solde' },
    { key: 'recovery',  label: 'Récupération' },
];

function Field({ label, required, error, hint, children }) {
    return (
        <div>
            <label className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && !error && <p className={cx('mt-1 text-[11px]', TEXT_FAINT)}>{hint}</p>}
            {error && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

export default function EmployeeForm({ employee = null, departments = [], managers = [], users = [] }) {
    const isEdit = Boolean(employee?.id);
    const [tab, setTab] = useState('identite');

    const { data, setData, post, put, processing, errors } = useForm({
        first_name:       employee?.first_name ?? '',
        last_name:        employee?.last_name ?? '',
        email:            employee?.email ?? '',
        phone:            employee?.phone ?? '',
        employee_number:  employee?.employee_number ?? '',
        job_title:        employee?.job_title ?? '',
        contract_type:    employee?.contract_type ?? 'cdi',
        status:           employee?.status ?? 'active',
        department_id:    employee?.department_id ?? '',
        manager_id:       employee?.manager_id ?? '',
        user_id:          employee?.user_id ?? '',
        hire_date:        employee?.hire_date?.slice(0, 10) ?? '',
        termination_date: employee?.termination_date?.slice(0, 10) ?? '',
        leave_balance:    employee?.leave_balance ?? { annual: 30, sick: 15, maternity: 0, unpaid: 0, recovery: 0 },
        notes:            employee?.notes ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('rh.employes.update', employee.id));
        } else {
            post(route('rh.employes.store'));
        }
    };

    const setBalance = (key, value) =>
        setData('leave_balance', { ...data.leave_balance, [key]: Number(value) || 0 });

    const TABS = [
        { key: 'identite', label: 'Identité',  icon: UserPlus },
        { key: 'poste',    label: 'Poste',     icon: Briefcase },
        { key: 'conges',   label: 'Congés',    icon: Wallet },
    ];

    return (
        <AppLayout>
            <Head title={isEdit ? 'Modifier un employé' : 'Nouvel employé'} />

            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
                <PageHeader
                    icon={UserPlus}
                    title={isEdit ? `${employee.first_name} ${employee.last_name}` : 'Nouvel employé'}
                    subtitle={isEdit ? 'Modifier la fiche du collaborateur' : 'Créer une fiche collaborateur'}
                    breadcrumbs={[
                        { label: 'Ressources humaines', href: '/rh' },
                        { label: 'Personnel', href: '/rh/personnel' },
                        { label: isEdit ? 'Modifier' : 'Nouveau' },
                    ]}
                    actions={
                        <Button variant="secondary" icon={ArrowLeft} href="/rh/personnel">
                            Retour
                        </Button>
                    }
                />

                {/* Onglets */}
                <div className="mb-5 flex gap-1">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={cx(
                                'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors',
                                tab === key
                                    ? 'bg-purple-600 text-white'
                                    : cx('hover:bg-gray-100 dark:hover:bg-gray-800', TEXT_MUTED),
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit}>
                    {tab === 'identite' && (
                        <Card title="Identité" subtitle="Informations personnelles du collaborateur">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Prénom" required error={errors.first_name}>
                                    <input className={CONTROL} value={data.first_name}
                                           onChange={e => setData('first_name', e.target.value)} />
                                </Field>
                                <Field label="Nom" required error={errors.last_name}>
                                    <input className={CONTROL} value={data.last_name}
                                           onChange={e => setData('last_name', e.target.value)} />
                                </Field>
                                <Field label="Email professionnel" required error={errors.email}>
                                    <input type="email" className={CONTROL} value={data.email}
                                           onChange={e => setData('email', e.target.value)} />
                                </Field>
                                <Field label="Téléphone" error={errors.phone}>
                                    <input className={CONTROL} value={data.phone}
                                           onChange={e => setData('phone', e.target.value)} />
                                </Field>
                                <Field label="Matricule" required error={errors.employee_number}
                                       hint="Identifiant unique dans l'organisation">
                                    <input className={CONTROL} value={data.employee_number}
                                           onChange={e => setData('employee_number', e.target.value)} />
                                </Field>
                                <Field label="Compte utilisateur lié" error={errors.user_id}
                                       hint="Facultatif : permet l'accès à l'ERP">
                                    <select className={CONTROL} value={data.user_id}
                                            onChange={e => setData('user_id', e.target.value)}>
                                        <option value="">Aucun</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </Card>
                    )}

                    {tab === 'poste' && (
                        <Card title="Poste et contrat" subtitle="Rattachement hiérarchique et conditions">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Intitulé du poste" required error={errors.job_title}>
                                    <input className={CONTROL} value={data.job_title}
                                           onChange={e => setData('job_title', e.target.value)} />
                                </Field>
                                <Field label="Type de contrat" required error={errors.contract_type}>
                                    <select className={CONTROL} value={data.contract_type}
                                            onChange={e => setData('contract_type', e.target.value)}>
                                        {CONTRACTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </Field>
                                <Field label="Service" error={errors.department_id}>
                                    <select className={CONTROL} value={data.department_id}
                                            onChange={e => setData('department_id', e.target.value)}>
                                        <option value="">Non affecté</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Responsable (N+1)" error={errors.manager_id}
                                       hint="Structure l'organigramme">
                                    <select className={CONTROL} value={data.manager_id}
                                            onChange={e => setData('manager_id', e.target.value)}>
                                        <option value="">Aucun</option>
                                        {managers.map(m => (
                                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Date d'embauche" required error={errors.hire_date}>
                                    <input type="date" className={cx(CONTROL, 'tabular-nums')} value={data.hire_date}
                                           onChange={e => setData('hire_date', e.target.value)} />
                                </Field>
                                <Field label="Date de fin de contrat" error={errors.termination_date}
                                       hint="À renseigner pour un CDD ou un départ">
                                    <input type="date" className={cx(CONTROL, 'tabular-nums')} value={data.termination_date}
                                           onChange={e => setData('termination_date', e.target.value)} />
                                </Field>
                                <Field label="Statut" required error={errors.status}>
                                    <select className={CONTROL} value={data.status}
                                            onChange={e => setData('status', e.target.value)}>
                                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </Card>
                    )}

                    {tab === 'conges' && (
                        <Card title="Soldes de congés" subtitle="Nombre de jours acquis par type"
                              icon={CalendarDays}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {LEAVE_TYPES.map(({ key, label }) => (
                                    <Field key={key} label={label}>
                                        <input
                                            type="number" min="0"
                                            className={cx(CONTROL, 'tabular-nums')}
                                            value={data.leave_balance?.[key] ?? 0}
                                            onChange={e => setBalance(key, e.target.value)}
                                        />
                                    </Field>
                                ))}
                            </div>
                            <div className="mt-4">
                                <Field label="Notes RH" hint="Visible uniquement par les gestionnaires RH">
                                    <textarea
                                        rows={4}
                                        className={cx(CONTROL, 'h-auto py-2')}
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                    />
                                </Field>
                            </div>
                        </Card>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-2">
                        <Button variant="secondary" href="/rh/personnel">Annuler</Button>
                        <Button type="submit" icon={Save} loading={processing}>
                            {isEdit ? 'Enregistrer les modifications' : 'Créer la fiche'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
