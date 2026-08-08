/**
 * Academie/MySpace.jsx — Espace personnel de l'apprenant (GET /academie/mon-espace)
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, mêmes onglets (et même lecture du hash
 * d'URL), mêmes helpers `route(...)`, même partage LinkedIn, même
 * `navigator.clipboard.writeText`.
 *
 * Props réelles (AcademyController@mySpace → Inertia::render('Academie/MySpace')) :
 *   dashboard : { in_progress[], completed[], certificates[], recommended[],
 *                 recent_resources[], total_time_spent,
 *                 stats: { courses_in_progress, courses_completed,
 *                          certificates_earned, lessons_completed } }
 *
 * ⚠️ `total_time_spent` est à la RACINE de `dashboard`, pas dans `stats`
 *    (AcademyService::getUserDashboard) — l'ancien code lisait
 *    `stats.total_time_spent` et affichait donc toujours « 0 min ».
 */

import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    BookOpenIcon,
    TrophyIcon,
    DocumentArrowDownIcon,
    DocumentTextIcon,
    ClockIcon,
    PlayCircleIcon,
    CheckCircleIcon,
    ShareIcon,
    LinkIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import {
    PageHeader, Button, Badge, StatCard, EmptyState,
    cx, SURFACE, SURFACE_SUNK, BORDER, DIVIDE,
    TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

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

const RESOURCE_LABELS = {
    pdf: 'PDF', excel: 'Excel', word: 'Word', csv: 'CSV', zip: 'ZIP', link: 'Lien',
};

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
    const pct   = Math.max(0, Math.min(100, Number(course.progress_percent) || 0));

    return (
        <article className={cx(SURFACE, 'flex flex-col gap-4 rounded-xl border p-5 shadow-sm', BORDER)}>
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
                    <BookOpenIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                    <h3 className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>{title}</h3>
                    <div className={cx('mt-1 flex items-center gap-3 text-xs', TEXT_MUTED)}>
                        <span>{levelLabel(course.level)}</span>
                        {course.duration_minutes && (
                            <span className="flex items-center gap-1">
                                <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span className={NUM}>{formatDuration(course.duration_minutes)}</span>
                            </span>
                        )}
                    </div>
                </div>

                <span className={cx('text-xl font-semibold tracking-tight', NUM, TEXT_TITLE)}>{pct}%</span>
            </div>

            {/* Progression */}
            <div
                className={cx('h-1.5 w-full overflow-hidden rounded-full', SURFACE_SUNK)}
                role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
            >
                <div className="h-full rounded-full bg-purple-600 transition-all" style={{ width: `${pct}%` }} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                {course.last_accessed_at && (
                    <span className={cx('text-xs', NUM, TEXT_FAINT)}>
                        Dernier accès : {formatDate(course.last_accessed_at)}
                    </span>
                )}
                <Button
                    as={Link}
                    href={route('academie.cours', { slug: course.slug })}
                    variant="primary" size="sm" icon={PlayCircleIcon}
                    className="ml-auto"
                >
                    Continuer
                </Button>
            </div>
        </article>
    );
}

function CompletedCard({ course }) {
    const title = course.title?.fr ?? course.title;

    return (
        <article className={cx(SURFACE, 'flex items-center gap-4 rounded-xl border p-4 shadow-sm', BORDER)}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
                <h3 className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>{title}</h3>
                <p className={cx('mt-0.5 text-xs', NUM, TEXT_MUTED)}>
                    Terminé le {formatDate(course.completed_at)}
                    {course.quiz_score != null && ` · Score : ${course.quiz_score}%`}
                </p>
            </div>

            <Button
                as={Link}
                href={route('academie.cours', { slug: course.slug })}
                variant="secondary" size="xs" iconRight={ArrowTopRightOnSquareIcon}
                className="shrink-0"
            >
                Revoir
            </Button>
        </article>
    );
}

