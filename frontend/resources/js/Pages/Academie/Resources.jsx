import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    MagnifyingGlassIcon,
    DocumentArrowDownIcon,
    FunnelIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    pdf:   { label: 'PDF',   icon: '📄', color: '#E53E3E' },
    excel: { label: 'Excel', icon: '📊', color: '#276749' },
    word:  { label: 'Word',  icon: '📝', color: '#2B6CB0' },
    csv:   { label: 'CSV',   icon: '📋', color: '#744210' },
    zip:   { label: 'ZIP',   icon: '🗜️', color: '#553C9A' },
    link:  { label: 'Lien',  icon: '🔗', color: '#2C7A7B' },
};

const TYPE_OPTIONS = [
    { value: '', label: 'Tous les types' },
    ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

// ─── Resource Card ────────────────────────────────────────────────────────────

function ResourceCard({ resource }) {
    const title = resource.title?.fr ?? resource.title;
    const desc  = typeof resource.description === 'object'
        ? (resource.description?.fr ?? '')
        : (resource.description ?? '');
    const cfg   = TYPE_CONFIG[resource.type] ?? { label: resource.type, icon: '📁', color: '#718096' };

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200">
            <div className="flex items-start gap-4">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: cfg.color + '18' }}
                >
                    {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                        <h3 className="flex-1 text-sm font-bold text-gray-900 dark:text-white leading-snug">
                            {title}
                        </h3>
                        <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                            style={{ backgroundColor: cfg.color + '18', color: cfg.color }}
                        >
                            {cfg.label}
                        </span>
                    </div>
                    {desc && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{desc}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    {resource.module && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg">
                            {resource.module}
                        </span>
                    )}
                    {resource.download_count > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                            {resource.download_count} téléchargement{resource.download_count > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <a
                    href={route('api.academy.resources.download', { id: resource.id })}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                    Télécharger
                </a>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieResources({ resources, categories }) {
    const [search, setSearch]       = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterCat, setFilterCat]   = useState('');

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return resources.filter(r => {
            const title = (r.title?.fr ?? '').toLowerCase();
            const desc  = (typeof r.description === 'object' ? (r.description?.fr ?? '') : (r.description ?? '')).toLowerCase();
            if (q && !title.includes(q) && !desc.includes(q)) return false;
            if (filterType && r.type !== filterType)           return false;
            if (filterCat  && r.category_id !== Number(filterCat)) return false;
            return true;
        });
    }, [resources, search, filterType, filterCat]);

    const hasFilters = filterType || filterCat;

    return (
        <AppLayout>
            <Head title="Ressources — Académie SECRETIS" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* En-tête */}
                <div className="mb-8">
                    <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <Link href={route('academie.index')} className="hover:text-purple-600">Académie</Link>
                        <span className="mx-2">/</span>
                        <span>Ressources</span>
                    </nav>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        Bibliothèque de ressources
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {resources.length} ressource{resources.length > 1 ? 's' : ''} disponible{resources.length > 1 ? 's' : ''}
                        — guides, modèles et documentation
                    </p>
                </div>

                {/* Types en chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {TYPE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setFilterType(opt.value === filterType ? '' : opt.value)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                filterType === opt.value
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                            }`}
                        >
                            {opt.value && TYPE_CONFIG[opt.value]?.icon}{' '}{opt.label}
                        </button>
                    ))}
                </div>

                {/* Barre de recherche + filtre catégorie */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher une ressource…"
                            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <select
                        value={filterCat}
                        onChange={e => setFilterCat(e.target.value)}
                        className="text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Toutes les catégories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name?.fr ?? cat.name}
                            </option>
                        ))}
                    </select>
                    {(hasFilters || search) && (
                        <button
                            onClick={() => { setFilterType(''); setFilterCat(''); setSearch(''); }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-500 hover:text-red-600 transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4" /> Effacer
                        </button>
                    )}
                </div>

                {/* Grille */}
                {filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map(resource => (
                            <ResourceCard key={resource.id} resource={resource} />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <DocumentArrowDownIcon className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune ressource trouvée</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Modifiez vos critères de filtrage pour trouver ce que vous cherchez.
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
export { AcademieResources };
