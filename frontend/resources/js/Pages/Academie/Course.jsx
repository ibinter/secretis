import { useState, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    CheckCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClockIcon,
    DocumentArrowDownIcon,
    LockClosedIcon,
    PlayCircleIcon,
    BookOpenIcon,
    TrophyIcon,
    ClipboardDocumentCheckIcon,
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
    return { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' }[level] ?? level;
}

// ─── Contenu Article ─────────────────────────────────────────────────────────

function ArticleContent({ content }) {
    const html = content?.html ?? '';
    return (
        <div
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-purple-600"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

// ─── Contenu Vidéo ───────────────────────────────────────────────────────────

function VideoContent({ videoUrl, content }) {
    const isPlaceholder = content?.video_placeholder;

    if (isPlaceholder || !videoUrl) {
        return (
            <div className="aspect-video bg-gray-900 rounded-2xl flex flex-col items-center justify-center text-center p-8 mb-6">
                <span className="text-5xl mb-4">🎬</span>
                <p className="text-gray-400 text-base font-medium">Vidéo en cours de production</p>
                <p className="text-gray-500 text-sm mt-1">Disponible prochainement</p>
            </div>
        );
    }

    const embedUrl = videoUrl.includes('youtube.com/watch')
        ? videoUrl.replace('watch?v=', 'embed/')
        : videoUrl;

    return (
        <div className="aspect-video mb-6 rounded-2xl overflow-hidden bg-black">
            <iframe
                src={embedUrl}
                title="Vidéo de formation"
                allowFullScreen
                className="w-full h-full"
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
            <div className="py-8 text-center text-gray-400">
                <ClipboardDocumentCheckIcon className="w-10 h-10 mx-auto mb-2" />
                <p>Aucune question de quiz pour cette leçon.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    Quiz de validation — {quizzes.length} question{quizzes.length > 1 ? 's' : ''} · Score minimum : 70%
                </p>
            </div>

            {quizzes.map((q, qi) => {
                const detail = result?.details?.find(d => d.question_id === q.id);
                const userAnswer = answers[q.id];

                return (
                    <div key={q.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                            {qi + 1}. {q.question?.fr ?? q.question}
                        </p>

                        <div className="space-y-2">
                            {(q.options ?? []).map((opt, idx) => {
                                let cls = 'border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200';

                                if (result) {
                                    if (idx === detail?.correct_index) {
                                        cls = 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200';
                                    } else if (idx === detail?.user_answer && !detail?.is_correct) {
                                        cls = 'border-2 border-rose-400 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200';
                                    } else {
                                        cls = 'border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500';
                                    }
                                } else if (userAnswer === idx) {
                                    cls = 'border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(q.id, idx)}
                                        disabled={!!result}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${cls} ${!result ? 'hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20' : ''}`}
                                    >
                                        {opt.text}
                                    </button>
                                );
                            })}
                        </div>

                        {result && detail?.explanation && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    <strong>Explication :</strong>{' '}
                                    {detail.explanation?.fr ?? detail.explanation}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}

            {!result ? (
                <button
                    onClick={handleSubmit}
                    disabled={submitting || Object.keys(answers).length < quizzes.length}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                >
                    {submitting ? 'Vérification…' : 'Valider mes réponses'}
                </button>
            ) : (
                <div className={`rounded-2xl p-5 text-center ${result.passed ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'}`}>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1 tabular-nums">
                        {result.score}%
                    </p>
                    <p className={`text-sm font-semibold ${result.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {result.passed
                            ? `Bravo ! Vous avez réussi avec ${result.correct_answers}/${result.total_questions} bonnes réponses.`
                            : `Score insuffisant (${result.correct_answers}/${result.total_questions}). Révisez et recommencez.`}
                    </p>
                    {!result.passed && (
                        <button
                            onClick={() => { setResult(null); setAnswers({}); }}
                            className="mt-3 text-sm text-amber-700 dark:text-amber-400 underline"
                        >
                            Réessayer
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Sidebar plan du cours ────────────────────────────────────────────────────

function CourseSidebar({ lessons, currentIndex, onSelect, isCompleted }) {
    return (
        <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Plan du cours</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {lessons.filter(l => l.is_completed).length} / {lessons.length} leçons
                    </p>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    {lessons.map((lesson, idx) => {
                        const title = lesson.title?.fr ?? lesson.title;
                        const active = idx === currentIndex;
                        return (
                            <button
                                key={lesson.id}
                                onClick={() => onSelect(idx)}
                                className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${
                                    active
                                        ? 'bg-purple-50 dark:bg-purple-900/30'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <div className="mt-0.5 flex-shrink-0">
                                    {lesson.is_completed ? (
                                        <CheckCircleSolid className="w-5 h-5 text-emerald-500" />
                                    ) : active ? (
                                        <PlayCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-gray-400">{idx + 1}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className={`text-xs font-medium leading-snug ${active ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {title}
                                    </p>
                                    {lesson.duration_minutes && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3" /> {formatDuration(lesson.duration_minutes)}
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieCourse({ course, lessons, progress_percent, is_completed, certificate }) {
    const [currentIndex, setCurrentIndex] = useState(() => {
        // Trouver la première leçon non terminée
        const firstIncomplete = lessons.findIndex(l => !l.is_completed);
        return firstIncomplete >= 0 ? firstIncomplete : 0;
    });
    const [completedMap, setCompletedMap] = useState(() => {
        const m = {};
        lessons.forEach(l => { if (l.is_completed) m[l.id] = true; });
        return m;
    });
    const [progress, setProgress] = useState(progress_percent);
    const [courseCompleted, setCourseCompleted] = useState(is_completed);
    const [cert, setCert] = useState(certificate);
    const [marking, setMarking] = useState(false);

    const lesson = lessons[currentIndex];

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
                if (currentIndex < lessons.length - 1) {
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
    const catColor    = course.category?.color ?? '#3B82F6';

    return (
        <AppLayout>
            <Head title={`${courseTitle} — Académie`} />

            {/* Barre de progression */}
            <div className="h-1 bg-gray-100 dark:bg-gray-800 sticky top-0 z-40">
                <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${progress}%`, backgroundColor: catColor }}
                />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Fil d'Ariane */}
                <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-2 flex-wrap">
                    <Link href={route('academie.index')} className="hover:text-purple-600">Académie</Link>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                    <Link href={route('academie.catalogue')} className="hover:text-purple-600">Catalogue</Link>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                    <span className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-xs">{courseTitle}</span>
                </nav>

                {/* Header cours */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1">
                            {course.category && (
                                <span
                                    className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2"
                                    style={{ backgroundColor: catColor + '22', color: catColor }}
                                >
                                    {course.category.name?.fr ?? course.category.name}
                                </span>
                            )}
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white text-balance">
                                {courseTitle}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                <span>{levelLabel(course.level)}</span>
                                <span className="flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" />
                                    {formatDuration(course.duration_minutes)}
                                </span>
                                <span>{lessons.length} leçons</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                                    {progress}% complété
                                </span>
                            </div>
                        </div>

                        {/* Certificat disponible */}
                        {cert && (
                            <Link
                                href={route('academie.certificat', { uuid: cert.uuid })}
                                className="flex-shrink-0 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-100 transition-colors"
                            >
                                <TrophyIcon className="w-5 h-5" />
                                Voir mon certificat
                            </Link>
                        )}
                    </div>

                    {/* Objectifs */}
                    {course.objectives?.length > 0 && (
                        <details className="mt-4 group">
                            <summary className="cursor-pointer text-sm font-semibold text-purple-600 dark:text-purple-400 select-none list-none flex items-center gap-1.5">
                                <BookOpenIcon className="w-4 h-4" />
                                Ce que vous apprendrez ({course.objectives.length} objectifs)
                            </summary>
                            <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                                {course.objectives.map((obj, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        {obj}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>

                {/* Corps : sidebar + contenu */}
                <div className="flex gap-6 items-start">
                    <CourseSidebar
                        lessons={lessons.map(l => ({ ...l, is_completed: completedMap[l.id] || l.is_completed }))}
                        currentIndex={currentIndex}
                        onSelect={setCurrentIndex}
                        isCompleted={courseCompleted}
                    />

                    {/* Contenu principal */}
                    <main className="flex-1 min-w-0">
                        {lesson ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                                {/* En-tête leçon */}
                                <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                                            Leçon {currentIndex + 1} sur {lessons.length}
                                        </p>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-balance">
                                            {lessonTitle}
                                        </h2>
                                    </div>
                                    {completedMap[lesson.id] && (
                                        <CheckCircleSolid className="w-7 h-7 text-emerald-500 flex-shrink-0" />
                                    )}
                                </div>

                                {/* Rendu selon le type */}
                                {lesson.type === 'video' ? (
                                    <VideoContent videoUrl={lesson.video_url} content={lesson.content} />
                                ) : lesson.type === 'quiz' ? (
                                    <QuizContent lesson={lesson} onQuizComplete={() => {}} />
                                ) : lesson.type === 'document' ? (
                                    <div className="py-8 text-center">
                                        <DocumentArrowDownIcon className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">
                                            Document à télécharger
                                        </p>
                                        {lesson.resource_file && (
                                            <a
                                                href={route('api.academy.resources.download', { id: lesson.id })}
                                                className="inline-flex items-center gap-2 bg-purple-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors"
                                            >
                                                <DocumentArrowDownIcon className="w-4 h-4" />
                                                Télécharger
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <ArticleContent content={lesson.content} />
                                )}

                                {/* Quiz en bas de l'article */}
                                {lesson.type === 'article' && lesson.quizzes?.length > 0 && (
                                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <ClipboardDocumentCheckIcon className="w-5 h-5 text-purple-600" />
                                            Quiz de cette leçon
                                        </h3>
                                        <QuizContent lesson={lesson} onQuizComplete={() => {}} />
                                    </div>
                                )}

                                {/* Navigation + bouton terminer */}
                                <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100 dark:border-gray-700 gap-3 flex-wrap">
                                    <button
                                        onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                                        disabled={currentIndex === 0}
                                        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" /> Précédent
                                    </button>

                                    {!completedMap[lesson.id] ? (
                                        <button
                                            onClick={markComplete}
                                            disabled={marking}
                                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            {marking ? 'Enregistrement…' : 'Marquer comme terminé'}
                                        </button>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                            <CheckCircleSolid className="w-5 h-5" /> Leçon terminée
                                        </span>
                                    )}

                                    <button
                                        onClick={() => setCurrentIndex(i => Math.min(lessons.length - 1, i + 1))}
                                        disabled={currentIndex === lessons.length - 1}
                                        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Suivant <ChevronRightIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* CTA Certificat si cours terminé */}
                                {courseCompleted && cert && (
                                    <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-700 flex flex-col sm:flex-row items-center gap-4">
                                        <TrophyIcon className="w-10 h-10 text-amber-500 flex-shrink-0" />
                                        <div className="flex-1 text-center sm:text-left">
                                            <p className="font-bold text-gray-900 dark:text-white">
                                                Félicitations, vous avez terminé ce cours !
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                Votre certificat d'accomplissement est disponible.
                                            </p>
                                        </div>
                                        <Link
                                            href={route('academie.certificat', { uuid: cert.uuid })}
                                            className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                                        >
                                            Obtenir le certificat
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-400">
                                <LockClosedIcon className="w-12 h-12 mx-auto mb-3" />
                                <p>Sélectionnez une leçon dans le plan de cours.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </AppLayout>
    );
}
export { AcademieCourse };
