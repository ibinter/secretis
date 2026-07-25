import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import IshikawaDiagram from '@/Components/Qualite/IshikawaDiagram';
import axios from 'axios';

// ─── Stepper de statut ────────────────────────────────────────────────────────
const STEPS = [
    { key: 'ouvert',            label: 'Ouvert' },
    { key: 'analyse',           label: 'Analyse' },
    { key: 'action_corrective', label: 'Action corrective' },
    { key: 'verification',      label: 'Vérification' },
    { key: 'clos',              label: 'Clos' },
];

function StatusStepper({ status }) {
    const current = STEPS.findIndex(s => s.key === status);
    return (
        <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
                const done    = i < current;
                const active  = i === current;
                const pending = i > current;
                return (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition
                                ${done   ? 'bg-green-500 border-green-500 text-white' : ''}
                                ${active ? 'bg-purple-600 border-purple-600 text-white'   : ''}
                                ${pending? 'bg-white border-gray-300 text-gray-400'   : ''}
                            `}>
                                {done ? '✓' : i + 1}
                            </div>
                            <span className={`text-xs mt-1 whitespace-nowrap
                                ${active  ? 'text-purple-600 font-semibold' : 'text-gray-500'}
                            `}>
                                {step.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < current ? 'bg-green-400' : 'bg-gray-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Section 5 Pourquoi ───────────────────────────────────────────────────────
function FivePourquoiEditor({ value = {}, onChange, readOnly }) {
    const whys = ['why1', 'why2', 'why3', 'why4', 'why5'];
    return (
        <div className="space-y-3">
            {whys.map((key, i) => (
                <div key={key} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Pourquoi {i > 0 ? `(cause ${i})` : '(problème initial)'}  ?</p>
                        {readOnly
                            ? <p className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2">{value[key] || '—'}</p>
                            : <input
                                type="text"
                                value={value[key] ?? ''}
                                onChange={e => onChange({ ...value, [key]: e.target.value })}
                                placeholder={`Pourquoi ${i + 1}...`}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        }
                    </div>
                    {i < whys.length - 1 && (
                        <div className="flex-shrink-0 text-gray-300 text-lg mt-2">↓</div>
                    )}
                </div>
            ))}
            <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Cause racine identifiée</label>
                {readOnly
                    ? <p className="text-sm font-semibold text-red-700 bg-red-50 rounded px-3 py-2">{value.root_conclusion || '—'}</p>
                    : <textarea
                        value={value.root_conclusion ?? ''}
                        onChange={e => onChange({ ...value, root_conclusion: e.target.value })}
                        rows={2}
                        placeholder="Conclusion : la cause racine est..."
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                }
            </div>
        </div>
    );
}

// ─── Étoiles de notation ──────────────────────────────────────────────────────
function StarRating({ value, onChange, readOnly }) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    disabled={readOnly}
                    onClick={() => !readOnly && onChange(star)}
                    className={`text-2xl transition ${star <= value ? 'text-yellow-400' : 'text-gray-300'} ${readOnly ? '' : 'hover:text-yellow-300'}`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}

// ─── Badge sévérité ───────────────────────────────────────────────────────────
const SEVERITY_BADGE = {
    critique: 'bg-red-100 text-red-700 border border-red-200',
    majeure:  'bg-orange-100 text-orange-700 border border-orange-200',
    mineure:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

// ─── Page principale ──────────────────────────────────────────────────────────
export default function NonconformityDetail() {
    const { nonconformity: nc, users, processes } = usePage().props;

    const [rootCauseMethod, setRootCauseMethod] = useState(nc.root_cause_method ?? '5pourquoi');
    const [rootCauseDetail, setRootCauseDetail] = useState(nc.root_cause_detail ?? {});
    const [savingRootCause, setSavingRootCause]  = useState(false);

    const [newAction, setNewAction]   = useState({ description: '', responsible_user_id: '', due_date: '' });
    const [addingAction, setAddingAction] = useState(false);

    const [verifyRating, setVerifyRating] = useState(0);
    const [verifying, setVerifying]       = useState(false);

    const isClosed = nc.status === 'clos';

    const saveRootCause = async () => {
        setSavingRootCause(true);
        try {
            await axios.post(`/qualite/nc/${nc.id}/root-cause`, {
                method:   rootCauseMethod,
                analysis: rootCauseDetail,
            });
            router.reload({ only: ['nonconformity'] });
        } catch (e) {
            alert('Erreur lors de la sauvegarde.');
        } finally {
            setSavingRootCause(false);
        }
    };

    const addCorrectiveAction = async () => {
        setAddingAction(true);
        try {
            await axios.post(`/qualite/nc/${nc.id}/corrective-action`, newAction);
            setNewAction({ description: '', responsible_user_id: '', due_date: '' });
            router.reload({ only: ['nonconformity'] });
        } catch (e) {
            alert('Erreur.');
        } finally {
            setAddingAction(false);
        }
    };

    const verify = async () => {
        if (!verifyRating) { alert('Veuillez sélectionner une note.'); return; }
        setVerifying(true);
        try {
            await axios.post(`/qualite/nc/${nc.id}/verify`, { rating: verifyRating });
            router.reload({ only: ['nonconformity'] });
        } finally {
            setVerifying(false);
        }
    };

    return (
        <AppLayout>
            <Head title={`${nc.reference} — Non-conformité`} />

            <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* En-tête */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <p className="text-xs font-mono text-gray-400">{nc.reference}</p>
                            <h1 className="text-xl font-bold text-gray-900 mt-1">{nc.title}</h1>
                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${SEVERITY_BADGE[nc.severity]}`}>
                                {nc.severity}
                            </span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                            <p>Détecté le {new Date(nc.detected_at).toLocaleDateString('fr-FR')}</p>
                            {nc.detected_by_user && <p>par {nc.detected_by_user.name}</p>}
                        </div>
                    </div>
                    <StatusStepper status={nc.status} />
                </div>

                {/* Section Détection */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Détection</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500">Source</p>
                            <p className="font-medium capitalize mt-0.5">{
                                {
                                    audit:               'Audit',
                                    client_complaint:    'Réclamation client',
                                    internal_detection:  'Détection interne',
                                    supplier:            'Fournisseur',
                                    regulatory:          'Réglementaire',
                                }[nc.source] ?? nc.source
                            }</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Processus</p>
                            <p className="font-medium mt-0.5">
                                {nc.process ? `${nc.process.code} — ${nc.process.name}` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Produit / Service concerné</p>
                            <p className="font-medium mt-0.5">{nc.product_service ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Échéance</p>
                            <p className="font-medium mt-0.5">
                                {nc.due_date ? new Date(nc.due_date).toLocaleDateString('fr-FR') : '—'}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-xs text-gray-500">Description</p>
                        <p className="mt-1 text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{nc.description}</p>
                    </div>
                    {nc.immediate_action && (
                        <div className="mt-3">
                            <p className="text-xs text-gray-500">Action immédiate</p>
                            <p className="mt-1 text-sm text-gray-800 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                {nc.immediate_action}
                            </p>
                        </div>
                    )}
                </div>

                {/* Section Analyse des causes */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Analyse des causes</h2>

                    {/* Sélection de méthode */}
                    {!isClosed && (
                        <div className="flex gap-2 mb-5">
                            {[
                                { key: '5pourquoi', label: '5 Pourquoi' },
                                { key: 'ishikawa',  label: 'Ishikawa (5M)' },
                            ].map(m => (
                                <button
                                    key={m.key}
                                    onClick={() => setRootCauseMethod(m.key)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition
                                        ${rootCauseMethod === m.key
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                                        }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Interface méthode */}
                    {rootCauseMethod === '5pourquoi' && (
                        <FivePourquoiEditor
                            value={rootCauseDetail}
                            onChange={setRootCauseDetail}
                            readOnly={isClosed}
                        />
                    )}
                    {(rootCauseMethod === 'ishikawa' || rootCauseMethod === '5M') && (
                        <IshikawaDiagram
                            value={rootCauseDetail}
                            onChange={setRootCauseDetail}
                            problem={nc.title}
                            readOnly={isClosed}
                        />
                    )}

                    {!isClosed && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={saveRootCause}
                                disabled={savingRootCause}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                            >
                                {savingRootCause ? 'Enregistrement...' : 'Enregistrer l\'analyse'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Section Actions correctives */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Actions correctives</h2>

                    {/* Liste des actions */}
                    <div className="space-y-3 mb-4">
                        {(nc.corrective_actions_list ?? []).length === 0 && (
                            <p className="text-sm text-gray-400 italic">Aucune action corrective définie.</p>
                        )}
                        {(nc.corrective_actions_list ?? []).map((action) => (
                            <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
                                <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                    action.status === 'completed' ? 'bg-green-500' :
                                    action.status === 'in_progress' ? 'bg-purple-500' :
                                    action.status === 'cancelled' ? 'bg-gray-400' : 'bg-yellow-500'
                                }`} />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{action.description}</p>
                                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                        {action.responsible_user && <span>Resp. : {action.responsible_user.name}</span>}
                                        {action.due_date && <span>Échéance : {new Date(action.due_date).toLocaleDateString('fr-FR')}</span>}
                                        <span className="capitalize">{action.status.replace('_', ' ')}</span>
                                    </div>
                                </div>
                                {action.effectiveness_rating && (
                                    <span className="text-yellow-400 text-sm">{'★'.repeat(action.effectiveness_rating)}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Formulaire nouvelle action */}
                    {!isClosed && (
                        <div className="border rounded-lg p-4 bg-purple-50 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700">Ajouter une action corrective</h3>
                            <textarea
                                value={newAction.description}
                                onChange={e => setNewAction({ ...newAction, description: e.target.value })}
                                placeholder="Description de l'action..."
                                rows={2}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={newAction.responsible_user_id}
                                    onChange={e => setNewAction({ ...newAction, responsible_user_id: e.target.value })}
                                    className="border rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">Responsable...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="date"
                                    value={newAction.due_date}
                                    onChange={e => setNewAction({ ...newAction, due_date: e.target.value })}
                                    className="border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={addCorrectiveAction}
                                    disabled={!newAction.description || addingAction}
                                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                                >
                                    {addingAction ? 'Ajout...' : 'Ajouter'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section Vérification */}
                {(nc.status === 'verification' || nc.status === 'clos') && (
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Vérification de l'efficacité</h2>

                        {nc.status === 'clos' ? (
                            <div className="space-y-3">
                                <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 flex items-center gap-2">
                                    ✅ Non-conformité clôturée le {new Date(nc.closed_at).toLocaleDateString('fr-FR')}
                                    {nc.verified_by_user && ` par ${nc.verified_by_user.name}`}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Note d'efficacité des actions correctives
                                    </label>
                                    <StarRating
                                        value={verifyRating}
                                        onChange={setVerifyRating}
                                        readOnly={false}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        1-2 : Non efficace (NC réouverte) — 3-5 : Efficace (NC clôturée)
                                    </p>
                                </div>
                                <button
                                    onClick={verify}
                                    disabled={verifying || !verifyRating}
                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                >
                                    {verifying ? 'Vérification...' : 'Soumettre la vérification'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
export { NonconformityDetail };
