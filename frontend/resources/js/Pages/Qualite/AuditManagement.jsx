import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

const AUDIT_TYPE_LABELS = {
    interne:       'Interne',
    externe:       'Externe',
    certification: 'Certification',
    fournisseur:   'Fournisseur',
    surveillance:  'Surveillance',
};

const STATUS_BADGE = {
    planifie:            'bg-gray-100 text-gray-700',
    en_cours:            'bg-purple-100 text-purple-700',
    rapport_en_attente:  'bg-yellow-100 text-yellow-700',
    clos:                'bg-green-100 text-green-700',
};

const STATUS_LABELS = {
    planifie:            'Planifié',
    en_cours:            'En cours',
    rapport_en_attente:  'Rapport en attente',
    clos:                'Clos',
};

// ─── Formulaire de planification ──────────────────────────────────────────────
function AuditForm({ onClose, onSuccess }) {
    const [form, setForm] = useState({
        title:            '',
        audit_type:       'interne',
        scope:            '',
        auditor_name:     '',
        audit_date_start: '',
        audit_date_end:   '',
        next_audit_date:  '',
    });
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/qualite/audits', form);
            onSuccess();
            onClose();
        } catch {
            alert('Erreur lors de la création de l\'audit.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-semibold text-gray-900">Planifier un audit</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Titre *</label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="Ex: Audit interne processus achats"
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type d'audit *</label>
                        <select
                            value={form.audit_type}
                            onChange={e => setForm({ ...form, audit_type: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                        >
                            {Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Périmètre / Scope</label>
                        <textarea
                            value={form.scope}
                            onChange={e => setForm({ ...form, scope: e.target.value })}
                            rows={2}
                            placeholder="Processus audités, clauses ISO concernées..."
                            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Auditeur</label>
                        <input
                            type="text"
                            value={form.auditor_name}
                            onChange={e => setForm({ ...form, auditor_name: e.target.value })}
                            placeholder="Nom de l'auditeur ou organisme"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
                            <input
                                type="date"
                                value={form.audit_date_start}
                                onChange={e => setForm({ ...form, audit_date_start: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
                            <input
                                type="date"
                                value={form.audit_date_end}
                                onChange={e => setForm({ ...form, audit_date_end: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Prochain audit prévu</label>
                        <input
                            type="date"
                            value={form.next_audit_date}
                            onChange={e => setForm({ ...form, next_audit_date: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                        >
                            {loading ? 'Création...' : 'Planifier l\'audit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Panel constatations ──────────────────────────────────────────────────────
function FindingPanel({ audit, onClose, onAdded }) {
    const [form, setForm] = useState({
        finding_type: 'observation',
        clause_iso:   '',
        description:  '',
        evidence:     '',
        risk_level:   'moyen',
        create_nc:    false,
    });
    const [checklist, setChecklist] = useState([]);
    const [loading, setLoading]     = useState(false);

    const loadChecklist = async (clause) => {
        if (!clause) return;
        try {
            const { data } = await axios.get(`/qualite/audits/${audit.id}/checklist?clause=${clause}`);
            setChecklist(data.questions);
        } catch {
            setChecklist([]);
        }
    };

    const submit = async () => {
        if (!form.description) return;
        setLoading(true);
        try {
            await axios.post(`/qualite/audits/${audit.id}/findings`, form);
            onAdded();
            setForm({ finding_type: 'observation', clause_iso: '', description: '', evidence: '', risk_level: 'moyen', create_nc: false });
        } catch {
            alert('Erreur.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Ajouter une constatation</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type de constatation</label>
                        <div className="flex gap-2">
                            {[
                                { key: 'nonconformite',  label: 'Non-conformité', color: 'red' },
                                { key: 'observation',    label: 'Observation',    color: 'yellow' },
                                { key: 'point_positif',  label: 'Point positif',  color: 'green' },
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setForm({ ...form, finding_type: t.key })}
                                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition
                                        ${form.finding_type === t.key
                                            ? `bg-${t.color}-100 text-${t.color}-700 border-${t.color}-300`
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Clause ISO 9001</label>
                            <input
                                type="text"
                                value={form.clause_iso}
                                onChange={e => { setForm({ ...form, clause_iso: e.target.value }); loadChecklist(e.target.value); }}
                                placeholder="Ex: 8.3, 9.1..."
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Niveau de risque</label>
                            <select
                                value={form.risk_level}
                                onChange={e => setForm({ ...form, risk_level: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="faible">Faible</option>
                                <option value="moyen">Moyen</option>
                                <option value="eleve">Élevé</option>
                            </select>
                        </div>
                    </div>

                    {/* Checklist ISO auto */}
                    {checklist.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-3 space-y-1">
                            <p className="text-xs font-semibold text-purple-700 mb-2">Questions de référence (clause {form.clause_iso})</p>
                            {checklist.map((q, i) => (
                                <p key={i} className="text-xs text-purple-600">• {q}</p>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={3}
                            placeholder="Décrire la constatation..."
                            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Preuve / Évidence</label>
                        <textarea
                            value={form.evidence}
                            onChange={e => setForm({ ...form, evidence: e.target.value })}
                            rows={2}
                            placeholder="Document référencé, observation terrain..."
                            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                        />
                    </div>
                    {form.finding_type === 'nonconformite' && (
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.create_nc}
                                onChange={e => setForm({ ...form, create_nc: e.target.checked })}
                                className="rounded"
                            />
                            Créer automatiquement une NC depuis cette constatation
                        </label>
                    )}
                    <div className="flex gap-2 justify-end">
                        <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                            Annuler
                        </button>
                        <button
                            onClick={submit}
                            disabled={!form.description || loading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                        >
                            {loading ? 'Ajout...' : 'Ajouter'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AuditManagement() {
    const { audits } = usePage().props;

    const [showCreate, setShowCreate]     = useState(false);
    const [activeFinding, setActiveFinding] = useState(null);

    const refresh = () => router.reload({ only: ['audits'] });

    const updateStatus = async (auditId, status) => {
        await axios.patch(`/qualite/audits/${auditId}`, { status });
        refresh();
    };

    return (
        <AppLayout>
            <Head title="Audits qualité — ISO 9001" />

            <div className="p-6 max-w-screen-xl mx-auto space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Audits qualité</h1>
                        <p className="text-sm text-gray-500">{audits.total} audit{audits.total > 1 ? 's' : ''} enregistré{audits.total > 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                    >
                        + Planifier un audit
                    </button>
                </div>

                {/* Tableau des audits */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auditeur</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Constatations</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {audits.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">Aucun audit planifié.</td>
                                    </tr>
                                )}
                                {audits.data.map(audit => (
                                    <tr key={audit.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{audit.reference}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{audit.title}</td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">{AUDIT_TYPE_LABELS[audit.audit_type] ?? audit.audit_type}</td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">{audit.auditor_name ?? '—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {audit.audit_date_start
                                                ? `${new Date(audit.audit_date_start).toLocaleDateString('fr-FR')} → ${audit.audit_date_end ? new Date(audit.audit_date_end).toLocaleDateString('fr-FR') : '?'}`
                                                : '—'
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <span className="text-red-600 font-semibold">{audit.findings_count_nc} NC</span>
                                            <span className="text-gray-400 mx-1">|</span>
                                            <span className="text-yellow-600">{audit.findings_count_obs} Obs.</span>
                                            <span className="text-gray-400 mx-1">|</span>
                                            <span className="text-green-600">{audit.findings_count_positive} +</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={audit.status}
                                                onChange={e => updateStatus(audit.id, e.target.value)}
                                                className={`text-xs px-2 py-1 rounded-lg border ${STATUS_BADGE[audit.status]}`}
                                            >
                                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setActiveFinding(audit)}
                                                className="text-purple-600 hover:underline text-xs mr-3"
                                            >
                                                + Constatation
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showCreate && (
                <AuditForm
                    onClose={() => setShowCreate(false)}
                    onSuccess={refresh}
                />
            )}
            {activeFinding && (
                <FindingPanel
                    audit={activeFinding}
                    onClose={() => setActiveFinding(null)}
                    onAdded={() => { refresh(); }}
                />
            )}
        </AppLayout>
    );
}
export { AuditManagement };
