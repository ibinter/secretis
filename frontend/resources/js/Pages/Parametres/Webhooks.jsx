import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_EVENTS = [
    { id: 'event.created',       label: 'Événement créé',         group: 'Agenda' },
    { id: 'event.updated',       label: 'Événement modifié',      group: 'Agenda' },
    { id: 'task.created',        label: 'Tâche créée',            group: 'Tâches' },
    { id: 'task.completed',      label: 'Tâche terminée',         group: 'Tâches' },
    { id: 'courrier.received',   label: 'Courrier reçu',          group: 'Courrier' },
    { id: 'courrier.processed',  label: 'Courrier traité',        group: 'Courrier' },
    { id: 'visitor.arrived',     label: 'Visiteur arrivé',        group: 'Accueil' },
    { id: 'visitor.departed',    label: 'Visiteur parti',         group: 'Accueil' },
    { id: 'invoice.created',     label: 'Facture créée',          group: 'Comptabilité' },
    { id: 'invoice.paid',        label: 'Facture payée',          group: 'Comptabilité' },
    { id: 'user.invited',        label: 'Utilisateur invité',     group: 'RH' },
    { id: 'leave.approved',      label: 'Congé approuvé',         group: 'RH' },
];

const EVENT_GROUPS = [...new Set(SUPPORTED_EVENTS.map(e => e.group))];

const STATUS_COLORS = {
    delivered: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    failed:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    pending:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ endpoint }) {
    if (!endpoint.is_active) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Désactivé
            </span>
        );
    }
    if (endpoint.failure_count >= 5) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Erreurs ({endpoint.failure_count})
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Actif
        </span>
    );
}

