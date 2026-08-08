/**
 * Academie/Index.jsx — Accueil de l'Académie IBIG SECRETIS (GET /academie)
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, mêmes helpers `route(...)`, mêmes liens.
 *
 * Props réelles (AcademyController@index → Inertia::render('Academie/Index')) :
 *   dashboard : { in_progress[], completed[], certificates[], recommended[],
 *                 recent_resources[], total_time_spent,
 *                 stats: { courses_in_progress, courses_completed,
 *                          certificates_earned, lessons_completed } }
 *   catalog   : [{ id, slug, name, description, icon, color, courses[],
 *                  total_courses, completed_count, percent_done }]
 *
 * ⚠️ `total_time_spent` est à la RACINE de `dashboard`, pas dans `stats`
 *    (AcademyService::getUserDashboard) — l'ancien code lisait
 *    `stats.total_time_spent` et affichait donc toujours « 0 min ».
 */

import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    BookOpenIcon,
    TrophyIcon,
    ClockIcon,
    ArrowRightIcon,
    DocumentArrowDownIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    PlayCircleIcon,
    AcademicCapIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import {
    PageHeader, Button, Badge, Card, StatCard, EmptyState,
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

const LEVELS = {
    debutant:      { label: 'Débutant',      tone: 'success' },
    intermediaire: { label: 'Intermédiaire', tone: 'warning' },
    avance:        { label: 'Avancé',        tone: 'danger'  },
};

const levelMeta = (level) => LEVELS[level] ?? { label: level ?? '—', tone: 'neutral' };

const RESOURCE_LABELS = {
    pdf: 'PDF', excel: 'Excel', word: 'Word', csv: 'CSV', zip: 'ZIP', link: 'Lien',
};

// ─── Composants ───────────────────────────────────────────────────────────────

function ProgressBar({ value, tone = 'accent' }) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    return (
        <div
            className={cx('h-1 w-full overflow-hidden rounded-full', SURFACE_SUNK)}
            role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}
        >
            <div
                className={cx('h-full rounded-full transition-all', tone === 'success' ? 'bg-emerald-500' : 'bg-purple-600')}
                style={{ width: `${v}%` }}
            />
        </div>
    );
}

