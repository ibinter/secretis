import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    BookOpenIcon,
    TrophyIcon,
    ClockIcon,
    ArrowRightIcon,
    DocumentArrowDownIcon,
    CheckCircleIcon,
    PlayCircleIcon,
    SparklesIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(min) {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function levelLabel(level) {
    const map = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
    return map[level] ?? level;
}

function levelColor(level) {
    const map = {
        debutant:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        intermediaire: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        avance:        'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    };
    return map[level] ?? 'bg-gray-100 text-gray-700';
}

// ─── Composants ───────────────────────────────────────────────────────────────

function StatCard({ value, label, icon: Icon, color }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '22' }}
            >
                <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
        </div>
    );
}

function CourseCard({ course, compact = false }) {
    const title = course.title?.fr ?? course.title;

    return (
        <Link
            href={route('academie.cours', { slug: course.slug })}
            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200"
        >
            {/* Thumbnail */}
            <div className="h-36 bg-gradient-to-br from-purple-600 to-indigo-700 relative flex items-center justify-center">
                {course.thumbnail ? (
                    <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                    <BookOpenIcon className="w-12 h-12 text-white/40" />
                )}
                {course.is_completed && (
                    <div className="absolute top-3 right-3">
                        <CheckCircleSolid className="w-7 h-7 text-emerald-400 drop-shadow" />
                    </div>
                )}
                {course.progress_percent > 0 && !course.is_completed && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                            className="h-full bg-emerald-400 transition-all"
                            style={{ width: `${course.progress_percent}%` }}
                        />
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${levelColor(course.level)}`}>
                        {levelLabel(course.level)}
                    </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-3">
                    <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {formatDuration(course.duration_minutes)}
                    </span>
                    {course.lessons_count > 0 && (
                        <span>{course.lessons_count} leçon{course.lessons_count > 1 ? 's' : ''}</span>
                    )}
                </div>

                {/* CTA */}
                <div className="mt-4">
                    {course.is_completed ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircleIcon className="w-4 h-4" /> Terminé
                        </span>
                    ) : course.progress_percent > 0 ? (
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <PlayCircleIcon className="w-4 h-4" /> Continuer ({course.progress_percent}%)
                        </span>
                    ) : (
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <ArrowRightIcon className="w-4 h-4" /> Commencer
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

function CategoryCard({ cat }) {
    const name = cat.name?.fr ?? cat.name;

    return (
        <Link
            href={route('academie.catalogue', { categorie: cat.slug })}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md transition-all duration-200 overflow-hidden"
        >
            {/* Bande de couleur à gauche */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: cat.color }} />

            <div className="pl-2">
                <div className="flex items-center justify-between mb-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={{ backgroundColor: cat.color + '22', color: cat.color }}
                    >
                        {cat.total_courses}
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </div>

                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 text-balance">
                    {name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {cat.total_courses} cours · {cat.completed_count} terminé{cat.completed_count > 1 ? 's' : ''}
                </p>

                {/* Barre de progression catégorie */}
                {cat.total_courses > 0 && (
                    <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${cat.percent_done}%`, backgroundColor: cat.color }}
                        />
                    </div>
                )}
            </div>
        </Link>
    );
}

function ContinueLearningSection({ courses }) {
    if (!courses || courses.length === 0) return null;

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Continuer l'apprentissage
                </h2>
                <Link
                    href={route('academie.mon-espace')}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                    Voir tout <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.slice(0, 3).map(course => (
                    <CourseCard key={course.id} course={course} />
                ))}
            </div>
        </section>
    );
}

