/**
 * Formation/LearningPaths.jsx — Parcours d'apprentissage (GET /formation/parcours)
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, mêmes appels axios
 * (`POST /training/learning-paths/{id}/enroll`,
 *  `GET  /training/learning-paths/{id}/progress`),
 * mêmes `router.visit` d'étape, mêmes états locaux.
 *
 * Props réelles (TrainingController@learningPaths → Inertia::render('Formation/LearningPaths')) :
 *   paths : [{ id, title, description, target_role, difficulty, total_hours,
 *              thumbnail_path, status, progress_percent, enrollment, items[] }]
 *           chaque item : { id, type: course|live|scorm|quiz, title, status,
 *                           progress, is_mandatory }
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    AcademicCapIcon,
    BookOpenIcon,
    ClockIcon,
    LockClosedIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    TrophyIcon,
    VideoCameraIcon,
    PuzzlePieceIcon,
    CubeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import {
    PageHeader, Button, Badge, Card, EmptyState,
    cx, SURFACE, SURFACE_SUNK, BORDER,
    TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
    beginner:     { label: 'Débutant',      tone: 'success' },
    intermediate: { label: 'Intermédiaire', tone: 'warning' },
    advanced:     { label: 'Avancé',        tone: 'danger'  },
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

const pct = (v) => Math.max(0, Math.min(100, Number(v) || 0));

// ─── Barre de progression fine ────────────────────────────────────────────────

function ProgressBar({ value, tone = 'accent', className = '' }) {
    const v = pct(value);
    return (
        <div
            className={cx('h-1.5 w-full overflow-hidden rounded-full', SURFACE_SUNK, className)}
            role="progressbar"
            aria-valuenow={v}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className={cx('h-full rounded-full transition-all', tone === 'success' ? 'bg-emerald-500' : 'bg-purple-600')}
                style={{ width: `${v}%` }}
            />
        </div>
    );
}

// ─── Étape du parcours ────────────────────────────────────────────────────────
/* Le jalon violet marque l'étape active (état actif) ; les statuts métier
   restent en tons sémantiques.                                               */

const STEP_STYLE = {
    completed:   { node: 'bg-emerald-600 text-white border-transparent', line: 'bg-emerald-500' },
    in_progress: { node: 'bg-purple-600 text-white border-transparent',  line: 'bg-gray-200 dark:bg-[#1E3048]' },
    registered:  { node: 'bg-sky-600 text-white border-transparent',     line: 'bg-gray-200 dark:bg-[#1E3048]' },
    available:   { node: cx('border-purple-400 text-purple-600 dark:text-purple-400', 'bg-white dark:bg-[#162032]'), line: 'bg-gray-200 dark:bg-[#1E3048]' },
    locked:      { node: cx('border-transparent', 'bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500'), line: 'bg-gray-200 dark:bg-[#1E3048]' },
};

