/**
 * SECRETIS ERP — Help/PracticalCases/Index.jsx
 * Catalogue des cas pratiques
 */

import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ─── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',        label: 'Tous',         icon: '🗂️' },
  { key: 'agenda',     label: 'Agenda',        icon: '📅' },
  { key: 'ged',        label: 'Documents',     icon: '📁' },
  { key: 'tasks',      label: 'Tâches',        icon: '✅' },
  { key: 'visitors',   label: 'Visiteurs',     icon: '👥' },
  { key: 'hr',         label: 'RH',            icon: '👤' },
  { key: 'accounting', label: 'Comptabilité',  icon: '💰' },
  { key: 'reporting',  label: 'Rapports',      icon: '📊' },
  { key: 'admin',      label: 'Admin',         icon: '⚙️' },
];

const DIFFICULTIES = [
  { key: 'all',          label: 'Tous niveaux' },
  { key: 'beginner',     label: 'Débutant' },
  { key: 'intermediate', label: 'Intermédiaire' },
  { key: 'advanced',     label: 'Avancé' },
];

const STATUSES = [
  { key: 'all',       label: 'Tous' },
  { key: 'todo',      label: 'À faire' },
  { key: 'completed', label: 'Complétés' },
];

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Débutant',      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',     dot: 'bg-green-500' },
  intermediate: { label: 'Intermédiaire', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',     dot: 'bg-amber-500' },
  advanced:     { label: 'Avancé',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',             dot: 'bg-red-500' },
};

const CATEGORY_COLORS = {
  agenda:     'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  ged:        'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  tasks:      'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  visitors:   'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  hr:         'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
  accounting: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  reporting:  'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
  admin:      'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
};

// ─── Composant carte ───────────────────────────────────────────────────────────

function CaseCard({ practicalCase }) {
  const diff = DIFFICULTY_CONFIG[practicalCase.difficulty] || DIFFICULTY_CONFIG.beginner;
  const catColor = CATEGORY_COLORS[practicalCase.category] || '';
  const catIcon = CATEGORIES.find(c => c.key === practicalCase.category)?.icon || '📋';

  return (
    <div className={`relative rounded-2xl border ${catColor} bg-white dark:bg-gray-900 overflow-hidden
                     hover:shadow-lg transition-all duration-200 group flex flex-col`}>
      {/* Statut complété */}
      {practicalCase.completed && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Featured badge */}
      {practicalCase.is_featured && !practicalCase.completed && (
        <div className="absolute top-3 right-3 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          ⭐ Recommandé
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{catIcon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight group-hover:text-[#7e22ce] transition-colors">
              {practicalCase.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 flex-1">
          {practicalCase.description}
        </p>

        {/* Objectifs */}
        {practicalCase.objectives && practicalCase.objectives.length > 0 && (
          <ul className="space-y-1 mb-3">
            {practicalCase.objectives.slice(0, 2).map((obj, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="text-[#7e22ce] mt-0.5 flex-shrink-0">•</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${diff.color}`}>
            {diff.label}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {practicalCase.duration_minutes} min
          </span>
        </div>

        {/* CTA */}
        <Link
          href={`/aide/cas-pratiques/${practicalCase.slug}`}
          className={`w-full text-center text-xs font-semibold py-2.5 rounded-xl transition-colors ${
            practicalCase.completed
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-[#9333EA] hover:bg-[#7e22ce] text-white'
          }`}
        >
          {practicalCase.completed ? '✓ Revoir le cas' : 'Commencer →'}
        </Link>
      </div>
    </div>
  );
}

// ─── Barre de progression ──────────────────────────────────────────────────────

function ProgressCircle({ percent, size = 80 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        className="text-[#7e22ce] transition-all duration-700" />
    </svg>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function PracticalCasesIndex({ cases = [], progress = { completed: 0, total: 0, percent: 0 } }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeDifficulty, setActiveDifficulty] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');

  const filtered = useMemo(() => {
    return cases.filter(c => {
      if (activeCategory !== 'all' && c.category !== activeCategory) return false;
      if (activeDifficulty !== 'all' && c.difficulty !== activeDifficulty) return false;
      if (activeStatus === 'todo' && c.completed) return false;
      if (activeStatus === 'completed' && !c.completed) return false;
      return true;
    });
  }, [cases, activeCategory, activeDifficulty, activeStatus]);

  const featured = cases.filter(c => c.is_featured && !c.completed).slice(0, 3);

  return (
    <AppLayout>
      <Head title="Cas pratiques | SECRETIS" />

      <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 pb-16">

        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-[#9333EA] to-[#7e22ce] text-white">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400 text-sm font-medium uppercase tracking-wide">Centre d'apprentissage</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">Apprenez SECRETIS en pratiquant</h1>
                <p className="text-white/70 text-sm max-w-xl">
                  {progress.total} cas pratiques guidés, basés sur des situations réelles d'organisations africaines.
                  Progressez à votre rythme, du débutant à l'expert.
                </p>
              </div>

              {/* Progression globale */}
              <div className="hidden md:flex items-center gap-4 bg-white/10 rounded-2xl p-5">
                <div className="relative">
                  <ProgressCircle percent={progress.percent} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{progress.percent}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold">{progress.completed}/{progress.total}</p>
                  <p className="text-white/70 text-xs">cas complétés</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6">

          {/* ── Section "Commencer par là" ── */}
          {featured.length > 0 && (
            <section className="mt-8 mb-8">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
                🚀 Commencer par là
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featured.map(c => <CaseCard key={c.id} practicalCase={c} />)}
              </div>
            </section>
          )}

          {/* ── Filtres ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
            {/* Filtre catégorie */}
            <div className="flex flex-wrap gap-2 mb-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-[#9333EA] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Filtre difficulté */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Niveau :</span>
                {DIFFICULTIES.map(d => (
                  <button key={d.key} onClick={() => setActiveDifficulty(d.key)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                      activeDifficulty === d.key
                        ? 'bg-[#7e22ce] text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Filtre statut */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Statut :</span>
                {STATUSES.map(s => (
                  <button key={s.key} onClick={() => setActiveStatus(s.key)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                      activeStatus === s.key
                        ? 'bg-[#7e22ce] text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-gray-400 ml-auto">{filtered.length} cas</span>
            </div>
          </div>

          {/* ── Grille de cas ── */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-500">Aucun cas pratique ne correspond à vos filtres.</p>
              <button onClick={() => { setActiveCategory('all'); setActiveDifficulty('all'); setActiveStatus('all'); }}
                className="mt-3 text-sm text-[#7e22ce] hover:underline">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => <CaseCard key={c.id} practicalCase={c} />)}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
export { PracticalCasesIndex };
