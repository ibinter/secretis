import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    ShoppingBagIcon,
    MagnifyingGlassIcon,
    StarIcon,
    CheckCircleIcon,
    ArrowDownTrayIcon,
    CurrencyDollarIcon,
    BuildingStorefrontIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// ─── Catégories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
    { value: '',               label: 'Toutes',        emoji: '🌐' },
    { value: 'comptabilite',   label: 'Comptabilité',  emoji: '💰' },
    { value: 'rh',             label: 'RH',            emoji: '👥' },
    { value: 'communication',  label: 'Communication', emoji: '📡' },
    { value: 'securite',       label: 'Sécurité',      emoji: '🔒' },
    { value: 'productivite',   label: 'Productivité',  emoji: '⚡' },
];

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ rating, size = 'sm' }) {
    const stars = Array.from({ length: 5 }, (_, i) => i + 1);
    const cls   = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
        <div className="flex items-center gap-0.5">
            {stars.map(star => (
                star <= Math.round(rating)
                    ? <StarSolid key={star} className={`${cls} text-yellow-400`}/>
                    : <StarIcon  key={star} className={`${cls} text-gray-300`}/>
            ))}
            <span className="text-xs text-gray-500 ml-1">{rating?.toFixed(1)}</span>
        </div>
    );
}

// ─── AppCard ──────────────────────────────────────────────────────────────────

function AppCard({ app, isInstalled, onInstall }) {
    const [installing, setInstalling] = useState(false);

    const priceLabel = app.price_monthly === 0
        ? 'Gratuit'
        : `${app.price_monthly.toLocaleString('fr-FR')} FCFA / mois`;

    async function handleInstall() {
        setInstalling(true);
        try {
            await onInstall(app);
        } finally {
            setInstalling(false);
        }
    }

    return (
        <div className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
            app.is_featured ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'
        }`}>
            {app.is_featured && (
                <div className="bg-indigo-600 text-white text-xs font-medium text-center py-1">
                    ⭐ Application vedette
                </div>
            )}

            <div className="p-5">
                {/* En-tête */}
                <div className="flex items-start gap-3 mb-3">
                    {app.icon_url ? (
                        <img src={app.icon_url} alt={app.name}
                             className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100"/>
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                            <ShoppingBagIcon className="w-6 h-6 text-white"/>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{app.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{app.developer_name}</p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{app.description}</p>

                {/* Rating et installations */}
                <div className="flex items-center justify-between mb-4">
                    <StarRating rating={app.rating_avg}/>
                    <span className="text-xs text-gray-400">
                        <ArrowDownTrayIcon className="w-3 h-3 inline mr-0.5"/>
                        {app.install_count.toLocaleString('fr-FR')} install.
                    </span>
                </div>

                {/* Prix */}
                <div className="flex items-center justify-between mb-4 p-2.5 bg-gray-50 rounded-lg">
                    <div>
                        <div className={`text-sm font-bold ${app.price_monthly === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            {priceLabel}
                        </div>
                        {app.price_yearly > 0 && (
                            <div className="text-xs text-gray-500">
                                ou {app.price_yearly.toLocaleString('fr-FR')} FCFA / an
                            </div>
                        )}
                    </div>
                    {app.price_monthly === 0 && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            Gratuit
                        </span>
                    )}
                </div>

                {/* Bouton action */}
                {isInstalled ? (
                    <div className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 text-sm font-medium rounded-xl border border-green-200">
                        <CheckCircleIcon className="w-4 h-4"/>
                        Installée
                    </div>
                ) : (
                    <button
                        onClick={handleInstall}
                        disabled={installing}
                        className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {installing ? 'Installation...' : 'Installer'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MarketplaceIndex({ apps, installations }) {
    const [search, setSearch]     = useState('');
    const [category, setCategory] = useState('');

    const installedAppIds = new Set((installations ?? []).map(i => i.app_id));

    const filtered = (apps ?? []).filter(app => {
        const matchesSearch = !search
            || app.name.toLowerCase().includes(search.toLowerCase())
            || app.description?.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !category || app.category === category;
        return matchesSearch && matchesCategory;
    });

    const featured = filtered.filter(a => a.is_featured);
    const regular  = filtered.filter(a => !a.is_featured);

    async function handleInstall(app) {
        const res = await fetch(`/marketplace/apps/${app.id}/install`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
            },
        });
        if (res.ok) {
            router.reload();
        } else {
            const data = await res.json();
            alert(data.message ?? 'Erreur lors de l\'installation.');
        }
    }

    return (
        <AppLayout>
            <Head title="Marketplace"/>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* En-tête */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <BuildingStorefrontIcon className="w-8 h-8 text-indigo-600"/>
                        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
                    </div>
                    <p className="text-gray-500">
                        Étendez SECRETIS avec des applications partenaires.
                    </p>
                </div>

                {/* Recherche + filtres */}
                <div className="flex flex-wrap gap-3 mb-8 items-end">
                    <div className="flex-1 min-w-56">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher une application..."
                                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Catégories */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => setCategory(cat.value)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                category === cat.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                        >
                            <span>{cat.emoji}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Applications vedettes */}
                {featured.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-base font-semibold text-gray-700 mb-4">
                            ⭐ Applications vedettes
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {featured.map(app => (
                                <AppCard
                                    key={app.id}
                                    app={app}
                                    isInstalled={installedAppIds.has(app.id)}
                                    onInstall={handleInstall}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Toutes les applications */}
                {regular.length > 0 && (
                    <section>
                        <h2 className="text-base font-semibold text-gray-700 mb-4">
                            Toutes les applications ({regular.length})
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {regular.map(app => (
                                <AppCard
                                    key={app.id}
                                    app={app}
                                    isInstalled={installedAppIds.has(app.id)}
                                    onInstall={handleInstall}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {filtered.length === 0 && (
                    <div className="text-center py-20">
                        <BuildingStorefrontIcon className="w-16 h-16 text-gray-200 mx-auto mb-4"/>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Aucune application trouvée</h3>
                        <p className="text-gray-500">Modifiez vos critères de recherche.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
