/**
 * SECRETIS ERP — Help/PracticalCases/Show.jsx
 * Page de cas pratique complet
 */

import { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';

// ─── Constantes ────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Débutant',      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  intermediate: { label: 'Intermédiaire', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  advanced:     { label: 'Avancé',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const CATEGORY_LABELS = {
  agenda: 'Agenda',
  ged: 'Documents & GED',
  tasks: 'Tâches & Projets',
  visitors: 'Gestion des visiteurs',
  hr: 'RH & Congés',
  accounting: 'Comptabilité',
  reporting: 'Rapports',
  admin: 'Administration',
};

// ─── Confetti animation ────────────────────────────────────────────────────────

function Confetti() {
  const colors = ['#F39C12', '#9333EA', '#7e22ce', '#1E8449', '#C0392B'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-8px',
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animation: `confetti-fall ${1.5 + Math.random() * 2}s ${Math.random() * 0.5}s linear forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(${Math.random() * 720}deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Modal félicitations ───────────────────────────────────────────────────────

function CompletionModal({ onClose, title }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Félicitations !</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Vous avez terminé le cas pratique<br />
          <strong>"{title}"</strong>
        </p>

        <div className="space-y-3">
          <Link
            href="/aide/guide"
            className="block w-full bg-[#9333EA] hover:bg-[#7e22ce] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            📖 Explorer le guide SECRETIS
          </Link>
          <Link
            href="/aide/cas-pratiques"
            className="block w-full bg-[#F39C12] hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            🧪 Tester d'autres cas pratiques
          </Link>
          <button
            onClick={onClose}
            className="block w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium py-2 text-sm transition-colors"
          >
            Commencer à travailler →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function PracticalCasesShow({ practicalCase, completed: initialCompleted, prev, next }) {
  const [checkedSteps, setCheckedSteps] = useState({});
  const [completed, setCompleted] = useState(initialCompleted);
  const [completing, setCompleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState({});
  const topRef = useRef(null);

  const diff = DIFFICULTY_CONFIG[practicalCase.difficulty] || DIFFICULTY_CONFIG.beginner;
  const totalSteps = practicalCase.steps?.length || 0;
  const checkedCount = Object.values(checkedSteps).filter(Boolean).length;
  const progressPercent = totalSteps > 0 ? Math.round((checkedCount / totalSteps) * 100) : 0;

  const toggleStep = (i) => {
    setCheckedSteps(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const handleComplete = async () => {
    if (completed || completing) return;
    setCompleting(true);
    try {
      await axios.post(`/api/practical-cases/${practicalCase.id}/complete`);
      setCompleted(true);
      setShowConfetti(true);
      setShowModal(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } catch {
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <AppLayout>
      <Head title={`${practicalCase.title} | Cas pratiques SECRETIS`} />

      {showConfetti && <Confetti />}
      {showModal && (
        <CompletionModal
          title={practicalCase.title}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 pb-16" ref={topRef}>

        {/* ── Breadcrumb ── */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-gray-500">
            <Link href="/aide" className="hover:text-[#7e22ce]">Aide</Link>
            <span>/</span>
            <Link href="/aide/cas-pratiques" className="hover:text-[#7e22ce]">Cas pratiques</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 truncate">{practicalCase.title}</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* ── Header ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{CATEGORY_LABELS[practicalCase.category]}</span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.color}`}>{diff.label}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {practicalCase.duration_minutes} min
                  </span>
                  {completed && (
                    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                      ✓ Complété
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{practicalCase.title}</h1>
              </div>
            </div>

            {/* Prérequis */}
            {practicalCase.prerequisites && practicalCase.prerequisites.length > 0 && (
              <div className="mt-3 flex items-start gap-2">
                <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">Prérequis :</span>
                <div className="flex flex-wrap gap-1">
                  {practicalCase.prerequisites.map((slug, i) => (
                    <Link key={i} href={`/aide/cas-pratiques/${slug}`}
                      className="text-xs bg-gray-100 dark:bg-gray-800 text-[#7e22ce] px-2 py-0.5 rounded hover:underline">
                      {slug}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Colonne principale ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Objectifs d'apprentissage */}
              {practicalCase.learning_objectives && practicalCase.learning_objectives.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <h2 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <span>🎯</span> Objectifs d'apprentissage
                  </h2>
                  <ul className="space-y-2">
                    {practicalCase.learning_objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="w-5 h-5 rounded-full bg-[#7e22ce]/10 text-[#7e22ce] flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contexte */}
              {practicalCase.context && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5">
                  <h2 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <span>📋</span> Contexte
                  </h2>
                  <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                    {practicalCase.context}
                  </p>
                </div>
              )}

              {/* Timeline des étapes */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <span>📝</span> Étapes
                  </h2>
                  <span className="text-xs text-gray-500">{checkedCount}/{totalSteps} étapes</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-5">
                  <div
                    className="bg-[#7e22ce] h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="space-y-4">
                  {(practicalCase.steps || []).map((step, i) => (
                    <div key={i} className="flex gap-4">
                      {/* Numéro / Checkbox */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => toggleStep(i)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                            checkedSteps[i]
                              ? 'bg-[#1E8449] text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {checkedSteps[i] ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </button>
                      </div>

                      {/* Instruction */}
                      <div className="flex-1 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                        <p className={`text-sm leading-relaxed mb-2 ${
                          checkedSteps[i] ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'
                        }`}
                          dangerouslySetInnerHTML={{
                            __html: step.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                          }}
                        />

                        {/* Zone de notes */}
                        <input
                          type="text"
                          value={notes[i] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [i]: e.target.value }))}
                          placeholder="Ajouter une note…"
                          className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7e22ce] text-gray-600 dark:text-gray-400 placeholder-gray-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Résultat attendu */}
              {practicalCase.expected_result && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-2xl p-5">
                  <h2 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                    <span>✅</span> Résultat attendu
                  </h2>
                  <p className="text-sm text-green-900 dark:text-green-200 leading-relaxed">
                    {practicalCase.expected_result}
                  </p>

                  {/* Placeholder capture simulée */}
                  <div className="mt-3 rounded-xl bg-green-100 dark:bg-green-900/20 border-2 border-dashed border-green-300 dark:border-green-700 h-24 flex items-center justify-center">
                    <span className="text-xs text-green-500 dark:text-green-400">🖥️ Aperçu de l'interface attendue</span>
                  </div>
                </div>
              )}

              {/* Bouton "J'ai terminé" */}
              <div className="text-center">
                <button
                  onClick={handleComplete}
                  disabled={completed || completing}
                  className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 shadow-lg ${
                    completed
                      ? 'bg-green-500 text-white cursor-default'
                      : completing
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-wait'
                      : 'bg-[#F39C12] hover:bg-amber-600 text-white hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {completed ? (
                    <>✓ Cas pratique complété !</>
                  ) : completing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Enregistrement…
                    </>
                  ) : (
                    <>🎯 J'ai terminé ce cas !</>
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  {completed ? 'Bravo ! Continuez avec les autres cas.' : 'Cliquez quand vous avez complété toutes les étapes'}
                </p>
              </div>
            </div>

            {/* ── Sidebar droite ── */}
            <div className="space-y-4">

              {/* Progression */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ma progression</h3>
                <div className="text-3xl font-bold text-[#7e22ce] mb-1">{progressPercent}%</div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-2">
                  <div className="bg-[#7e22ce] h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-xs text-gray-500">{checkedCount} sur {totalSteps} étapes cochées</p>
              </div>

              {/* Navigation */}
              {(prev || next) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Navigation</h3>
                  <div className="space-y-2">
                    {prev && (
                      <Link href={`/aide/cas-pratiques/${prev.slug}`}
                        className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-[#7e22ce] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="truncate">{prev.title}</span>
                      </Link>
                    )}
                    {next && (
                      <Link href={`/aide/cas-pratiques/${next.slug}`}
                        className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-[#7e22ce] transition-colors">
                        <span className="truncate">{next.title}</span>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Aide SARA */}
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold">S</div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Besoin d'aide ?</p>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                  SARA peut vous guider étape par étape sur ce cas pratique.
                </p>
                <button
                  onClick={() => window.dispatchEvent(new Event('sara:open'))}
                  className="w-full text-xs bg-amber-400 hover:bg-amber-500 text-white font-medium py-2 rounded-xl transition-colors"
                >
                  Demander à SARA
                </button>
              </div>

              {/* Retour catalogue */}
              <Link href="/aide/cas-pratiques"
                className="flex items-center justify-center gap-2 w-full text-xs text-gray-500 hover:text-[#7e22ce] transition-colors py-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour au catalogue
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export { PracticalCasesShow };
