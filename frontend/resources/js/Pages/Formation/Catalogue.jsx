/**
 * Formation/Catalogue.jsx — Accueil du module Formation (GET /formation)
 *
 * ⚠️ Page VIVANTE : `TrainingController@index` (route web `formation.index`)
 * rend bien `Formation/Catalogue`. À ne pas confondre avec `Formation/Catalog`
 * rendu par `TrainingController@catalog` (route web `formation.catalogue`).
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, mêmes routes (`GET /training/courses`,
 * `POST /training/courses/{id}/enroll`), mêmes états locaux, mêmes payloads.
 *
 * Props réelles (Inertia::render('Formation/Catalogue')) :
 *   courses     : tableau de cours { id, title, description, category, level,
 *                   duration_minutes, thumbnail_path,
 *                   enrollment: { status, progress_percent } | null }
 *   pagination  : { current_page, last_page, total, … }
 *   filters     : { category, level, search, status }  (sérialisé `[]` si vide)
 *   categories  : string[]
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    AcademicCapIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    BookOpenIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import {
    PageHeader, Button, Badge, Card, EmptyState,
    cx, CONTROL, SURFACE, SURFACE_SUNK, BORDER,
    TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';

// ─── Constantes ──────────────────────────────────────────────────────────────
/* Niveaux et statuts en tons sémantiques : l'accent violet reste réservé
   aux actions principales et à l'état actif.                                  */

const LEVEL_CONFIG = {
    beginner:     { label: 'Débutant',      tone: 'success' },
    intermediate: { label: 'Intermédiaire', tone: 'warning' },
    advanced:     { label: 'Avancé',        tone: 'danger'  },
};

const STATUS_CONFIG = {
    enrolled:    { label: 'Inscrit',  tone: 'info'    },
    in_progress: { label: 'En cours', tone: 'warning' },
    completed:   { label: 'Terminé',  tone: 'success' },
};

function formatDuration(minutes) {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;
}

// ─── Barre de progression ────────────────────────────────────────────────────

function ProgressBar({ value }) {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    return (
        <div
            className={cx('h-1 w-full overflow-hidden rounded-full', SURFACE_SUNK)}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div className="h-full rounded-full bg-purple-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
    );
}

// ─── Carte cours ─────────────────────────────────────────────────────────────