function PathStep({ item, index, isLast, onClick }) {
    const Icon     = ITEM_ICONS[item.type] ?? BookOpenIcon;
    const s        = STEP_STYLE[item.status] ?? STEP_STYLE.locked;
    const isLocked = item.status === 'locked';
    const isDone   = item.status === 'completed';

    return (
        <div className="flex gap-4">
            {/* Jalon + trait vertical */}
            <div className="flex flex-col items-center">
                <button
                    type="button"
                    onClick={() => !isLocked && onClick?.(item)}
                    disabled={isLocked}
                    title={item.title ?? ITEM_LABELS[item.type] ?? 'Étape'}
                    className={cx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        s.node, FOCUS_RING,
                        isLocked ? 'cursor-not-allowed' : 'cursor-pointer',
                    )}
                >
                    {isDone
                        ? <CheckSolid className="h-4 w-4" aria-hidden="true" />
                        : isLocked
                            ? <LockClosedIcon className="h-4 w-4" aria-hidden="true" />
                            : <Icon className="h-4 w-4" aria-hidden="true" />}
                </button>
                {!isLast && <div className={cx('mt-1 min-h-6 w-px flex-1', s.line)} />}
            </div>

            {/* Contenu */}
            <div
                className={cx('flex-1 pb-6', !isLocked && 'cursor-pointer')}
                onClick={() => !isLocked && onClick?.(item)}
            >
                <div className={cx(
                    'rounded-xl border p-4 transition-colors',
                    isDone
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : isLocked
                            ? cx(BORDER, SURFACE_SUNK, 'opacity-60')
                            : cx(SURFACE, BORDER, 'hover:border-purple-300 dark:hover:border-purple-500/50'),
                )}>
                    <div className="flex items-start gap-3">
                        <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className={cx('text-[11px] font-semibold uppercase tracking-wider', NUM, TEXT_FAINT)}>
                                    Étape {index + 1}
                                </span>
                                <Badge variant={item.type === 'live' ? 'danger' : 'neutral'}>
                                    {ITEM_LABELS[item.type] ?? item.type}
                                </Badge>
                                {item.is_mandatory && <Badge variant="warning" outline>Obligatoire</Badge>}
                            </div>

                            <p className={cx('text-sm font-semibold', TEXT_TITLE)}>
                                {item.title ?? `${ITEM_LABELS[item.type] ?? ''} #${item.id}`}
                            </p>

                            {item.status === 'in_progress' && item.progress != null && (
                                <div className="mt-2 flex items-center gap-2">
                                    <ProgressBar value={item.progress} className="flex-1" />
                                    <span className={cx('text-xs', NUM, TEXT_MUTED)}>{pct(item.progress)}%</span>
                                </div>
                            )}
                        </div>

                        <div className="ml-auto shrink-0">
                            {!isLocked && !isDone && (
                                <ArrowRightIcon className={cx('h-4 w-4', TEXT_FAINT)} aria-hidden="true" />
                            )}
                            {isDone && (
                                <CheckSolid className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Carte de parcours ────────────────────────────────────────────────────────

function PathCard({ path, onEnroll, onView, enrolling }) {
    const level      = LEVEL_CONFIG[path.difficulty] ?? LEVEL_CONFIG.beginner;
    const isEnrolled = !!path.enrollment;
    const progress   = pct(path.progress_percent);
    const isDone     = path.status === 'completed';
    const stepCount  = Array.isArray(path.items) ? path.items.length : 0;

    return (
        <article className={cx(SURFACE, 'border', BORDER, 'overflow-hidden rounded-xl shadow-sm')}>
            {/* Bandeau */}
            <div className={cx('relative aspect-[16/6] overflow-hidden border-b', BORDER, SURFACE_SUNK)}>
                {path.thumbnail_path ? (
                    <img src={`/storage/${path.thumbnail_path}`} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-end justify-between gap-2 p-4">
                        <AcademicCapIcon className={cx('h-8 w-8', TEXT_FAINT)} aria-hidden="true" />
                        {path.target_role && (
                            <span className={cx('text-xs font-medium', TEXT_MUTED)}>{path.target_role}</span>
                        )}
                    </div>
                )}
                {isDone && (
                    <span className="absolute right-3 top-3">
                        <Badge variant="success" icon={TrophyIcon} className="shadow-sm">Terminé</Badge>
                    </span>
                )}
            </div>

            <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                    <Badge variant={level.tone} outline>{level.label}</Badge>
                    {path.total_hours > 0 && (
                        <span className={cx('flex items-center gap-1 text-xs', TEXT_MUTED)}>
                            <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className={NUM}>{path.total_hours}h</span>
                        </span>
                    )}
                </div>

                <h3 className={cx('mb-1 text-sm font-semibold leading-5', TEXT_TITLE)}>{path.title}</h3>
                <p className={cx('mb-4 line-clamp-2 text-xs leading-5', TEXT_MUTED)}>{path.description}</p>

                <p className={cx('mb-3 text-xs', NUM, TEXT_FAINT)}>{stepCount} étape{stepCount > 1 ? 's' : ''}</p>

                {/* Progression */}
                {isEnrolled && (
                    <div className="mb-4">
                        <div className={cx('mb-1 flex items-center justify-between text-xs', TEXT_MUTED)}>
                            <span>Progression</span>
                            <span className={cx('font-medium', NUM, TEXT_TITLE)}>{progress}%</span>
                        </div>
                        <ProgressBar value={progress} tone={isDone ? 'success' : 'accent'} />
                        {isDone && (
                            <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Parcours terminé — votre certificat est disponible.
                            </p>
                        )}
                        {!isDone && progress > 0 && (
                            <p className={cx('mt-1.5 text-xs', NUM, TEXT_MUTED)}>
                                {path.total_hours > 0
                                    ? `~${Math.ceil(path.total_hours * (1 - progress / 100))}h restantes`
                                    : `${100 - progress}% restant`}
                            </p>
                        )}
                    </div>
                )}

                {!isEnrolled ? (
                    <Button
                        variant="primary" size="sm" block
                        loading={enrolling === path.id}
                        onClick={() => onEnroll(path)}
                    >
                        Commencer le parcours
                    </Button>
                ) : (
                    <Button variant="subtle" size="sm" block onClick={() => onView(path)}>
                        {isDone ? 'Voir le certificat' : 'Continuer'}
                    </Button>
                )}
            </div>
        </article>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function LearningPaths({ paths = [] }) {
    const [selectedPath, setSelectedPath] = useState(null);
    const [pathProgress, setPathProgress] = useState([]);
    const [enrolling, setEnrolling] = useState(null);

    const list  = Array.isArray(paths) ? paths : [];
    const roles = [...new Set(list.map(p => p.target_role).filter(Boolean))];
    const [filterRole, setFilterRole] = useState('');

    const displayed = filterRole
        ? list.filter(p => p.target_role === filterRole)
        : list;

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

    /* ─── Vue détail d'un parcours ─────────────────────────────────────────── */

    if (selectedPath) {
        const progress = pct(selectedPath.progress_percent);
        const isDone   = selectedPath.status === 'completed';
        const steps    = pathProgress.length > 0
            ? pathProgress
            : (Array.isArray(selectedPath.items) ? selectedPath.items : []);

        return (
            <AppLayout>
                <Head title={selectedPath.title} />

                <PageHeader
                    title={selectedPath.title}
                    subtitle={selectedPath.description}
                    icon={AcademicCapIcon}
                    meta={
                        <>
                            {selectedPath.target_role && (
                                <Badge variant="neutral" size="md">{selectedPath.target_role}</Badge>
                            )}
                            {isDone && <Badge variant="success" size="md" icon={TrophyIcon}>Parcours terminé</Badge>}
                        </>
                    }
                    actions={
                        <Button variant="secondary" icon={ArrowLeftIcon} onClick={() => setSelectedPath(null)}>
                            Retour aux parcours
                        </Button>
                    }
                />

                {/* Progression globale */}
                <Card className="mb-6">
                    <div className={cx('mb-2 flex items-center justify-between text-sm', TEXT_BODY)}>
                        <span className="font-medium">Progression globale</span>
                        <span className={cx('font-semibold', NUM, TEXT_TITLE)}>{progress}%</span>
                    </div>
                    <ProgressBar value={progress} tone={isDone ? 'success' : 'accent'} />
                    {!isDone && selectedPath.total_hours > 0 && (
                        <p className={cx('mt-2 text-xs', NUM, TEXT_MUTED)}>
                            ~{Math.ceil(selectedPath.total_hours * (1 - progress / 100))}h restantes
                        </p>
                    )}
                </Card>

                {/* Certificat */}
                {isDone && (
                    <div className={cx(
                        'mb-6 flex flex-wrap items-center gap-4 rounded-xl border p-4 sm:p-5',
                        'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
                    )}>
                        <TrophyIcon className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Félicitations</p>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                Vous avez complété ce parcours. Votre certificat est disponible.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            className="ml-auto"
                            onClick={() => router.visit('/training/certificates')}
                        >
                            Voir mes certificats
                        </Button>
                    </div>
                )}

                {/* Étapes */}
                <section className="max-w-2xl">
                    <h2 className={cx('mb-6 text-base font-semibold tracking-tight', TEXT_TITLE)}>
                        Étapes du parcours
                    </h2>
                    {steps.length === 0 ? (
                        <EmptyState
                            bordered
                            compact
                            icon={BookOpenIcon}
                            title="Aucune étape définie"
                            description="Ce parcours ne contient pas encore de cours, de session live ou de quiz."
                        />
                    ) : (
                        steps.map((item, i) => (
                            <PathStep
                                key={i}
                                item={item}
                                index={i}
                                isLast={i === steps.length - 1}
                                onClick={handleStepClick}
                            />
                        ))
                    )}
                </section>
            </AppLayout>
        );
    }

    /* ─── Vue liste ────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Parcours d'apprentissage" />

            <PageHeader
                title="Parcours d'apprentissage"
                subtitle="Des chemins structurés, étape par étape, pour atteindre vos objectifs métier."
                icon={AcademicCapIcon}
                breadcrumbs={[{ label: 'Formation', href: '/formation' }, { label: 'Parcours' }]}
            />

            {/* Filtre par rôle */}
            {roles.length > 1 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setFilterRole('')}
                        aria-pressed={!filterRole}
                        className={cx(
                            'h-10 rounded-lg border px-4 text-sm font-medium transition-colors', FOCUS_RING,
                            !filterRole
                                ? 'border-transparent bg-purple-600 text-white'
                                : cx(SURFACE, BORDER, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                        )}
                    >
                        Tous
                    </button>
                    {roles.map(role => (
                        <button
                            key={role}
                            type="button"
                            onClick={() => setFilterRole(role)}
                            aria-pressed={filterRole === role}
                            className={cx(
                                'h-10 rounded-lg border px-4 text-sm font-medium transition-colors', FOCUS_RING,
                                filterRole === role
                                    ? 'border-transparent bg-purple-600 text-white'
                                    : cx(SURFACE, BORDER, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                            )}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            )}

            {displayed.length === 0 ? (
                <EmptyState
                    bordered
                    variant={filterRole ? 'no-results' : 'no-data'}
                    icon={filterRole ? undefined : AcademicCapIcon}
                    title={filterRole ? 'Aucun parcours pour ce rôle' : 'Aucun parcours disponible'}
                    description={
                        filterRole
                            ? `Aucun parcours n'est encore rattaché au rôle « ${filterRole} ».`
                            : "Les parcours regroupent cours, sessions live et quiz dans un ordre imposé. Aucun n'a encore été publié."
                    }
                    hints={
                        filterRole
                            ? undefined
                            : [
                                'Un parcours débloque ses étapes au fur et à mesure de votre progression.',
                                'Les étapes obligatoires conditionnent la délivrance du certificat.',
                            ]
                    }
                    secondary={
                        filterRole
                            ? <Button variant="secondary" onClick={() => setFilterRole('')}>Voir tous les parcours</Button>
                            : undefined
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {displayed.map(path => (
                        <PathCard
                            key={path.id}
                            path={path}
                            onEnroll={handleEnroll}
                            onView={handleView}
                            enrolling={enrolling}
                        />
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
export { LearningPaths };
