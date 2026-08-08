/**
 * Academie/Catalog.jsx — Catalogue complet de l'Académie (GET /academie/catalogue)
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, mêmes filtres locaux (recherche, catégorie,
 * niveau, durée, statut), mêmes helpers `route(...)`.
 *
 * Props réelles (AcademyController@catalog → Inertia::render('Academie/Catalog')) :
 *   catalog : [{ id, slug, name, description, icon, color, courses[],
 *                total_courses, completed_count, percent_done }]
 *             chaque cours : { id, slug, title, description, objectives[],
 *               level, duration_minutes, thumbnail, is_featured,
 *               lessons_count, progress_percent, is_completed, last_accessed_at }
 */

import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    BookOpenIcon,
    ClockIcon,
    CheckCircleIcon,
    PlayCircleIcon,
    ArrowRightIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import {
    PageHeader, Button, Badge, Card, EmptyState,
    cx, CONTROL, SURFACE, SURFACE_SUNK, BORDER,
    TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
    { value: '', label: 'Tous les niveaux' },
    { value: 'debutant', label: 'Débutant' },
    { value: 'intermediaire', label: 'Intermédiaire' },
    { value: 'avance', label: 'Avancé' },
];

const DURATION_OPTIONS = [
    { value: '', label: 'Toute durée' },
    { value: 'short', label: '< 30 min' },
    { value: 'medium', label: '30–60 min' },
    { value: 'long', label: '> 60 min' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'Tout statut' },
    { value: 'not_started', label: 'Non commencé' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
];

const LEVELS = {
    debutant:      { label: 'Débutant',      tone: 'success' },
    intermediaire: { label: 'Intermédiaire', tone: 'warning' },
    avance:        { label: 'Avancé',        tone: 'danger'  },
};

const levelMeta = (level) => LEVELS[level] ?? { label: level ?? '—', tone: 'neutral' };

function formatDuration(min) {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function matchesDuration(min, filter) {
    if (!filter) return true;
    if (!min) return false;
    if (filter === 'short')  return min < 30;
    if (filter === 'medium') return min >= 30 && min <= 60;
    if (filter === 'long')   return min > 60;
    return true;
}

function matchesStatus(course, filter) {
    if (!filter) return true;
    if (filter === 'completed')   return course.is_completed;
    if (filter === 'in_progress') return !course.is_completed && course.progress_percent > 0;
    if (filter === 'not_started') return course.progress_percent === 0;
    return true;
}

// ─── Carte cours ──────────────────────────────────────────────────────────────

function CourseCatalogCard({ course }) {
    const title = course.title?.fr ?? course.title;
    const desc  = typeof course.description === 'object'
        ? (course.description?.fr ?? '')
        : (course.description ?? '');
    const level = levelMeta(course.level);
    const pct   = Math.max(0, Math.min(100, Number(course.progress_percent) || 0));

    return (
        <Link
            href={route('academie.cours', { slug: course.slug })}
            className={cx(
                'group flex flex-col overflow-hidden rounded-xl border shadow-sm transition-colors',
                SURFACE, BORDER, FOCUS_RING,
                'hover:border-purple-300 dark:hover:border-purple-500/50',
            )}
        >
            {/* Miniature */}
            <div className={cx('relative aspect-[16/9] overflow-hidden border-b', BORDER, SURFACE_SUNK)}>
                {course.thumbnail ? (
                    <img src={course.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <BookOpenIcon className={cx('h-9 w-9', TEXT_FAINT)} aria-hidden="true" />
                    </div>
                )}
                {course.is_completed && (
                    <span className="absolute right-2 top-2">
                        <CheckCircleSolid className="h-6 w-6 text-emerald-500" aria-hidden="true" />
                    </span>
                )}
                {pct > 0 && !course.is_completed && (
                    <div
                        className={cx('absolute inset-x-0 bottom-0 h-1', SURFACE_SUNK)}
                        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                    >
                        <div className="h-full bg-purple-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-start gap-2">
                    <h3 className={cx(
                        'flex-1 text-sm font-semibold leading-5 transition-colors',
                        TEXT_TITLE, 'group-hover:text-purple-700 dark:group-hover:text-purple-300',
                    )}>
                        {title}
                    </h3>
                    <Badge variant={level.tone} outline className="shrink-0">{level.label}</Badge>
                </div>

                <p className={cx('line-clamp-2 flex-1 text-xs leading-5', TEXT_MUTED)}>{desc}</p>

                <div className={cx('mt-3 flex items-center gap-3 border-t pt-3 text-xs', BORDER, TEXT_MUTED)}>
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className={NUM}>{formatDuration(course.duration_minutes)}</span>
                    </span>
                    {course.lessons_count > 0 && (
                        <span className={NUM}>
                            {course.lessons_count} leçon{course.lessons_count > 1 ? 's' : ''}
                        </span>
                    )}
                    <span className="ml-auto font-medium">
                        {course.is_completed ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" /> Terminé
                            </span>
                        ) : pct > 0 ? (
                            <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300">
                                <PlayCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className={NUM}>{pct}%</span>
                            </span>
                        ) : (
                            <span className={cx('flex items-center gap-1', TEXT_MUTED)}>
                                Commencer <ArrowRightIcon className="h-3 w-3" aria-hidden="true" />
                            </span>
                        )}
                    </span>
                </div>
            </div>
        </Link>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AcademieCatalog({ catalog = [] }) {
    const categories = Array.isArray(catalog) ? catalog : [];

    const [search, setSearch]         = useState('');
    const [filterCat, setFilterCat]   = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterDur, setFilterDur]   = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Aplatir tous les cours avec leur catégorie
    const allCourses = useMemo(() => {
        return categories.flatMap(cat =>
            (cat.courses ?? []).map(c => ({
                ...c,
                categorySlug: cat.slug,
                categoryName: cat.name?.fr ?? cat.name,
                catColor: cat.color,
            })),
        );
    }, [categories]);

    const filteredCourses = useMemo(() => {
        const q = search.toLowerCase();
        return allCourses.filter(c => {
            const title = (c.title?.fr ?? '').toLowerCase();
            const desc  = (typeof c.description === 'object' ? c.description?.fr : c.description ?? '').toLowerCase();
            if (q && !title.includes(q) && !desc.includes(q)) return false;
            if (filterCat   && c.categorySlug !== filterCat)           return false;
            if (filterLevel && c.level !== filterLevel)                return false;
            if (!matchesDuration(c.duration_minutes, filterDur))       return false;
            if (!matchesStatus(c, filterStatus))                       return false;
            return true;
        });
    }, [allCourses, search, filterCat, filterLevel, filterDur, filterStatus]);

    // Regrouper par catégorie (sauf si une recherche ou un filtre est actif)
    const grouped = useMemo(() => {
        if (filterCat || search || filterLevel || filterDur || filterStatus) {
            return [{ id: '__all', name: { fr: 'Résultats' }, color: null, courses: filteredCourses }];
        }
        return categories.map(cat => ({
            ...cat,
            courses: filteredCourses.filter(c => c.categorySlug === cat.slug),
        })).filter(cat => cat.courses.length > 0);
    }, [filteredCourses, categories, filterCat, search, filterLevel, filterDur, filterStatus]);

    const hasActiveFilters = Boolean(filterCat || filterLevel || filterDur || filterStatus);
    const isSearching      = Boolean(search) || hasActiveFilters;
    const lbl = cx('mb-1.5 block text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED);

    function clearFilters() {
        setFilterCat('');
        setFilterLevel('');
        setFilterDur('');
        setFilterStatus('');
        setSearch('');
    }

    return (
        <AppLayout>
            <Head title="Catalogue — Académie SECRETIS" />

            <PageHeader
                title="Catalogue des formations"
                subtitle={
                    <>
                        <span className={NUM}>{allCourses.length}</span> cours disponible{allCourses.length > 1 ? 's' : ''} dans{' '}
                        <span className={NUM}>{categories.length}</span> catégorie{categories.length > 1 ? 's' : ''}.
                    </>
                }
                icon={BookOpenIcon}
                breadcrumbs={[
                    { label: 'Académie', href: route('academie.index') },
                    { label: 'Catalogue' },
                ]}
            />

            {/* Recherche + bascule filtres */}
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
                        placeholder="Rechercher un cours…"
                        aria-label="Rechercher un cours"
                        className={cx(CONTROL, 'h-10 pl-9')}
                    />
                </div>
                <Button
                    variant={hasActiveFilters ? 'subtle' : 'secondary'}
                    icon={FunnelIcon}
                    onClick={() => setShowFilters(v => !v)}
                    aria-expanded={showFilters}
                >
                    Filtres
                    {hasActiveFilters && <Badge variant="accent" className="ml-1">actifs</Badge>}
                </Button>
            </div>

            {/* Panneau de filtres */}
            {showFilters && (
                <Card
                    className="mb-6"
                    footer={
                        hasActiveFilters ? (
                            <div className="flex justify-end">
                                <Button variant="ghost" icon={XMarkIcon} onClick={clearFilters}>
                                    Réinitialiser les filtres
                                </Button>
                            </div>
                        ) : undefined
                    }
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className={lbl} htmlFor="ac-cat">Catégorie</label>
                            <select
                                id="ac-cat" value={filterCat}
                                onChange={e => setFilterCat(e.target.value)}
                                className={cx(CONTROL, 'h-10')}
                            >
                                <option value="">Toutes les catégories</option>
                                {categories.map(cat => (
                                    <option key={cat.slug} value={cat.slug}>
                                        {cat.name?.fr ?? cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={lbl} htmlFor="ac-level">Niveau</label>
                            <select
                                id="ac-level" value={filterLevel}
                                onChange={e => setFilterLevel(e.target.value)}
                                className={cx(CONTROL, 'h-10')}
                            >
                                {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={lbl} htmlFor="ac-dur">Durée</label>
                            <select
                                id="ac-dur" value={filterDur}
                                onChange={e => setFilterDur(e.target.value)}
                                className={cx(CONTROL, 'h-10')}
                            >
                                {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={lbl} htmlFor="ac-status">Statut</label>
                            <select
                                id="ac-status" value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className={cx(CONTROL, 'h-10')}
                            >
                                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>
                </Card>
            )}

            {/* Résultats */}
            {filteredCourses.length === 0 ? (
                <EmptyState
                    bordered
                    variant={isSearching ? 'no-results' : 'no-data'}
                    icon={isSearching ? undefined : BookOpenIcon}
                    title={isSearching ? 'Aucun cours ne correspond' : "Le catalogue de l'Académie est vide"}
                    description={
                        isSearching
                            ? 'Aucun cours ne correspond à ces critères. Élargissez la recherche ou réinitialisez les filtres.'
                            : "Aucun cours n'est encore publié. Les formations de l'Académie IBIG apparaîtront ici dès leur mise en ligne."
                    }
                    hints={
                        isSearching
                            ? undefined
                            : [
                                'Les cours sont regroupés par catégorie métier.',
                                'Chaque cours affiche sa durée, son niveau et son nombre de leçons.',
                                'Votre progression est reprise là où vous vous êtes arrêté.',
                            ]
                    }
                    secondary={
                        isSearching
                            ? <Button variant="secondary" icon={XMarkIcon} onClick={clearFilters}>Réinitialiser les filtres</Button>
                            : undefined
                    }
                />
            ) : (
                <div className="space-y-10">
                    {grouped.map(group => (
                        group.courses.length > 0 && (
                            <section key={group.id ?? group.slug}>
                                <div className="mb-4 flex items-center gap-3">
                                    <h2 className={cx('text-base font-semibold tracking-tight', TEXT_TITLE)}>
                                        {group.name?.fr ?? group.name}
                                    </h2>
                                    <span className={cx('text-xs', NUM, TEXT_MUTED)}>
                                        {group.courses.length} cours
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {group.courses.map(course => (
                                        <CourseCatalogCard key={course.id} course={course} />
                                    ))}
                                </div>
                            </section>
                        )
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
export { AcademieCatalog };
