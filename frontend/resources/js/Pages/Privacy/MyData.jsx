import { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate, formatRelative } from '@/utils/date';

const REQUEST_TYPES = {
    access:          { label: 'Accès à mes données',         icon: '📋' },
    rectification:   { label: 'Rectification de mes données', icon: '✏️' },
    erasure:         { label: 'Suppression de mes données',   icon: '🗑️' },
    portability:     { label: 'Portabilité de mes données',   icon: '📦' },
    objection:       { label: 'Opposition au traitement',     icon: '🚫' },
};

const STATUS_COLORS = {
    pending:    'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed:  'bg-green-100 text-green-800',
    rejected:   'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
    pending:    'En attente',
    processing: 'En cours',
    completed:  'Terminée',
    rejected:   'Refusée',
};

export default function MyData() {
    const { auth } = usePage().props;
    const [summary,   setSummary]   = useState(null);
    const [consents,  setConsents]  = useState([]);
    const [requests,  setRequests]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedType, setSelectedType] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            const [s, c, r] = await Promise.all([
                fetch('/gdpr/my-data/summary').then(r => r.json()),
                fetch('/gdpr/consent').then(r => r.json()),
                fetch('/gdpr/requests').then(r => r.json()),
            ]);
            setSummary(s);
            setConsents(c.data ?? []);
            setRequests(r.data ?? []);
        } finally {
            setLoading(false);
        }
    }

    async function downloadData() {
        setDownloading(true);
        try {
            const res = await fetch('/gdpr/my-data', { method: 'GET' });
            if (!res.ok) throw new Error('Erreur lors de la génération');
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `mes_donnees_secretis_${new Date().toISOString().slice(0,10)}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('success', 'Export téléchargé avec succès !');
        } catch (e) {
            showToast('error', 'Erreur lors de l\'export. Réessayez.');
        } finally {
            setDownloading(false);
        }
    }

    async function revokeConsent(consentType) {
        if (!confirm('Révoquer ce consentement ?')) return;
        await fetch('/gdpr/consent/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            body: JSON.stringify({ consent_type: consentType }),
        });
        showToast('success', 'Consentement révoqué.');
        fetchAll();
    }

    async function submitRequest() {
        if (!selectedType) return;
        setSubmitting(true);
        try {
            const res = await fetch('/gdpr/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ type: selectedType }),
            });
            if (res.ok) {
                showToast('success', 'Demande soumise. Vous recevrez une réponse sous 30 jours.');
                setShowRequestModal(false);
                setSelectedType('');
                fetchAll();
            } else {
                const err = await res.json();
                showToast('error', err.message ?? 'Erreur lors de la soumission.');
            }
        } finally {
            setSubmitting(false);
        }
    }

    function showToast(type, msg) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function csrfToken() {
        return document.querySelector('meta[name=csrf-token]')?.content ?? '';
    }

    return (
        <AppLayout>
            <Head title="Mes données personnelles" />

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 rounded-lg px-5 py-3 shadow-lg text-sm font-medium
                    ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* En-tête */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span>🔐</span> Mes données personnelles
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Gérez vos données conformément au RGPD (Règlement UE 2016/679)
                        </p>
                    </div>
                    <button
                        onClick={downloadData}
                        disabled={downloading}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {downloading ? (
                            <><span className="animate-spin">⏳</span> Préparation…</>
                        ) : (
                            <><span>📥</span> Télécharger mes données</>
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Chargement…</div>
                ) : (
                    <>
                        {/* Récapitulatif des données */}
                        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                                📊 Données stockées
                            </h2>
                            {summary && (
                                <>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        Compte créé {summary.account_age}
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {Object.entries(summary.data ?? {}).map(([key, val]) => (
                                            <DataCard key={key} label={DATA_LABELS[key] ?? key} value={val} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>

                        {/* Consentements */}
                        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                                ✅ Mes consentements actifs
                            </h2>
                            {consents.length === 0 ? (
                                <p className="text-sm text-gray-500">Aucun consentement enregistré.</p>
                            ) : (
                                <div className="space-y-3">
                                    {consents.map(c => (
                                        <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {CONSENT_LABELS[c.consent_type] ?? c.consent_type}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Accordé le {formatDate(c.granted_at)} · v{c.version}
                                                </p>
                                            </div>
                                            {c.consent_type !== 'essential' && (
                                                <button
                                                    onClick={() => revokeConsent(c.consent_type)}
                                                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 underline font-medium"
                                                >
                                                    Révoquer
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Demandes RGPD */}
                        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                    📋 Mes demandes RGPD
                                </h2>
                                <button
                                    onClick={() => setShowRequestModal(true)}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                    + Nouvelle demande
                                </button>
                            </div>
                            {requests.length === 0 ? (
                                <p className="text-sm text-gray-500">Aucune demande soumise.</p>
                            ) : (
                                <div className="space-y-2">
                                    {requests.map(r => (
                                        <div key={r.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {REQUEST_TYPES[r.type]?.icon} {REQUEST_TYPES[r.type]?.label ?? r.type}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Soumise {formatRelative(r.requested_at)}
                                                    {r.completed_at && ` · Traitée ${formatRelative(r.completed_at)}`}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[r.status]}`}>
                                                {STATUS_LABELS[r.status] ?? r.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Zone danger */}
                        <section className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-6">
                            <h2 className="text-base font-semibold text-red-800 dark:text-red-400 mb-2">
                                ⚠️ Zone de suppression
                            </h2>
                            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                                Vous pouvez demander la suppression définitive de vos données personnelles.
                                Les données comptables seront conservées 10 ans (obligation légale).
                                Cette action est irréversible.
                            </p>
                            <button
                                onClick={() => { setSelectedType('erasure'); setShowRequestModal(true); }}
                                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:bg-red-950 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900 transition-colors"
                            >
                                Demander la suppression de mes données
                            </button>
                        </section>
                    </>
                )}
            </div>

            {/* Modal nouvelle demande */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowRequestModal(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Nouvelle demande RGPD
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Conformément au RGPD, vous disposez de droits sur vos données personnelles.
                            Sélectionnez le type de demande :
                        </p>
                        <div className="space-y-2 mb-6">
                            {Object.entries(REQUEST_TYPES).map(([key, { label, icon }]) => (
                                <label key={key} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors
                                    ${selectedType === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                                    <input
                                        type="radio"
                                        name="request_type"
                                        value={key}
                                        checked={selectedType === key}
                                        onChange={() => setSelectedType(key)}
                                        className="text-blue-600"
                                    />
                                    <span className="text-base">{icon}</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mb-4">
                            Réponse garantie sous 30 jours (Art. 12 RGPD).
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowRequestModal(false); setSelectedType(''); }}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={submitRequest}
                                disabled={!selectedType || submitting}
                                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? 'Envoi…' : 'Soumettre'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function DataCard({ label, value }) {
    return (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-700 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {typeof value === 'boolean' ? (value ? '✓' : '—') : value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
    );
}

const DATA_LABELS = {
    profile:      'Profil',
    events:       'Événements',
    tasks:        'Tâches',
    documents:    'Documents',
    messages:     'Messages',
    activity_log: 'Activités',
};

const CONSENT_LABELS = {
    essential:  'Cookies essentiels',
    analytics:  'Cookies analytiques',
    marketing:  'Cookies marketing',
    newsletter: 'Newsletter',
};
