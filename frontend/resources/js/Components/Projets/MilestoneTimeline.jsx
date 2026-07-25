import React, { useState } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG = {
  completed:   { icon: '✓', color: '#22C55E', label: 'Terminé' },
  missed:      { icon: '✗', color: '#EF4444', label: 'Manqué'  },
  in_progress: { icon: '◐', color: '#3B82F6', label: 'En cours' },
  pending:     { icon: '○', color: '#9CA3AF', label: 'En attente' },
};

// ── Popover ──────────────────────────────────────────────────────────────────

function MilestonePopover({ milestone, position }) {
  const cfg = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.pending;

  return (
    <div
      className="absolute z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64 pointer-events-none"
      style={{
        left: position.x,
        top:  position.y - 10,
        transform: 'translate(-50%, -100%)',
      }}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg" style={{ color: cfg.color }}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{milestone.name}</p>
          <p className="text-xs text-gray-500">{fmtDate(milestone.due_date)}</p>
        </div>
      </div>

      {milestone.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{milestone.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
          {cfg.label}
        </span>
        <span className="text-xs text-gray-500">{milestone.completion_percent}% complété</span>
      </div>

      {milestone.completion_percent > 0 && (
        <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{
            width: `${milestone.completion_percent}%`,
            backgroundColor: cfg.color,
          }} />
        </div>
      )}

      {/* Petite flèche pointant vers le bas */}
      <div className="absolute left-1/2 bottom-0 translate-x-[-50%] translate-y-full">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800" />
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

/**
 * MilestoneTimeline — Timeline horizontale des milestones d'un projet.
 *
 * Props :
 *   milestones  : array [{id, name, due_date, status, color, completion_percent, description}]
 *   projectStart: string 'YYYY-MM-DD'
 *   projectEnd  : string 'YYYY-MM-DD'
 *   className   : string
 */
export default function MilestoneTimeline({ milestones = [], projectStart, projectEnd, className = '' }) {
  const [hovered, setHovered]       = useState(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  const today = new Date();
  const start = projectStart ? new Date(projectStart) : (() => {
    if (milestones.length === 0) return new Date();
    return new Date(Math.min(...milestones.map((m) => new Date(m.due_date))));
  })();
  const end = projectEnd ? new Date(projectEnd) : (() => {
    if (milestones.length === 0) {
      const e = new Date(); e.setMonth(e.getMonth() + 1); return e;
    }
    return new Date(Math.max(...milestones.map((m) => new Date(m.due_date))));
  })();

  const totalMs = Math.max(1, end - start);
  const toPct   = (dateStr) => {
    const d = new Date(dateStr);
    return Math.max(0, Math.min(100, ((d - start) / totalMs) * 100));
  };

  const todayPct = Math.max(0, Math.min(100, ((today - start) / totalMs) * 100));

  const handleMouseEnter = (e, milestone) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.closest('[data-timeline]');
    const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 };
    setPopoverPos({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
    });
    setHovered(milestone);
  };

  return (
    <div className={`relative ${className}`} data-timeline="1">
      {/* Ligne de base */}
      <div className="relative h-16 flex items-center">
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-200 dark:bg-gray-700 transform -translate-y-1/2" />

        {/* Ligne "Aujourd'hui" */}
        <div
          className="absolute top-0 bottom-0 w-px bg-purple-400 opacity-70"
          style={{ left: `${todayPct}%` }}>
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-purple-500 font-medium whitespace-nowrap">
            Auj.
          </span>
        </div>

        {/* Dots des milestones */}
        {milestones.map((m) => {
          const pct = toPct(m.due_date);
          const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
          const isHovered = hovered?.id === m.id;

          return (
            <div
              key={m.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 cursor-pointer"
              style={{ left: `${pct}%` }}
              onMouseEnter={(e) => handleMouseEnter(e, m)}
              onMouseLeave={() => setHovered(null)}>

              {/* Cercle principal */}
              <div
                className={`w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform ${isHovered ? 'scale-150' : 'scale-100'}`}
                style={{ backgroundColor: cfg.color }}>
                {m.status === 'completed' ? '✓' : m.status === 'missed' ? '✗' : ''}
              </div>

              {/* Étiquette alternée haut/bas */}
              <div
                className={`absolute whitespace-nowrap text-xs font-medium ${isHovered ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: milestones.indexOf(m) % 2 === 0 ? 18 : undefined,
                  bottom: milestones.indexOf(m) % 2 !== 0 ? 18 : undefined,
                }}>
                {m.name.length > 12 ? m.name.slice(0, 11) + '…' : m.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels dates */}
      <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
        <span>{start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
        <span>{end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>

      {/* Popover */}
      {hovered && (
        <MilestonePopover milestone={hovered} position={popoverPos} />
      )}
    </div>
  );
}
export { MilestoneTimeline };
