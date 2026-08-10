import { useState, useEffect, useCallback } from 'react';
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
    CheckCircleIcon,
    ExclamationTriangleIcon,
    GlobeAltIcon,
    CodeBracketIcon,
    BoltIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';

// ─── Constantes ───────────────────────────────────────────────────────────────

const AVAILABLE_SCOPES = [
    { key: 'org:read',         label: 'Lire les infos organisation',    group: 'Organisation' },
    { key: 'contacts:read',    label: 'Lire les contacts',              group: 'Contacts' },
    { key: 'contacts:write',   label: 'Créer/modifier les contacts',    group: 'Contacts' },
    { key: 'events:read',      label: 'Lire les événements',            group: 'Agenda' },
    { key: 'events:write',     label: 'Créer des événements',           group: 'Agenda' },
    { key: 'documents:read',   label: 'Lire les documents',             group: 'GED' },
    { key: 'documents:write',  label: 'Uploader des documents',         group: 'GED' },
    { key: 'webhooks:manage',  label: 'Gérer les webhooks',             group: 'Webhooks' },
];

const WEBHOOK_EVENTS = [
    'contact.created', 'contact.updated', 'event.created',
    'document.uploaded', 'task.completed',
];

// ─── Copier dans le presse-papier ─────────────────────────────────────────────

function CopyButton({ value, label = 'Copier' }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <button
            onClick={copy}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors"
        >
            {copied
                ? <><CheckSolid className="w-3.5 h-3.5 text-green-500" /> Copié !</>
                : <><ClipboardDocumentIcon className="w-3.5 h-3.5" /> {label}</>
            }
        </button>
    );
}

// ─── App Card ─────────────────────────────────────────────────────────────────

function AppCard({ app, onRevoke }) {
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [newSecret,     setNewSecret]     = useState(null);

    const scopeGroups = AVAILABLE_SCOPES
        .filter(s => (app.scopes ?? []).includes(s.key))
        .reduce((acc, s) => { (acc[s.group] = acc[s.group] ?? []).push(s.label); return acc; }, {});

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{app.name}</h3>
                    <p className="text-xs text-gray-400">{app.partner_email}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.is_approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {app.is_approved ? 'Approuvée' : 'En attente'}
                    </span>
                </div>
            </div>

            {/* Scopes */}
            <div className="mb-3">
                {Object.entries(scopeGroups).map(([group, labels]) => (
                    <div key={group} className="text-xs mb-1">
                        <span className="text-gray-400 font-medium">{group} : </span>
                        <span className="text-gray-600 dark:text-gray-300">{labels.join(', ')}</span>
                    </div>
                ))}
            </div>

            {/* Client ID */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3">
                <code className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">{app.client_id ?? 'Non disponible'}</code>
                {app.client_id && <CopyButton value={app.client_id} label="ID" />}
            </div>

            {/* Callback URL */}
            {app.callback_url && (
                <p className="text-xs text-gray-400 mb-3 truncate">
                    <GlobeAltIcon className="w-3.5 h-3.5 inline mr-1" /> {app.callback_url}
                </p>
            )}

            {deleteConfirm ? (
                <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-red-600">Révoquer l'accès ?</p>
                    <button onClick={() => { onRevoke(app.id); setDeleteConfirm(false); }} className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg">Confirmer</button>
                    <button onClick={() => setDeleteConfirm(false)} className="text-xs px-2 py-1 border border-gray-200 rounded-lg">Annuler</button>
                </div>
            ) : (
                <button
                    onClick={() => setDeleteConfirm(true)}
                    className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 mt-2"
                >
                    <TrashIcon className="w-3.5 h-3.5" /> Révoquer l'accès
                </button>
            )}
        </div>
    );
}

// ─── Formulaire nouvelle app partenaire ───────────────────────────────────────

