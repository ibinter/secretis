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

function levelLabel(level) {
    const map = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
    return map[level] ?? level;
}

function levelColor(level) {
    return {
        debutant:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        intermediaire: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        avance:        'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    }[level] ?? 'bg-gray-100 text-gray-700';
}

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

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCatalogCard({ course, catColor }) {
    const title = course.title?.fr ?? course.title;
    const desc  = typeof course.description === 'object'
        ? (course.description?.fr ?? '')
        : (course.description ?? '');

    return (
        <Link
            href={route('academie.cours', { slug: course.slug })}
            className="group flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-700 transition-all duration-200"
        >
            {/* Bande catégorie */}
            <div className="h-1.5" style={{ backgroundColor: catColor || '#3B82F6' }} />

            {/* Thumbnail / placeholder */}
            <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 relative flex items-center justify-center">
                {course.thumbnail ? (
                    <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                    <BookOpenIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                )}
                {course.is_completed && (
                    <div className="absolute top-2 right-2">
                        <CheckCircleSolid className="w-6 h-6 text-emerald-400" />
                    </div>
                )}
                {course.progress_percent > 0 && !course.is_completed && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                        <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: `${course.progress_percent}%` }}
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-col flex-1 p-4">
                <div className="flex items-start gap-2 mb-2">
                    <h3 className="flex-1 text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors text-balance">
                        {title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${levelColor(course.level)}`}>
                        {levelLabel(course.level)}
                    </span>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
                    {desc}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {formatDuration(course.duration_minutes)}
                    </span>
                    {course.lessons_count > 0 && (
                        <span>{course.lessons_count} leçon{course.lessons_count > 1 ? 's' : ''}</span>
                    )}
                    <span className="ml-auto font-medium">
                        {course.is_completed ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircleIcon className="w-3.5 h-3.5" /> Terminé
                            </span>
                        ) : course.progress_percent > 0 ? (
                            <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                <PlayCircleIcon className="w-3.5 h-3.5" /> {course.progress_percent}%
                            </span>
                        ) : (
                            <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                Commencer <ArrowRightIcon className="w-3 h-3" />
                            </span>
                        )}
                    </span>
                </div>
            </div>
        </Link>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AcademieCatalog({ catalog }) {
    const [search, setSearch]         = useState('');
    const [filterCat, setFilterCat]   = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterDur, setFilterDur]   = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Aplatir tous les cours avec leur catégorie
    const allCourses = useMemo(() => {
        return catalog.flatMap(cat =>
            cat.courses.map(c => ({ ...c, categorySlug: cat.slug, categoryName: cat.name?.fr ?? cat.name, catColor: cat.color }))
        );
    }, [catalog]);

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

    // Regrouper par catégorie pour affichage groupé (si pas de filtre catégorie)
    const grouped = useMemo(() => {
        if (filterCat || search || filterLevel || filterDur || filterStatus) {
            return [{ id: '__all', name: { fr: 'Résultats' }, color: '#3B82F6', courses: filteredCourses }];
        }
        return catalog.map(cat => ({
            ...cat,
            courses: filteredCourses.filter(c => c.categorySlug === cat.slug),
        })).filter(cat => cat.courses.length > 0);
    }, [filteredCourses, catalog, filterCat, search, filterLevel, filterDur, filterStatus]);

    const hasActiveFilters = filterCat || filterLevel || filterDur || filterStatus;

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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* En-tête */}
                <div className="mb-8">
                    <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <Link href={route('academie.index')} className="hover:text-purple-600 dark:hover:text-purple-400">Académie</Link>
                        <span className="mx-2">/</span>
                        <span>Catalogue</span>
                    </nav>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Catalogue des formations</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {allCourses.length} cours disponibles dans {catalog.length} catégories
                    </p>
                </div>

                {/* Barre de recherche + filtres */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un cours…"
                            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                            hasActiveFilters
                                ? 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        <FunnelIcon className="w-4 h-4" />
                        Filtres {hasActiveFilters && <span className="bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
                    </button>
                </div>

                {/* Panneau de filtres */}
                {showFilters && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Catégorie */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                Catégorie
                            </label>
                            <select
                                value={filterCat}
                                onChange={e => setFilterCat(e.target.value)}
                                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Toutes les catégories</option>
                                {catalog.map(cat => (
                                    <option key={cat.slug} value={cat.slug}>
                                        {cat.name?.fr ?? cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Niveau */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                Niveau
                            </label>
                            <select
                                value={filterLevel}
                                onChange={e => setFilterLevel(e.target.value)}
                                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* Durée */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                Durée
                            </label>
                            <select
                                value={filterDur}
                                onChange={e => setFilterDur(e.target.value)}
                                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* Statut */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                Statut
                            </label>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <XMarkIcon className="w-4 h-4" /> Réinitialiser les filtres
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Résultats */}
                {filteredCourses.length === 0 ? (
                    <div className="py-20 text-center">
                        <BookOpenIcon className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Aucun cours trouvé</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                            Modifiez vos critères de recherche ou{' '}
                            <button onClick={clearFilters} className="text-purple-600 dark:text-purple-400 underline">
                                réinitialisez les filtres
                            </button>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {grouped.map(group => (
                            group.courses.length > 0 && (
                                <section key={group.id ?? group.slug}>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div
                                            className="w-3 h-8 rounded-full"
                                            style={{ backgroundColor: group.color }}
                                        />
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {group.name?.fr ?? group.name}
                                        </h2>
                                        <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                                            {group.courses.length} cours
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {group.courses.map(course => (
                                            <CourseCatalogCard
                                                key={course.id}
                                                course={course}
                                                catColor={group.color}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
export { AcademieCatalog };
