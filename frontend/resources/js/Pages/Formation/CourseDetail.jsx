import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import CourseRating from '@/Components/Formation/CourseRating';
import {
    ClockIcon,
    UserGroupIcon,
    AcademicCapIcon,
    PlayCircleIcon,
    BookOpenIcon,
    CheckCircleIcon,
    LockClosedIcon,
    StarIcon,
    ArrowLeftIcon,
    DocumentTextIcon,
    VideoCameraIcon,
    PuzzlePieceIcon,
    CubeIcon,
    SignalIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_LABEL = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

const MODULE_ICONS = {
    video:  VideoCameraIcon,
    text:   DocumentTextIcon,
    quiz:   PuzzlePieceIcon,
    scorm:  CubeIcon,
    file:   DocumentTextIcon,
    live:   SignalIcon,
};

function formatDuration(min) {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
}

function StarDisplay({ value, count }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                    <StarSolid key={i} className={`w-5 h-5 ${i <= Math.round(value) ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}`} />
                ))}
            </div>
            <span className="font-bold text-gray-900 dark:text-white">{Number(value).toFixed(1)}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">({count} avis)</span>
        </div>
    );
}

// ─── Composant module ─────────────────────────────────────────────────────────

function ModuleItem({ module, index, isUnlocked, userProgress }) {
    const Icon = MODULE_ICONS[module.content_type] ?? BookOpenIcon;
    const done = userProgress?.completed_at != null;

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors
            ${isUnlocked ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
        `}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold
                ${done ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                {done ? <CheckSolid className="w-4 h-4" /> : index + 1}
            </div>
            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{module.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {module.content_type} • {formatDuration(module.duration_minutes)}
                </p>
            </div>
            {!isUnlocked && <LockClosedIcon className="w-4 h-4 text-gray-400" />}
        </div>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function CourseDetail({ course, modules = [], enrollment, ratings = [], instructor }) {
    const [activeTab, setActiveTab] = useState('programme');
    const [showRating, setShowRating] = useState(false);

    const isFree = !course.price_xof || course.price_xof === 0;
    const skills = Array.isArray(course.skills_taught)
        ? course.skills_taught
        : (JSON.parse(course.skills_taught ?? '[]'));
    const prerequisites = Array.isArray(course.prerequisites)
        ? course.prerequisites
        : (JSON.parse(course.prerequisites ?? '[]'));
    const tags = Array.isArray(course.tags)
        ? course.tags
        : (JSON.parse(course.tags ?? '[]'));

    // Distribution des évaluations
    const ratingDistribution = [5, 4, 3, 2, 1].map(n => ({
        star: n,
        count: ratings.filter(r => r.rating === n).length,
        pct: ratings.length > 0
            ? Math.round(ratings.filter(r => r.rating === n).length / ratings.length * 100)
            : 0,
    }));

    const handleEnroll = () => {
        if (enrollment) {
            router.visit(`/training/courses/${course.id}/play`);
        } else if (isFree) {
            router.post(`/training/courses/${course.id}/enroll`, {}, {
                onSuccess: () => router.visit(`/training/courses/${course.id}/play`),
            });
        } else {
            // Intégration paiement SECRETIS
            router.visit(`/billing/checkout?item=training_course&id=${course.id}`);
        }
    };

    const ctaLabel = enrollment
        ? (enrollment.status === 'completed' ? 'Revoir la formation' : 'Continuer')
        : (isFree ? "S'inscrire gratuitement" : `Acheter — ${course.price_xof?.toLocaleString('fr-FR')} XOF`);

    const tabs = [
        { id: 'programme', label: 'Programme' },
        { id: 'apercu',    label: 'Aperçu' },
        { id: 'avis',      label: `Avis (${ratings.length})` },
    ];

    return (
        <AppLayout>
            <Head title={course.title} />

            {/* Bouton retour */}
            <button onClick={() => router.visit('/training/catalog')}
                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
                <ArrowLeftIcon className="w-4 h-4" />
                Retour au catalogue
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Colonne principale */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Hero */}
                    <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {course.category && (
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                    {course.category}
                                </span>
                            )}
                            {course.level && (
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                    {LEVEL_LABEL[course.level] ?? course.level}
                                </span>
                            )}
                            {tags.map(tag => (
                                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                            {course.title}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                            {course.description}
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-5 text-sm text-gray-600 dark:text-gray-400">
                            {course.rating_avg > 0 && (
                                <StarDisplay value={course.rating_avg} count={course.rating_count ?? 0} />
                            )}
                            <span className="flex items-center gap-1.5">
                                <UserGroupIcon className="w-4 h-4" />
                                {(course.enrollment_count ?? 0).toLocaleString()} inscrits
                            </span>
                            <span className="flex items-center gap-1.5">
                                <ClockIcon className="w-4 h-4" />
                                {formatDuration(course.duration_minutes)}
                            </span>
                            {course.language && (
                                <span className="uppercase font-medium">{course.language}</span>
                            )}
                        </div>
                    </div>

                    {/* Miniature / Trailer */}
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 aspect-video">
                        {course.thumbnail_path ? (
                            <img src={`/storage/${course.thumbnail_path}`} alt={course.title}
                                 className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <AcademicCapIcon className="w-24 h-24 text-white/30" />
                            </div>
                        )}
                        {course.trailer_url && (
                            <a href={course.trailer_url} target="_blank" rel="noreferrer"
                               className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                                <PlayCircleIcon className="w-20 h-20 text-white drop-shadow-xl" />
                            </a>
                        )}
                    </div>

                    {/* Onglets */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex gap-6">
                            {tabs.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`pb-3 text-sm font-medium border-b-2 transition-colors
                                        ${activeTab === t.id
                                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Programme */}
                    {activeTab === 'programme' && (
                        <div className="space-y-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                {modules.length} modules • {formatDuration(course.duration_minutes)}
                            </p>
                            {modules.map((mod, i) => (
                                <ModuleItem
                                    key={mod.id}
                                    module={mod}
                                    index={i}
                                    isUnlocked={!!enrollment || i === 0}
                                    userProgress={mod.progress}
                                />
                            ))}
                        </div>
                    )}

                    {/* Aperçu */}
                    {activeTab === 'apercu' && (
                        <div className="space-y-6">
                            {skills.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                                        Ce que vous apprendrez
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {skills.map((skill, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <CheckSolid className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{skill}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {prerequisites.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Prérequis</h3>
                                    <ul className="space-y-1">
                                        {prerequisites.map((p, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="text-gray-400 mt-0.5">•</span>
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Instructeur */}
                            {instructor && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Votre instructeur</h3>
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                            {instructor.avatar ? (
                                                <img src={instructor.avatar} alt={instructor.name} className="w-16 h-16 rounded-full object-cover" />
                                            ) : (
                                                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                                    {instructor.name?.[0]}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{instructor.name}</p>
                                            <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">{instructor.title}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{instructor.bio}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Avis */}
                    {activeTab === 'avis' && (
                        <div className="space-y-6">
                            {course.rating_avg > 0 && (
                                <div className="flex gap-8 items-center">
                                    <div className="text-center">
                                        <div className="text-5xl font-bold text-gray-900 dark:text-white">
                                            {Number(course.rating_avg).toFixed(1)}
                                        </div>
                                        <div className="flex justify-center mt-1">
                                            {[1,2,3,4,5].map(i => (
                                                <StarSolid key={i} className={`w-5 h-5 ${i <= Math.round(course.rating_avg) ? 'text-yellow-400' : 'text-gray-200'}`} />
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{course.rating_count} avis</p>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        {ratingDistribution.map(({ star, count, pct }) => (
                                            <div key={star} className="flex items-center gap-2">
                                                <span className="text-xs text-gray-600 dark:text-gray-400 w-4">{star}</span>
                                                <StarSolid className="w-3.5 h-3.5 text-yellow-400" />
                                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-500 w-8">{pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {enrollment && (
                                <div>
                                    {showRating ? (
                                        <CourseRating
                                            courseId={course.id}
                                            onSuccess={() => setShowRating(false)}
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setShowRating(true)}
                                            className="px-4 py-2 border border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                        >
                                            Laisser un avis
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                {ratings.map(r => (
                                    <div key={r.id} className="border-b border-gray-100 dark:border-gray-700 pb-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                                {r.user_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{r.user_name}</p>
                                                <div className="flex">
                                                    {[1,2,3,4,5].map(i => (
                                                        <StarSolid key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {r.comment && <p className="text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar CTA */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                        {!isFree && (
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {course.price_xof?.toLocaleString('fr-FR')} XOF
                            </div>
                        )}
                        {isFree && (
                            <div className="text-3xl font-bold text-green-600 mb-1">Gratuit</div>
                        )}

                        <button
                            onClick={handleEnroll}
                            className="w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors mb-4 mt-3"
                        >
                            {ctaLabel}
                        </button>

                        {enrollment?.status === 'in_progress' && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span>Progression</span>
                                    <span>{enrollment.progress_percent ?? 0}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full transition-all"
                                        style={{ width: `${enrollment.progress_percent ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2.5">
                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                {formatDuration(course.duration_minutes)} de contenu
                            </div>
                            <div className="flex items-center gap-2.5">
                                <BookOpenIcon className="w-4 h-4 text-gray-400" />
                                {modules.length} modules
                            </div>
                            <div className="flex items-center gap-2.5">
                                <AcademicCapIcon className="w-4 h-4 text-gray-400" />
                                Certificat à la complétion
                            </div>
                            {course.level && (
                                <div className="flex items-center gap-2.5">
                                    <CheckCircleIcon className="w-4 h-4 text-gray-400" />
                                    Niveau : {LEVEL_LABEL[course.level] ?? course.level}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
export { CourseDetail };
