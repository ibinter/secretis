/**
 * Formation/MySpace.jsx — Mon espace formation (GET /formation/mon-espace)
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, même helper `route('formation.catalogue')`,
 * mêmes onglets et mêmes filtres locaux.
 *
 * Props réelles (TrainingController@mySpace → Inertia::render('Formation/MySpace')) :
 *   enrollments : [{ id, status, progress, started_at, completed_at,
 *                    course: { id, title, category, thumbnail } }]
 *                 ⚠️ le contrôleur renvoie aujourd'hui `progress: 0` en dur et
 *                 `started_at`/`completed_at` à `null` — voir rapport.
 *   user        : { id, name, email }
 */

import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    BookOpenIcon,
    ClockIcon,
    PlayCircleIcon,
    CheckCircleIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import {
    PageHeader, Button, Badge, StatCard, EmptyState,
    cx, SURFACE, SURFACE_SUNK, BORDER,
    TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Statuts ──────────────────────────────────────────────────────────────────
/* Tons sémantiques uniquement : l'accent violet est réservé aux actions
   principales et à l'onglet actif.                                            */

const STATUS_CFG = {
    enrolled:    { label: 'Inscrit',  tone: 'info',    Icon: ClockIcon },
    in_progress: { label: 'En cours', tone: 'warning', Icon: PlayCircleIcon },
    completed:   { label: 'Terminé',  tone: 'success', Icon: CheckCircleIcon },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CFG[status] ?? STATUS_CFG.enrolled;
    return <Badge variant={cfg.tone} icon={cfg.Icon}>{cfg.label}</Badge>;
}

// ─── Carte d'inscription ──────────────────────────────────────────────────────

function EnrollmentCard({ enrollment }) {
    const course   = enrollment.course ?? {};
    const progress = Math.max(0, Math.min(100, Number(enrollment.progress) || 0));

    return (
        <article className={cx(SURFACE, 'border', BORDER, 'flex gap-4 rounded-xl p-4 shadow-sm sm:p-5')}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
                <BookOpenIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-3">
                    <h3 className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>
                        {course.title ?? 'Formation'}
                    </h3>
                    <StatusBadge status={enrollment.status} />
                </div>

                {course.category && (
                    <p className={cx('mb-2 text-xs capitalize', TEXT_MUTED)}>{course.category}</p>
                )}

                {progress > 0 && (
                    <div className="mb-2">
                        <div className={cx('mb-1 flex items-center justify-between text-xs', TEXT_MUTED)}>
                            <span>Progression</span>
                            <span className={cx('font-medium', NUM, TEXT_TITLE)}>{progress}%</span>
                        </div>
                        <div
                            className={cx('h-1 w-full overflow-hidden rounded-full', SURFACE_SUNK)}
                            role="progressbar"
                            aria-valuenow={progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div className="h-full rounded-full bg-purple-600 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', TEXT_FAINT)}>
                    {enrollment.started_at && (
                        <span className={NUM}>Débuté le {formatDate(enrollment.started_at)}</span>
                    )}
                    {enrollment.completed_at && (
                        <span className={NUM}>Terminé le {formatDate(enrollment.completed_at)}</span>
                    )}
                </div>
            </div>
        </article>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const TABS = [
    { id: 'en-cours',   label: 'En cours',    filter: e => e.status === 'in_progress', Icon: PlayCircleIcon },
    { id: 'inscrits',   label: 'Inscrits',     filter: e => e.status === 'enrolled',    Icon: ClockIcon },
    { id: 'termines',   label: 'Terminés',     filter: e => e.status === 'completed',   Icon: CheckCircleIcon },
];

export default function FormationMySpace({ enrollments = [], user = {} }) {
    const rows = Array.isArray(enrollments) ? enrollments : [];

    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location?.hash?.replace('#', '') || '';
        const ids  = TABS.map(t => t.id);
        if (ids.includes(hash)) return hash;
        if (rows.some(e => e.status === 'in_progress')) return 'en-cours';
        return 'inscrits';
    });

    const currentTab = TABS.find(t => t.id === activeTab) ?? TABS[0];
    const items      = rows.filter(currentTab.filter);

    const inProgressCount = rows.filter(e => e.status === 'in_progress').length;
    const completedCount  = rows.filter(e => e.status === 'completed').length;
    const enrolledCount   = rows.filter(e => e.status === 'enrolled').length;

    return (
        <AppLayout>
            <Head title="Mon espace formation" />

            <PageHeader
                title="Mon espace formation"
                subtitle={user.name || 'Suivez vos inscriptions et votre progression.'}
                icon={BookOpenIcon}
                breadcrumbs={[
                    { label: 'Formation', href: route('formation.catalogue') },
                    { label: 'Mon espace' },
                ]}
                actions={
                    <Button
                        as={Link}
                        href={route('formation.catalogue')}
                        variant="primary"
                        iconRight={ArrowRightIcon}
                    >
                        Catalogue
                    </Button>
                }
            />

            {/* Indicateurs */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="En cours"  value={inProgressCount} icon={PlayCircleIcon}  tone="warning" />
                <StatCard label="Terminés"  value={completedCount}  icon={CheckCircleIcon} tone="success" />
                <StatCard label="Inscrits"  value={enrolledCount}   icon={ClockIcon}       tone="info"    />
            </div>

            {/* Onglets */}
            <div className={cx('mb-6 flex gap-1 overflow-x-auto rounded-xl p-1', SURFACE_SUNK, 'border', BORDER)}>
                {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    const count  = rows.filter(tab.filter).length;
                    const Icon   = tab.Icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            aria-current={active ? 'true' : undefined}
                            className={cx(
                                'flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors',
                                FOCUS_RING,
                                active
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : cx(TEXT_MUTED, 'hover:bg-white dark:hover:bg-white/[0.06]'),
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {tab.label}
                            {count > 0 && (
                                <span className={cx(
                                    'rounded-full px-1.5 py-0.5 text-[11px]', NUM,
                                    active
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300',
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Contenu */}
            {items.length > 0 ? (
                <div className="space-y-4">
                    {items.map(e => (
                        <EnrollmentCard key={e.id} enrollment={e} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    bordered
                    icon={BookOpenIcon}
                    title={
                        activeTab === 'en-cours'
                            ? 'Aucune formation en cours'
                            : activeTab === 'termines'
                            ? 'Aucune formation terminée'
                            : "Vous n'êtes inscrit à aucune formation"
                    }
                    description={
                        activeTab === 'en-cours'
                            ? "Dès que vous démarrerez un cours, il apparaîtra ici avec sa progression."
                            : activeTab === 'termines'
                            ? 'Les formations achevées et leurs certificats seront regroupés ici.'
                            : 'Parcourez le catalogue pour vous inscrire à votre première formation.'
                    }
                    hints={[
                        'Votre progression est enregistrée automatiquement à chaque leçon.',
                        'Un cours terminé délivre un certificat vérifiable.',
                    ]}
                    action={
                        <Button
                            as={Link}
                            href={route('formation.catalogue')}
                            variant="primary"
                            iconRight={ArrowRightIcon}
                        >
                            Voir le catalogue
                        </Button>
                    }
                />
            )}
        </AppLayout>
    );
}
