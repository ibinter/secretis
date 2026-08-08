/**
 * Academie/Resources.jsx — Bibliothèque de ressources (GET /academie/ressources)
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, mêmes filtres locaux (type, catégorie,
 * recherche), même route de téléchargement
 * `route('api.academy.resources.download', { id })`.
 *
 * Props réelles (AcademyController@resources → Inertia::render('Academie/Resources')) :
 *   resources  : [{ id, title, description, type, module, download_count, category_id }]
 *   categories : [{ id, slug, name, color, icon }]
 */

import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    MagnifyingGlassIcon,
    DocumentArrowDownIcon,
    DocumentTextIcon,
    TableCellsIcon,
    ArchiveBoxIcon,
    LinkIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import {
    PageHeader, Button, Badge, EmptyState,
    cx, CONTROL, SURFACE, SURFACE_SUNK, BORDER,
    TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ─── Constantes ───────────────────────────────────────────────────────────────
/* Un type de fichier est une information neutre : icône monochrome + libellé,
   jamais une pastille de couleur arbitraire ni un emoji.                      */

const TYPE_CONFIG = {
    pdf:   { label: 'PDF',   Icon: DocumentTextIcon },
    excel: { label: 'Excel', Icon: TableCellsIcon },
    word:  { label: 'Word',  Icon: DocumentTextIcon },
    csv:   { label: 'CSV',   Icon: TableCellsIcon },
    zip:   { label: 'ZIP',   Icon: ArchiveBoxIcon },
    link:  { label: 'Lien',  Icon: LinkIcon },
};

const TYPE_OPTIONS = [
    { value: '', label: 'Tous les types' },
    ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

// ─── Carte ressource ──────────────────────────────────────────────────────────

function ResourceCard({ resource }) {
    const title = resource.title?.fr ?? resource.title;
    const desc  = typeof resource.description === 'object'
        ? (resource.description?.fr ?? '')
        : (resource.description ?? '');
    const cfg  = TYPE_CONFIG[resource.type] ?? { label: resource.type, Icon: DocumentTextIcon };
    const Icon = cfg.Icon;

    return (
        <article className={cx(
            SURFACE, 'flex flex-col gap-4 rounded-xl border p-5 shadow-sm transition-colors',
            BORDER, 'hover:border-purple-300 dark:hover:border-purple-500/50',
        )}>
            <div className="flex items-start gap-4">
                <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', SURFACE_SUNK, BORDER)}>
                    <Icon className={cx('h-5 w-5', TEXT_MUTED)} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <h3 className={cx('flex-1 text-sm font-semibold leading-5', TEXT_TITLE)}>
                            {title}
                        </h3>
                        <Badge variant="neutral" className="shrink-0">{cfg.label}</Badge>
                    </div>
                    {desc && (
                        <p className={cx('mt-1 line-clamp-2 text-xs leading-5', TEXT_MUTED)}>{desc}</p>
                    )}
                </div>
            </div>

            <div className={cx('mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3', BORDER)}>
                <div className={cx('flex flex-wrap items-center gap-3 text-xs', TEXT_FAINT)}>
                    {resource.module && (
                        <span className={cx('rounded-lg px-2 py-1', SURFACE_SUNK)}>{resource.module}</span>
                    )}
                    {resource.download_count > 0 && (
                        <span className="flex items-center gap-1">
                            <DocumentArrowDownIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className={NUM}>{resource.download_count}</span>
                            <span>téléchargement{resource.download_count > 1 ? 's' : ''}</span>
                        </span>
                    )}
                </div>

                <Button
                    href={route('api.academy.resources.download', { id: resource.id })}
                    variant="primary" size="sm" icon={DocumentArrowDownIcon}
                >
                    Télécharger
                </Button>
            </div>
        </article>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieResources({ resources = [], categories = [] }) {
    const rows = Array.isArray(resources) ? resources : [];
    const cats = Array.isArray(categories) ? categories : [];

    const [search, setSearch]       = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterCat, setFilterCat]   = useState('');

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return rows.filter(r => {
            const title = (r.title?.fr ?? '').toLowerCase();
            const desc  = (typeof r.description === 'object' ? (r.description?.fr ?? '') : (r.description ?? '')).toLowerCase();
            if (q && !title.includes(q) && !desc.includes(q)) return false;
            if (filterType && r.type !== filterType)           return false;
            if (filterCat  && r.category_id !== Number(filterCat)) return false;
            return true;
        });
    }, [rows, search, filterType, filterCat]);

    const hasFilters = Boolean(filterType || filterCat);
    const isFiltered = hasFilters || Boolean(search);

    const clearAll = () => { setFilterType(''); setFilterCat(''); setSearch(''); };

    return (
        <AppLayout>
            <Head title="Ressources — Académie SECRETIS" />

            <PageHeader
                title="Bibliothèque de ressources"
                subtitle={
                    <>
                        <span className={NUM}>{rows.length}</span> ressource{rows.length > 1 ? 's' : ''} disponible{rows.length > 1 ? 's' : ''} — guides, modèles et documentation.
                    </>
                }
                icon={DocumentArrowDownIcon}
                breadcrumbs={[
                    { label: 'Académie', href: route('academie.index') },
                    { label: 'Ressources' },
                ]}
            />

            {/* Filtres par type */}
            <div className="mb-4 flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(opt => {
                    const active = filterType === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFilterType(opt.value === filterType ? '' : opt.value)}
                            aria-pressed={active}
                            className={cx(
                                'h-10 rounded-lg border px-4 text-sm font-medium transition-colors',
                                FOCUS_RING,
                                active
                                    ? 'border-transparent bg-purple-600 text-white'
                                    : cx(SURFACE, BORDER, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                            )}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            {/* Recherche + catégorie */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon
                        className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)}
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher une ressource…"
                        aria-label="Rechercher une ressource"
                        className={cx(CONTROL, 'h-10 pl-9')}
                    />
                </div>

                <select
                    value={filterCat}
                    onChange={e => setFilterCat(e.target.value)}
                    aria-label="Filtrer par catégorie"
                    className={cx(CONTROL, 'h-10 sm:w-64')}
                >
                    <option value="">Toutes les catégories</option>
                    {cats.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name?.fr ?? cat.name}
                        </option>
                    ))}
                </select>

                {isFiltered && (
                    <Button variant="secondary" icon={XMarkIcon} onClick={clearAll}>
                        Effacer
                    </Button>
                )}
            </div>

            {/* Grille */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(resource => (
                        <ResourceCard key={resource.id} resource={resource} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    bordered
                    variant={isFiltered ? 'no-results' : 'no-data'}
                    icon={isFiltered ? undefined : DocumentArrowDownIcon}
                    title={isFiltered ? 'Aucune ressource ne correspond' : 'La bibliothèque est vide'}
                    description={
                        isFiltered
                            ? 'Aucune ressource ne correspond à ces critères. Élargissez la recherche ou effacez les filtres.'
                            : "Aucune ressource n'est encore publiée. Guides, modèles et fiches pratiques apparaîtront ici."
                    }
                    hints={
                        isFiltered
                            ? undefined
                            : [
                                'Les ressources sont classées par type de fichier et par catégorie.',
                                'Le nombre de téléchargements indique les documents les plus utilisés.',
                            ]
                    }
                    secondary={
                        isFiltered
                            ? <Button variant="secondary" icon={XMarkIcon} onClick={clearAll}>Effacer les filtres</Button>
                            : <Button as={Link} href={route('academie.index')} variant="secondary">Retour à l'Académie</Button>
                    }
                />
            )}
        </AppLayout>
    );
}
export { AcademieResources };
