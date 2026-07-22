import { useState, useEffect, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import ProgressBar from '@/Components/Onboarding/ProgressBar';
import OrganizationProfile   from './Steps/OrganizationProfile';
import ConfigureServices     from './Steps/ConfigureServices';
import SetPrefix             from './Steps/SetPrefix';
import InviteUsers           from './Steps/InviteUsers';
import CreateFirstEvent      from './Steps/CreateFirstEvent';
import UploadFirstDocument   from './Steps/UploadFirstDocument';
import ConfigureNotifications from './Steps/ConfigureNotifications';
import DiscoverSara          from './Steps/DiscoverSara';

const STEP_COMPONENTS = {
  organization_profile   : OrganizationProfile,
  configure_services     : ConfigureServices,
  set_prefix             : SetPrefix,
  invite_users           : InviteUsers,
  create_first_event     : CreateFirstEvent,
  upload_first_document  : UploadFirstDocument,
  configure_notifications: ConfigureNotifications,
  discover_sara          : DiscoverSara,
};

function CompletionScreen({ onGoToDashboard }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-6xl mb-6 animate-bounce">🎉</div>
      <h2 className="text-3xl font-extrabold text-white mb-3">
        Configuration terminée !
      </h2>
      <p className="text-slate-300 mb-8 max-w-md">
        Votre organisation est prête. Vous pouvez maintenant profiter de toutes les
        fonctionnalités d'IBIG SECRETIS.
      </p>
      <button
        onClick={onGoToDashboard}
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-xl text-lg shadow-xl shadow-blue-600/30 transition-all active:scale-95"
      >
        Accéder au tableau de bord →
      </button>
    </div>
  );
}

export default function Wizard({ progress: initialProgress, remainingDays, trialExpired }) {
  const [progress, setProgress]         = useState(initialProgress);
  const [currentStepKey, setCurrentStepKey] = useState(
    initialProgress?.nextStep ?? initialProgress?.steps?.[0]?.key
  );
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);
  const [completed, setCompleted]       = useState(initialProgress?.isComplete ?? false);

  // Persister la progression dans localStorage
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_current_step');
    if (saved && !initialProgress?.isComplete) {
      const matchingStep = initialProgress?.steps?.find(s => s.key === saved);
      if (matchingStep && matchingStep.status === 'pending') {
        setCurrentStepKey(saved);
      }
    }
  }, []);

  useEffect(() => {
    if (currentStepKey) {
      localStorage.setItem('onboarding_current_step', currentStepKey);
    }
  }, [currentStepKey]);

  const stepsList   = progress?.steps ?? [];
  const currentIndex = stepsList.findIndex(s => s.key === currentStepKey);
  const currentStep  = stepsList[currentIndex];

  const navigateToStep = useCallback((key) => {
    setCurrentStepKey(key);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const refreshProgress = useCallback(async () => {
    const res  = await fetch('/onboarding/progress', { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    setProgress(data);
    if (data.isComplete) {
      setCompleted(true);
      localStorage.removeItem('onboarding_current_step');
    }
    return data;
  }, []);

  const handleComplete = useCallback(async (stepKey, data = {}) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/onboarding/${stepKey}/complete`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        body   : JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur');
      const result   = await res.json();
      const newProg  = result.progress;
      setProgress(newProg);
      if (newProg.isComplete) {
        setCompleted(true);
        localStorage.removeItem('onboarding_current_step');
      } else if (newProg.nextStep) {
        navigateToStep(newProg.nextStep);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [navigateToStep]);

  const handleSkip = useCallback(async (stepKey) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/onboarding/${stepKey}/skip`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        body   : '{}',
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur');
      const result   = await res.json();
      const newProg  = result.progress;
      setProgress(newProg);
      if (newProg.isComplete) {
        setCompleted(true);
      } else if (newProg.nextStep) {
        navigateToStep(newProg.nextStep);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [navigateToStep]);

  const goBack = () => {
    if (currentIndex > 0) {
      navigateToStep(stepsList[currentIndex - 1].key);
    }
  };

  const StepComponent = currentStepKey ? STEP_COMPONENTS[currentStepKey] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm">S</div>
            <span className="font-bold text-white text-sm">IBIG SECRETIS</span>
          </div>
          <div className="flex items-center gap-4">
            {!trialExpired && (
              <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-3 py-1 rounded-full">
                ⏳ {remainingDays}j de trial
              </span>
            )}
            <span className="text-xs text-slate-400">
              {progress?.completed ?? 0}/{progress?.total ?? 8} étapes
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <ProgressBar steps={stepsList} currentStepKey={currentStepKey} onStepClick={navigateToStep} />
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-10">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {completed ? (
          <CompletionScreen onGoToDashboard={() => router.visit('/dashboard')} />
        ) : StepComponent ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
            {/* Step header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">
                Étape {currentIndex + 1} sur {stepsList.length}
              </div>
            </div>

            <StepComponent
              step={currentStep}
              onComplete={(data) => handleComplete(currentStepKey, data)}
              onSkip={currentStep?.skippable ? () => handleSkip(currentStepKey) : null}
              saving={saving}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
              <button
                onClick={goBack}
                disabled={currentIndex === 0 || saving}
                className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                ← Précédent
              </button>

              <div className="flex items-center gap-3">
                {currentStep?.skippable && (
                  <button
                    onClick={() => handleSkip(currentStepKey)}
                    disabled={saving}
                    className="text-slate-500 hover:text-slate-400 text-sm transition-colors disabled:opacity-50"
                  >
                    Passer
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-center">Chargement...</p>
        )}
      </main>
    </div>
  );
}
