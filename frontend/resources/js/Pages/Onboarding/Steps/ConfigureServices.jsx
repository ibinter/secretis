import { useState } from 'react';

const MODULES = [
  { key: 'courrier',      icon: '📬', name: 'Gestion du courrier',    desc: 'Entrée, sortie, archivage et suivi du courrier officiel.' },
  { key: 'evenements',    icon: '📅', name: 'Événements & Agendas',   desc: 'Réunions, audiences et planification d\'activités.' },
  { key: 'documents',     icon: '📄', name: 'Gestion documentaire',   desc: 'GED, versions, signature et workflows d\'approbation.' },
  { key: 'rh',            icon: '👥', name: 'Ressources Humaines',    desc: 'Employés, congés, évaluations et organigramme.' },
  { key: 'budget',        icon: '💰', name: 'Budget & Finances',      desc: 'Suivi budgétaire, engagements et reporting financier.' },
  { key: 'projets',       icon: '🚀', name: 'Gestion de projets',     desc: 'Tâches, jalons, équipes et suivi d\'avancement.' },
  { key: 'patrimoine',    icon: '🏛️', name: 'Patrimoine & Actifs',    desc: 'Inventaire, maintenance et gestion des équipements.' },
  { key: 'contrats',      icon: '📝', name: 'Contrats & Marchés',     desc: 'Marchés publics, contrats fournisseurs et suivi.' },
  { key: 'sara',          icon: '🤖', name: 'SARA (IA)',               desc: 'Assistante intelligente pour recherche et analyse.', recommended: true },
  { key: 'reporting',     icon: '📊', name: 'Reporting & Analytics',  desc: 'Tableaux de bord, indicateurs et exports Excel/PDF.', recommended: true },
];

export default function ConfigureServices({ step, onComplete, onSkip, saving }) {
  const [enabled, setEnabled] = useState(
    step?.data?.enabled ?? MODULES.filter(m => m.recommended).map(m => m.key)
  );

  const toggle = (key) => {
    setEnabled(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Activez vos modules</h2>
        <p className="text-slate-400 text-sm">
          Choisissez les modules adaptés à votre organisation. Vous pourrez toujours en activer d'autres plus tard.
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{enabled.length}/{MODULES.length} modules activés</span>
        <div className="flex gap-3">
          <button onClick={() => setEnabled(MODULES.map(m => m.key))} className="text-purple-400 hover:text-purple-300 transition-colors">
            Tout activer
          </button>
          <button onClick={() => setEnabled([])} className="text-slate-500 hover:text-slate-400 transition-colors">
            Tout désactiver
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map((mod) => {
          const active = enabled.includes(mod.key);
          return (
            <button
              key={mod.key}
              type="button"
              onClick={() => toggle(mod.key)}
              className={`relative text-left p-4 rounded-xl border transition-all duration-200 ${
                active
                  ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-blue-600/10'
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              {mod.recommended && (
                <span className="absolute top-2 right-2 text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                  Recommandé
                </span>
              )}
              <div className="flex items-start gap-3">
                <span className="text-2xl">{mod.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold truncate ${active ? 'text-purple-300' : 'text-white'}`}>
                      {mod.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{mod.desc}</p>
                </div>
                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  active ? 'bg-purple-500 border-purple-500' : 'border-white/30'
                }`}>
                  {active && <span className="text-white text-xs font-black">✓</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onComplete({ enabled })}
          disabled={saving || enabled.length === 0}
          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
        >
          {saving ? '⏳ Enregistrement...' : `Activer ${enabled.length} module${enabled.length > 1 ? 's' : ''} →`}
        </button>
        {onSkip && (
          <button onClick={onSkip} disabled={saving} className="px-5 text-slate-400 hover:text-slate-300 text-sm border border-white/10 rounded-xl transition-colors">
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
export { ConfigureServices };
