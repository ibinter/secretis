import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    AcademicCapIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    PlayCircleIcon,
    CheckCircleIcon,
    BookOpenIcon,
    FunnelIcon,
    StarIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';

// ─── Constantes ──────────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
    beginner:     { label: 'Débutant',     color: 'bg-green-100 text-green-700' },
    intermediate: { label: 'Intermédiaire',color: 'bg-yellow-100 text-yellow-700' },
    advanced:     { label: 'Avancé',       color: 'bg-red-100 text-red-700' },
};

const STATUS_CONFIG = {
    enrolled:    { label: 'Inscrit',    color: 'bg-purple-100 text-purple-700' },
    in_progress: { label: 'En cours',   color: 'bg-orange-100 text-orange-700' },
    completed:   { label: 'Terminé',    color: 'bg-green-100 text-green-700' },
};

function formatDuration(minutes) {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

function CourseCard({ course }) {
    const enrollment = course.enrollment;
    const level      = LEVEL_CONFIG[course.level] ?? { label: course.level, color: 'bg-gray-100 text-gray-600' };
    const status     = enrollment ? STATUS_CONFIG[enrollment.status] : null;

    function handleAction() {
        if (!enrollment) {
            router.post(`/training/courses/${course.id}/enroll`, {}, {
                onSuccess: () => router.reload(),
            });
        } else {
            router.visit(`/training/courses/${course.id}`);
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            {/* Thumbnail */}
            <div className="relative h-36 bg-gradient-to-br from-purple-600 to-indigo-700 overflow-hidden">
                {course.thumbnail_path ? (
                    <img src={`/storage/${course.thumbnail_path}`} alt={course.title}
                         className="w-full h-full object-cover"/>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <AcademicCapIcon className="w-16 h-16 text-white/30"/>
                    </div>
                )}
                {/* Badge niveau */}
                <span className={`absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full ${level.color}`}>
                    {level.label}
                </span>
                {/* Badge statut */}
                {status && (
                    <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                    </span>
                )}
                {/* Progression overlay */}
                {enrollment && enrollment.status !== 'completed' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                        <div className="h-full bg-white transition-all"
                             style={{ width: `${enrollment.progress_percent}%` }}/>
                    </div>
                )}
                {/* Terminé overlay */}
                {enrollment?.status === 'completed' && (
                    <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center">
                        <CheckSolid className="w-10 h-10 text-white"/>
                    </div>
                )}
            </div>

            {/* Contenu */}
            <div className="p-4 flex flex-col flex-1">
                <div className="text-xs font-medium text-indigo-600 mb-1 uppercase tracking-wide">
                    {course.category}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">
                    {course.title}
                </h3>
                {course.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 mt-auto">
                    <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5"/>
                        {formatDuration(course.duration_minutes)}
                    </span>
                    {enrollment && (
                        <span className="flex items-center gap-1">
                            <BookOpenIcon className="w-3.5 h-3.5"/>
                            {enrollment.progress_percent}% complété
                        </span>
                    )}
                </div>

                <button
                    onClick={handleAction}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                        enrollment?.status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                            : enrollment
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {enrollment?.status === 'completed' && <CheckSolid className="w-4 h-4 inline mr-1"/>}
                    {enrollment?.status === 'completed'
                        ? 'Revoir le cours'
                        : enrollment
                            ? 'Continuer'
                            : "S'inscrire"}
                </button>
            </div>
        </div>
    );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Catalogue({ courses, pagination, filters, categories }) {
    const [search, setSearch]     = useState(filters?.search ?? '');
    const [category, setCategory] = useState(filters?.category ?? '');
    const [level, setLevel]       = useState(filters?.level ?? '');
    const [status, setStatus]     = useState(filters?.status ?? '');

    function applyFilters(overrides = {}) {
        router.get('/training/courses', {
            search:   overrides.search   ?? search,
            category: overrides.category ?? category,
            level:    overrides.level    ?? level,
            status:   overrides.status   ?? status,
        }, { preserveState: true, replace: true });
    }

    function handleSearch(e) {
        e.preventDefault();
        applyFilters();
    }

    return (
        <AppLayout>
            <Head title="Catalogue de formations"/>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* En-tête */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <AcademicCapIcon className="w-8 h-8 text-indigo-600"/>
                        <h1 className="text-2xl font-bold text-gray-900">Formations</h1>
                    </div>
                    <p className="text-gray-500">Développez vos compétences avec nos formations internes.</p>
                </div>

                {/* Barre de recherche et filtres */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
                    <form onSubmit={handleSearch} className="flex-1 min-w-48">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Rechercher</label>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Titre, description..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </form>

                    <div className="min-w-36">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
                        <select value={category}
                                onChange={e => { setCategory(e.target.value); applyFilters({ category: e.target.value }); }}
                                className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Toutes</option>
                            {(categories ?? []).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-36">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Niveau</label>
                        <select value={level}
                                onChange={e => { setLevel(e.target.value); applyFilters({ level: e.target.value }); }}
                                className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Tous</option>
                            <option value="beginner">Débutant</option>
                            <option value="intermediate">Intermédiaire</option>
                            <option value="advanced">Avancé</option>
                        </select>
                    </div>

                    <div className="min-w-36">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                        <select value={status}
                                onChange={e => { setStatus(e.target.value); applyFilters({ status: e.target.value }); }}
                                className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Tous</option>
                            <option value="not_started">Non commencé</option>
                            <option value="in_progress">En cours</option>
                            <option value="completed">Terminé</option>
                        </select>
                    </div>

                    <button onClick={() => applyFilters()}
                            className="py-2 px-4 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                        <FunnelIcon className="w-4 h-4 inline mr-1"/>
                        Filtrer
                    </button>
                </div>

                {/* Grille de cours */}
                {courses.length === 0 ? (
                    <div className="text-center py-16">
                        <AcademicCapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Aucune formation trouvée</h3>
                        <p className="text-gray-500">Modifiez vos filtres ou revenez plus tard.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {courses.map(course => (
                                <CourseCard key={course.id} course={course}/>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.last_page > 1 && (
                            <div className="flex justify-center mt-8 gap-2">
                                {pagination.current_page > 1 && (
                                    <button onClick={() => router.get('/training/courses', { ...filters, page: pagination.current_page - 1 })}
                                            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                                        Précédent
                                    </button>
                                )}
                                <span className="px-3 py-1.5 text-sm text-gray-600">
                                    Page {pagination.current_page} / {pagination.last_page}
                                </span>
                                {pagination.current_page < pagination.last_page && (
                                    <button onClick={() => router.get('/training/courses', { ...filters, page: pagination.current_page + 1 })}
                                            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                                        Suivant
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
export { Catalogue };