function CourseCard({ course }) {
    const enrollment = course.enrollment;
    const level      = LEVEL_CONFIG[course.level] ?? { label: course.level, tone: 'neutral' };
    const status     = enrollment ? STATUS_CONFIG[enrollment.status] : null;
    const done       = enrollment?.status === 'completed';

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
        <article className={cx(
            SURFACE, 'border', BORDER, 'flex flex-col overflow-hidden rounded-xl shadow-sm',
            'transition-colors hover:border-purple-300 dark:hover:border-purple-500/50',
        )}>
            {/* Miniature */}
            <div className={cx('relative aspect-[16/9] overflow-hidden border-b', BORDER, SURFACE_SUNK)}>
                {course.thumbnail_path ? (
                    <img
                        src={`/storage/${course.thumbnail_path}`}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <AcademicCapIcon className={cx('h-10 w-10', TEXT_FAINT)} aria-hidden="true" />
                    </div>
                )}

                <span className="absolute left-2 top-2">
                    <Badge variant={level.tone} outline className="shadow-sm">{level.label}</Badge>
                </span>

                {status && (
                    <span className="absolute right-2 top-2">
                        <Badge variant={status.tone} className="shadow-sm">{status.label}</Badge>
                    </span>
                )}

                {/* Progression — trait fin en pied de miniature */}
                {enrollment && !done && (
                    <div className="absolute inset-x-0 bottom-0">
                        <ProgressBar value={enrollment.progress_percent} />
                    </div>
                )}
            </div>

            {/* Contenu */}
            <div className="flex flex-1 flex-col p-4">
                {course.category && (
                    <p className={cx('mb-1 text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
                        {course.category}
                    </p>
                )}

                <h3 className={cx('mb-2 line-clamp-2 text-sm font-semibold leading-5', TEXT_TITLE)}>
                    {course.title}
                </h3>

                {course.description && (
                    <p className={cx('mb-3 line-clamp-2 text-xs leading-5', TEXT_MUTED)}>
                        {course.description}
                    </p>
                )}

                <div className={cx('mb-4 mt-auto flex items-center gap-3 text-xs', TEXT_MUTED)}>
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className={NUM}>{formatDuration(course.duration_minutes)}</span>
                    </span>
                    {enrollment && (
                        <span className="flex items-center gap-1">
                            <BookOpenIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className={NUM}>{enrollment.progress_percent ?? 0}%</span>
                            <span>complété</span>
                        </span>
                    )}
                </div>

                <Button
                    variant={done ? 'secondary' : 'primary'}
                    size="sm"
                    block
                    icon={done ? CheckSolid : undefined}
                    onClick={handleAction}
                >
                    {done ? 'Revoir le cours' : enrollment ? 'Continuer' : "S'inscrire"}
                </Button>
            </div>
        </article>
    );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Catalogue({ courses, pagination, filters, categories }) {
    /* PHP sérialise un `filters` vide en tableau `[]` : on normalise en objet. */
    const f = filters && !Array.isArray(filters) ? filters : {};

    const [search, setSearch]     = useState(f.search ?? '');
    const [category, setCategory] = useState(f.category ?? '');
    const [level, setLevel]       = useState(f.level ?? '');
    const [status, setStatus]     = useState(f.status ?? '');

    const items = Array.isArray(courses) ? courses : (courses?.data ?? []);
    const total = pagination?.total ?? items.length;

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

    function resetFilters() {
        setSearch(''); setCategory(''); setLevel(''); setStatus('');
        router.get('/training/courses', {}, { preserveState: true, replace: true });
    }

    const isFiltered = Boolean(f.search || f.category || f.level || f.status);
    const lbl = cx('mb-1.5 block text-xs font-medium', TEXT_MUTED);

    return (
        <AppLayout>
            <Head title="Catalogue de formations" />

            <PageHeader
                title="Formations"
                subtitle="Développez vos compétences avec les formations internes de l'organisation."
                icon={AcademicCapIcon}
                breadcrumbs={[{ label: 'Formation' }]}
                meta={
                    <Badge variant="neutral" size="md">
                        <span className={NUM}>{total.toLocaleString('fr-FR')}</span>
                        &nbsp;formation{total > 1 ? 's' : ''}
                    </Badge>
                }
            />

            {/* Recherche et filtres */}
            <Card className="mb-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                    <form onSubmit={handleSearch} className="lg:col-span-2">
                        <label className={lbl} htmlFor="cat-search">Rechercher</label>
                        <div className="relative">
                            <MagnifyingGlassIcon
                                className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)}
                                aria-hidden="true"
                            />
                            <input
                                id="cat-search"
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Titre, description…"
                                className={cx(CONTROL, 'h-10 pl-9')}
                            />
                        </div>
                    </form>

                    <div>
                        <label className={lbl} htmlFor="cat-category">Catégorie</label>
                        <select
                            id="cat-category"
                            value={category}
                            onChange={e => { setCategory(e.target.value); applyFilters({ category: e.target.value }); }}
                            className={cx(CONTROL, 'h-10')}
                        >
                            <option value="">Toutes</option>
                            {(categories ?? []).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={lbl} htmlFor="cat-level-filter">Niveau</label>
                        <select
                            id="cat-level-filter"
                            value={level}
                            onChange={e => { setLevel(e.target.value); applyFilters({ level: e.target.value }); }}
                            className={cx(CONTROL, 'h-10')}
                        >
                            <option value="">Tous</option>
                            <option value="beginner">Débutant</option>
                            <option value="intermediate">Intermédiaire</option>
                            <option value="advanced">Avancé</option>
                        </select>
                    </div>

                    <div>
                        <label className={lbl} htmlFor="cat-status">Statut</label>
                        <select
                            id="cat-status"
                            value={status}
                            onChange={e => { setStatus(e.target.value); applyFilters({ status: e.target.value }); }}
                            className={cx(CONTROL, 'h-10')}
                        >
                            <option value="">Tous</option>
                            <option value="not_started">Non commencé</option>
                            <option value="in_progress">En cours</option>
                            <option value="completed">Terminé</option>
                        </select>
                    </div>
                </div>

                <div className={cx('mt-4 flex justify-end gap-2 border-t pt-4', BORDER)}>
                    {isFiltered && (
                        <Button variant="ghost" onClick={resetFilters}>Effacer</Button>
                    )}
                    <Button variant="primary" icon={FunnelIcon} onClick={() => applyFilters()}>
                        Filtrer
                    </Button>
                </div>
            </Card>

            {/* Grille de cours */}
            {items.length === 0 ? (
                <EmptyState
                    bordered
                    variant={isFiltered ? 'no-results' : 'no-data'}
                    icon={isFiltered ? undefined : AcademicCapIcon}
                    title={isFiltered ? 'Aucune formation ne correspond' : 'Aucune formation disponible'}
                    description={
                        isFiltered
                            ? 'Aucun cours ne correspond à ces critères. Élargissez la recherche ou réinitialisez les filtres.'
                            : "Le catalogue interne est vide pour le moment. Les formations publiées par votre organisation apparaîtront ici."
                    }
                    hints={
                        isFiltered
                            ? undefined
                            : [
                                'Seuls les cours publiés de votre organisation sont listés.',
                                'Votre progression est reprise automatiquement sur chaque carte.',
                                'Un cours terminé reste accessible en relecture.',
                            ]
                    }
                    secondary={
                        isFiltered
                            ? <Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>
                            : undefined
                    }
                />
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {items.map(course => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.last_page > 1 && (
                        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={pagination.current_page <= 1}
                                onClick={() => router.get('/training/courses', { ...f, page: pagination.current_page - 1 })}
                            >
                                Précédent
                            </Button>
                            <span className={cx('text-sm', NUM, TEXT_MUTED)}>
                                Page {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={pagination.current_page >= pagination.last_page}
                                onClick={() => router.get('/training/courses', { ...f, page: pagination.current_page + 1 })}
                            >
                                Suivant
                            </Button>
                        </nav>
                    )}
                </>
            )}
        </AppLayout>
    );
}
export { Catalogue };