function ResourceRow({ resource }) {
    const title = resource.title?.fr ?? resource.title;
    const typeIconMap = {
        pdf:   '📄',
        excel: '📊',
        word:  '📝',
        csv:   '📋',
        zip:   '🗜️',
        link:  '🔗',
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">{typeIconMap[resource.type] ?? '📁'}</span>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
                    {resource.module && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{resource.module}</p>
                    )}
                </div>
            </div>
            <a
                href={route('api.academy.resources.download', { id: resource.id })}
                className="ml-4 flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
            >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Télécharger
            </a>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieIndex({ dashboard, catalog }) {
    const { stats, in_progress, recommended, certificates, recent_resources } = dashboard;

    // Collecter tous les cours du catalogue (pour la grille recommandée)
    const allFeaturedCourses = catalog
        .flatMap(cat => cat.courses.filter(c => c.is_featured))
        .slice(0, 4);

    const recommendedCourses = recommended.length > 0 ? recommended : allFeaturedCourses;

    return (
        <AppLayout>
            <Head title="Académie SECRETIS" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* ── Hero ─────────────────────────────────────────────────────── */}
                <div className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-8 sm:p-10 mb-8 overflow-hidden">
                    {/* Décoration */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/3" />
                        <div className="absolute bottom-0 left-20 w-64 h-64 bg-white rounded-full translate-y-1/2" />
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <SparklesIcon className="w-5 h-5 text-yellow-300" />
                                <span className="text-sm font-medium text-purple-200 uppercase tracking-widest">
                                    Académie IBIG SECRETIS
                                </span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 text-balance">
                                Maîtrisez SECRETIS avec l'Académie IBIG
                            </h1>
                            <p className="text-purple-200 text-base max-w-xl">
                                Formations guidées, ressources téléchargeables et certificats reconnus.
                                Progressez à votre rythme, partout et sur tous vos appareils.
                            </p>

                            <div className="flex flex-wrap gap-3 mt-6">
                                <Link
                                    href={route('academie.catalogue')}
                                    className="inline-flex items-center gap-2 bg-white text-purple-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors shadow-md"
                                >
                                    <BookOpenIcon className="w-4 h-4" />
                                    Explorer le catalogue
                                </Link>
                                {stats.courses_in_progress > 0 && (
                                    <Link
                                        href={route('academie.mon-espace')}
                                        className="inline-flex items-center gap-2 bg-purple-500/30 hover:bg-purple-500/50 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors border border-white/20"
                                    >
                                        Mon espace
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Stats rapides */}
                        <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-full sm:w-auto">
                            {[
                                { v: stats.courses_completed, label: 'cours terminés' },
                                { v: stats.certificates_earned, label: 'certificats' },
                                { v: stats.lessons_completed, label: 'leçons' },
                                { v: `${stats.total_time_spent ?? 0} min`, label: 'de formation' },
                            ].map(({ v, label }) => (
                                <div key={label} className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-white tabular-nums">{v}</p>
                                    <p className="text-xs text-purple-200 mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Continuer l'apprentissage ─────────────────────────────────── */}
                <ContinueLearningSection courses={in_progress} />

                {/* ── Recommandés pour vous ─────────────────────────────────────── */}
                {recommendedCourses.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Recommandés pour vous
                            </h2>
                            <Link
                                href={route('academie.catalogue')}
                                className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                            >
                                Tout voir <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {recommendedCourses.slice(0, 4).map(course => (
                                <CourseCard key={course.id || course.slug} course={course} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Catégories ────────────────────────────────────────────────── */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Parcourir par catégorie
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {catalog.map(cat => (
                            <CategoryCard key={cat.id} cat={cat} />
                        ))}
                    </div>
                </section>

                {/* ── Ressources + Certificats ──────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ressources */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Ressources téléchargeables
                            </h2>
                            <Link
                                href={route('academie.ressources')}
                                className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                            >
                                Voir tout <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                        {recent_resources.length > 0 ? (
                            <div>
                                {recent_resources.map(r => (
                                    <ResourceRow key={r.id} resource={r} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                                Aucune ressource disponible pour le moment.
                            </p>
                        )}
                    </div>

                    {/* Certificats */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Mes certificats
                            </h2>
                            {certificates.length > 0 && (
                                <Link
                                    href={route('academie.mon-espace', { tab: 'certificats' })}
                                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                >
                                    Voir tout <ArrowRightIcon className="w-3.5 h-3.5" />
                                </Link>
                            )}
                        </div>
                        {certificates.length > 0 ? (
                            <div className="space-y-3">
                                {certificates.slice(0, 3).map(cert => (
                                    <div
                                        key={cert.uuid}
                                        className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800"
                                    >
                                        <TrophyIcon className="w-8 h-8 text-amber-500 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {cert.course_title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {cert.score != null ? `Score : ${cert.score}% · ` : ''}
                                                {new Date(cert.issued_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                        <Link
                                            href={route('academie.certificat', { uuid: cert.uuid })}
                                            className="flex-shrink-0 text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline"
                                        >
                                            Voir
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <TrophyIcon className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Terminez un cours pour obtenir votre premier certificat.
                                </p>
                                <Link
                                    href={route('academie.catalogue')}
                                    className="mt-3 inline-block text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                    Explorer le catalogue
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
export { AcademieIndex };