function CertificateCard({ cert }) {
    function shareOnLinkedIn() {
        const text = encodeURIComponent(`Je viens d'obtenir le certificat "${cert.course_title}" sur l'Académie IBIG SECRETIS !`);
        const url  = encodeURIComponent(cert.verify_url);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
    }

    return (
        <article className={cx(
            'rounded-xl border p-5 shadow-sm',
            'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
        )}>
            <div className="mb-4 flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
                    <TrophyIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className={cx('text-sm font-semibold leading-5', TEXT_TITLE)}>{cert.course_title}</h3>
                    <p className={cx('mt-1 text-xs', NUM, TEXT_MUTED)}>
                        Délivré le {formatDate(cert.issued_at)}
                        {cert.score != null && ` · Score : ${cert.score}%`}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    as={Link}
                    href={route('academie.certificat', { uuid: cert.uuid })}
                    variant="primary" size="sm" icon={TrophyIcon}
                >
                    Voir le certificat
                </Button>
                <Button variant="secondary" size="sm" icon={ShareIcon} onClick={shareOnLinkedIn}>
                    Partager sur LinkedIn
                </Button>
                <Button
                    variant="ghost" size="sm" icon={LinkIcon}
                    onClick={() => { navigator.clipboard.writeText(cert.verify_url); }}
                >
                    Copier le lien
                </Button>
            </div>
        </article>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieMySpace({ dashboard = {} }) {
    const inProgress      = dashboard.in_progress ?? [];
    const completed       = dashboard.completed ?? [];
    const certificates    = dashboard.certificates ?? [];
    const recentResources = dashboard.recent_resources ?? [];
    const stats           = dashboard.stats ?? {};
    const totalTimeSpent  = dashboard.total_time_spent ?? 0;

    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location?.hash?.replace('#', '') || '';
        const validTabs = TABS.map(t => t.id);
        return validTabs.includes(hash) ? hash : inProgress.length > 0 ? 'en-cours' : 'termines';
    });

    const counts = {
        'en-cours':    inProgress.length,
        'termines':    completed.length,
        'certificats': certificates.length,
        'ressources':  recentResources.length,
    };

    return (
        <AppLayout>
            <Head title="Mon espace formation — Académie" />

            <PageHeader
                title="Mon espace formation"
                subtitle="Vos cours en cours, vos formations terminées, vos certificats et vos ressources."
                icon={BookOpenIcon}
                breadcrumbs={[
                    { label: 'Académie', href: route('academie.index') },
                    { label: 'Mon espace' },
                ]}
                actions={
                    <Button as={Link} href={route('academie.catalogue')} variant="primary" icon={BookOpenIcon}>
                        Catalogue
                    </Button>
                }
            />

            {/* Indicateurs */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="En cours"    value={stats.courses_in_progress ?? 0} icon={PlayCircleIcon}  tone="info"    />
                <StatCard label="Terminés"    value={stats.courses_completed ?? 0}   icon={CheckCircleIcon} tone="success" />
                <StatCard label="Certificats" value={stats.certificates_earned ?? 0} icon={TrophyIcon}      tone="warning" />
                <StatCard label="Formation"   value={totalTimeSpent} unit="min"      icon={ClockIcon}       tone="neutral" />
            </div>

            {/* Onglets */}
            <div className={cx('mb-6 flex gap-1 overflow-x-auto rounded-xl border p-1', SURFACE_SUNK, BORDER)}>
                {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    const Icon   = tab.icon;
                    const count  = counts[tab.id] ?? 0;

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

            {/* Contenu des onglets */}

            {activeTab === 'en-cours' && (
                inProgress.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {inProgress.map(course => (
                            <InProgressCard key={course.id} course={course} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        bordered
                        icon={BookOpenIcon}
                        title="Aucun cours en cours"
                        description="Démarrez une formation du catalogue : elle apparaîtra ici avec sa progression, reprise exactement là où vous vous êtes arrêté."
                        hints={[
                            'Votre avancement est enregistré leçon par leçon.',
                            'Un cours démarré reste accessible depuis tous vos appareils.',
                        ]}
                        action={
                            <Button as={Link} href={route('academie.catalogue')} variant="primary">
                                Explorer le catalogue
                            </Button>
                        }
                    />
                )
            )}

            {activeTab === 'termines' && (
                completed.length > 0 ? (
                    <div className="space-y-3">
                        {completed.map(course => (
                            <CompletedCard key={course.id} course={course} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        bordered
                        icon={CheckCircleIcon}
                        title="Aucun cours terminé"
                        description="Les formations que vous aurez achevées seront regroupées ici, avec leur date de complétion et votre score au quiz."
                        action={
                            <Button as={Link} href={route('academie.catalogue')} variant="primary">
                                Explorer le catalogue
                            </Button>
                        }
                    />
                )
            )}

            {activeTab === 'certificats' && (
                certificates.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {certificates.map(cert => (
                            <CertificateCard key={cert.uuid} cert={cert} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        bordered
                        icon={TrophyIcon}
                        title="Aucun certificat obtenu"
                        description="Terminez un cours et obtenez un score d'au moins 70 % au quiz final pour recevoir votre certificat."
                        hints={[
                            'Chaque certificat porte un identifiant unique vérifiable en ligne.',
                            'Vous pourrez le partager sur LinkedIn en un clic.',
                        ]}
                        action={
                            <Button as={Link} href={route('academie.catalogue')} variant="primary">
                                Explorer le catalogue
                            </Button>
                        }
                    />
                )
            )}

            {activeTab === 'ressources' && (
                recentResources.length > 0 ? (
                    <div className={cx(SURFACE, 'rounded-xl border shadow-sm', BORDER, 'divide-y', DIVIDE)}>
                        {recentResources.map(res => {
                            const title = res.title?.fr ?? res.title;
                            return (
                                <div key={res.id} className="flex items-center gap-4 p-4">
                                    <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', SURFACE_SUNK, BORDER)}>
                                        <DocumentTextIcon className={cx('h-4 w-4', TEXT_MUTED)} aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>{title}</p>
                                        <p className={cx('mt-0.5 flex items-center gap-1.5 truncate text-xs', TEXT_MUTED)}>
                                            <Badge variant="neutral">{RESOURCE_LABELS[res.type] ?? res.type}</Badge>
                                            {res.module && <span className="truncate">{res.module}</span>}
                                        </p>
                                    </div>
                                    <Button
                                        href={route('api.academy.resources.download', { id: res.id })}
                                        variant="secondary" size="sm" icon={DocumentArrowDownIcon}
                                        className="shrink-0"
                                    >
                                        Télécharger
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        bordered
                        icon={DocumentArrowDownIcon}
                        title="Aucune ressource disponible"
                        description="Modèles, guides et fiches pratiques publiés par l'Académie apparaîtront ici dès leur mise en ligne."
                        action={
                            <Button as={Link} href={route('academie.ressources')} variant="primary">
                                Voir la bibliothèque
                            </Button>
                        }
                    />
                )
            )}
        </AppLayout>
    );
}
export { AcademieMySpace };