function CourseCard({ course }) {
    const title = course.title?.fr ?? course.title;
    const level = levelMeta(course.level);
    const pct   = Math.max(0, Math.min(100, Number(course.progress_percent) || 0));

    return (
        <Link
            href={route('academie.cours', { slug: course.slug })}
            className={cx(
                'group flex flex-col overflow-hidden rounded-xl border shadow-sm transition-colors',
                SURFACE, BORDER, FOCUS_RING,
                'hover:border-purple-300 dark:hover:border-purple-500/50',
            )}
        >
            {/* Miniature */}
            <div className={cx('relative aspect-[16/9] overflow-hidden border-b', BORDER, SURFACE_SUNK)}>
                {course.thumbnail ? (
                    <img src={course.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <BookOpenIcon className={cx('h-9 w-9', TEXT_FAINT)} aria-hidden="true" />
                    </div>
                )}
                {course.is_completed && (
                    <span className="absolute right-3 top-3">
                        <CheckCircleSolid className="h-6 w-6 text-emerald-500" aria-hidden="true" />
                    </span>
                )}
                {pct > 0 && !course.is_completed && (
                    <div className="absolute inset-x-0 bottom-0">
                        <ProgressBar value={pct} />
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className={cx(
                        'text-sm font-semibold leading-5 transition-colors',
                        TEXT_TITLE, 'group-hover:text-purple-700 dark:group-hover:text-purple-300',
                    )}>
                        {title}
                    </h3>
                    <Badge variant={level.tone} outline className="shrink-0">{level.label}</Badge>
                </div>

                <div className={cx('mt-3 flex items-center gap-3 text-xs', TEXT_MUTED)}>
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className={NUM}>{formatDuration(course.duration_minutes)}</span>
                    </span>
                    {course.lessons_count > 0 && (
                        <span className={NUM}>
                            {course.lessons_count} leçon{course.lessons_count > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="mt-4">
                    {course.is_completed ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" /> Terminé
                        </span>
                    ) : pct > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                            <PlayCircleIcon className="h-4 w-4" aria-hidden="true" />
                            Continuer <span className={NUM}>({pct}%)</span>
                        </span>
                    ) : (
                        <span className={cx('flex items-center gap-1 text-xs font-semibold', TEXT_MUTED)}>
                            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /> Commencer
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
            className={cx(
                'group rounded-xl border p-4 shadow-sm transition-colors',
                SURFACE, BORDER, FOCUS_RING,
                'hover:border-purple-300 dark:hover:border-purple-500/50',
            )}
        >
            <div className="mb-3 flex items-center justify-between">
                <span className={cx(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold',
                    NUM, SURFACE_SUNK, 'border', BORDER, TEXT_TITLE,
                )}>
                    {cat.total_courses}
                </span>
                <ChevronRightIcon
                    className={cx('h-4 w-4 transition-colors', TEXT_FAINT, 'group-hover:text-purple-600 dark:group-hover:text-purple-400')}
                    aria-hidden="true"
                />
            </div>

            <h3 className={cx('mb-1 text-sm font-semibold leading-5', TEXT_TITLE)}>{name}</h3>
            <p className={cx('text-xs', NUM, TEXT_MUTED)}>
                {cat.total_courses} cours · {cat.completed_count} terminé{cat.completed_count > 1 ? 's' : ''}
            </p>

            {cat.total_courses > 0 && (
                <div className="mt-3">
                    <ProgressBar value={cat.percent_done} tone={cat.percent_done >= 100 ? 'success' : 'accent'} />
                </div>
            )}
        </Link>
    );
}

function SectionHeading({ title, href, linkLabel = 'Voir tout' }) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className={cx('text-base font-semibold tracking-tight', TEXT_TITLE)}>{title}</h2>
            {href && (
                <Link
                    href={href}
                    className={cx(
                        'flex items-center gap-1 rounded px-0.5 text-sm font-medium',
                        'text-purple-700 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200',
                        FOCUS_RING,
                    )}
                >
                    {linkLabel} <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}

function ResourceRow({ resource }) {
    const title = resource.title?.fr ?? resource.title;

    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', SURFACE_SUNK, 'border', BORDER)}>
                    <DocumentTextIcon className={cx('h-4 w-4', TEXT_MUTED)} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{title}</p>
                    <p className={cx('flex items-center gap-1.5 truncate text-xs', TEXT_MUTED)}>
                        <Badge variant="neutral">{RESOURCE_LABELS[resource.type] ?? resource.type}</Badge>
                        {resource.module && <span className="truncate">{resource.module}</span>}
                    </p>
                </div>
            </div>
            <a
                href={route('api.academy.resources.download', { id: resource.id })}
                className={cx(
                    'flex shrink-0 items-center gap-1.5 rounded px-0.5 text-xs font-medium',
                    'text-purple-700 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200',
                    FOCUS_RING,
                )}
            >
                <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
                Télécharger
            </a>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieIndex({ dashboard = {}, catalog = [] }) {
    const stats           = dashboard.stats ?? {};
    const inProgress      = dashboard.in_progress ?? [];
    const recommended     = dashboard.recommended ?? [];
    const certificates    = dashboard.certificates ?? [];
    const recentResources = dashboard.recent_resources ?? [];
    const totalTimeSpent  = dashboard.total_time_spent ?? 0;

    const categories = Array.isArray(catalog) ? catalog : [];

    // Cours mis en avant du catalogue, utilisés à défaut de recommandations.
    const allFeaturedCourses = categories
        .flatMap(cat => (cat.courses ?? []).filter(c => c.is_featured))
        .slice(0, 4);

    const recommendedCourses = recommended.length > 0 ? recommended : allFeaturedCourses;

    return (
        <AppLayout>
            <Head title="Académie SECRETIS" />

            <PageHeader
                title="Académie IBIG SECRETIS"
                subtitle="Formations guidées, ressources téléchargeables et certificats reconnus. Progressez à votre rythme."
                icon={AcademicCapIcon}
                breadcrumbs={[{ label: 'Académie' }]}
                actions={
                    <>
                        {stats.courses_in_progress > 0 && (
                            <Button as={Link} href={route('academie.mon-espace')} variant="secondary">
                                Mon espace
                            </Button>
                        )}
                        <Button as={Link} href={route('academie.catalogue')} variant="primary" icon={BookOpenIcon}>
                            Explorer le catalogue
                        </Button>
                    </>
                }
            />

            {/* Indicateurs */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Cours terminés" value={stats.courses_completed ?? 0}   icon={CheckCircleIcon} tone="success" />
                <StatCard label="Certificats"    value={stats.certificates_earned ?? 0} icon={TrophyIcon}      tone="warning" />
                <StatCard label="Leçons"         value={stats.lessons_completed ?? 0}   icon={BookOpenIcon}    tone="info"    />
                <StatCard label="Formation"      value={totalTimeSpent} unit="min"      icon={ClockIcon}       tone="neutral" />
            </div>

            {/* Continuer l'apprentissage */}
            {inProgress.length > 0 && (
                <section className="mb-8">
                    <SectionHeading title="Continuer l'apprentissage" href={route('academie.mon-espace')} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {inProgress.slice(0, 3).map(course => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                </section>
            )}

            {/* Recommandés */}
            {recommendedCourses.length > 0 && (
                <section className="mb-8">
                    <SectionHeading title="Recommandés pour vous" href={route('academie.catalogue')} linkLabel="Tout voir" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {recommendedCourses.slice(0, 4).map(course => (
                            <CourseCard key={course.id || course.slug} course={course} />
                        ))}
                    </div>
                </section>
            )}

            {/* Catégories */}
            <section className="mb-8">
                <SectionHeading title="Parcourir par catégorie" />
                {categories.length === 0 ? (
                    <EmptyState
                        bordered
                        icon={BookOpenIcon}
                        title="Aucune catégorie publiée"
                        description="Le catalogue de l'Académie est encore vide. Les catégories et leurs cours apparaîtront ici dès leur mise en ligne."
                        hints={[
                            'Chaque catégorie regroupe des cours par domaine métier.',
                            'Votre avancement par catégorie est suivi automatiquement.',
                        ]}
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {categories.map(cat => (
                            <CategoryCard key={cat.id} cat={cat} />
                        ))}
                    </div>
                )}
            </section>

            {/* Ressources + Certificats */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card
                    title="Ressources téléchargeables"
                    actions={
                        <Button as={Link} href={route('academie.ressources')} variant="ghost" size="sm" iconRight={ArrowRightIcon}>
                            Voir tout
                        </Button>
                    }
                >
                    {recentResources.length > 0 ? (
                        <div className={cx('divide-y', DIVIDE)}>
                            {recentResources.map(r => (
                                <ResourceRow key={r.id} resource={r} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            compact
                            icon={DocumentArrowDownIcon}
                            title="Aucune ressource"
                            description="Les modèles, guides et fiches pratiques publiés par l'Académie apparaîtront ici."
                        />
                    )}
                </Card>

                <Card
                    title="Mes certificats"
                    actions={
                        certificates.length > 0 ? (
                            <Button
                                as={Link}
                                href={route('academie.mon-espace', { tab: 'certificats' })}
                                variant="ghost" size="sm" iconRight={ArrowRightIcon}
                            >
                                Voir tout
                            </Button>
                        ) : undefined
                    }
                >
                    {certificates.length > 0 ? (
                        <div className="space-y-3">
                            {certificates.slice(0, 3).map(cert => (
                                <div
                                    key={cert.uuid}
                                    className={cx('flex items-center gap-3 rounded-xl border p-3', BORDER, SURFACE_SUNK)}
                                >
                                    <TrophyIcon className="h-7 w-7 shrink-0 text-amber-500" aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                        <p className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>
                                            {cert.course_title}
                                        </p>
                                        <p className={cx('text-xs', NUM, TEXT_MUTED)}>
                                            {cert.score != null ? `Score : ${cert.score}% · ` : ''}
                                            {new Date(cert.issued_at).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <Button
                                        as={Link}
                                        href={route('academie.certificat', { uuid: cert.uuid })}
                                        variant="secondary" size="xs"
                                    >
                                        Voir
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            compact
                            icon={TrophyIcon}
                            title="Aucun certificat"
                            description="Terminez un cours de bout en bout pour obtenir votre premier certificat vérifiable."
                            action={
                                <Button as={Link} href={route('academie.catalogue')} variant="primary" size="sm">
                                    Explorer le catalogue
                                </Button>
                            }
                        />
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
export { AcademieIndex };
