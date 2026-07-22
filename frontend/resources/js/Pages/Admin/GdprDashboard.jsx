import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatRelative } from '@/utils/date';

const REQUEST_TYPE_LABELS = {
    access:        'Accès',
    rectification: 'Rectification',
    erasure:       'Effacement',
    portability:   'Portabilité',
    objection:     'Opposition',
};

const STATUS_COLORS = {
    pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    completed:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    rejected:   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const SEVERITY_COLORS = {
    low:      'bg-gray-100 text-gray-700',
    medium:   'bg-yellow-100 text-yellow-700',
    high:     'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
};

const LEGAL_BASIS_LABELS = {
    consent:              'Consentement (Art. 6.1.a)',
    contract:             'Exécution d\'un contrat (Art. 6.1.b)',
    legal_obligation:     'Obligation légale (Art. 6.1.c)',
    vital_interests:      'Intérêts vitaux (Art. 6.1.d)',
    public_task:          'Mission d\'intérêt public (Art. 6.1.e)',
    legitimate_interests: 'Intérêts légitimes (Art. 6.1.f)',
};

export default function GdprDashboard() {
    const [activeTab,  setActiveTab]  = useState('requests');
    const [kpis,       setKpis]       = useState(null);
    const [requests,   setRequests]   = useState([]);
    const [inventory,  setInventory]  = useState([]);
    const [policies,   setPolicies]   = useState([]);
    const [incidents,  setIncidents]  = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [toast,      setToast]      = useState(null);

    // Modals
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [showIncidentModal,  setShowIncidentModal]  = useState(false);

    useEffect(() => { fetchDashboard(); }, []);
    useEffect(() => {
        if (activeTab === 'requests')  fetchRequests();
        if (activeTab === 'inventory') fetchInventory();
        if (activeTab === 'retention') fetchPolicies();
        if (activeTab === 'incidents') fetchIncidents();
    }, [activeTab]);

    async function fetchDashboard() {
        const res = await fetch('/admin/gdpr/dashboard');
        const d   = await res.json();
        setKpis(d.kpis);
        setLoading(false);
    }

    async function fetchRequests() {
        const res = await fetch('/admin/gdpr/requests');
        const d   = await res.json();
        setRequests(d.data ?? []);
    }

    async function fetchInventory() {
        const res = await fetch('/admin/gdpr/inventory');
        const d   = await res.json();
        setInventory(d.processing_records ?? []);
    }

    async function fetchPolicies() {
        const res = await fetch('/admin/gdpr/retention');
        const d   = await res.json();
        setPolicies(d.data ?? []);
    }

    async function fetchIncidents() {
        const res = await fetch('/admin/gdpr/incidents');
        const d   = await res.json();
        setIncidents(d.data ?? []);
    }

    async function processRequest(id, action) {
        const res = await fetch(`/admin/gdpr/requests/${id}/process`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            body: JSON.stringify({ action }),
        });
        if (res.ok) {
            showToastMsg('success', 'Demande mise à jour.');
            fetchRequests();
            fetchDashboard();
        }
    }

    async function toggleAutoDelete(policy) {
        await fetch(`/admin/gdpr/retention/${policy.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            body: JSON.stringify({ auto_delete: !policy.auto_delete }),
        });
        fetchPolicies();
    }

    function showToastMsg(type, msg) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function csrfToken() {
        return document.querySelector('meta[name=csrf-token]')?.content ?? '';
    }

    const TABS = [
        { id: 'requests',  label: 'Demandes', badge: kpis?.pending_requests },
        { id: 'inventory', label: 'Registre Article 30' },
        { id: 'retention', label: 'Rétention' },
        { id: 'incidents', label: 'Incidents', badge: kpis?.open_incidents },
    ];

    return (
        <AppLayout>
            <Head title="Tableau de bord RGPD" />

            {toast && (
                <div className={`fixed top-4 right-4 z-50 rounded-lg px-5 py-3 shadow-lg text-sm font-medium
                    ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* En-tête */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>⚖️</span> Tableau de bord RGPD
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Conformité Règlement (UE) 2016/679 — Gestion des droits et traitements
                    </p>
                </div>

                {/* KPIs */}
                {kpis && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <KpiCard label="Demandes en attente" value={kpis.pending_requests}
                            color="yellow" alert={kpis.pending_requests > 0} />
                        <KpiCard label="Demandes hors délai" value={kpis.overdue_requests}
                            color="red" alert={kpis.overdue_requests > 0} />
                        <KpiCard label="Incidents ouverts" value={kpis.open_incidents}
                            color="orange" alert={kpis.open_incidents > 0} />
                        <KpiCard label="Traitements actifs" value={kpis.active_processings} color="blue" />
                        <KpiCard label="Politiques auto" value={kpis.active_policies} color="green" />
                    </div>
                )}

                {/* Alerte délai légal */}
                {kpis?.overdue_requests > 0 && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-5 py-4 flex items-start gap-3">
                        <span className="text-xl">🚨</span>
                        <div>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                {kpis.overdue_requests} demande(s) dépassent le délai légal de 30 jours !
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Le non-respect des délais RGPD expose l'organisation à des sanctions
                                pouvant atteindre 20 M€ ou 4 % du CA annuel mondial.
                            </p>
                        </div>
                    </div>
                )}

                {/* Onglets */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex gap-1 -mb-px" aria-label="Onglets RGPD">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                                    ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab.label}
                                {tab.badge > 0 && (
                                    <span className="ml-1 rounded-full bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Contenu onglets */}
                <div>
                    {/* Demandes */}
                    {activeTab === 'requests' && (
                        <div className="space-y-4">
                            {requests.length === 0 ? (
                                <EmptyState icon="📋" text="Aucune demande en cours." />
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                                            <tr>
                                                {['#', 'Type', 'Demandeur', 'Statut', 'Date', 'Délai légal', 'Actions'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                            {requests.map(r => (
                                                <tr key={r.id} className={r.is_overdue ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                                                    <td className="px-4 py-3 font-mono text-gray-400">#{r.id}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                        {REQUEST_TYPE_LABELS[r.type] ?? r.type}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-gray-900 dark:text-white">{r.subject_name}</p>
                                                        <p className="text-xs text-gray-400">{r.subject_email}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[r.status]}`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500">{formatDate(r.requested_at)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs font-semibold ${r.is_overdue ? 'text-red-600' : r.days_remaining > -5 ? 'text-yellow-600' : 'text-gray-500'}`}>
                                                            {r.is_overdue
                                                                ? `⚠️ Dépassé`
                                                                : `J-${Math.abs(r.days_remaining)} · ${r.deadline}`}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {r.status === 'pending' && (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => processRequest(r.id, 'complete')}
                                                                    className="text-xs text-green-600 hover:underline font-medium">
                                                                    Traiter
                                                                </button>
                                                                <button onClick={() => processRequest(r.id, 'reject')}
                                                                    className="text-xs text-red-600 hover:underline font-medium">
                                                                    Rejeter
                                                                </button>
                                                            </div>
                                                        )}
                                                        {r.status === 'processing' && (
                                                            <button onClick={() => processRequest(r.id, 'complete')}
                                                                className="text-xs text-blue-600 hover:underline font-medium">
                                                                Marquer terminée
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Registre Article 30 */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <button onClick={() => setShowInventoryModal(true)}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                                    + Nouveau traitement
                                </button>
                            </div>
                            {inventory.length === 0 ? (
                                <EmptyState icon="📄" text="Aucun traitement enregistré." />
                            ) : (
                                <div className="grid gap-4">
                                    {inventory.map(rec => (
                                        <div key={rec.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">{rec.name}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{rec.purpose}</p>
                                                </div>
                                                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-1 rounded-full whitespace-nowrap">
                                                    {LEGAL_BASIS_LABELS[rec.legal_basis] ?? rec.legal_basis}
                                                </span>
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-500">
                                                <div>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Catégories</span>
                                                    {(rec.data_categories ?? []).join(', ')}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Personnes concernées</span>
                                                    {(rec.data_subjects ?? []).join(', ')}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Rétention</span>
                                                    {rec.retention_period_days} jours
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Tiers destinataires</span>
                                                    {rec.third_parties?.length > 0 ? rec.third_parties.join(', ') : 'Aucun'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Politiques de rétention */}
                    {activeTab === 'retention' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Configurez les durées de conservation automatique. La purge automatique s'exécute le 1er de chaque mois à 3h.
                            </p>
                            {policies.length === 0 ? (
                                <EmptyState icon="🗂️" text="Aucune politique de rétention configurée." />
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                                            <tr>
                                                {['Type de données', 'Durée', 'Suppression auto', 'Dernier passage', 'Supprimés'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                            {policies.map(p => (
                                                <tr key={p.id}>
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                                                            {p.data_type}
                                                        </code>
                                                        {p.description && (
                                                            <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                        {p.retention_days} jours
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => toggleAutoDelete(p)}
                                                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${p.auto_delete ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                            aria-pressed={p.auto_delete}
                                                            aria-label={`Suppression auto ${p.data_type}`}
                                                        >
                                                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${p.auto_delete ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                                        {p.last_run_at ? formatDate(p.last_run_at) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {p.last_deleted_count ?? '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Incidents */}
                    {activeTab === 'incidents' && (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <button onClick={() => setShowIncidentModal(true)}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                                    + Déclarer un incident
                                </button>
                            </div>
                            {incidents.length === 0 ? (
                                <EmptyState icon="✅" text="Aucun incident déclaré." />
                            ) : (
                                <div className="space-y-4">
                                    {incidents.map(inc => (
                                        <div key={inc.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[inc.severity]}`}>
                                                            {inc.severity.toUpperCase()}
                                                        </span>
                                                        <span className="text-xs text-gray-400">#{inc.id}</span>
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">{inc.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{inc.description}</p>
                                                </div>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[inc.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {inc.status}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                                                <span>👥 {inc.affected_users_count} utilisateurs concernés</span>
                                                <span>🕐 Découvert le {formatDate(inc.discovered_at)}</span>
                                                <span className={inc.notified_authority ? 'text-green-600' : 'text-red-600'}>
                                                    {inc.notified_authority ? '✓ CNIL notifiée' : '⚠️ CNIL non notifiée'}
                                                </span>
                                                {['medium','high','critical'].includes(inc.severity) && !inc.notified_authority && (
                                                    <span className="text-red-600 font-semibold">
                                                        ⏰ Notification requise sous 72h !
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals (simplifié) */}
            {showInventoryModal && (
                <InventoryModal
                    onClose={() => setShowInventoryModal(false)}
                    onSave={() => { setShowInventoryModal(false); fetchInventory(); showToastMsg('success', 'Traitement ajouté.'); }}
                />
            )}
            {showIncidentModal && (
                <IncidentModal
                    onClose={() => setShowIncidentModal(false)}
                    onSave={() => { setShowIncidentModal(false); fetchIncidents(); fetchDashboard(); showToastMsg('success', 'Incident déclaré.'); }}
                />
            )}
        </AppLayout>
    );
}

function KpiCard({ label, value, color, alert }) {
    const colors = {
        yellow: 'text-yellow-600 dark:text-yellow-400',
        red:    'text-red-600 dark:text-red-400',
        orange: 'text-orange-600 dark:text-orange-400',
        blue:   'text-blue-600 dark:text-blue-400',
        green:  'text-green-600 dark:text-green-400',
    };
    return (
        <div className={`rounded-xl border p-4 bg-white dark:bg-gray-800
            ${alert ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
            <p className={`text-3xl font-bold ${colors[color]}`}>{value ?? '—'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
    );
}

function EmptyState({ icon, text }) {
    return (
        <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">{icon}</div>
            <p className="text-sm">{text}</p>
        </div>
    );
}

function InventoryModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        name: '', purpose: '', legal_basis: 'consent',
        data_categories: '', data_subjects: '', retention_period_days: 365,
    });
    const [saving, setSaving] = useState(false);

    async function save() {
        setSaving(true);
        const res = await fetch('/admin/gdpr/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' },
            body: JSON.stringify({
                ...form,
                data_categories: form.data_categories.split(',').map(s => s.trim()).filter(Boolean),
                data_subjects:   form.data_subjects.split(',').map(s => s.trim()).filter(Boolean),
            }),
        });
        setSaving(false);
        if (res.ok) onSave();
    }

    const legal_bases = [
        ['consent', 'Consentement (Art. 6.1.a)'],
        ['contract', 'Exécution d\'un contrat (Art. 6.1.b)'],
        ['legal_obligation', 'Obligation légale (Art. 6.1.c)'],
        ['vital_interests', 'Intérêts vitaux (Art. 6.1.d)'],
        ['public_task', 'Mission d\'intérêt public (Art. 6.1.e)'],
        ['legitimate_interests', 'Intérêts légitimes (Art. 6.1.f)'],
    ];

    return (
        <Modal title="Nouveau traitement (Article 30)" onClose={onClose}>
            <div className="space-y-4">
                <Field label="Nom du traitement" required>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                        className="input" placeholder="ex: Gestion des ressources humaines" />
                </Field>
                <Field label="Finalité" required>
                    <textarea value={form.purpose} onChange={e => setForm(p => ({...p, purpose: e.target.value}))}
                        rows={2} className="input" placeholder="Décrire l'objectif du traitement…" />
                </Field>
                <Field label="Base légale" required>
                    <select value={form.legal_basis} onChange={e => setForm(p => ({...p, legal_basis: e.target.value}))} className="input">
                        {legal_bases.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </Field>
                <Field label="Catégories de données (séparées par virgule)" required>
                    <input type="text" value={form.data_categories} onChange={e => setForm(p => ({...p, data_categories: e.target.value}))}
                        className="input" placeholder="identité, contact, financier" />
                </Field>
                <Field label="Personnes concernées (séparées par virgule)" required>
                    <input type="text" value={form.data_subjects} onChange={e => setForm(p => ({...p, data_subjects: e.target.value}))}
                        className="input" placeholder="salariés, clients, prospects" />
                </Field>
                <Field label="Durée de conservation (jours)" required>
                    <input type="number" value={form.retention_period_days} min={1}
                        onChange={e => setForm(p => ({...p, retention_period_days: +e.target.value}))} className="input" />
                </Field>
            </div>
            <ModalFooter onClose={onClose} onSave={save} saving={saving} />
        </Modal>
    );
}

function IncidentModal({ onClose, onSave }) {
    const [form, setForm] = useState({ title: '', description: '', severity: 'medium', affected_users_count: 0, discovered_at: new Date().toISOString().slice(0,16) });
    const [saving, setSaving] = useState(false);

    async function save() {
        setSaving(true);
        const res = await fetch('/admin/gdpr/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' },
            body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.ok) onSave();
    }

    return (
        <Modal title="Déclarer un incident de sécurité" onClose={onClose}>
            <div className="space-y-4">
                <Field label="Titre" required>
                    <input type="text" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} className="input" />
                </Field>
                <Field label="Description" required>
                    <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} className="input" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Gravité" required>
                        <select value={form.severity} onChange={e => setForm(p => ({...p, severity: e.target.value}))} className="input">
                            {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Utilisateurs affectés" required>
                        <input type="number" value={form.affected_users_count} min={0}
                            onChange={e => setForm(p => ({...p, affected_users_count: +e.target.value}))} className="input" />
                    </Field>
                </div>
                <Field label="Date de découverte" required>
                    <input type="datetime-local" value={form.discovered_at}
                        onChange={e => setForm(p => ({...p, discovered_at: e.target.value}))} className="input" />
                </Field>
                {['medium','high','critical'].includes(form.severity) && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 p-3 text-xs text-red-700 dark:text-red-300">
                        ⏰ Obligation de notification à la CNIL sous 72h (Art. 33 RGPD)
                    </div>
                )}
            </div>
            <ModalFooter onClose={onClose} onSave={save} saving={saving} saveLabel="Déclarer" />
        </Modal>
    );
}

function Modal({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children, required }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
        </div>
    );
}

function ModalFooter({ onClose, onSave, saving, saveLabel = 'Enregistrer' }) {
    return (
        <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Annuler
            </button>
            <button onClick={onSave} disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Enregistrement…' : saveLabel}
            </button>
        </div>
    );
}
