import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    BookOpenIcon,
    TrophyIcon,
    DocumentArrowDownIcon,
    ClockIcon,
    PlayCircleIcon,
    CheckCircleIcon,
    ShareIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(min) {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function levelLabel(level) {
    return { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' }[level] ?? level;
}

// ─── Onglets ──────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'en-cours', label: 'En cours', icon: PlayCircleIcon },
    { id: 'termines', label: 'Terminés', icon: CheckCircleIcon },
    { id: 'certificats', label: 'Certificats', icon: TrophyIcon },
    { id: 'ressources', label: 'Ressources', icon: DocumentArrowDownIcon },
];

// ─── Composants ───────────────────────────────────────────────────────────────

function InProgressCard({ course }) {
    const title = course.title?.fr ?? course.title;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <BookOpenIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{levelLabel(course.level)}</span>
                        {course.duration_minutes && (
                            <span className="flex items-center gap-1">
                                <ClockIcon className="w-3.5 h-3.5" />
                                {formatDuration(course.duration_minutes)}
                            </span>
                        )}
                    </div>
                </div>
                <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
                    {course.progress_percent}%
                </span>
            </div>

            {/* Barre de progression */}
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${course.progress_percent}%` }}
                />
            </div>

            <div className="flex items-center justify-between">
                {course.last_accessed_at && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        Dernier accès : {formatDate(course.last_accessed_at)}
                    </span>
                )}
                <Link
                    href={route('academie.cours', { slug: course.slug })}
                    className="ml-auto flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <PlayCircleIcon className="w-4 h-4" />
                    Continuer
                </Link>
            </div>
        </div>
    );
}

function CompletedCard({ course }) {
    const title = course.title?.fr ?? course.title;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Terminé le {formatDate(course.completed_at)}
                    {course.quiz_score != null && ` · Score : ${course.quiz_score}%`}
                </p>
            </div>
            <Link
                href={route('academie.cours', { slug: course.slug })}
                className="flex-shrink-0 text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1"
            >
                Revoir <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </Link>
        </div>
    );
}

function CertificateCard({ cert }) {
    function shareOnLinkedIn() {
        const text = encodeURIComponent(`Je viens d'obtenir le certificat "${cert.course_title}" sur l'Académie IBIG SECRETIS ! 🎓`);
        const url  = encodeURIComponent(cert.verify_url);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
    }

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 rounded-2xl border border-amber-200 dark:border-amber-700 p-5">
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <TrophyIcon className="w-7 h-7 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white leading-snug">{cert.course_title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Délivré le {formatDate(cert.issued_at)}
                        {cert.score != null && ` · Score : ${cert.score}%`}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Link
                    href={route('academie.certificat', { uuid: cert.uuid })}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg transition-colors"
                >
                    <TrophyIcon className="w-3.5 h-3.5" />
                    Voir le certificat
                </Link>
                <button
                    onClick={shareOnLinkedIn}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-lg transition-colors"
                >
                    <ShareIcon className="w-3.5 h-3.5" />
                    Partager sur LinkedIn
                </button>
                <button
                    onClick={() => { navigator.clipboard.writeText(cert.verify_url); }}
                    className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
                >
                    Copier le lien
                </button>
            </div>
        </div>
    );
}

function ResourceTypeIcon({ type }) {
    const map = { pdf: '📄', excel: '📊', word: '📝', csv: '📋', zip: '🗜️', link: '🔗' };
    return <span className="text-xl">{map[type] ?? '📁'}</span>;
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieMySpace({ dashboard }) {
    const { in_progress, completed, certificates, recent_resources, stats } = dashboard;

    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location?.hash?.replace('#', '') || '';
        const validTabs = TABS.map(t => t.id);
        return validTabs.includes(hash) ? hash : in_progress.length > 0 ? 'en-cours' : 'termines';
    });

    return (
        <AppLayout>
            <Head title="Mon espace formation — Académie" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* En-tête */}
                <div className="mb-8">
                    <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <Link href={route('academie.index')} className="hover:text-purple-600">Académie</Link>
                        <span className="mx-2">/</span>
                        <span>Mon espace</span>
                    </nav>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Mon espace formation</h1>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { v: stats.courses_in_progress, label: 'En cours', color: '#3B82F6', Icon: PlayCircleIcon },
                        { v: stats.courses_completed,   label: 'Terminés', color: '#10B981', Icon: CheckCircleIcon },
                        { v: stats.certificates_earned, label: 'Certificats', color: '#F59E0B', Icon: TrophyIcon },
                        { v: `${stats.total_time_spent ?? 0} min`, label: 'De formation', color: '#8B5CF6', Icon: ClockIcon },
                    ].map(({ v, label, color, Icon }) => (
                        <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
                                <Icon className="w-5 h-5" style={{ color }} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{v}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Onglets */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
                    {TABS.map(tab => {
                        const active = activeTab === tab.id;
                        const Icon   = tab.icon;
                        const counts = {
                            'en-cours':   in_progress.length,
                            'termines':   completed.length,
                            'certificats':certificates.length,
                            'ressources': recent_resources.length,
                        };
                        const count = counts[tab.id] ?? 0;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                                    active
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {count > 0 && (
                                    <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-full px-1.5 py-0.5 tabular-nums">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Contenu des onglets */}

                {activeTab === 'en-cours' && (
                    <div>
                        {in_progress.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {in_progress.map(course => (
                                    <InProgressCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-16 text-center">
                                <BookOpenIcon className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun cours en cours</p>
                                <Link
                                    href={route('academie.catalogue')}
                                    className="mt-3 inline-block text-sm text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                    Explorer le catalogue
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'termines' && (
                    <div>
                        {completed.length > 0 ? (
                            <div className="space-y-3">
                                {completed.map(course => (
                                    <CompletedCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-16 text-center">
                                <CheckCircleIcon className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun cours terminé pour le moment</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'certificats' && (
                    <div>
                        {certificates.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {certificates.map(cert => (
                                    <CertificateCard key={cert.uuid} cert={cert} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-16 text-center">
                                <TrophyIcon className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun certificat obtenu</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Terminez un cours et obtenez un score ≥ 70% au quiz pour obtenir votre certificat.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ressources' && (
                    <div>
                        {recent_resources.length > 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                                {recent_resources.map(res => {
                                    const title = res.title?.fr ?? res.title;
                                    return (
                                        <div key={res.id} className="flex items-center gap-4 p-4">
                                            <ResourceTypeIcon type={res.type} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</p>
                                                {res.module && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">{res.module}</p>
                                                )}
                                            </div>
                                            <a
                                                href={route('api.academy.resources.download', { id: res.id })}
                                                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                                            >
                                                <DocumentArrowDownIcon className="w-4 h-4" />
                                                Télécharger
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-16 text-center">
                                <DocumentArrowDownIcon className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune ressource disponible</p>
                                <Link
                                    href={route('academie.ressources')}
                                    className="mt-3 inline-block text-sm text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                    Voir la bibliothèque
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
export { AcademieMySpace };