function DeliveryRow({ delivery }) {
    const [showPayload, setShowPayload] = useState(false);
    const isSuccess = delivery.delivered_at !== null;
    const isFailed  = delivery.attempts >= 5 && !isSuccess;

    const status = isSuccess ? 'delivered' : isFailed ? 'failed' : 'pending';
    const statusLabels = { delivered: 'Livré', failed: 'Échec', pending: 'En attente' };

    return (
        <>
            <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                    {delivery.delivery_id?.substring(0, 8)}…
                </td>
                <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono">
                        {delivery.event_type}
                    </span>
                </td>
                <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                        {statusLabels[status]}
                    </span>
                </td>
                <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-mono font-medium ${delivery.response_status >= 200 && delivery.response_status < 300 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {delivery.response_status ?? '—'}
                    </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                    {delivery.attempts}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {delivery.created_at
                        ? new Date(delivery.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                </td>
                <td className="px-4 py-3">
                    <button
                        type="button"
                        onClick={() => setShowPayload(!showPayload)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {showPayload ? 'Masquer' : 'Payload'}
                    </button>
                </td>
            </tr>
            {showPayload && (
                <tr>
                    <td colSpan={7} className="px-4 pb-3">
                        <pre className="text-xs bg-gray-900 text-green-300 p-3 rounded-lg overflow-x-auto max-h-48 leading-relaxed">
                            {JSON.stringify(delivery.payload, null, 2)}
                        </pre>
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function EndpointModal({ onClose, onSave, endpoint = null }) {
    const isEditing = !!endpoint;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        url:         endpoint?.url ?? '',
        secret:      endpoint?.secret ?? crypto.randomUUID().replace(/-/g, ''),
        events:      endpoint?.events ?? [],
        description: endpoint?.description ?? '',
        is_active:   endpoint?.is_active ?? true,
    });

    const toggleEvent = (eventId) => {
        const events = data.events.includes(eventId)
            ? data.events.filter(e => e !== eventId)
            : [...data.events, eventId];
        setData('events', events);
    };

    const toggleGroup = (group) => {
        const groupEvents  = SUPPORTED_EVENTS.filter(e => e.group === group).map(e => e.id);
        const allSelected  = groupEvents.every(id => data.events.includes(id));
        const events       = allSelected
            ? data.events.filter(e => !groupEvents.includes(e))
            : [...new Set([...data.events, ...groupEvents])];
        setData('events', events);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const action = isEditing
            ? () => put(route('parametres.webhooks.update', endpoint.id), { onSuccess: onSave })
            : () => post(route('parametres.webhooks.store'), { onSuccess: onSave });
        action();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {isEditing ? 'Modifier l\'endpoint' : 'Nouvel endpoint webhook'}
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* URL */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">URL de destination *</label>
                        <input
                            type="url"
                            value={data.url}
                            onChange={e => setData('url', e.target.value)}
                            placeholder="https://hooks.zapier.com/hooks/catch/..."
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                        {errors.url && <p className="text-xs text-red-600 dark:text-red-400">{errors.url}</p>}
                        <p className="text-xs text-gray-500 dark:text-gray-400">L'URL doit être accessible depuis Internet (HTTPS recommandé).</p>
                    </div>

                    {/* Secret */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Secret de signature</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={data.secret}
                                onChange={e => setData('secret', e.target.value)}
                                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setData('secret', crypto.randomUUID().replace(/-/g, ''))}
                                className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                Régénérer
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Utilisé pour vérifier la signature <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">X-Secretis-Signature</code> côté récepteur.
                        </p>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description (optionnel)</label>
                        <input
                            type="text"
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                            placeholder="Ex: Zapier — Création de tâche ClickUp"
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Événements */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Événements déclencheurs *{' '}
                            <span className="text-gray-400 font-normal">({data.events.length} sélectionné{data.events.length !== 1 ? 's' : ''})</span>
                        </label>

                        <div className="space-y-4">
                            {EVENT_GROUPS.map(group => {
                                const groupEvents = SUPPORTED_EVENTS.filter(e => e.group === group);
                                const allSelected = groupEvents.every(e => data.events.includes(e.id));

                                return (
                                    <div key={group} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                        <div
                                            className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
                                            onClick={() => toggleGroup(group)}
                                        >
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{group}</span>
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={() => toggleGroup(group)}
                                                onClick={e => e.stopPropagation()}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {groupEvents.map(ev => (
                                                <label key={ev.id} className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                                                    <div>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">{ev.label}</span>
                                                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-mono">{ev.id}</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={data.events.includes(ev.id)}
                                                        onChange={() => toggleEvent(ev.id)}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {errors.events && <p className="text-xs text-red-600 dark:text-red-400">{errors.events}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={processing || data.events.length === 0 || !data.url}
                            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {processing && (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            )}
                            {isEditing ? 'Enregistrer' : 'Créer l\'endpoint'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Webhooks({ endpoints = [], recentDeliveries = [], flash }) {
    const [showModal, setShowModal]     = useState(false);
    const [editEndpoint, setEditEndpoint] = useState(null);
    const [selectedEndpoint, setSelectedEndpoint] = useState(null);
    const [testing, setTesting]         = useState(null);
    const [testResult, setTestResult]   = useState({});

    const handleTest = async (endpointId) => {
        setTesting(endpointId);
        setTestResult(prev => ({ ...prev, [endpointId]: null }));
        try {
            await axios.post(route('parametres.webhooks.test', endpointId));
            setTestResult(prev => ({ ...prev, [endpointId]: 'success' }));
        } catch {
            setTestResult(prev => ({ ...prev, [endpointId]: 'error' }));
        } finally {
            setTesting(null);
        }
    };

    const handleDelete = (endpointId) => {
        if (!confirm('Supprimer cet endpoint webhook ? Cette action est irréversible.')) return;
        router.delete(route('parametres.webhooks.destroy', endpointId), { preserveScroll: true });
    };

    const handleToggle = (endpoint) => {
        router.patch(route('parametres.webhooks.toggle', endpoint.id), {}, { preserveScroll: true });
    };

    const deliveries = selectedEndpoint
        ? recentDeliveries.filter(d => d.endpoint_id === selectedEndpoint)
        : recentDeliveries;

    return (
        <AppLayout title="Paramètres — Webhooks">
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks sortants</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Connectez SECRETIS à Zapier, Make, n8n ou vos propres systèmes via des webhooks HTTP.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setEditEndpoint(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nouvel endpoint
                    </button>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Info box */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">ℹ️</span>
                        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                            <p><strong>Sécurité :</strong> Chaque requête inclut un header <code className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">X-Secretis-Signature: sha256=&lt;hmac&gt;</code> pour vérifier l'authenticité.</p>
                            <p><strong>Retry :</strong> En cas d'échec (non-2xx ou timeout), les livraisons sont retentées automatiquement : 1min → 5min → 30min → 2h → 24h (max 5 tentatives).</p>
                            <p><strong>Désactivation auto :</strong> Un endpoint est désactivé automatiquement après 10 échecs consécutifs.</p>
                        </div>
                    </div>
                </div>

                {/* Liste des endpoints */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Endpoints configurés ({endpoints.length})
                        </h2>
                    </div>

                    {endpoints.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="text-4xl mb-3">🔌</div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Aucun endpoint configuré.</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Créez votre premier endpoint pour connecter SECRETIS à Zapier ou vos outils.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {endpoints.map(ep => (
                                <div key={ep.id} className="px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <StatusBadge endpoint={ep} />
                                                {ep.description && (
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                                        {ep.description}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{ep.url}</p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {(ep.events || []).slice(0, 5).map(ev => (
                                                    <span key={ev} className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                        {ev}
                                                    </span>
                                                ))}
                                                {(ep.events || []).length > 5 && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 px-1 py-0.5">
                                                        +{ep.events.length - 5} autres
                                                    </span>
                                                )}
                                            </div>
                                            {ep.last_called_at && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    Dernier appel : {new Date(ep.last_called_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Test */}
                                            <button
                                                type="button"
                                                onClick={() => handleTest(ep.id)}
                                                disabled={testing === ep.id}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition
                                                    ${testResult[ep.id] === 'success' ? 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20'
                                                    : testResult[ep.id] === 'error' ? 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                            >
                                                {testing === ep.id ? '...'
                                                    : testResult[ep.id] === 'success' ? '✓ OK'
                                                    : testResult[ep.id] === 'error' ? '✗ Échec'
                                                    : 'Tester'}
                                            </button>

                                            {/* Historique */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedEndpoint(selectedEndpoint === ep.id ? null : ep.id)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                            >
                                                Historique
                                            </button>

                                            {/* Toggle actif/inactif */}
                                            <button
                                                type="button"
                                                onClick={() => handleToggle(ep)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition
                                                    ${ep.is_active
                                                        ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                        : 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                            >
                                                {ep.is_active ? 'Désactiver' : 'Activer'}
                                            </button>

                                            {/* Modifier */}
                                            <button
                                                type="button"
                                                onClick={() => { setEditEndpoint(ep); setShowModal(true); }}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>

                                            {/* Supprimer */}
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(ep.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Historique des livraisons */}
                {recentDeliveries.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Historique des livraisons
                                {selectedEndpoint && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedEndpoint(null)}
                                        className="ml-3 text-xs text-blue-600 dark:text-blue-400 font-normal hover:underline"
                                    >
                                        Afficher tout
                                    </button>
                                )}
                            </h2>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{deliveries.length} entrée{deliveries.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <th className="px-4 py-3 text-left">ID</th>
                                        <th className="px-4 py-3 text-left">Événement</th>
                                        <th className="px-4 py-3 text-left">Statut</th>
                                        <th className="px-4 py-3 text-center">HTTP</th>
                                        <th className="px-4 py-3 text-center">Tentatives</th>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Payload</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {deliveries.map(d => (
                                        <DeliveryRow key={d.id} delivery={d} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal création/édition */}
            {showModal && (
                <EndpointModal
                    endpoint={editEndpoint}
                    onClose={() => { setShowModal(false); setEditEndpoint(null); }}
                    onSave={() => { setShowModal(false); setEditEndpoint(null); }}
                />
            )}
        </AppLayout>
    );
}
