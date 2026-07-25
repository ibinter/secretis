import { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeftIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function completionPercent(completionStatus, score) {
    if (!completionStatus) return 0;
    const done = ['completed', 'passed'].includes(completionStatus);
    if (done) return 100;
    if (score > 0) return Math.min(90, score);
    return completionStatus === 'incomplete' ? 30 : 0;
}

// ─── SCORM 1.2 API Bridge (window.API) ────────────────────────────────────────
// Exposé dans la fenêtre principale — intercepté par le contenu SCORM dans l'iframe.

function createScormApi(sessionId, version, onUpdate) {
    const pendingData = {};
    let commitTimeout = null;

    const commitToServer = async () => {
        if (Object.keys(pendingData).length === 0) return;
        const payload = { ...pendingData };
        Object.keys(pendingData).forEach(k => delete pendingData[k]);
        try {
            await axios.post(`/training/scorm/${sessionId}/data`, { data: payload });
            onUpdate(payload);
        } catch (e) {
            console.error('[SCORM] Commit failed:', e);
        }
    };

    const scheduleCommit = () => {
        clearTimeout(commitTimeout);
        commitTimeout = setTimeout(commitToServer, 2000);
    };

    // API SCORM 1.2
    const api12 = {
        LMSInitialize: (_) => { console.log('[SCORM 1.2] LMSInitialize'); return 'true'; },
        LMSFinish: (_) => {
            console.log('[SCORM 1.2] LMSFinish');
            commitToServer();
            return 'true';
        },
        LMSGetValue: (element) => {
            return pendingData[element] ?? window.__scormInitData?.[element] ?? '';
        },
        LMSSetValue: (element, value) => {
            pendingData[element] = value;
            scheduleCommit();
            return 'true';
        },
        LMSCommit: (_) => { commitToServer(); return 'true'; },
        LMSGetLastError: () => '0',
        LMSGetErrorString: (code) => code === '0' ? 'No error' : 'Error',
        LMSGetDiagnostic: (code) => `Diagnostic: ${code}`,
    };

    // API SCORM 2004
    const api2004 = {
        Initialize: (_) => { console.log('[SCORM 2004] Initialize'); return 'true'; },
        Terminate: (_) => { commitToServer(); return 'true'; },
        GetValue: (element) => pendingData[element] ?? window.__scormInitData?.[element] ?? '',
        SetValue: (element, value) => {
            pendingData[element] = value;
            scheduleCommit();
            return 'true';
        },
        Commit: (_) => { commitToServer(); return 'true'; },
        GetLastError: () => '0',
        GetErrorString: (code) => code === '0' ? 'No error' : 'Error',
        GetDiagnostic: (code) => `Diagnostic: ${code}`,
    };

    return version === 'scorm_2004' ? api2004 : api12;
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ScormPlayer({ package: pkg, session, scormData, launchUrl, courseId }) {
    const iframeRef              = useRef(null);
    const timerRef               = useRef(null);
    const [elapsed, setElapsed]  = useState(0);
    const [isFullscreen, setIsFullscreen]     = useState(false);
    const [completionStatus, setCompletionStatus] = useState(
        session?.completion_status ?? 'not attempted'
    );
    const [scoreRaw, setScoreRaw] = useState(session?.score_raw ?? null);
    const [iframeReady, setIframeReady] = useState(false);
    const [error, setError] = useState(null);

    // Initialiser les données SCORM dans window pour que l'API bridge y accède
    useEffect(() => {
        window.__scormInitData = scormData ?? {};
    }, [scormData]);

    // Installer l'API SCORM dans la fenêtre
    useEffect(() => {
        if (!session?.id) return;

        const handleUpdate = (data) => {
            const status = data['cmi.core.lesson_status']
                ?? data['cmi.completion_status']
                ?? completionStatus;
            const score = parseFloat(data['cmi.core.score.raw'] ?? data['cmi.score.raw'] ?? scoreRaw);

            setCompletionStatus(status);
            if (!isNaN(score)) setScoreRaw(score);
        };

        const api = createScormApi(session.id, pkg.version, handleUpdate);

        if (pkg.version === 'scorm_2004') {
            window.API_1484_11 = api;
        } else {
            window.API = api;
        }

        return () => {
            delete window.API;
            delete window.API_1484_11;
        };
    }, [session?.id, pkg.version]);

    // Chronomètre
    useEffect(() => {
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    // Sauvegarde auto toutes les 60s
    useEffect(() => {
        const interval = setInterval(async () => {
            if (session?.id) {
                try {
                    await axios.post(`/training/scorm/${session.id}/data`, {
                        data: { 'cmi.core.total_time': formatTime(elapsed) },
                    });
                } catch (e) { /* silent */ }
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [session?.id, elapsed]);

    const handleResume = useCallback(() => {
        if (iframeRef.current && scormData?.['cmi.suspend_data']) {
            // Le contenu SCORM reprendra depuis les données de session_data
            iframeRef.current.src = iframeRef.current.src;
        }
    }, [scormData]);

    const toggleFullscreen = () => {
        const container = document.getElementById('scorm-container');
        if (!isFullscreen) {
            container?.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        setIsFullscreen(f => !f);
    };

    const pct = completionPercent(completionStatus, scoreRaw);
    const isDone = ['completed', 'passed'].includes(completionStatus);

    const statusConfig = {
        'not attempted': { label: 'Non démarré',  color: 'text-gray-500',  bg: 'bg-gray-100 dark:bg-gray-700' },
        'incomplete':    { label: 'En cours',       color: 'text-purple-600',  bg: 'bg-purple-100 dark:bg-purple-900/40' },
        'completed':     { label: 'Terminé',        color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/40' },
        'passed':        { label: 'Réussi',         color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/40' },
        'failed':        { label: 'Échoué',         color: 'text-red-600',   bg: 'bg-red-100 dark:bg-red-900/40' },
    };
    const sc = statusConfig[completionStatus] ?? statusConfig['not attempted'];

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            <Head title={`SCORM — ${pkg.title}`} />

            {/* Barre de contrôle */}
            <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-4">
                <button
                    onClick={() => courseId ? router.visit(`/training/courses/${courseId}`) : router.visit('/training/my-courses')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Retour
                </button>

                <div className="flex-1 min-w-0">
                    <h1 className="text-white font-semibold truncate text-sm">{pkg.title}</h1>
                    <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                            {sc.label}
                        </span>
                        {scoreRaw != null && (
                            <span className="text-xs text-gray-400">
                                Score : {scoreRaw}{session?.score_max ? `/${session.score_max}` : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* Chrono */}
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <ClockIcon className="w-4 h-4" />
                    {formatTime(elapsed)}
                </div>

                {/* Barre de progression */}
                <div className="hidden md:flex items-center gap-2 w-48">
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${isDone ? 'bg-green-500' : 'bg-indigo-500'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                </div>

                {isDone && (
                    <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                )}

                <button onClick={toggleFullscreen}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors">
                    {isFullscreen
                        ? <ArrowsPointingInIcon className="w-5 h-5" />
                        : <ArrowsPointingOutIcon className="w-5 h-5" />
                    }
                </button>
            </div>

            {/* Barre mobile progression */}
            <div className="md:hidden bg-gray-900 px-4 pb-2">
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isDone ? 'bg-green-500' : 'bg-indigo-500'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-400">{pct}%</span>
                </div>
            </div>

            {/* Reprendre */}
            {scormData?.['cmi.suspend_data'] && completionStatus === 'incomplete' && (
                <div className="bg-indigo-900/50 border-b border-indigo-800 px-4 py-2 flex items-center gap-3">
                    <ExclamationCircleIcon className="w-4 h-4 text-indigo-300 flex-shrink-0" />
                    <span className="text-sm text-indigo-300 flex-1">
                        Vous avez une session en cours. La formation reprendra depuis votre dernière position.
                    </span>
                    <button onClick={handleResume}
                            className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg">
                        Reprendre
                    </button>
                </div>
            )}

            {/* Iframe SCORM */}
            <div id="scorm-container" className="flex-1 relative">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <ExclamationCircleIcon className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
                            <p className="text-lg font-semibold text-white mb-2">Erreur de chargement</p>
                            <p className="text-sm text-gray-400">{error}</p>
                        </div>
                    </div>
                ) : (
                    <iframe
                        ref={iframeRef}
                        src={launchUrl}
                        className="w-full h-full border-0"
                        style={{ minHeight: 'calc(100vh - 120px)' }}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                        allow="fullscreen"
                        title={pkg.title}
                        onLoad={() => setIframeReady(true)}
                        onError={() => setError("Impossible de charger le contenu SCORM.")}
                    />
                )}

                {/* Indicateur de chargement */}
                {!iframeReady && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
                        <div className="text-center">
                            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-400 text-sm">Chargement du contenu SCORM…</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
export { ScormPlayer };
