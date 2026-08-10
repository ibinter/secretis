/**
 * Formation/Catalog.jsx — Catalogue public des formations
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier STRICTEMENT inchangée : mêmes props Inertia, mêmes routes
 * (`GET /training/catalog`, `POST /training/courses/{id}/enroll`,
 * `router.visit('/training/courses/{id}')`), mêmes états locaux, mêmes payloads.
 *
 * Props réelles (TrainingController@catalog → Inertia::render('Formation/Catalog')) :
 *   courses  : paginateur Laravel { data[], total, current_page, last_page, … }
 *              chaque cours : { id, title, description, level, language,
 *                price_xof, thumbnail_path, trailer_url, duration_minutes,
 *                rating_avg, rating_count, enrollment_count, created_by_name,
 *                tags, created_at }
 *   filters  : { level, language, search, free, sort } — sérialisé en `[]` par PHP
 *              quand il est vide, d'où la garde `f` ci-dessous (À CONSERVER).
 *   userRole : string
 */

import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ClockIcon,
    UserGroupIcon,
    AcademicCapIcon,
    PlayCircleIcon,
    ChevronRightIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import {
    PageHeader, Button, Badge, Card, EmptyState,
    cx, CONTROL, SURFACE, SURFACE_SUNK, BORDER,
    TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ─── Constantes ───────────────────────────────────────────────────────────────
/* Un niveau est une information de contenu, pas une action : ton sémantique,
   jamais l'accent violet réservé aux actions principales.                     */

const LEVEL_CONFIG = {
    beginner:     { label: 'Débutant',      tone: 'success' },
    intermediate: { label: 'Intermédiaire', tone: 'warning' },
    advanced:     { label: 'Avancé',        tone: 'danger'  },
};

const SORT_OPTIONS = [
    { value: 'popular', label: 'Popularité' },
    { value: 'rating',  label: 'Mieux notés' },
    { value: 'date',    label: 'Récents' },
    { value: 'duration',label: 'Durée croissante' },
];

function formatDuration(min) {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function StarRating({ value, size = 'sm' }) {
    const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
    return (
        <div className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map(i => (
                <StarSolid
                    key={i}
                    className={cx(
                        cls,
                        i <= Math.round(value)
                            ? 'text-amber-400'
                            : 'text-gray-200 dark:text-gray-700',
                    )}
                />
            ))}
        </div>
    );
}

// ─── Carte cours ─────────────────────────────────────────────────────────────
/* Ordre de lecture volontaire : miniature → niveau/langue → titre → formateur
   → note → durée & inscrits → action. La carte reste scannable d'un coup d'œil. */

function CourseCard({ course, onEnroll }) {
    const level  = LEVEL_CONFIG[course.level] ?? LEVEL_CONFIG.beginner;
    const isFree = !course.price_xof || course.price_xof === 0;

    return (
        <article
            className={cx(
                SURFACE, 'border', BORDER, 'rounded-xl shadow-sm overflow-hidden',
                'flex flex-col cursor-pointer transition-colors',
                'hover:border-purple-300 dark:hover:border-purple-500/50',
            )}
            onClick={() => router.visit(`/training/courses/${course.id}`)}
        >
            {/* Miniature */}
            <div className={cx('relative aspect-[16/9] overflow-hidden border-b', BORDER, SURFACE_SUNK)}>
                {course.thumbnail_path ? (
                    <img
                        src={`/storage/${course.thumbnail_path}`}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <AcademicCapIcon className={cx('h-10 w-10', TEXT_FAINT)} aria-hidden="true" />
                    </div>
                )}

                {/* Prix */}
                <div className="absolute right-3 top-3">
                    <Badge variant={isFree ? 'success' : 'neutral'} size="md" className="shadow-sm">
                        {isFree ? 'Gratuit' : (
                            <span className={NUM}>{course.price_xof?.toLocaleString('fr-FR')} XOF</span>
                        )}
                    </Badge>
                </div>

                {course.trailer_url && (
                    <button
                        type="button"
                        title="Voir la bande-annonce"
                        className={cx(
                            'absolute inset-0 flex items-center justify-center',
                            'bg-gray-900/30 opacity-0 transition-opacity hover:opacity-100',
                            FOCUS_RING,
                        )}
                        onClick={e => { e.stopPropagation(); window.open(course.trailer_url, '_blank'); }}
                    >
                        <PlayCircleIcon className="h-12 w-12 text-white" aria-hidden="true" />
                    </button>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                {/* Niveau + langue */}
                <div className="mb-2 flex items-center gap-2">
                    <Badge variant={level.tone} outline>{level.label}</Badge>
                    {course.language && (
                        <span className={cx('flex items-center gap-1 text-xs', TEXT_MUTED)}>
                            <GlobeAltIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {course.language.toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Titre */}
                <h3 className={cx('mb-1 flex-1 line-clamp-2 text-sm font-semibold leading-5', TEXT_TITLE)}>
                    {course.title}
                </h3>

                {/* Formateur */}
                <p className={cx('mb-2 truncate text-xs', TEXT_MUTED)}>
                    {course.created_by_name || 'Formateur non renseigné'}
                </p>

                {/* Note */}
                <div className="mb-3 flex items-center gap-1.5">
                    <span className={cx('text-sm font-semibold', NUM, TEXT_TITLE)}>
                        {course.rating_avg > 0 ? Number(course.rating_avg).toFixed(1) : '—'}
                    </span>
                    <StarRating value={course.rating_avg ?? 0} />
                    <span className={cx('text-xs', NUM, TEXT_FAINT)}>({course.rating_count ?? 0})</span>
                </div>

                {/* Méta */}
                <div className={cx('mb-4 flex items-center gap-4 text-xs', TEXT_MUTED)}>
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className={NUM}>{formatDuration(course.duration_minutes)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className={NUM}>{(course.enrollment_count ?? 0).toLocaleString('fr-FR')}</span>
                        <span>inscrits</span>
                    </span>
                </div>

                {/* Action */}
                <Button
                    variant="primary"
                    size="sm"
                    block
                    onClick={e => { e.stopPropagation(); onEnroll(course); }}
                >
                    {course.my_enrollment ? 'Continuer' : (isFree ? "S'inscrire" : 'Acheter')}
                </Button>
            </div>
        </article>
    );
}

// ─── Carrousel ────────────────────────────────────────────────────────────────

function Carousel({ title, courses, onEnroll }) {
    const [idx, setIdx] = useState(0);
    const visible = 4;
    const max = Math.max(0, courses.length - visible);

    return (
        <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
                <h2 className={cx('text-base font-semibold tracking-tight', TEXT_TITLE)}>{title}</h2>
                <div className="flex gap-1">
                    <Button
                        variant="secondary" size="sm" iconOnly
                        title="Précédent"
                        onClick={() => setIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                    >
                        <ChevronRightIcon className="h-4 w-4 rotate-180" aria-hidden="true" />
                    </Button>
                    <Button
                        variant="secondary" size="sm" iconOnly
                        title="Suivant"
                        onClick={() => setIdx(i => Math.min(max, i + 1))}
                        disabled={idx >= max}
                    >
                        <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {courses.slice(idx, idx + visible).map(c => (
                    <CourseCard key={c.id} course={c} onEnroll={onEnroll} />
                ))}
            </div>
        </section>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function Catalog({ courses, filters, userRole }) {
    /* Garde à conserver : PHP sérialise un `filters` vide en tableau `[]`. */
    const f = filters && !Array.isArray(filters) ? filters : {};
    const [search, setSearch]         = useState(f.search ?? '');
    const [level, setLevel]           = useState(f.level ?? '');
    const [sort, setSort]             = useState(f.sort ?? 'popular');
    const [freeOnly, setFreeOnly]     = useState(f.free === '1' || f.free === true);
    const [showFilters, setShowFilters] = useState(false);

    const items = courses?.data ?? courses ?? [];
    const total = courses?.total ?? items.length;

    const recommended = useMemo(() => {
        if (!userRole) return items.slice(0, 8);
        return items.filter(c => {
            const tags = Array.isArray(c.tags) ? c.tags : (JSON.parse(c.tags ?? '[]'));
            return tags.includes(userRole);
        }).slice(0, 8);
    }, [items, userRole]);

    const newCourses = useMemo(() =>
        [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8),
    [items]);

    const applyFilters = () => {
        router.get('/training/catalog', {
            search: search || undefined,
            level: level || undefined,
            sort,
            free: freeOnly ? '1' : undefined,
        }, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch(''); setLevel(''); setSort('popular'); setFreeOnly(false);
        router.get('/training/catalog', { sort: 'popular' }, { preserveState: true, replace: true });
    };

    const handleEnroll = (course) => {
        if (course.my_enrollment) {
            router.visit(`/training/courses/${course.id}`);
        } else if (!course.price_xof) {
            router.post(`/training/courses/${course.id}/enroll`, {}, {
                onSuccess: () => router.visit(`/training/courses/${course.id}`),
            });
        } else {
            router.visit(`/training/courses/${course.id}`);
        }
    };

    const isFiltered = Boolean(f.search || f.level || f.free);
    const lbl = cx('mb-1.5 block text-xs font-medium', TEXT_MUTED);

    return (
        <AppLayout>
            <Head title="Catalogue de formations" />

            <PageHeader
                title="Catalogue de formations"
                subtitle="Développez vos compétences avec les formations certifiantes de l'organisation."
                icon={AcademicCapIcon}
                breadcrumbs={[{ label: 'Formation', href: '/formation' }, { label: 'Catalogue' }]}
                actions={
                    <Button
                        variant={showFilters ? 'subtle' : 'secondary'}
                        icon={FunnelIcon}
                        onClick={() => setShowFilters(v => !v)}
                        aria-expanded={showFilters}
                    >
                        Filtres
                    </Button>
                }
            />

            {/* Recherche */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon
                        className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)}
                        aria-hidden="true"
                    />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && applyFilters()}
                        placeholder="Rechercher une formation…"
                        aria-label="Rechercher une formation"
                        className={cx(CONTROL, 'h-10 pl-9')}
                    />
                </div>
                <Button variant="primary" onClick={applyFilters}>Rechercher</Button>
            </div>

            {/* Filtres */}
            {showFilters && (
                <Card
                    className="mb-6"
                    title="Filtres"
                    subtitle="Affinez le catalogue par niveau, tri ou tarif."
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={resetFilters}>Effacer</Button>
                            <Button variant="primary" onClick={applyFilters}>Appliquer</Button>
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className={lbl} htmlFor="cat-level">Niveau</label>
                            <select
                                id="cat-level" value={level}
                                onChange={e => setLevel(e.target.value)}
                                className={cx(CONTROL, 'h-10')}
                            >
                                <option value="">Tous les niveaux</option>
                                {Object.entries(LEVEL_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={lbl} htmlFor="cat-sort">Trier par</label>
                            <select
                                id="cat-sort" value={sort}
                                onChange={e => setSort(e.target.value)}
                                className={cx(CONTROL, 'h-10')}
                            >
                                {SORT_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className={cx('flex h-10 cursor-pointer items-center gap-2 text-sm', TEXT_BODY)}>
                                <input
                                    type="checkbox"
                                    checked={freeOnly}
                                    onChange={e => setFreeOnly(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-[#1E3048] dark:bg-[#0F1923]"
                                />
                                Formations gratuites uniquement
                            </label>
                        </div>
                    </div>
                </Card>
            )}

            {/* Carrousels */}
            {!f.search && !f.level && (
                <>
                    {recommended.length > 0 && (
                        <Carousel
                            title={`Recommandées pour vous${userRole ? ` (${userRole})` : ''}`}
                            courses={recommended}
                            onEnroll={handleEnroll}
                        />
                    )}
                    {newCourses.length > 0 && (
                        <Carousel title="Nouvelles formations" courses={newCourses} onEnroll={handleEnroll} />
                    )}
                </>
            )}

            {/* Grille principale */}
            <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className={cx('text-base font-semibold tracking-tight', TEXT_TITLE)}>
                        Toutes les formations
                    </h2>
                    <span className={cx('text-xs', NUM, TEXT_MUTED)}>
                        {total.toLocaleString('fr-FR')} résultat{total > 1 ? 's' : ''}
                    </span>
                </div>

                {items.length === 0 ? (
                    <EmptyState
                        bordered
                        variant={isFiltered ? 'no-results' : 'no-data'}
                        icon={isFiltered ? undefined : AcademicCapIcon}
                        title={isFiltered ? 'Aucune formation ne correspond' : 'Le catalogue est vide'}
                        description={
                            isFiltered
                                ? 'Aucun cours ne correspond à ces critères. Élargissez la recherche ou réinitialisez les filtres.'
                                : "Aucune formation n'est encore publiée. Les cours apparaîtront ici dès qu'un formateur en publiera un."
                        }
                        hints={
                            isFiltered
                                ? undefined
                                : [
                                    'Seuls les cours publiés et publics apparaissent dans ce catalogue.',
                                    'Chaque carte affiche la durée, le niveau et la note des apprenants.',
                                    'Les formations gratuites s’ouvrent en un clic depuis la carte.',
                                ]
                        }
                        secondary={
                            isFiltered
                                ? <Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>
                                : undefined
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {items.map(c => (
                            <CourseCard key={c.id} course={c} onEnroll={handleEnroll} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {courses?.last_page > 1 && (
                    <nav className="mt-8 flex flex-wrap justify-center gap-1.5" aria-label="Pagination">
                        {Array.from({ length: courses.last_page }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => router.get('/training/catalog', { ...f, page: p })}
                                aria-current={courses.current_page === p ? 'page' : undefined}
                                className={cx(
                                    'h-9 w-9 rounded-lg border text-sm font-medium transition-colors',
                                    NUM, FOCUS_RING,
                                    courses.current_page === p
                                        ? 'border-transparent bg-purple-600 text-white'
                                        : cx(SURFACE, BORDER, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </nav>
                )}
            </section>
        </AppLayout>
    );
}
export { Catalog };
