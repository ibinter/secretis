/**
 * SECRETIS ERP — StatusBadge.jsx
 * Badge de statut réutilisable avec couleurs sémantiques
 *
 * Props :
 *   status   string   — valeur du statut (voir STATUSES ci-dessous)
 *   size     'sm' | 'md' | 'lg'   (défaut 'md')
 *   dot      boolean  — affiche un point indicateur animé pour les statuts actifs
 *   label    string   — libellé personnalisé (remplace le libellé par défaut)
 *   className string  — classes CSS supplémentaires
 *
 * Statuts supportés :
 *   pending, active, expired, suspended, approved, rejected,
 *   todo, in_progress, done, cancelled, trial, grace,
 *   open, closed, resolved, draft, published
 *
 * @example
 *   <StatusBadge status="active" />
 *   <StatusBadge status="expired" size="sm" />
 *   <StatusBadge status="in_progress" dot />
 *   <StatusBadge status="approved" label="Validé" size="lg" />
 */

import React from 'react';

// ─── Définition des statuts ───────────────────────────────────────────────────
const STATUSES = {
  // Cycle de vie compte / licence
  pending: {
    label:  'En attente',
    colors: 'bg-amber-100 text-amber-800 ring-amber-300',
    dot:    'bg-amber-500',
    icon:   '⏳',
  },
  active: {
    label:  'Actif',
    colors: 'bg-green-100 text-green-800 ring-green-300',
    dot:    'bg-green-500',
    icon:   '✓',
    pulse:  true,
  },
  expired: {
    label:  'Expiré',
    colors: 'bg-red-100 text-red-800 ring-red-300',
    dot:    'bg-red-500',
    icon:   '✕',
  },
  suspended: {
    label:  'Suspendu',
    colors: 'bg-gray-100 text-gray-700 ring-gray-300',
    dot:    'bg-gray-400',
    icon:   '⊘',
  },
  trial: {
    label:  'Essai',
    colors: 'bg-purple-100 text-purple-800 ring-purple-300',
    dot:    'bg-purple-500',
    icon:   '🔬',
  },
  grace: {
    label:  'Période de grâce',
    colors: 'bg-orange-100 text-orange-800 ring-orange-300',
    dot:    'bg-orange-400',
    icon:   '⚠',
  },

  // Approbation
  approved: {
    label:  'Approuvé',
    colors: 'bg-green-100 text-green-800 ring-green-300',
    dot:    'bg-green-500',
    icon:   '✓',
  },
  rejected: {
    label:  'Rejeté',
    colors: 'bg-red-100 text-red-800 ring-red-300',
    dot:    'bg-red-500',
    icon:   '✕',
  },

  // Tâches / projets
  todo: {
    label:  'À faire',
    colors: 'bg-slate-100 text-slate-700 ring-slate-300',
    dot:    'bg-slate-400',
    icon:   '○',
  },
  in_progress: {
    label:  'En cours',
    colors: 'bg-purple-100 text-purple-800 ring-purple-300',
    dot:    'bg-purple-500',
    icon:   '↻',
    pulse:  true,
  },
  done: {
    label:  'Terminé',
    colors: 'bg-green-100 text-green-800 ring-green-300',
    dot:    'bg-green-500',
    icon:   '✓',
  },
  cancelled: {
    label:  'Annulé',
    colors: 'bg-gray-100 text-gray-500 ring-gray-200',
    dot:    'bg-gray-400',
    icon:   '✕',
  },

  // Documents / publications
  draft: {
    label:  'Brouillon',
    colors: 'bg-zinc-100 text-zinc-600 ring-zinc-300',
    dot:    'bg-zinc-400',
    icon:   '✎',
  },
  published: {
    label:  'Publié',
    colors: 'bg-teal-100 text-teal-800 ring-teal-300',
    dot:    'bg-teal-500',
    icon:   '◆',
  },

  // Tickets
  open: {
    label:  'Ouvert',
    colors: 'bg-purple-100 text-purple-800 ring-purple-300',
    dot:    'bg-purple-500',
    icon:   '◎',
    pulse:  true,
  },
  closed: {
    label:  'Fermé',
    colors: 'bg-gray-100 text-gray-500 ring-gray-200',
    dot:    'bg-gray-400',
    icon:   '●',
  },
  resolved: {
    label:  'Résolu',
    colors: 'bg-green-100 text-green-800 ring-green-300',
    dot:    'bg-green-500',
    icon:   '✓',
  },

  // Fallback
  _unknown: {
    label:  'Inconnu',
    colors: 'bg-gray-100 text-gray-500 ring-gray-200',
    dot:    'bg-gray-400',
    icon:   '?',
  },
};

