import { useState, useEffect, useCallback } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    PlayIcon,
    TrashIcon,
    DocumentTextIcon,
    ChartBarIcon,
    ClockIcon,
    ShieldCheckIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid, XCircleIcon } from '@heroicons/react/24/solid';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TABS = ['configuration', 'logs', 'statistiques'];
const TAB_LABELS = {
    configuration: 'Configuration',
    logs:          'Logs',
    statistiques:  'Statistiques',
};

const STATUS_COLOR = {
    active:   'text-green-600 bg-green-50',
    error:    'text-red-600 bg-red-50',
    pending:  'text-amber-600 bg-amber-50',
    disabled: 'text-gray-500 bg-gray-100',
};

// ─── Formulaire dynamique (depuis config_schema) ──────────────────────────────

function DynamicConfigForm({ schema = {}, onSubmit, isInstalled, integration }) {
    const fields   = schema.fields ?? [];
    const { data, setData, processing, errors } = useForm(
        Object.fromEntries(fields.map(f => [f.key, '']))
    );
    const [showPasswords, setShowPasswords] = useState({});

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit(data);
    }

    if (!fields.length) {
        return (
            <p className="text-sm text-gray-500 italic">Ce connecteur ne nécessite pas de configuration.</p>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map(field => (
                <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {field.type === 'select' ? (
                        <select
                            value={data[field.key]}
                            onChange={e => setData(field.key, e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Sélectionner…</option>
                            {(field.options ?? []).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    ) : field.type === 'textarea' ? (
                        <textarea
                            value={data[field.key]}
                            onChange={e => setData(field.key, e.target.value)}
                            rows={3}
                            placeholder={field.placeholder ?? ''}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                    ) : (
                        <div className="relative">
                            <input
                                type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                                value={data[field.key]}
                                onChange={e => setData(field.key, e.target.value)}
                                placeholder={field.placeholder ?? (field.type === 'password' ? '••••••••••••' : '')}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {field.type === 'password' && (
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(p => ({ ...p, [field.key]: !p[field.key] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords[field.key]
                                        ? <EyeSlashIcon className="w-4 h-4" />
                                        : <EyeIcon className="w-4 h-4" />
                                    }
                                </button>
                            )}
                        </div>
                    )}

                    {field.help && (
                        <p className="text-xs text-gray-400 mt-1">{field.help}</p>
                    )}
                    {errors[field.key] && (
                        <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>
                    )}
                </div>
            ))}

            <button
                type="submit"
                disabled={processing}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {processing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
                {isInstalled ? 'Mettre à jour la configuration' : 'Installer le connecteur'}
            </button>
        </form>
    );
}

// ─── Onglet Logs ──────────────────────────────────────────────────────────────

function LogsTab({ integrationId }) {
    const [logs,    setLogs]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [page,    setPage]    = useState(1);
    const [meta,    setMeta]    = useState({});

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/integrations/${integrationId}/logs?page=${page}`);
            setLogs(data.data);
            setMeta(data.meta);
        } finally {
            setLoading(false);
        }
    }, [integrationId, page]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const STATUS_ICON = {
        success: <CheckSolid className="w-4 h-4 text-green-500" />,
        error:   <XCircleIcon className="w-4 h-4 text-red-500" />,
        retry:   <ArrowPathIcon className="w-4 h-4 text-amber-500" />,
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Historique des événements</h3>
                <button onClick={fetchLogs} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <ArrowPathIcon className="w-4 h-4" /> Actualiser
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
            ) : logs.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Aucun événement enregistré.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left pb-2 text-xs text-gray-500 font-medium">Statut</th>
                                <th className="text-left pb-2 text-xs text-gray-500 font-medium">Événement</th>
                                <th className="text-left pb-2 text-xs text-gray-500 font-medium">Direction</th>
                                <th className="text-left pb-2 text-xs text-gray-500 font-medium">HTTP</th>
                                <th className="text-left pb-2 text-xs text-gray-500 font-medium">Durée</th>
                                <th className="text-left pb-2 text-xs text-gray-500 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="py-2">{STATUS_ICON[log.status]}</td>
                                    <td className="py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{log.event_type}</td>
                                    <td className="py-2">
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${log.direction === 'inbound' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                            {log.direction}
                                        </span>
                                    </td>
                                    <td className="py-2 text-xs text-gray-500">{log.http_status ?? '—'}</td>
                                    <td className="py-2 text-xs text-gray-500">{log.duration_ms != null ? `${log.duration_ms}ms` : '—'}</td>
                                    <td className="py-2 text-xs text-gray-400">
                                        {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {meta.total > meta.per_page && (
                        <div className="flex justify-between mt-4 text-sm">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="text-blue-600 disabled:opacity-30 hover:underline"
                            >
                                Précédent
                            </button>
                            <span className="text-gray-400">Page {page} / {Math.ceil(meta.total / meta.per_page)}</span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= Math.ceil(meta.total / meta.per_page)}
                                className="text-blue-600 disabled:opacity-30 hover:underline"
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Onglet Statistiques ──────────────────────────────────────────────────────

function StatsTab({ stats }) {
    if (!stats) return <p className="text-gray-400 text-sm">Installez d'abord ce connecteur pour voir les statistiques.</p>;

    const statCards = [
        { label: 'Événements (30j)',   value: stats.total_events,           icon: ChartBarIcon,      color: 'text-blue-600' },
        { label: 'Taux de succès',     value: `${stats.success_rate}%`,     icon: CheckCircleIcon,   color: 'text-green-600' },
        { label: 'Latence moyenne',    value: `${stats.avg_latency_ms}ms`,  icon: ClockIcon,         color: 'text-purple-600' },
        { label: "Événements auj.",    value: stats.events_today,           icon: ArrowPathIcon,     color: 'text-amber-600' },
    ];

    return (
        <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map(card => (
                    <div key={card.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                        <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
                    </div>
                ))}
            </div>

            {stats.last_error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
                    <strong>Dernière erreur :</strong> {stats.last_error}
                </div>
            )}

            {/* Mini graphique événements/jour */}
            {stats.events_by_day?.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Activité (30 derniers jours)</h4>
                    <div className="flex items-end gap-1 h-16">
                        {stats.events_by_day.map((d, i) => {
                            const maxTotal = Math.max(...stats.events_by_day.map(x => x.total), 1);
                            const heightPct = (d.total / maxTotal) * 100;
                            const successPct = d.total > 0 ? (d.success / d.total) * 100 : 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 min-w-0 relative group"
                                    title={`${d.day}: ${d.total} événements (${successPct.toFixed(0)}% succès)`}
                                >
                                    <div
                                        className="w-full rounded-t transition-all"
                                        style={{
                                            height: `${heightPct}%`,
                                            background: successPct > 90
                                                ? '#22c55e'
                                                : successPct > 70
                                                    ? '#f59e0b'
                                                    : '#ef4444',
                                            minHeight: d.total > 0 ? '4px' : '0',
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{stats.events_by_day[0]?.day}</span>
                        <span>{stats.events_by_day[stats.events_by_day.length - 1]?.day}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Page ConnectorDetail ─────────────────────────────────────────────────────

export default function ConnectorDetail({ connector, integration, stats }) {
    const [activeTab,      setActiveTab]      = useState('configuration');
    const [testLoading,    setTestLoading]    = useState(false);
    const [testResult,     setTestResult]     = useState(null);
    const [syncLoading,    setSyncLoading]    = useState(false);
    const [deleteConfirm,  setDeleteConfirm]  = useState(false);
    const [installLoading, setInstallLoading] = useState(false);
    const [installError,   setInstallError]   = useState(null);

    const isInstalled = !!integration;
    const statusColor = STATUS_COLOR[integration?.status] ?? STATUS_COLOR.pending;

    async function handleInstall(config) {
        setInstallLoading(true);
        setInstallError(null);
        try {
            await axios.post(`/integrations/${connector.id}/install`, config);
            router.reload({ only: ['integration', 'stats'] });
        } catch (err) {
            setInstallError(err.response?.data?.message ?? 'Erreur lors de l\'installation.');
        } finally {
            setInstallLoading(false);
        }
    }

    async function handleTest() {
        setTestLoading(true);
        setTestResult(null);
        try {
            const { data } = await axios.post(`/integrations/${integration.id}/test`);
            setTestResult({ success: data.success, message: data.message });
        } catch {
            setTestResult({ success: false, message: 'Erreur lors du test.' });
        } finally {
            setTestLoading(false);
        }
    }

    async function handleSync() {
        setSyncLoading(true);
        try {
            await axios.post(`/integrations/${integration.id}/sync`);
        } finally {
            setSyncLoading(false);
            router.reload({ only: ['integration'] });
        }
    }

    async function handleUninstall() {
        await axios.delete(`/integrations/${integration.id}`);
        router.visit('/integrations');
    }

    return (
        <AppLayout>
            <Head title={`${connector.name} — Intégrations`} />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Retour */}
                <button
                    onClick={() => router.visit('/integrations')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" /> Marketplace
                </button>

                {/* Header connecteur */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0">
                        {connector.icon_url
                            ? <img src={connector.icon_url} alt={connector.name} className="w-10 h-10 object-contain" />
                            : <ShieldCheckIcon className="w-8 h-8 text-gray-400" />
                        }
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{connector.name}</h1>
                            {connector.is_official && (
                                <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                    <ShieldCheckIcon className="w-3 h-3" /> Officiel IBIG
                                </span>
                            )}
                            {connector.status === 'beta' && (
                                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Bêta</span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{connector.description}</p>

                        {/* Statut installation */}
                        {isInstalled && (
                            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                                {integration.status === 'active'
                                    ? <CheckSolid className="w-3.5 h-3.5" />
                                    : integration.status === 'error'
                                        ? <XCircleIcon className="w-3.5 h-3.5" />
                                        : <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                }
                                {integration.status === 'active' ? 'Connecté' : integration.status === 'error' ? 'Erreur de connexion' : 'Configuration en cours'}
                            </div>
                        )}
                    </div>

                    {/* Actions rapides */}
                    {isInstalled && (
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <button
                                onClick={handleTest}
                                disabled={testLoading}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                {testLoading
                                    ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                    : <PlayIcon className="w-3.5 h-3.5" />
                                }
                                Tester
                            </button>
                            <button
                                onClick={handleSync}
                                disabled={syncLoading}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                <ArrowPathIcon className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                                Synchroniser
                            </button>
                        </div>
                    )}
                </div>

                {/* Résultat test */}
                {testResult && (
                    <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {testResult.success
                            ? <CheckCircleIcon className="w-4 h-4" />
                            : <ExclamationTriangleIcon className="w-4 h-4" />
                        }
                        {testResult.message}
                    </div>
                )}

                {/* Erreur d'installation */}
                {installError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {installError}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={[
                                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                activeTab === tab
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                            ].join(' ')}
                        >
                            {TAB_LABELS[tab]}
                        </button>
                    ))}
                </div>

                {/* Contenu des tabs */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                    {activeTab === 'configuration' && (
                        <div>
                            {/* Instructions */}
                            {connector.config_schema?.instructions && (
                                <div className="mb-6">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                                        Instructions d'installation
                                    </h3>
                                    <ol className="space-y-2">
                                        {connector.config_schema.instructions.map((step, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                    {i + 1}
                                                </span>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            <DynamicConfigForm
                                schema={connector.config_schema ?? {}}
                                onSubmit={handleInstall}
                                isInstalled={isInstalled}
                                integration={integration}
                            />

                            {/* Désinstaller */}
                            {isInstalled && (
                                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    {deleteConfirm ? (
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm text-red-600">Confirmer la désinstallation ?</p>
                                            <button onClick={handleUninstall} className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                                Confirmer
                                            </button>
                                            <button onClick={() => setDeleteConfirm(false)} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                                                Annuler
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(true)}
                                            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" /> Désinstaller ce connecteur
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'logs' && integration && (
                        <LogsTab integrationId={integration.id} />
                    )}
                    {activeTab === 'logs' && !integration && (
                        <p className="text-gray-400 text-sm">Installez d'abord ce connecteur pour voir les logs.</p>
                    )}

                    {activeTab === 'statistiques' && (
                        <StatsTab stats={stats} />
                    )}
                </div>

                {/* Lien documentation */}
                {connector.documentation_url && (
                    <div className="mt-4 text-center">
                        <a
                            href={connector.documentation_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            📖 Documentation officielle →
                        </a>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