function NewAppForm({ onCreated, onCancel }) {
    const [form,    setForm]    = useState({ name: '', partner_email: '', callback_url: '', scopes: [] });
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
        if (!form.name || !form.partner_email || form.scopes.length === 0) {
            setError('Remplissez tous les champs et sélectionnez au moins un scope.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.post('/partner/apps', form);
            onCreated(data.data);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Erreur lors de la création.');
        } finally {
            setLoading(false);
        }
    }

    const scopesByGroup = AVAILABLE_SCOPES.reduce((acc, s) => {
        (acc[s.group] = acc[s.group] ?? []).push(s);
        return acc;
    }, {});

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Nouvelle application partenaire</h3>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" /> {error}
                </div>
            )}

            <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nom de l'application <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Mon Application CRM" />
            </div>

            <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Email du partenaire <span className="text-red-500">*</span></label>
                <input type="email" value={form.partner_email} onChange={e => setForm(f => ({ ...f, partner_email: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="dev@monapp.com" />
            </div>

            <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">URL de callback <span className="text-red-500">*</span></label>
                <input type="url" value={form.callback_url} onChange={e => setForm(f => ({ ...f, callback_url: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="https://monapp.com/secretis/callback" />
            </div>

            {/* Scopes */}
            <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Permissions (scopes) <span className="text-red-500">*</span></label>
                {Object.entries(scopesByGroup).map(([group, scopes]) => (
                    <div key={group} className="mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{group}</p>
                        <div className="space-y-1">
                            {scopes.map(scope => (
                                <label key={scope.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={form.scopes.includes(scope.key)}
                                        onChange={() => toggleScope(scope.key)}
                                        className="rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <code className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{scope.key}</code>
                                    <span className="text-xs text-gray-500">{scope.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Créer l'application
                </button>
                <button type="button" onClick={onCancel} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Annuler
                </button>
            </div>
        </form>
    );
}

// ─── Page WebhooksIn ──────────────────────────────────────────────────────────

export default function WebhooksIn({ partnerApps: initialApps = [], logs: initialLogs = [] }) {
    const [apps,        setApps]        = useState(initialApps);
    const [logs,        setLogs]        = useState(initialLogs);
    const [activeTab,   setActiveTab]   = useState('apps');
    const [showNewForm, setShowNewForm] = useState(false);
    const [newAppCreds, setNewAppCreds] = useState(null);

    const BASE_URL = window.location.origin + '/partner/v1';

    const TABS = [
        { key: 'apps',    label: 'Applications partenaires' },
        { key: 'logs',    label: 'Logs entrants' },
        { key: 'docs',    label: 'Documentation API' },
    ];

    async function handleRevoke(appId) {
        await axios.delete(`/partner/apps/${appId}`);
        setApps(prev => prev.filter(a => a.id !== appId));
    }

    function handleAppCreated(creds) {
        setNewAppCreds(creds);
        setShowNewForm(false);
        // Reload apps
        axios.get('/partner/apps').then(({ data }) => setApps(data.data ?? []));
    }

    // Simulation logs temps réel
    async function refreshLogs() {
        const { data } = await axios.get('/partner/logs');
        setLogs(data.data ?? []);
    }

    return (
        <AppLayout>
            <Head title="Webhooks entrants" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.visit('/integrations')} className="text-gray-400 hover:text-gray-600">
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BoltIcon className="w-6 h-6 text-yellow-500" />
                                Webhooks &amp; API Partenaires
                            </h1>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 ml-8">
                            Intégrez SECRETIS avec vos propres applications via l'API partenaire.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNewForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" /> Nouvelle app
                    </button>
                </div>

                {/* Credentials de la nouvelle app (affiché UNE SEULE FOIS) */}
                {newAppCreds && (
                    <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl">
                        <div className="flex items-start gap-3 mb-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Sauvegardez ces informations maintenant !</p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Le Client Secret et le Webhook Secret ne seront affichés qu'une seule fois.</p>
                            </div>
                        </div>
                        {[
                            ['Client ID',       newAppCreds.client_id],
                            ['Client Secret',   newAppCreds.client_secret],
                            ['Webhook Secret',  newAppCreds.webhook_secret],
                        ].map(([label, value]) => (
                            <div key={label} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg mb-2">
                                <span className="text-xs font-medium text-gray-500 w-28 shrink-0">{label}</span>
                                <code className="text-xs text-gray-800 dark:text-gray-200 flex-1 break-all">{value}</code>
                                <CopyButton value={value} />
                            </div>
                        ))}
                        <button onClick={() => setNewAppCreds(null)} className="mt-2 text-xs text-amber-700 hover:text-amber-900">
                            ✓ J'ai sauvegardé ces informations
                        </button>
                    </div>
                )}

                {/* Formulaire nouvelle app */}
                {showNewForm && (
                    <div className="mb-6">
                        <NewAppForm onCreated={handleAppCreated} onCancel={() => setShowNewForm(false)} />
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={['px-4 py-1.5 rounded-lg text-sm font-medium transition-all', activeTab === tab.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'].join(' ')}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Applications */}
                {activeTab === 'apps' && (
                    <div>
                        {apps.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <BoltIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p className="font-medium">Aucune application partenaire</p>
                                <p className="text-sm mt-1">Créez une application pour accéder à l'API SECRETIS.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {apps.map(app => (
                                    <AppCard key={app.id} app={app} onRevoke={handleRevoke} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Logs */}
                {activeTab === 'logs' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Appels API entrants</h3>
                            <button onClick={refreshLogs} className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                                <ArrowPathIcon className="w-4 h-4" /> Actualiser
                            </button>
                        </div>
                        {logs.length === 0 ? (
                            <p className="text-center text-gray-400 py-10">Aucun appel enregistré.</p>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs">
                                        <span className={`w-16 text-center px-1.5 py-0.5 rounded font-mono font-bold ${log.http_status < 400 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{log.http_status}</span>
                                        <span className="font-mono text-gray-500 w-10">{log.method}</span>
                                        <span className="flex-1 text-gray-600 dark:text-gray-300 truncate font-mono">{log.path}</span>
                                        <span className="text-gray-400">{log.duration_ms}ms</span>
                                        <span className="text-gray-400">{new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Documentation */}
                {activeTab === 'docs' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl">
                            <p className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-1">Base URL</p>
                            <code className="text-xs text-purple-700 dark:text-purple-300">{BASE_URL}</code>
                        </div>

                        {/* Auth */}
                        <section>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><CodeBracketIcon className="w-4 h-4 text-purple-600" /> Authentification</h3>
                            <div className="p-4 bg-gray-900 rounded-xl text-xs text-green-400 font-mono overflow-x-auto">
                                {`POST ${BASE_URL.replace('/partner/v1', '')}/partner/oauth/token\n\n{\n  "grant_type": "client_credentials",\n  "client_id": "secretis_xxx",\n  "client_secret": "votre_secret"\n}\n\n# Réponse\n{\n  "access_token": "...",\n  "token_type": "Bearer",\n  "expires_in": 3600\n}`}
                            </div>
                        </section>

                        {/* Endpoints */}
                        {[
                            { method: 'GET',  path: '/organizations',       scope: 'org:read',        desc: 'Infos organisation' },
                            { method: 'GET',  path: '/contacts',            scope: 'contacts:read',   desc: 'Liste des contacts (paginé)' },
                            { method: 'POST', path: '/events',              scope: 'events:write',    desc: 'Créer un événement' },
                            { method: 'POST', path: '/documents',           scope: 'documents:write', desc: 'Uploader un document (multipart)' },
                            { method: 'GET',  path: '/webhooks',            scope: 'webhooks:manage', desc: 'Liste des webhooks configurés' },
                            { method: 'POST', path: '/webhooks',            scope: 'webhooks:manage', desc: 'Créer un webhook entrant' },
                        ].map(ep => (
                            <div key={ep.path} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs">
                                <span className={`w-12 text-center font-bold px-1.5 py-0.5 rounded ${ep.method === 'GET' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>{ep.method}</span>
                                <code className="text-gray-700 dark:text-gray-300 flex-1">{ep.path}</code>
                                <code className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{ep.scope}</code>
                                <span className="text-gray-400 hidden sm:block">{ep.desc}</span>
                            </div>
                        ))}

                        {/* Webhooks */}
                        <section>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Format des webhooks sortants</h3>
                            <p className="text-xs text-gray-500 mb-2">Chaque event est signé avec HMAC-SHA256 (header <code>X-SECRETIS-Signature</code>).</p>
                            <div className="p-4 bg-gray-900 rounded-xl text-xs text-green-400 font-mono overflow-x-auto">
                                {`POST https://votre-app.com/webhook\n\nHeaders:\n  X-SECRETIS-Signature: sha256=abc123...\n  X-SECRETIS-Event: contact.created\n  Content-Type: application/json\n\nBody:\n{\n  "event": "contact.created",\n  "timestamp": "2026-01-15T10:30:00Z",\n  "data": {\n    "id": 42,\n    "name": "Kouassi Jean",\n    "email": "jean@example.ci"\n  }\n}`}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
export { WebhooksIn };