// ─── Classes par taille ───────────────────────────────────────────────────────
const SIZES = {
  sm: {
    badge: 'text-xs px-2 py-0.5 gap-1.5',
    dot:   'w-1.5 h-1.5',
    ring:  'ring-1',
  },
  md: {
    badge: 'text-xs px-2.5 py-1 gap-1.5',
    dot:   'w-2 h-2',
    ring:  'ring-1',
  },
  lg: {
    badge: 'text-sm px-3 py-1.5 gap-2',
    dot:   'w-2.5 h-2.5',
    ring:  'ring-2',
  },
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function StatusBadge({
  status,
  size      = 'md',
  dot       = false,
  label,
  className = '',
  showIcon  = false,
}) {
  const config  = STATUSES[status] || STATUSES._unknown;
  const sizing  = SIZES[size]     || SIZES.md;
  const displayLabel = label || config.label;

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium whitespace-nowrap select-none
        ${sizing.badge}
        ${sizing.ring}
        ${config.colors}
        ${className}
      `}
      aria-label={displayLabel}
      title={displayLabel}
    >
      {/* Point indicateur avec animation pour statuts actifs */}
      {dot && (
        <span className="relative flex-shrink-0" style={{ width: sizing.dot === 'w-1.5 h-1.5' ? '6px' : sizing.dot === 'w-2 h-2' ? '8px' : '10px', height: sizing.dot === 'w-1.5 h-1.5' ? '6px' : sizing.dot === 'w-2 h-2' ? '8px' : '10px' }}>
          {config.pulse && (
            <span
              className={`absolute inset-0 rounded-full ${config.dot} opacity-75 animate-ping`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full ${config.dot}`}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </span>
      )}

      {/* Icône optionnelle */}
      {showIcon && !dot && (
        <span className="flex-shrink-0 font-bold opacity-70 leading-none text-xs">
          {config.icon}
        </span>
      )}

      {/* Libellé */}
      {displayLabel}
    </span>
  );
}

// ─── Composant point seul (pour les listes) ───────────────────────────────────
export function StatusDot({ status, size = 'md', pulse }) {
  const config = STATUSES[status] || STATUSES._unknown;
  const sizing = SIZES[size] || SIZES.md;
  const shouldPulse = pulse ?? config.pulse;

  return (
    <span className="relative flex-shrink-0 inline-flex" aria-label={config.label}>
      {shouldPulse && (
        <span className={`absolute inset-0 rounded-full ${config.dot} opacity-75 animate-ping`} />
      )}
      <span className={`relative inline-flex rounded-full ${sizing.dot} ${config.dot}`} />
    </span>
  );
}

// ─── Utilitaire : obtenir la config d'un statut ───────────────────────────────
export function getStatusConfig(status) {
  return STATUSES[status] || STATUSES._unknown;
}

// ─── Groupe de badges (pour les filtres) ─────────────────────────────────────
/**
 * Affiche plusieurs badges dans un groupe horizontal.
 * @example
 *   <StatusBadgeGroup statuses={['active', 'trial']} />
 */
export function StatusBadgeGroup({ statuses = [], size = 'sm', gap = 'gap-1.5' }) {
  return (
    <div className={`flex flex-wrap items-center ${gap}`}>
      {statuses.map((s, i) => (
        <StatusBadge key={`${s}-${i}`} status={s} size={size} />
      ))}
    </div>
  );
}

// ─── Sélecteur de statut (pour les formulaires) ───────────────────────────────
/**
 * Dropdown pour sélectionner un statut dans une liste prédéfinie.
 * @example
 *   <StatusSelect
 *     value={task.status}
 *     options={['todo', 'in_progress', 'done', 'cancelled']}
 *     onChange={v => updateTask({ status: v })}
 *   />
 */
export function StatusSelect({ value, options = [], onChange, disabled = false, size = 'sm' }) {
  return (
    <div className="relative inline-flex items-center">
      <StatusBadge status={value} size={size} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 opacity-0 w-full cursor-pointer disabled:cursor-not-allowed"
        aria-label="Changer le statut"
      >
        {options.map(s => (
          <option key={s} value={s}>
            {STATUSES[s]?.label || s}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Export de la liste des statuts (pour les filtres, etc.) ─────────────────
export { STATUSES };
