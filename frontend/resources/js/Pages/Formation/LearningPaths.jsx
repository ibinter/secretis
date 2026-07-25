import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    AcademicCapIcon,
    BookOpenIcon,
    ClockIcon,
    CheckCircleIcon,
    LockClosedIcon,
    ArrowRightIcon,
    TrophyIcon,
    StarIcon,
    PlayCircleIcon,
    VideoCameraIcon,
    PuzzlePieceIcon,
    CubeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_COLORS = {
    'Secrétaire': 'from-purple-500 to-cyan-500',
    'Manager':    'from-purple-500 to-indigo-500',
    'DAF':        'from-green-500 to-teal-500',
    'RH':         'from-pink-500 to-rose-500',
    'Direction':  'from-orange-500 to-amber-500',
};

const LEVEL_CONFIG = {
    debutant:      { label: 'Débutant',      color: 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400' },
    intermediaire: { label: 'Intermédiaire', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-400' },
    avance:        { label: 'Avancé',        color: 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400' },
};

const ITEM_ICONS = {
    course: BookOpenIcon,
    live:   VideoCameraIcon,
    scorm:  CubeIcon,
    quiz:   PuzzlePieceIcon,
};

const ITEM_LABELS = {
    course: 'Cours',
    live:   'Live',
    scorm:  'SCORM',
    quiz:   'Quiz',
};

// ─── Étape du parcours ────────────────────────────────────────────────────────

function PathStep({ item, index, isLast, onClick }) {
    const Icon = ITEM_ICONS[item.type] ?? BookOpenIcon;
    const statusMap = {
        completed:   { cls: 'bg-green-500 text-white', ring: 'ring-green-300 dark:ring-green-700', line: 'bg-green-400' },
        in_progress: { cls: 'bg-indigo-500 text-white animate-pulse', ring: 'ring-indigo-300 dark:ring-indigo-700', line: 'bg-gray-200 dark:bg-gray-700' },
        available:   { cls: 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-400', ring: 'ring-indigo-200 dark:ring-indigo-800', line: 'bg-gray-200 dark:bg-gray-700' },
        locked:      { cls: 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500', ring: 'ring-gray-200 dark:ring-gray-700', line: 'bg-gray-200 dark:bg-gray-700' },
        registered:  { cls: 'bg-purple-500 text-white', ring: 'ring-purple-300 dark:ring-purple-700', line: 'bg-purple-400' },
    };
    const s = statusMap[item.status] ?? statusMap.locked;
    const isLocked = item.status === 'locked';
    const isDone   = item.status === 'completed';

    return (
        <div className="flex gap-4">
            {/* Ligne verticale + cercle */}
            <div className="flex flex-col items-center">
                <button
                    onClick={() => !isLocked && onClick?.(item)}
                    disabled={isLocked}
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ring-4 ${s.ring} ${s.cls} transition-all duration-200
                        ${!isLocked ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}`}
                >
                    {isDone ? <CheckSolid className="w-5 h-5" /> : isLocked ? <LockClosedIcon className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </button>
                {!isLast && (
                    <div className={`w-0.5 flex-1 mt-1 ${s.line} min-h-6 transition-colors`} />
                )}
            </div>

            {/* Contenu */}
            <div className={`flex-1 pb-6 ${!isLocked ? 'cursor-pointer' : ''}`}
                 onClick={() => !isLocked && onClick?.(item)}>
                <div className={`rounded-xl border p-4 transition-all
                    ${isDone ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : ''}
                    ${!isDone && !isLocked ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md' : ''}
                    ${isLocked ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60' : ''}
                `}>
                    <div className="flex items-start gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                                    Étape {index + 1}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                    ${item.type === 'live' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    {ITEM_LABELS[item.type] ?? item.type}
                                </span>
                                {item.is_mandatory && (
                                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Obligatoire</span>
                                )}
                            </div>
                            <p className={`font-semibold ${isDone ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                                {item.title ?? `${ITEM_LABELS[item.type] ?? ''} #${item.id}`}
                            </p>
                            {item.status === 'in_progress' && item.progress != null && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full transition-all"
                                             style={{ width: `${item.progress}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.progress}%</span>
                                </div>
                            )}
                        </div>
                        <div className="ml-auto flex-shrink-0">
                            {!isLocked && !isDone && (
                                <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                            )}
                            {isDone && <CheckSolid className="w-5 h-5 text-green-500" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Card de parcours ─────────────────────────────────────────────────────────

function PathCard({ path, onEnroll, onView }) {
    const level   = LEVEL_CONFIG[path.difficulty] ?? LEVEL_CONFIG.debutant;
    const gradient = ROLE_COLORS[path.target_role] ?? 'from-indigo-500 to-purple-500';
    const isEnrolled = !!path.enrollment;
    const progress   = path.progress_percent ?? 0;
    const isDone     = path.status === 'completed';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
            {/* Bannière */}
            <div className={`h-32 bg-gradient-to-br ${gradient} relative`}>
                {path.thumbnail_path ? (
                    <img src={`/storage/${path.thumbnail_path}`} alt={path.title}
                         className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-end h-full p-4">
                        {path.target_role && (
                            <span className="text-white/80 text-sm font-medium">{path.target_role}</span>
                        )}
                    </div>
                )}
                {isDone && (
                    <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <TrophyIcon className="w-3 h-3" />
                        Terminé
                    </div>
                )}
            </div>

            <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${level.color}`}>
                        {level.label}
                    </span>
                    {path.total_hours > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {path.total_hours}h
                        </span>
                    )}
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{path.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{path.description}</p>

                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {Array.isArray(path.items) ? path.items.length : 0} étapes
                </div>

                {/* Progression */}
                {isEnrolled && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Progression</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${isDone ? 'bg-green-500' : 'bg-indigo-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {isDone && (
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                                Parcours terminé ! Votre certificat est disponible.
                            </p>
                        )}
                        {!isDone && progress > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {path.total_hours > 0
                                    ? `~${Math.ceil(path.total_hours * (1 - progress / 100))}h restantes`
                                    : `${100 - progress}% restant`}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    {!isEnrolled ? (
                        <button onClick={() => onEnroll(path)}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
                            Commencer le parcours
                        </button>
                    ) : (
                        <button onClick={() => onView(path)}
                                className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-sm font-semibold rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800">
                            {isDone ? 'Voir le certificat' : 'Continuer'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function LearningPaths({ paths = [] }) {
    const [selectedPath, setSelectedPath] = useState(null);
    const [pathProgress, setPathProgress] = useState([]);
    const [enrolling, setEnrolling] = useState(null);

    const roles = [...new Set(paths.map(p => p.target_role).filter(Boolean))];
    const [filterRole, setFilterRole] = useState('');

    const displayed = filterRole
        ? paths.filter(p => p.target_role === filterRole)
        : paths;

    const handleEnroll = async (path) => {
        setEnrolling(path.id);
        try {
            await axios.post(`/training/learning-paths/${path.id}/enroll`);
            const res = await axios.get(`/training/learning-paths/${path.id}/progress`);
            setPathProgress(res.data);
            setSelectedPath(path);
            router.reload({ only: ['paths'] });
        } catch (e) {
            alert(e.response?.data?.message ?? "Erreur lors de l'inscription.");
        } finally {
            setEnrolling(null);
        }
    };

    const handleView = async (path) => {
        try {
            const res = await axios.get(`/training/learning-paths/${path.id}/progress`);
            setPathProgress(res.data);
            setSelectedPath(path);
        } catch (e) {
            setSelectedPath(path);
            setPathProgress(Array.isArray(path.items) ? path.items : []);
        }
    };

    const handleStepClick = (item) => {
        if (item.type === 'course') router.visit(`/training/courses/${item.id}`);
        else if (item.type === 'live') router.visit(`/training/live-sessions`);
        else if (item.type === 'scorm') router.visit(`/training/scorm/${item.id}/launch`);
        else if (item.type === 'quiz') router.visit(`/training/quizzes/${item.id}`);
    };

    if (selectedPath) {
        const progress = selectedPath.progress_percent ?? 0;
        const isDone   = selectedPath.status === 'completed';
        const gradient = ROLE_COLORS[selectedPath.target_role] ?? 'from-indigo-500 to-purple-500';
        const steps    = pathProgress.length > 0 ? pathProgress : (Array.isArray(selectedPath.items) ? selectedPath.items : []);

        return (
            <AppLayout>
                <Head title={selectedPath.title} />

                <button onClick={() => setSelectedPath(null)}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
                    ← Retour aux parcours
                </button>

                {/* Hero */}
                <div className={`rounded-2xl bg-gradient-to-r ${gradient} p-8 mb-8 text-white`}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            {selectedPath.target_role && (
                                <p className="text-white/70 text-sm mb-1">{selectedPath.target_role}</p>
                            )}
                            <h1 className="text-2xl font-bold mb-2">{selectedPath.title}</h1>
                            <p className="text-white/80">{selectedPath.description}</p>
                        </div>
                        {isDone && (
                            <div className="flex-shrink-0 bg-white/20 rounded-2xl p-4 text-center">
                                <TrophyIcon className="w-10 h-10 mx-auto mb-1" />
                                <span className="text-sm font-semibold">Terminé !</span>
                            </div>
                        )}
                    </div>

                    {/* Barre globale */}
                    <div className="mt-6">
                        <div className="flex justify-between text-sm text-white/80 mb-2">
                            <span>Progression globale</span>
                            <span className="font-bold">{progress}%</span>
                        </div>
                        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {!isDone && selectedPath.total_hours > 0 && (
                            <p className="text-white/60 text-xs mt-2">
                                ~{Math.ceil(selectedPath.total_hours * (1 - progress / 100))}h restantes
                            </p>
                        )}
                    </div>
                </div>

                {/* Certificat */}
                {isDone && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5 mb-6 flex items-center gap-4">
                        <TrophyIcon className="w-10 h-10 text-yellow-500 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-yellow-900 dark:text-yellow-300">Félicitations !</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                Vous avez complété ce parcours. Votre certificat est disponible.
                            </p>
                        </div>
                        <button
                            onClick={() => router.visit('/training/certificates')}
                            className="ml-auto px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold"
                        >
                            Voir mes certificats
                        </button>
                    </div>
                )}

                {/* Étapes */}
                <div className="max-w-2xl">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        Étapes du parcours
                    </h2>
                    {steps.map((item, i) => (
                        <PathStep
                            key={i}
                            item={item}
                            index={i}
                            isLast={i === steps.length - 1}
                            onClick={handleStepClick}
                        />
                    ))}
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title="Parcours d'apprentissage" />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parcours d'apprentissage</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Des chemins structurés pour atteindre vos objectifs
                    </p>
                </div>
            </div>

            {/* Filtre par rôle */}
            {roles.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setFilterRole('')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                            ${!filterRole ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        Tous
                    </button>
                    {roles.map(role => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                                ${filterRole === role ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            )}

            {displayed.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <AcademicCapIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Aucun parcours disponible</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayed.map(path => (
                        <PathCard
                            key={path.id}
                            path={path}
                            onEnroll={handleEnroll}
                            onView={handleView}
                        />
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
export { LearningPaths };
