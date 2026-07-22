import React, { useState } from 'react';

// ── Configuration ─────────────────────────────────────────────────────────────

const LEVELS = ['low', 'medium', 'high'];
const LABELS = { low: 'Faible', medium: 'Moyen(ne)', high: 'Élevé(e)' };

/**
 * Couleur de cellule selon probabilité × impact.
 * Score de 1 (low×low) à 9 (high×high).
 */
function cellColor(prob, impact) {
  const s = { low: 1, medium: 2, high: 3 };
  const score = s[prob] * s[impact];
  if (score >= 6) return { bg: 'bg-red-100 dark:bg-red-900/30',   border: 'border-red-300 dark:border-red-700',   badge: 'bg-red-500',   label: 'Critique' };
  if (score >= 4) return { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', badge: 'bg-orange-500', label: 'Élevé' };
  if (score >= 3) return { bg: 'bg-amber-100 dark:bg-amber-900/30',  border: 'border-amber-300 dark:border-amber-700',  badge: 'bg-amber-500',  label: 'Moyen' };
  return            { bg: 'bg-green-100 dark:bg-green-900/30',  border: 'border-green-300 dark:border-green-700',  badge: 'bg-green-500',  label: 'Faible' };
}

// ── Drawer de détail ──────────────────────────────────────────────────────────

function RiskDrawer({ risk, onClose }) {
  if (!risk) return null;

  const statusLabels = { open: 'Ouvert', mitigated: 'Atténué', closed: 'Fermé' };
  const statusColors = {
    open:      'text-red-600 bg-red-50 dark:bg-red-900/30',
    mitigated: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
    closed:    'text-green-600 bg-green-50 dark:bg-green-900/30',
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">Détail du risque</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            ✕
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1">{risk.title}</h3>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[risk.status] || statusColors.open}`}>
              {statusLabels[risk.status] || risk.status}
            </span>
          </div>

          {risk.description && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{risk.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Probabilité</p>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{LABELS[risk.probability]}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Impact</p>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{LABELS[risk.impact]}</span>
            </div>
          </div>

          {risk.mitigation && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Plan d'atténuation</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                {risk.mitigation}
              </p>
            </div>
          )}

          {risk.owner && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Responsable</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {risk.owner.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-800 dark:text-gray-200">{risk.owner.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

/**
 * RiskMatrix — Matrice 3×3 Probabilité × Impact.
 *
 * Props :
 *   risks : array [{id, title, probability, impact, status, description, mitigation, owner}]
 */
export default function RiskMatrix({ risks = [] }) {
  const [selectedRisk, setSelectedRisk] = useState(null);

  // Filtre les risques ouverts uniquement
  const openRisks = risks.filter((r) => r.status !== 'closed');

  return (
    <div className="space-y-3">
      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: 'Critique', color: 'bg-red-500' },
          { label: 'Élevé',    color: 'bg-orange-500' },
          { label: 'Moyen',    color: 'bg-amber-500' },
          { label: 'Faible',   color: 'bg-green-500' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>

      {/* Matrice */}
      <div className="overflow-x-auto">
        <div className="inline-grid" style={{ gridTemplateColumns: 'auto 1fr 1fr 1fr', minWidth: 320 }}>

          {/* Ligne d'en-tête impact */}
          <div className="col-start-2 col-span-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1 border-b border-gray-200 dark:border-gray-700 mb-1">
            Impact →
          </div>

          {/* Label colonnes impact */}
          <div />
          {LEVELS.map((impact) => (
            <div key={impact} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 pb-1">
              {LABELS[impact]}
            </div>
          ))}

          {/* Lignes (probabilité de bas en haut) */}
          {[...LEVELS].reverse().map((prob, rowIdx) => (
            <React.Fragment key={prob}>
              {/* Label probabilité */}
              <div className="flex items-center justify-end pr-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {rowIdx === 1 && (
                  <span className="writing-mode-vertical rotate-180 whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl' }}>
                    ↑ Probabilité
                  </span>
                )}
                <span className="ml-1">{LABELS[prob]}</span>
              </div>

              {/* Cellules */}
              {LEVELS.map((impact) => {
                const cfg = cellColor(prob, impact);
                const cellRisks = openRisks.filter(
                  (r) => r.probability === prob && r.impact === impact
                );

                return (
                  <div key={impact}
                    className={`border ${cfg.border} ${cfg.bg} rounded-lg p-2 min-h-[72px] m-0.5 transition-all`}>
                    <div className="flex flex-wrap gap-1">
                      {cellRisks.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedRisk(r)}
                          className={`${cfg.badge} text-white text-xs px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity max-w-full truncate text-left shadow-sm`}
                          title={r.title}>
                          {r.title.length > 14 ? r.title.slice(0, 13) + '…' : r.title}
                        </button>
                      ))}
                      {cellRisks.length === 0 && (
                        <span className="text-xs text-gray-300 dark:text-gray-600 self-center mx-auto py-2">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Résumé */}
      <p className="text-xs text-gray-400 text-center">
        {openRisks.length} risque(s) ouvert(s) · Cliquer sur un risque pour le détail
      </p>

      {/* Drawer */}
      {selectedRisk && (
        <RiskDrawer risk={selectedRisk} onClose={() => setSelectedRisk(null)} />
      )}
    </div>
  );
}
