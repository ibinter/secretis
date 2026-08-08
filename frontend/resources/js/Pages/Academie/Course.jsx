/**
 * Academie/Course.jsx — Lecture d'un cours (GET /academie/cours/{slug})
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, mêmes `fetch` vers
 * `route('api.academy.progress')` et `route('api.academy.quiz')`
 * (mêmes en-têtes, mêmes payloads), mêmes états locaux et mêmes transitions
 * (passage automatique à la leçon suivante après validation).
 *
 * Props réelles (AcademyController@course → Inertia::render('Academie/Course', $data)) :
 *   course           : { id, slug, title, description, objectives[], level,
 *                        duration_minutes, thumbnail, version_compatible,
 *                        category: { slug, name, color, icon } | null }
 *   lessons          : [{ id, slug, title, type, content, video_url,
 *                         duration_minutes, resource_file, is_preview, order,
 *                         is_completed, quiz_score, quizzes[] }]
 *   progress_percent : number
 *   is_completed     : boolean
 *   certificate      : { uuid, score, issued_at } | null
 */

import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    CheckCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClockIcon,
    DocumentArrowDownIcon,
    LockClosedIcon,
    PlayCircleIcon,
    FilmIcon,
    BookOpenIcon,
    TrophyIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import {
    PageHeader, Button, Badge, Card, EmptyState,
    cx, SURFACE, SURFACE_SUNK, BORDER, DIVIDE,
    TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(min) {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function levelLabel(level) {
    return { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' }[level] ?? level;
}

const clampPct = (v) => Math.max(0, Math.min(100, Number(v) || 0));

// ─── Contenu Article ─────────────────────────────────────────────────────────

function ArticleContent({ content }) {
    const html = content?.html ?? '';
    return (
        <div
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-purple-700 dark:prose-a:text-purple-300"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

// ─── Contenu Vidéo ───────────────────────────────────────────────────────────

function VideoContent({ videoUrl, content }) {
    const isPlaceholder = content?.video_placeholder;

    if (isPlaceholder || !videoUrl) {
        return (
            <div className={cx(
                'mb-6 flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center',
                BORDER, SURFACE_SUNK,
            )}>
                <FilmIcon className={cx('mb-3 h-8 w-8', TEXT_FAINT)} strokeWidth={1.75} aria-hidden="true" />
                <p className={cx('text-sm font-semibold', TEXT_TITLE)}>Vidéo en cours de production</p>
                <p className={cx('mt-1 text-sm', TEXT_MUTED)}>Disponible prochainement.</p>
            </div>
        );
    }

    const embedUrl = videoUrl.includes('youtube.com/watch')
        ? videoUrl.replace('watch?v=', 'embed/')
        : videoUrl;

    return (
        <div className={cx('mb-6 aspect-video overflow-hidden rounded-xl border bg-black', BORDER)}>
            <iframe
                src={embedUrl}
                title="Vidéo de formation"
                allowFullScreen
                className="h-full w-full"
            />
        </div>
    );
}

// ─── Quiz ────────────────────────────────────────────────────────────────────

function QuizContent({ lesson, onQuizComplete }) {
    const [answers, setAnswers]   = useState({});
    const [result, setResult]     = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const quizzes = lesson.quizzes ?? [];

    function handleAnswer(questionId, idx) {
        if (result) return; // verrouillé après soumission
        setAnswers(prev => ({ ...prev, [questionId]: idx }));
    }

    async function handleSubmit() {
        if (Object.keys(answers).length < quizzes.length) return;
        setSubmitting(true);

        try {
            const res = await fetch(route('api.academy.quiz'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ lesson_id: lesson.id, answers }),
            });
            const data = await res.json();
            setResult(data.data);
            if (data.data.passed) {
                onQuizComplete?.(data.data.score);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    }

    if (quizzes.length === 0) {
        return (
            <EmptyState
                compact
                icon={ClipboardDocumentCheckIcon}
                title="Aucune question"
                description="Cette leçon ne comporte pas de quiz de validation."
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className={cx(
                'rounded-xl border p-4',
                'border-purple-200 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10',
            )}>
                <p className="flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-200">
                    <ClipboardDocumentCheckIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>
                        Quiz de validation — <span className={NUM}>{quizzes.length}</span> question{quizzes.length > 1 ? 's' : ''} · Score minimum : <span className={NUM}>70 %</span>
                    </span>
                </p>
            </div>

            {quizzes.map((q, qi) => {
                const detail = result?.details?.find(d => d.question_id === q.id);
                const userAnswer = answers[q.id];

                return (
                    <div key={q.id} className={cx(SURFACE, 'rounded-xl border p-5 shadow-sm', BORDER)}>
                        <p className={cx('mb-4 text-sm font-semibold', TEXT_TITLE)}>
                            <span className={NUM}>{qi + 1}.</span> {q.question?.fr ?? q.question}
                        </p>

                        <div className="space-y-2">
                            {(q.options ?? []).map((opt, idx) => {
                                let cls = cx('border', BORDER, SURFACE, TEXT_BODY);

                                if (result) {
                                    if (idx === detail?.correct_index) {
                                        cls = 'border border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200';
                                    } else if (idx === detail?.user_answer && !detail?.is_correct) {
                                        cls = 'border border-red-400 bg-red-50 text-red-800 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-200';
                                    } else {
                                        cls = cx('border', BORDER, SURFACE_SUNK, TEXT_FAINT);
                                    }
                                } else if (userAnswer === idx) {
                                    cls = 'border border-purple-500 bg-purple-50 text-purple-800 dark:border-purple-500/60 dark:bg-purple-500/10 dark:text-purple-200';
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleAnswer(q.id, idx)}
                                        disabled={!!result}
                                        className={cx(
                                            'w-full rounded-lg px-4 py-2.5 text-left text-sm transition-colors',
                                            cls, FOCUS_RING,
                                            !result && 'hover:border-purple-300 dark:hover:border-purple-500/50',
                                        )}
                                    >
                                        {opt.text}
                                    </button>
                                );
                            })}
                        </div>

                        {result && detail?.explanation && (
                            <div className={cx('mt-3 rounded-lg border p-3', BORDER, SURFACE_SUNK)}>
                                <p className={cx('text-xs leading-5', TEXT_BODY)}>
                                    <strong className={TEXT_TITLE}>Explication :</strong>{' '}
                                    {detail.explanation?.fr ?? detail.explanation}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}

            {!result ? (
                <Button
                    variant="primary" block
                    loading={submitting}
                    disabled={Object.keys(answers).length < quizzes.length}
                    onClick={handleSubmit}
                >
                    {submitting ? 'Vérification…' : 'Valider mes réponses'}
                </Button>
            ) : (
                <div className={cx(
                    'rounded-xl border p-5 text-center',
                    result.passed
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
                )}>
                    <p className={cx('mb-1 text-2xl font-semibold tracking-tight', NUM, TEXT_TITLE)}>
                        {result.score}%
                    </p>
                    <p className={cx(
                        'text-sm font-medium',
                        result.passed
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-amber-700 dark:text-amber-300',
                    )}>
                        {result.passed
                            ? `Bravo — ${result.correct_answers}/${result.total_questions} bonnes réponses.`
                            : `Score insuffisant (${result.correct_answers}/${result.total_questions}). Révisez et recommencez.`}
                    </p>
                    {!result.passed && (
                        <Button
                            variant="secondary" size="sm" className="mt-3"
                            onClick={() => { setResult(null); setAnswers({}); }}
                        >
                            Réessayer
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Plan du cours ────────────────────────────────────────────────────────────

function CourseSidebar({ lessons, currentIndex, onSelect }) {
    const doneCount = lessons.filter(l => l.is_completed).length;

    return (
        <aside className="hidden w-72 shrink-0 lg:block">
            <div className={cx('sticky top-24 overflow-hidden rounded-xl border shadow-sm', SURFACE, BORDER)}>
                <div className={cx('border-b px-5 py-4', BORDER)}>
                    <h2 className={cx('text-sm font-semibold', TEXT_TITLE)}>Plan du cours</h2>
                    <p className={cx('mt-0.5 text-xs', NUM, TEXT_MUTED)}>
                        {doneCount} / {lessons.length} leçons
                    </p>
                </div>

                <div className={cx('max-h-[60vh] overflow-y-auto divide-y', DIVIDE)}>
                    {lessons.map((lesson, idx) => {
                        const title = lesson.title?.fr ?? lesson.title;
                        const active = idx === currentIndex;
                        return (
                            <button
                                key={lesson.id}
                                type="button"
                                onClick={() => onSelect(idx)}
                                aria-current={active ? 'true' : undefined}
                                className={cx(
                                    'flex w-full items-start gap-3 px-5 py-3 text-left transition-colors',
                                    FOCUS_RING,
                                    active
                                        ? 'bg-purple-50 dark:bg-purple-500/10'
                                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                                )}
                            >
                                <span className="mt-0.5 shrink-0">
                                    {lesson.is_completed ? (
                                        <CheckCircleSolid className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                                    ) : active ? (
                                        <PlayCircleIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                                    ) : (
                                        <span className={cx(
                                            'flex h-5 w-5 items-center justify-center rounded-full border',
                                            BORDER, NUM,
                                        )}>
                                            <span className={cx('text-[9px] font-semibold', TEXT_FAINT)}>{idx + 1}</span>
                                        </span>
                                    )}
                                </span>

                                <span className="min-w-0">
                                    <span className={cx(
                                        'block text-xs font-medium leading-4',
                                        active ? 'text-purple-700 dark:text-purple-300' : TEXT_BODY,
                                    )}>
                                        {title}
                                    </span>
                                    {lesson.duration_minutes && (
                                        <span className={cx('mt-0.5 flex items-center gap-1 text-xs', NUM, TEXT_FAINT)}>
                                            <ClockIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                                            {formatDuration(lesson.duration_minutes)}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieCourse({ course = {}, lessons = [], progress_percent = 0, is_completed = false, certificate = null }) {
    const rows = Array.isArray(lessons) ? lessons : [];

    const [currentIndex, setCurrentIndex] = useState(() => {
        // Première leçon non terminée
        const firstIncomplete = rows.findIndex(l => !l.is_completed);
        return firstIncomplete >= 0 ? firstIncomplete : 0;
    });
    const [completedMap, setCompletedMap] = useState(() => {
        const m = {};
        rows.forEach(l => { if (l.is_completed) m[l.id] = true; });
        return m;
    });
    const [progress, setProgress] = useState(progress_percent);
    const [courseCompleted, setCourseCompleted] = useState(is_completed);
    const [cert, setCert] = useState(certificate);
    const [marking, setMarking] = useState(false);

    const lesson = rows[currentIndex];

    async function markComplete() {
        if (!lesson || completedMap[lesson.id] || marking) return;
        setMarking(true);

        try {
            const res = await fetch(route('api.academy.progress'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ lesson_id: lesson.id }),
            });
            const data = await res.json();
            if (data.success) {
                setCompletedMap(prev => ({ ...prev, [lesson.id]: true }));
                setProgress(data.data.progress_percent);
                if (data.data.course_completed) {
                    setCourseCompleted(true);
                }
                if (data.data.certificate) {
                    setCert(data.data.certificate);
                }
                // Passer automatiquement à la leçon suivante
                if (currentIndex < rows.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setMarking(false);
        }
    }

    const lessonTitle = lesson?.title?.fr ?? lesson?.title ?? '';
    const courseTitle = course.title?.fr ?? course.title ?? '';
    const pct         = clampPct(progress);
    const objectives  = course.objectives ?? [];

    return (
        <AppLayout>
            <Head title={`${courseTitle} — Académie`} />

            {/* Progression globale — trait fin collé en haut */}
            <div
                className={cx('sticky top-0 z-40 -mx-4 mb-4 h-1 sm:-mx-6', SURFACE_SUNK)}
                role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                aria-label="Progression du cours"
            >
                <div className="h-full bg-purple-600 transition-all" style={{ width: `${pct}%` }} />
            </div>

            <PageHeader
                title={courseTitle}
                icon={BookOpenIcon}
                breadcrumbs={[
                    { label: 'Académie', href: route('academie.index') },
                    { label: 'Catalogue', href: route('academie.catalogue') },
                    { label: courseTitle },
                ]}
                meta={
                    <>
                        {course.category && (
                            <Badge variant="neutral" size="md">
                                {course.category.name?.fr ?? course.category.name}
                            </Badge>
                        )}
                        <Badge variant="info" size="md" outline>{levelLabel(course.level)}</Badge>
                        <Badge variant="neutral" size="md" icon={ClockIcon}>
                            <span className={NUM}>{formatDuration(course.duration_minutes)}</span>
                        </Badge>
                        <Badge variant="neutral" size="md">
                            <span className={NUM}>{rows.length}</span>&nbsp;leçons
                        </Badge>
                        <Badge variant={courseCompleted ? 'success' : 'accent'} size="md">
                            <span className={NUM}>{pct}%</span>&nbsp;complété
                        </Badge>
                    </>
                }
                actions={
                    cert ? (
                        <Button
                            as={Link}
                            href={route('academie.certificat', { uuid: cert.uuid })}
                            variant="primary" icon={TrophyIcon}
                        >
                            Voir mon certificat
                        </Button>
                    ) : undefined
                }
            />

            {/* Objectifs */}
            {objectives.length > 0 && (
                <Card className="mb-6">
                    <details className="group">
                        <summary className={cx(
                            'flex cursor-pointer list-none select-none items-center gap-1.5 text-sm font-medium',
                            'text-purple-700 dark:text-purple-300',
                        )}>
                            <BookOpenIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Ce que vous apprendrez (<span className={NUM}>{objectives.length}</span> objectifs)
                        </summary>
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                            {objectives.map((obj, i) => (
                                <li key={i} className={cx('flex items-start gap-2 text-sm', TEXT_BODY)}>
                                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                                    {obj}
                                </li>
                            ))}
                        </ul>
                    </details>
                </Card>
            )}

            {/* Corps : plan + contenu */}
            <div className="flex items-start gap-6">
                <CourseSidebar
                    lessons={rows.map(l => ({ ...l, is_completed: completedMap[l.id] || l.is_completed }))}
                    currentIndex={currentIndex}
                    onSelect={setCurrentIndex}
                />

                <main className="min-w-0 flex-1">
                    {lesson ? (
                        <div className={cx(SURFACE, 'rounded-xl border p-4 shadow-sm sm:p-6', BORDER)}>
                            {/* En-tête leçon */}
                            <div className={cx('mb-6 flex items-start justify-between gap-4 border-b pb-4', BORDER)}>
                                <div className="min-w-0">
                                    <p className={cx('mb-1 text-[11px] font-semibold uppercase tracking-wider', NUM, TEXT_MUTED)}>
                                        Leçon {currentIndex + 1} sur {rows.length}
                                    </p>
                                    <h2 className={cx('text-xl font-semibold tracking-tight', TEXT_TITLE)}>
                                        {lessonTitle}
                                    </h2>
                                </div>
                                {completedMap[lesson.id] && (
                                    <CheckCircleSolid className="h-6 w-6 shrink-0 text-emerald-500" aria-hidden="true" />
                                )}
                            </div>

                            {/* Rendu selon le type */}
                            {lesson.type === 'video' ? (
                                <VideoContent videoUrl={lesson.video_url} content={lesson.content} />
                            ) : lesson.type === 'quiz' ? (
                                <QuizContent lesson={lesson} onQuizComplete={() => {}} />
                            ) : lesson.type === 'document' ? (
                                <EmptyState
                                    compact
                                    icon={DocumentArrowDownIcon}
                                    title="Document à télécharger"
                                    description="Cette leçon met à disposition un support téléchargeable."
                                    action={
                                        lesson.resource_file ? (
                                            <Button
                                                href={route('api.academy.resources.download', { id: lesson.id })}
                                                variant="primary" icon={DocumentArrowDownIcon}
                                            >
                                                Télécharger
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            ) : (
                                <ArticleContent content={lesson.content} />
                            )}

                            {/* Quiz en bas de l'article */}
                            {lesson.type === 'article' && lesson.quizzes?.length > 0 && (
                                <div className={cx('mt-8 border-t pt-8', BORDER)}>
                                    <h3 className={cx('mb-4 flex items-center gap-2 text-base font-semibold tracking-tight', TEXT_TITLE)}>
                                        <ClipboardDocumentCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                                        Quiz de cette leçon
                                    </h3>
                                    <QuizContent lesson={lesson} onQuizComplete={() => {}} />
                                </div>
                            )}

                            {/* Navigation */}
                            <div className={cx('mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5', BORDER)}>
                                <Button
                                    variant="ghost" size="sm" icon={ChevronLeftIcon}
                                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                                    disabled={currentIndex === 0}
                                >
                                    Précédent
                                </Button>

                                {!completedMap[lesson.id] ? (
                                    <Button
                                        variant="primary" icon={CheckCircleIcon}
                                        loading={marking}
                                        onClick={markComplete}
                                    >
                                        {marking ? 'Enregistrement…' : 'Marquer comme terminé'}
                                    </Button>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                        <CheckCircleSolid className="h-5 w-5" aria-hidden="true" /> Leçon terminée
                                    </span>
                                )}

                                <Button
                                    variant="ghost" size="sm" iconRight={ChevronRightIcon}
                                    onClick={() => setCurrentIndex(i => Math.min(rows.length - 1, i + 1))}
                                    disabled={currentIndex === rows.length - 1}
                                >
                                    Suivant
                                </Button>
                            </div>

                            {/* Certificat si cours terminé */}
                            {courseCompleted && cert && (
                                <div className={cx(
                                    'mt-6 flex flex-col items-center gap-4 rounded-xl border p-5 sm:flex-row',
                                    'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
                                )}>
                                    <TrophyIcon className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                    <div className="flex-1 text-center sm:text-left">
                                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                            Félicitations, vous avez terminé ce cours
                                        </p>
                                        <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300">
                                            Votre certificat d'accomplissement est disponible.
                                        </p>
                                    </div>
                                    <Button
                                        as={Link}
                                        href={route('academie.certificat', { uuid: cert.uuid })}
                                        variant="primary" className="shrink-0"
                                    >
                                        Obtenir le certificat
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <EmptyState
                            bordered
                            icon={LockClosedIcon}
                            title="Aucune leçon sélectionnée"
                            description="Ce cours ne contient pas encore de leçon, ou aucune n'est sélectionnée dans le plan."
                        />
                    )}
                </main>
            </div>
        </AppLayout>
    );
}
export { AcademieCourse };
