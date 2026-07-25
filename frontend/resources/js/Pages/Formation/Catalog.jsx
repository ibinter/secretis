import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    StarIcon,
    ClockIcon,
    UserGroupIcon,
    AcademicCapIcon,
    PlayCircleIcon,
    TagIcon,
    ChevronRightIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
    debutant:      { label: 'Débutant',      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    intermediaire: { label: 'Intermédiaire', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    avance:        { label: 'Avancé',        color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
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
    const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <StarSolid
                    key={i}
                    className={`${cls} ${i <= Math.round(value) ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}
                />
            ))}
        </div>
    );
}

// ─── Card cours ──────────────────────────────────────────────────────────────

function CourseCard({ course, onEnroll }) {
    const level = LEVEL_CONFIG[course.level] ?? LEVEL_CONFIG.debutant;
    const isFree = !course.price_xof || course.price_xof === 0;

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700
                       hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
            onClick={() => router.visit(`/training/courses/${course.id}`)}
        >
            {/* Thumbnail */}
            <div className="relative h-44 rounded-t-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
                {course.thumbnail_path ? (
                    <img src={`/storage/${course.thumbnail_path}`} alt={course.title}
                         className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <AcademicCapIcon className="w-16 h-16 text-white/50" />
                    </div>
                )}
                {/* Prix badge */}
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold shadow
                    ${isFree ? 'bg-green-500 text-white' : 'bg-white text-gray-900'}`}>
                    {isFree ? 'Gratuit' : `${course.price_xof?.toLocaleString('fr-FR')} XOF`}
                </div>
                {course.trailer_url && (
                    <button
                        className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                        onClick={e => { e.stopPropagation(); window.open(course.trailer_url, '_blank'); }}
                    >
                        <PlayCircleIcon className="w-14 h-14 text-white drop-shadow-lg" />
                    </button>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1">
                {/* Niveau + langue */}
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${level.color}`}>
                        {level.label}
                    </span>
                    {course.language && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <GlobeAltIcon className="w-3.5 h-3.5" />
                            {course.language.toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Titre */}
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1 flex-1">
                    {course.title}
                </h3>

                {/* Instructeur */}
                {course.created_by_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{course.created_by_name}</p>
                )}

                {/* Rating */}
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-sm font-bold text-yellow-600">
                        {course.rating_avg > 0 ? Number(course.rating_avg).toFixed(1) : '—'}
                    </span>
                    <StarRating value={course.rating_avg ?? 0} />
                    <span className="text-xs text-gray-400">({course.rating_count ?? 0})</span>
                </div>

                {/* Méta */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {formatDuration(course.duration_minutes)}
                    </span>
                    <span className="flex items-center gap-1">
                        <UserGroupIcon className="w-3.5 h-3.5" />
                        {(course.enrollment_count ?? 0).toLocaleString()} inscrits
                    </span>
                </div>

                {/* CTA */}
                <button
                    onClick={e => { e.stopPropagation(); onEnroll(course); }}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-colors
                               bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {course.my_enrollment ? 'Continuer' : (isFree ? "S'inscrire" : 'Acheter')}
                </button>
            </div>
        </div>
    );
}

// ─── Carrousel ────────────────────────────────────────────────────────────────

function Carousel({ title, courses, onEnroll }) {
    const [idx, setIdx] = useState(0);
    const visible = 4;
    const max = Math.max(0, courses.length - visible);

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                <div className="flex gap-1">
                    <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <ChevronRightIcon className="w-4 h-4 rotate-180" />
                    </button>
                    <button onClick={() => setIdx(i => Math.min(max, i + 1))} disabled={idx >= max}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {courses.slice(idx, idx + visible).map(c => (
                    <CourseCard key={c.id} course={c} onEnroll={onEnroll} />
                ))}
            </div>
        </section>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function Catalog({ courses, filters = {}, userRole }) {
    const [search, setSearch]         = useState(filters.search ?? '');
    const [level, setLevel]           = useState(filters.level ?? '');
    const [sort, setSort]             = useState(filters.sort ?? 'popular');
    const [freeOnly, setFreeOnly]     = useState(filters.free === '1' || filters.free === true);
    const [showFilters, setShowFilters] = useState(false);

    const items = courses?.data ?? courses ?? [];

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

    return (
        <AppLayout>
            <Head title="Catalogue de formations" />

            {/* Hero */}
            <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl p-8 mb-8 text-white">
                <h1 className="text-3xl font-bold mb-2">Catalogue de formations</h1>
                <p className="text-indigo-200 mb-6">Développez vos compétences avec nos formations certifiantes</p>

                {/* Barre de recherche */}
                <div className="flex gap-3 max-w-2xl">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            placeholder="Rechercher une formation…"
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 bg-white shadow-sm
                                       focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                    </div>
                    <button onClick={applyFilters}
                            className="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors">
                        Rechercher
                    </button>
                    <button onClick={() => setShowFilters(f => !f)}
                            className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
                        <FunnelIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filtres */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6 flex flex-wrap gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Niveau</label>
                        <select value={level} onChange={e => setLevel(e.target.value)}
                                className="input-base text-sm">
                            <option value="">Tous les niveaux</option>
                            {Object.entries(LEVEL_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Trier par</label>
                        <select value={sort} onChange={e => setSort(e.target.value)}
                                className="input-base text-sm">
                            {SORT_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)}
                                   className="w-4 h-4 accent-indigo-600" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Formations gratuites uniquement</span>
                        </label>
                    </div>
                    <div className="flex items-end ml-auto">
                        <button onClick={applyFilters}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                            Appliquer
                        </button>
                    </div>
                </div>
            )}

            {/* Carrousels */}
            {!filters.search && !filters.level && (
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
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Toutes les formations
                        <span className="ml-2 text-sm font-normal text-gray-400">
                            ({(courses?.total ?? items.length).toLocaleString()} résultats)
                        </span>
                    </h2>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <AcademicCapIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Aucune formation trouvée</p>
                        <p className="text-sm mt-1">Essayez d'autres critères de recherche</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {items.map(c => (
                            <CourseCard key={c.id} course={c} onEnroll={handleEnroll} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {courses?.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                        {Array.from({ length: courses.last_page }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => router.get('/training/catalog', { ...filters, page: p })}
                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                                    ${courses.current_page === p
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </AppLayout>
    );
}
export { Catalog };
