import { useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Components/Layout/AppLayout';
import { router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    PlusIcon,
    ClipboardDocumentIcon,
    TrashIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    KeyIcon,
    ChartBarIcon,
    CalendarIcon,
    ShieldCheckIcon,
    BellAlertIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid, XCircleIcon } from '@heroicons/react/24/solid';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ALL_SCOPES = [
    { key: 'contacts:read',   label: 'Contacts — lecture' },
    { key: 'contacts:write',  label: 'Contacts — écriture' },
    { key: 'events:read',     label: 'Agenda — lecture' },
    { key: 'events:write',    label: 'Agenda — écriture' },
    { key: 'documents:read',  label: 'GED — lecture' },
    { key: 'documents:write', label: 'GED — écriture' },
    { key: 'tasks:read',      label: 'Tâches — lecture' },
    { key: 'tasks:write',     label: 'Tâches — écriture' },
    { key: 'invoices:read',   label: 'Factures — lecture' },
    { key: 'accounting:read', label: 'Comptabilité — lecture' },
    { key: 'org:read',        label: 'Organisation — lecture' },
    { key: 'webhooks:manage', label: 'Webhooks — gestion' },
];

const EXPIRY_OPTIONS = [
    { value: 30,  label: '30 jours' },
    { value: 60,  label: '60 jours' },
    { value: 90,  label: '90 jours' },
    { value: 180, label: '6 mois' },
    { value: 365, label: '1 an' },
    { value: 0,   label: 'Jamais (déconseillé)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntilExpiry(expiresAt) {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CopyButton({ value }) {
    const [copied, setCopied] = useState(false);
    async function copy() {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    return (
        <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-600 transition-colors p-1 rounded hover:bg-purple-50">
            {copied ? <CheckSolid className="w-4 h-4 text-green-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
        </button>
    );
}

// ─── KeyCard ─────────────────────────────────────────────────────────────────

function KeyCard({ apiKey, onRevoke }) {
    const [revConfirm, setRevConfirm] = useState(false);

    const daysLeft    = daysUntilExpiry(apiKey.expires_at);
    const isExpired   = daysLeft !== null && daysLeft <= 0;
    const soonExpires = daysLeft !== null && daysLeft > 0 && daysLeft <= 14;
    const needsRotate = daysLeft !== null && daysLeft <= 90 && daysLeft > 14;

    return (
        <div className={[
            'bg-white dark:bg-gray-800 border rounded-2xl p-5 transition-all',
            isExpired
                ? 'border-red-200 dark:border-red-800 opacity-70'
                : soonExpires
                    ? 'border-amber-300 dark:border-amber-700'
                    : 'border-gray-200 dark:border-gray-700',
        ].join(' ')}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <KeyIcon className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{apiKey.name}</h3>
                    {isExpired && (
                        <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Expirée</span>
                    )}
                    {soonExpires && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <BellAlertIcon className="w-3 h-3" /> Expire dans {daysLeft}j
                        </span>
                    )}
                </div>

                {/* Statut dernier appel */}
                {apiKey.last_used_at && (
                    <span className="text-xs text-gray-400">
                        Dernier appel : {formatDate(apiKey.last_used_at)}
                    </span>
                )}
            </div>

            {/* Clé masquée */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3 font-mono">
                <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">
                    {apiKey.key_prefix ?? 'sk_'}•••••••••••••••••••••••••••••••••
                </span>
            </div>

            {/* Scopes */}
            <div className="flex flex-wrap gap-1 mb-3">
                {(apiKey.scopes ?? []).map(scope => (
                    <span key={scope} className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-mono">
                        {scope}
                    </span>
                ))}
            </div>

            {/* Infos */}
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-3">
                <div>
                    <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                    Créée : {formatDate(apiKey.created_at)}
                </div>
                <div>
                    <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                    Expire : {formatDate(apiKey.expires_at)}
                </div>
                <div>
                    <ChartBarIcon className="w-3.5 h-3.5 inline mr-1" />
                    {apiKey.calls_today ?? 0} appels/jour
                </div>
            </div>

            {/* Alerte rotation recommandée */}
            {needsRotate && !isExpired && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-xs mb-3">
                    <ShieldCheckIcon className="w-4 h-4 shrink-0" />
                    Rotation recommandée — cette clé a plus de 90 jours.
                </div>
            )}

            {/* Actions */}
            {revConfirm ? (
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-red-600">Révoquer définitivement ?</p>
                    <button onClick={() => { onRevoke(apiKey.id); setRevConfirm(false); }} className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirmer</button>
                    <button onClick={() => setRevConfirm(false)} className="text-xs px-2 py-1 border border-gray-200 rounded-lg">Annuler</button>
                </div>
            ) : (
                <button
                    onClick={() => setRevConfirm(true)}
                    className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                    <TrashIcon className="w-3.5 h-3.5" /> Révoquer
                </button>
            )}
        </div>
    );
}

// ─── Formulaire nouvelle clé ──────────────────────────────────────────────────

function NewKeyForm({ onCreated, onCancel }) {
    const [form,    setForm]    = useState({ name: '', scopes: [], expires_in: 90 });
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);

    function toggleScope(key) {
        setForm(f => ({
            ...f,
            scopes: f.scopes.includes(key) ? f.scopes.filter(s => s !== key) : [...f.scopes, key],
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name) { setError('Donnez un nom à cette clé.'); return; }
        if (!form.scopes.length) { setError('Sélectionnez au moins un scope.'); return; }
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.post('/api-keys', form);
            onCreated(data.data);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Erreur lors de la création.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-purple-600" /> Générer une nouvelle clé API
            </h3>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nom / Description <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex : Intégration CRM, Mobile App…"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>

            <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Expiration</label>
                <select
                    value={form.expires_in}
                    onChange={e => setForm(f => ({ ...f, expires_in: parseInt(e.target.value) }))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                    {EXPIRY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Permissions (scopes) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {ALL_SCOPES.map(scope => (
                        <label key={scope.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                            <input
                                type="checkbox"
                                checked={form.scopes.includes(scope.key)}
                                onChange={() => toggleScope(scope.key)}
                                className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <code className="text-xs text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">{scope.key}</code>
                            <span className="text-xs text-gray-500">{scope.label}</span>
                        </label>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, scopes: ALL_SCOPES.map(s => s.key) }))}
                    className="text-xs text-purple-600 hover:underline mt-2"
                >
                    Tout sélectionner
                </button>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Générer la clé
                </button>
                <button type="button" onClick={onCancel} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Annuler
                </button>
            </div>
        </form>
    );
}

// ─── Page ApiKeys ─────────────────────────────────────────────────────────────

export default function ApiKeys({ apiKeys: initialKeys = [] }) {
    const [keys,        setKeys]       = useState(initialKeys);
    const [showForm,    setShowForm]   = useState(false);
    const [newKeyValue, setNewKeyValue] = useState(null);

    const expiringCount = keys.filter(k => {
        const d = daysUntilExpiry(k.expires_at);
        return d !== null && d <= 14 && d > 0;
    }).length;

    async function handleRevoke(keyId) {
        await axios.delete(`/api-keys/${keyId}`);
        setKeys(prev => prev.filter(k => k.id !== keyId));
    }

    function handleKeyCreated(keyData) {
        setNewKeyValue(keyData.plain_token);
        setKeys(prev => [keyData, ...prev]);
        setShowForm(false);
    }

    return (
        <AppLayout>
            <Head title="Clés API SECRETIS" />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <button onClick={() => router.visit('/integrations')} className="text-gray-400 hover:text-gray-600">
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <KeyIcon className="w-6 h-6 text-purple-600" /> Clés API SECRETIS
                            </h1>
                        </div>
                        <p className="text-sm text-gray-500 ml-8">{keys.length} clé{keys.length !== 1 ? 's' : ''} · {keys.filter(k => { const d = daysUntilExpiry(k.expires_at); return d === null || d > 0; }).length} active{keys.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" /> Nouvelle clé
                    </button>
                </div>

                {/* Alerte expiration prochaine */}
                {expiringCount > 0 && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-start gap-3">
                        <BellAlertIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                {expiringCount} clé{expiringCount > 1 ? 's' : ''} expire{expiringCount === 1 ? '' : 'nt'} dans moins de 14 jours.
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                Renouvelez-les pour éviter toute interruption de service.
                            </p>
                        </div>
                    </div>
                )}

                {/* Clé nouvellement générée (affichée UNE SEULE FOIS) */}
                {newKeyValue && (
                    <div className="mb-6 p-5 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-2xl">
                        <div className="flex items-start gap-3 mb-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-green-900 dark:text-green-200 text-sm">Votre clé API — à copier maintenant !</p>
                                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">Elle ne sera plus affichée après cette session.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-700">
                            <code className="text-sm text-gray-800 dark:text-gray-200 flex-1 break-all font-mono">{newKeyValue}</code>
                            <CopyButton value={newKeyValue} />
                        </div>
                        <button onClick={() => setNewKeyValue(null)} className="mt-3 text-xs text-green-700 hover:text-green-900 flex items-center gap-1">
                            <CheckSolid className="w-4 h-4" /> Clé copiée et sauvegardée
                        </button>
                    </div>
                )}

                {/* Formulaire */}
                {showForm && (
                    <div className="mb-6">
                        <NewKeyForm onCreated={handleKeyCreated} onCancel={() => setShowForm(false)} />
                    </div>
                )}

                {/* Liste des clés */}
                {keys.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <KeyIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="font-medium">Aucune clé API</p>
                        <p className="text-sm mt-1">Générez une clé pour accéder à l'API SECRETIS depuis vos applications.</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
                            Créer ma première clé
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {keys.map(key => (
                            <KeyCard key={key.id} apiKey={key} onRevoke={handleRevoke} />
                        ))}
                    </div>
                )}

                {/* Best practices */}
                <div className="mt-10 p-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-purple-600" /> Bonnes pratiques de sécurité
                    </h3>
                    <ul className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <li>• Ne jamais stocker une clé API dans le code source (utilisez des variables d'environnement).</li>
                        <li>• Créez une clé distincte par application/environnement.</li>
                        <li>• Accordez uniquement les scopes nécessaires (principe du moindre privilège).</li>
                        <li>• Faites une rotation des clés tous les 90 jours maximum.</li>
                        <li>• En cas de compromission, révoquez immédiatement la clé concernée.</li>
                    </ul>
                </div>
            </div>
        </AppLayout>
    );
}
export { ApiKeys };
