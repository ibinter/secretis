import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';

const STEP_ICONS = {
  organization_profile   : '🏢',
  configure_services     : '⚙️',
  set_prefix             : '🏷️',
  invite_users           : '👥',
  create_first_event     : '📅',
  upload_first_document  : '📄',
  configure_notifications: '🔔',
  discover_sara          : '🤖',
};

const DISMISS_KEY    = 'onboarding_checklist_dismissed';
const SHOW_DAYS      = 30;

export default function ChecklistWidget({ organizationCreatedAt }) {
  const [open, setOpen]         = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');
  const [progress, setProgress] = useState(null);
  const [loading, setLoading]   = useState(false);

  // Ne montrer que pendant les 30 premiers jours
  const isWithinWindow = useCallback(() => {
    if (!organizationCreatedAt) return true;
    const created  = new Date(organizationCreatedAt);
    const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= SHOW_DAYS;
  }, [organizationCreatedAt]);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/onboarding/progress', { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setProgress(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!dismissed && isWithinWindow()) fetchProgress();
  }, [dismissed, isWithinWindow, fetchProgress]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
    setOpen(false);
  };

  const handleGoToStep = (stepKey) => {
    router.visit('/onboarding');
    setOpen(false);
  };

  if (dismissed || !isWithinWindow() || progress?.isComplete) return null;

  const completed = progress?.completed ?? 0;
  const total     = progress?.total ?? 8;
  const percent   = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {open && (
        <div className="w-80 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-sm">Configuration de l'organisation</h3>
              <p className="text-slate-400 text-xs mt-0.5">{completed}/{total} étapes complétées</p>
            </div>
            <button onClick={handleDismiss} className="text-slate-600 hover:text-slate-400 text-sm transition-colors" title="Masquer définitivement">
              ✕
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-4 pt-3">
            <div className="bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-right text-xs text-slate-500 mt-1">{percent}%</p>
          </div>

          {/* Steps list */}
          <div className="px-4 pb-2 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="py-6 text-center text-slate-500 text-sm">Chargement...</div>
            ) : (
              progress?.steps?.map((step) => (
                <button
                  key={step.key}
                  onClick={() => handleGoToStep(step.key)}
                  className={`w-full flex items-center gap-3 py-2.5 text-left hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors group ${
                    step.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${step.status === 'completed' ? 'bg-green-500 border-green-500'
                    : step.status === 'skipped'   ? 'bg-slate-700 border-slate-600'
                    : 'border-white/20 group-hover:border-blue-400'}`}
                  >
                    {step.status === 'completed' ? <span className="text-white text-xs font-black">✓</span>
                    : step.status === 'skipped'  ? <span className="text-slate-400 text-xs">⏭</span>
                    : <span className="text-xs">{STEP_ICONS[step.key]}</span>}
                  </div>
                  <span className={`text-sm flex-1 ${
                    step.status === 'completed' ? 'text-slate-400 line-through'
                    : step.status === 'skipped' ? 'text-slate-500'
                    : 'text-slate-200 group-hover:text-white'}`}
                  >
                    {step.label}
                  </span>
                  {step.status === 'pending' && (
                    <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={() => router.visit('/onboarding')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all active:scale-95"
            >
              Continuer la configuration →
            </button>
          </div>
        </div>
      )}

      {/* Bubble trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95"
      >
        <span className="text-lg">📋</span>
        <span className="text-sm">{completed}/{total} étapes</span>

        {/* Badge */}
        {completed < total && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full text-xs font-black flex items-center justify-center">
            {total - completed}
          </span>
        )}
      </button>
    </div>
  );
}
