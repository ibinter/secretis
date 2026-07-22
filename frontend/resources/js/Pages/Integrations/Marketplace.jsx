import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    MagnifyingGlassIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    PlusIcon,
    StarIcon,
    ShieldCheckIcon,
    SparklesIcon,
    BeakerIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TABS = [
    { key: '',              label: 'Tout' },
    { key: 'communication', label: 'Communication' },
    { key: 'erp',          label: 'Comptabilité / ERP' },
    { key: 'payment',      label: 'Paiements' },
    { key: 'productivity', label: 'Productivité' },
    { key: 'hr',           label: 'RH' },
    { key: 'storage',      label: 'Stockage' },
    { key: 'custom',       label: 'Afrique' },
];

const STATUS_BADGE = {
    active:   { label: 'Actif',     color: 'bg-green-100 text-green-700' },
    beta:     { label: 'Bêta',      color: 'bg-purple-100 text-purple-700' },
    deprecated: { label: 'Déprécié', color: 'bg-gray-100 text-gray-500' },
};

const PLAN_LABELS = {
    starter:    'Starter',
    pro:        'Pro',
    enterprise: 'Enterprise',
};

// ─── ConnectorCard ────────────────────────────────────────────────────────────

function ConnectorCard({ connector, plan }) {
    const [loading, setLoading] = useState(false);

    const planOrder    = { starter: 1, pro: 2, enterprise: 3 };
    const planLocked   = (planOrder[connector.required_plan] ?? 1) > (planOrder[plan] ?? 1);
    const statusBadge  = STATUS_BADGE[connector.status] ?? STATUS_BADGE.active;

    function handleAction() {
        if (planLocked) {
            router.visit('/abonnement/upgrade');
            return;
        }
        if (connector.installed) {
            router.visit(`/integrations/${connector.id}`);
        } else {
            router.visit(`/integrations/${connector.id}`);
        }
    }

    const installStatus = connector.install_status;

    return (
        <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">

            {/* Badges en haut à droite */}
            <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end">
                {connector.is_official && (
                    <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        <ShieldCheckIcon className="w-3 h-3" /> Officiel
                    </span>
                )}
                {connector.is_premium && !connector.installed && (
                    <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        <StarIcon className="w-3 h-3" /> Premium
                    </span>
                )}
                {connector.status === 'beta' && (
                    <span className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        <BeakerIcon className="w-3 h-3" /> Bêta
                    </span>
                )}
            </div>

            {/* Logo + Nom */}
            <div className="flex items-start gap-4 pr-24 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 dark:border-gray-600">
                    {connector.icon_url
                        ? <img src={connector.icon_url} alt={connector.name} className="w-8 h-8 object-contain" />
                        : <SparklesIcon className="w-6 h-6 text-gray-400" />
                    }
                </div>
                <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">
                        {connector.name}
                    </h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge.color}`}>
                        {statusBadge.label}
                    </span>
                </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                {connector.description}
            </p>

            {/* Statut d'installation */}
            {connector.installed && (
                <div className="flex items-center gap-1.5 mb-3 text-xs">
                    {installStatus === 'active' && (
                        <span className="flex items-center gap-1 text-green-600">
                            <CheckCircleSolid className="w-4 h-4" /> Connecté
                        </span>
                    )}
                    {installStatus === 'error' && (
                        <span className="flex items-center gap-1 text-red-500">
                            <ExclamationTriangleIcon className="w-4 h-4" /> Erreur
                        </span>
                    )}
                    {installStatus === 'pending' && (
                        <span className="flex items-center gap-1 text-amber-500">
                            <ArrowPathIcon className="w-4 h-4 animate-spin" /> Configuration…
                        </span>
                    )}
                    {connector.last_sync_at && (
                        <span className="text-gray-400 ml-auto">
                            Sync {new Date(connector.last_sync_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            )}

            {/* Plan requis (si verrouillé) */}
            {planLocked && (
                <div className="flex items-center gap-1 text-xs text-amber-600 mb-3">
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    Nécessite le plan <strong className="ml-1">{PLAN_LABELS[connector.required_plan]}</strong>
                </div>
            )}

            {/* CTA */}
            <button
                onClick={handleAction}
                disabled={loading}
                className={[
                    'w-full py-2 rounded-xl text-xs font-semibold transition-all',
                    planLocked
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : connector.installed
                            ? installStatus === 'error'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                            : 'bg-blue-600 text-white hover:bg-blue-700',
                ].join(' ')}
            >
                {loading
                    ? <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto" />
                    : planLocked
                        ? 'Mettre à niveau'
                        : connector.installed
                            ? installStatus === 'error' ? 'Reconfigurer' : 'Gérer'
                            : 'Installer'
                }
            </button>
        </div>
    );
}

// ─── Section "Populaires en Afrique" ─────────────────────────────────────────

function AfricaSpotlight({ connectors }) {
    const africaSlugs = ['africas-talking', 'orange-sms', 'cinetpay', 'sage-afrique', 'mtn-momo', 'wave', 'orange-money'];
    const africaItems = connectors.filter(c => africaSlugs.includes(c.slug));

    if (!africaItems.length) return null;

    return (
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🌍</span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Populaires en Afrique</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {africaItems.map(c => (
                    <button
                        key={c.id}
                        onClick={() => router.visit(`/integrations/${c.id}`)}
                        className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                            {c.icon_url
                                ? <img src={c.icon_url} alt={c.name} className="w-7 h-7 object-contain" />
                                : <SparklesIcon className="w-5 h-5 text-gray-400" />
                            }
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{c.name}</span>
                        {c.installed && <CheckCircleSolid className="w-4 h-4 text-green-500" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Section "Nouveautés" ─────────────────────────────────────────────────────

function NewConnectors({ connectors }) {
    const recent = [...connectors]
        .filter(c => c.status === 'beta' || c.status === 'active')
        .slice(0, 4);

    if (!recent.length) return null;

    return (
        <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-200">Nouvelles intégrations</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-blue-200">
                {recent.map(c => (
                    <button
                        key={c.id}
                        onClick={() => router.visit(`/integrations/${c.id}`)}
                        className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-700 rounded-lg px-3 py-2 shrink-0 hover:shadow-sm transition-all"
                    >
                        {c.icon_url
                            ? <img src={c.icon_url} alt={c.name} className="w-5 h-5 object-contain" />
                            : <SparklesIcon className="w-4 h-4 text-gray-400" />
                        }
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                        {c.status === 'beta' && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">Bêta</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Marketplace({ connectors = [], byCategory = {}, plan = 'starter', activeCount = 0 }) {
    const [activeTab, setActiveTab]   = useState('');
    const [search,    setSearch]      = useState('');

    const filtered = useMemo(() => {
        let items = connectors;
        if (activeTab) items = items.filter(c => c.category === activeTab);
        if (search)    items = items.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.description?.toLowerCase().includes(search.toLowerCase())
        );
        return items;
    }, [connectors, activeTab, search]);

    return (
        <AppLayout>
            <Head title="Marketplace d'intégrations" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Marketplace d'intégrations
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {activeCount > 0
                                ? <><CheckCircleSolid className="w-4 h-4 text-green-500 inline mr-1" />{activeCount} intégration{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}</>
                                : 'Connectez SECRETIS à vos outils préférés'
                            }
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.visit('/integrations/webhooks')}
                            className="text-sm px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Webhooks
                        </button>
                        <button
                            onClick={() => router.visit('/integrations/api-keys')}
                            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                        >
                            <PlusIcon className="w-4 h-4" /> Clés API
                        </button>
                    </div>
                </div>

                {/* Sections spéciales */}
                <AfricaSpotlight connectors={connectors} />
                <NewConnectors connectors={connectors} />

                {/* Barre de recherche */}
                <div className="relative mb-6">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher une intégration…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>

                {/* Tabs catégories */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-thin scrollbar-thumb-gray-200">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={[
                                'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                                activeTab === tab.key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
                            ].join(' ')}
                        >
                            {tab.label}
                            {tab.key && byCategory[tab.key]?.length
                                ? <span className="ml-1.5 text-xs opacity-70">({byCategory[tab.key].length})</span>
                                : null
                            }
                        </button>
                    ))}
                </div>

                {/* Grille des connecteurs */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <SparklesIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="font-medium">Aucune intégration trouvée</p>
                        <p className="text-sm mt-1">Essayez d'autres mots-clés ou sélectionnez une autre catégorie.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(connector => (
                            <ConnectorCard key={connector.id} connector={connector} plan={plan} />
                        ))}
                    </div>
                )}

                {/* Footer — lien custom connector */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-gray-500">
                        Vous ne trouvez pas votre intégration ?{' '}
                        <a href="mailto:integrations@ibig.ci" className="text-blue-600 hover:underline font-medium">
                            Contactez notre équipe
                        </a>
                        {' '}ou{' '}
                        <a href="/docs/integrations#custom-connector" className="text-blue-600 hover:underline font-medium" target="_blank">
                            créez un connecteur custom
                        </a>.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
