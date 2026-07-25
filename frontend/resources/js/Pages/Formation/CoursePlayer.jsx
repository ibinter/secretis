import { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    CheckCircleIcon,
    LockClosedIcon,
    PlayCircleIcon,
    DocumentTextIcon,
    QuestionMarkCircleIcon,
    PaperClipIcon,
    ChevronRightIcon,
    ClockIcon,
    ArrowRightIcon,
    XMarkIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';

// ─── Icône par type de module ─────────────────────────────────────────────────

const MODULE_ICON = {
    video: PlayCircleIcon,
    text:  DocumentTextIcon,
    quiz:  QuestionMarkCircleIcon,
    file:  PaperClipIcon,
};

// ─── Lecteur de contenu texte (HTML riche) ────────────────────────────────────

function TextPlayer({ content }) {
    const html = typeof content === 'string' ? content : content?.html ?? '';
    return (
        <div
            className="prose prose-indigo max-w-none p-6"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

// ─── Lecteur vidéo ────────────────────────────────────────────────────────────

function VideoPlayer({ content }) {
    const url = typeof content === 'string' ? content : content?.url ?? '';
    // Supporte YouTube, Vimeo, ou URL directe
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    const isVimeo   = url.includes('vimeo.com');

    let embedUrl = url;
    if (isYoutube) {
        const id = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
        embedUrl = `https://www.youtube.com/embed/${id}?rel=0`;
    } else if (isVimeo) {
        const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
        embedUrl = `https://player.vimeo.com/video/${id}`;
    }

    return (
        <div className="p-6">
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
                {isYoutube || isVimeo ? (
                    <iframe src={embedUrl} className="w-full h-full"
                            allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
                ) : (
                    <video src={url} controls className="w-full h-full" controlsList="nodownload"/>
                )}
            </div>
        </div>
    );
}

// ─── Quiz Player ──────────────────────────────────────────────────────────────

function QuizPlayer({ module, onComplete }) {
    const content     = typeof module.content === 'string' ? JSON.parse(module.content) : module.content;
    const quizId      = content?.quiz_id;
    const [quiz, setQuiz]         = useState(null);
    const [answers, setAnswers]   = useState({});
    const [result, setResult]     = useState(null);
    const [loading, setLoading]   = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        // Charge le quiz depuis l'API
        fetch(`/api/training/quizzes/${quizId}`)
            .then(r => r.json())
            .then(data => {
                setQuiz(data);
                if (data.time_limit_minutes) {
                    setTimeLeft(data.time_limit_minutes * 60);
                }
            });
    }, [quizId]);

    // Timer
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;
        const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
        return () => clearTimeout(t);
    }, [timeLeft]);

    function toggleAnswer(questionId, answerId, isSingle) {
        setAnswers(prev => {
            const current = prev[questionId] ?? [];
            if (isSingle) return { ...prev, [questionId]: [answerId] };
            return current.includes(answerId)
                ? { ...prev, [questionId]: current.filter(a => a !== answerId) }
                : { ...prev, [questionId]: [...current, answerId] };
        });
    }

    async function handleSubmit() {
        setLoading(true);
        try {
            const res = await fetch(`/api/training/quizzes/${quizId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
                body: JSON.stringify({ answers }),
            });
            const data = await res.json();
            setResult(data);
            if (data.passed) onComplete?.();
        } finally {
            setLoading(false);
        }
    }

    function formatTime(s) {
        const m = Math.floor(s / 60), sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    if (!quiz) return (
        <div className="p-8 text-center text-gray-400">
            <QuestionMarkCircleIcon className="w-10 h-10 mx-auto mb-2"/>
            Chargement du quiz...
        </div>
    );

    const questions = typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : quiz.questions;

    if (result) {
        return (
            <div className="p-6">
                <div className={`text-center py-8 rounded-xl mb-6 ${result.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                    {result.passed
                        ? <CheckSolid className="w-16 h-16 text-green-500 mx-auto mb-3"/>
                        : <XMarkIcon className="w-16 h-16 text-red-400 mx-auto mb-3"/>
                    }
                    <h2 className={`text-2xl font-bold mb-1 ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                        {result.passed ? 'Félicitations !' : 'Pas encore...'}
                    </h2>
                    <p className="text-gray-600">
                        Score : <strong>{result.score}%</strong> (seuil : {result.pass_score}%)
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        {result.total_correct} / {result.total_questions} réponses correctes
                    </p>
                </div>

                {/* Corrections */}
                <h3 className="font-semibold text-gray-800 mb-4">Corrections</h3>
                <div className="space-y-4">
                    {questions.map((q, idx) => {
                        const corr = result.corrections?.[q.id];
                        return (
                            <div key={q.id} className={`rounded-lg border p-4 ${corr?.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                <div className="flex items-start gap-2 mb-2">
                                    {corr?.is_correct
                                        ? <CheckSolid className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"/>
                                        : <XMarkIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"/>
                                    }
                                    <p className="font-medium text-sm text-gray-800">{idx + 1}. {q.text}</p>
                                </div>
                                {corr?.explanation && (
                                    <p className="text-xs text-gray-600 ml-7">{corr.explanation}</p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {!result.passed && (
                    <button onClick={() => setResult(null)}
                            className="mt-6 w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                        Réessayer
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-gray-900">{quiz.title}</h2>
                {timeLeft !== null && (
                    <span className={`flex items-center gap-1.5 text-sm font-mono font-semibold px-3 py-1 rounded-full ${
                        timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                        <ClockIcon className="w-4 h-4"/>
                        {formatTime(timeLeft)}
                    </span>
                )}
            </div>

            <div className="space-y-6">
                {questions.map((question, idx) => {
                    const isSingle   = question.type !== 'multiple';
                    const userAnswers = answers[question.id] ?? [];

                    return (
                        <div key={question.id} className="bg-gray-50 rounded-xl p-4">
                            <p className="font-medium text-gray-900 mb-3">
                                <span className="text-indigo-600 font-bold mr-2">{idx + 1}.</span>
                                {question.text}
                                {!isSingle && <span className="ml-2 text-xs text-gray-400">(plusieurs réponses possibles)</span>}
                            </p>
                            <div className="space-y-2">
                                {question.answers.map(answer => {
                                    const selected = userAnswers.includes(String(answer.id)) || userAnswers.includes(answer.id);
                                    return (
                                        <label key={answer.id}
                                               className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                   selected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-200'
                                               }`}>
                                            <input
                                                type={isSingle ? 'radio' : 'checkbox'}
                                                name={`q_${question.id}`}
                                                checked={selected}
                                                onChange={() => toggleAnswer(String(question.id), String(answer.id), isSingle)}
                                                className="accent-indigo-600"
                                            />
                                            <span className="text-sm text-gray-700">{answer.text}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={handleSubmit}
                disabled={loading || Object.keys(answers).length < questions.length}
                className="mt-8 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loading ? 'Correction en cours...' : 'Soumettre mes réponses'}
            </button>
        </div>
    );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CoursePlayer({ course, modules, enrollment }) {
    const [activeModule, setActiveModule] = useState(modules?.[0] ?? null);
    const [progress, setProgress]         = useState({});
    const startTimeRef                    = useRef(Date.now());

    // Calcule la progression globale
    const totalRequired    = modules?.filter(m => m.is_required).length ?? 0;
    const completedModules = Object.values(progress).filter(p => p.status === 'completed').length
        + (modules?.filter(m => m.progress?.status === 'completed').length ?? 0);
    const progressPercent  = enrollment?.progress_percent ?? (
        totalRequired > 0 ? Math.round((completedModules / totalRequired) * 100) : 0
    );

    function isModuleDone(module) {
        return progress[module.id]?.status === 'completed'
            || module.progress?.status === 'completed';
    }

    function canAccessModule(module, idx) {
        if (idx === 0) return true;
        const prev = modules[idx - 1];
        return !prev?.is_required || isModuleDone(prev);
    }

    async function markModuleComplete(module) {
        if (isModuleDone(module)) return;

        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        startTimeRef.current = Date.now();

        if (!enrollment) return;

        const res = await fetch(`/api/training/progress/${module.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
            body: JSON.stringify({ enrollment_id: enrollment.id, time_spent_seconds: timeSpent }),
        });

        if (res.ok) {
            const data = await res.json();
            setProgress(prev => ({
                ...prev,
                [module.id]: { status: 'completed' },
            }));
        }
    }

    function goToNextModule() {
        const idx = modules.findIndex(m => m.id === activeModule?.id);
        if (idx < modules.length - 1) {
            setActiveModule(modules[idx + 1]);
            startTimeRef.current = Date.now();
        }
    }

    const isCurrentDone   = activeModule && isModuleDone(activeModule);
    const isLastModule    = modules?.findLastIndex?.(Boolean) === modules?.findIndex(m => m.id === activeModule?.id);
    const ContentIcon     = MODULE_ICON[activeModule?.content_type] ?? DocumentTextIcon;
    const content         = activeModule?.content
        ? (typeof activeModule.content === 'string' ? JSON.parse(activeModule.content) : activeModule.content)
        : null;

    return (
        <AppLayout>
            <Head title={course.title}/>

            <div className="h-[calc(100vh-64px)] flex overflow-hidden">

                {/* ── Sidebar modules ── */}
                <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
                    {/* En-tête cours */}
                    <div className="p-4 border-b border-gray-100 bg-indigo-600 text-white">
                        <h2 className="font-bold text-sm leading-snug line-clamp-2 mb-2">{course.title}</h2>
                        {/* Progression globale */}
                        <div className="text-xs opacity-80 mb-1">{progressPercent}% complété</div>
                        <div className="w-full bg-indigo-400/50 rounded-full h-1.5">
                            <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}/>
                        </div>
                    </div>

                    {/* Liste des modules */}
                    <div className="flex-1 py-2">
                        {modules?.map((module, idx) => {
                            const done       = isModuleDone(module);
                            const accessible = canAccessModule(module, idx);
                            const active     = module.id === activeModule?.id;
                            const Icon       = MODULE_ICON[module.content_type] ?? DocumentTextIcon;

                            return (
                                <button
                                    key={module.id}
                                    disabled={!accessible}
                                    onClick={() => accessible && setActiveModule(module)}
                                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                                        active ? 'bg-indigo-50 border-r-2 border-indigo-600' : 'hover:bg-gray-50'
                                    } ${!accessible ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        {done
                                            ? <CheckSolid className="w-5 h-5 text-green-500"/>
                                            : accessible
                                                ? <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`}/>
                                                : <LockClosedIcon className="w-5 h-5 text-gray-300"/>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium line-clamp-2 ${active ? 'text-indigo-700' : done ? 'text-green-700' : 'text-gray-700'}`}>
                                            {module.title}
                                        </p>
                                        {module.duration_minutes > 0 && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                <ClockIcon className="w-3 h-3 inline mr-0.5"/>
                                                {module.duration_minutes} min
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* ── Zone principale ── */}
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    {activeModule ? (
                        <div className="max-w-4xl mx-auto">
                            {/* En-tête module */}
                            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <ContentIcon className="w-5 h-5 text-indigo-600"/>
                                    <h3 className="font-semibold text-gray-900">{activeModule.title}</h3>
                                    {isCurrentDone && <CheckSolid className="w-5 h-5 text-green-500"/>}
                                </div>
                                <div className="flex items-center gap-3">
                                    {!isCurrentDone && activeModule.content_type !== 'quiz' && (
                                        <button
                                            onClick={() => markModuleComplete(activeModule)}
                                            className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1.5">
                                            <CheckIcon className="w-4 h-4"/>
                                            Marquer comme terminé
                                        </button>
                                    )}
                                    {isCurrentDone && !isLastModule && (
                                        <button
                                            onClick={goToNextModule}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                                            Module suivant
                                            <ArrowRightIcon className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Contenu */}
                            <div className="bg-white mt-4 mx-4 rounded-xl shadow-sm overflow-hidden">
                                {activeModule.content_type === 'text'  && <TextPlayer content={content}/>}
                                {activeModule.content_type === 'video' && <VideoPlayer content={content}/>}
                                {activeModule.content_type === 'quiz'  && (
                                    <QuizPlayer module={activeModule} onComplete={() => markModuleComplete(activeModule)}/>
                                )}
                                {activeModule.content_type === 'file' && (
                                    <div className="p-6 text-center">
                                        <PaperClipIcon className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                                        <a href={content?.url} target="_blank" rel="noopener noreferrer"
                                           className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                                            Télécharger le fichier
                                        </a>
                                        <p className="mt-4 text-sm text-gray-500">
                                            Après avoir consulté le fichier, marquez le module comme terminé.
                                        </p>
                                        {!isCurrentDone && (
                                            <button onClick={() => markModuleComplete(activeModule)}
                                                    className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">
                                                J'ai consulté ce fichier
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="h-8"/>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <div className="text-center">
                                <PlayCircleIcon className="w-16 h-16 mx-auto mb-3"/>
                                <p>Sélectionnez un module pour commencer</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}
export { CoursePlayer };
