import { useState } from 'react';

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

export default function ProgressBar({ steps = [], currentStepKey, onStepClick }) {
  const [hoveredKey, setHoveredKey] = useState(null);

  const completed = steps.filter(s => s.status === 'completed').length;
  const total     = steps.length;
  const percent   = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      {/* Desktop — étapes individuelles */}
      <div className="hidden md:block px-4 py-3 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          {/* Labels */}
          <div className="flex items-start gap-1 mb-2">
            {steps.map((step, i) => {
              const isActive    = step.key === currentStepKey;
              const isCompleted = step.status === 'completed';
              const isSkipped   = step.status === 'skipped';

              return (
                <div
                  key={step.key}
                  className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                  onMouseEnter={() => setHoveredKey(step.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => onStepClick?.(step.key)}
                >
                  {/* Tooltip */}
                  {hoveredKey === step.key && (
                    <div className="absolute mt-[-2.5rem] bg-slate-800 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap shadow-lg z-50 pointer-events-none">
                      {step.label}
                    </div>
                  )}

                  {/* Circle */}
                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 border-2
                    ${isActive    ? 'bg-purple-600 border-purple-400 shadow-lg shadow-blue-600/40 scale-110'  : ''}
                    ${isCompleted ? 'bg-green-600 border-green-500'                                        : ''}
                    ${isSkipped   ? 'bg-slate-700 border-slate-600'                                        : ''}
                    ${!isActive && !isCompleted && !isSkipped ? 'bg-slate-800 border-white/10 group-hover:border-white/30' : ''}
                  `}>
                    {isCompleted ? <span className="text-xs text-white font-black">✓</span>
                    : isSkipped  ? <span className="text-xs text-slate-400">⏭</span>
                    : <span>{STEP_ICONS[step.key] ?? (i + 1)}</span>}
                  </div>

                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className={`absolute top-4 left-1/2 right-0 h-0.5 transition-all duration-500
                      ${isCompleted ? 'bg-green-600' : 'bg-slate-700'}`}
                      style={{ width: 'calc(100% - 2rem)', marginLeft: '1rem' }}
                    />
                  )}

                  {/* Label */}
                  <span className={`text-[10px] font-semibold text-center leading-tight mt-1 transition-colors max-w-[60px]
                    ${isActive ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile — barre simple */}
      <div className="md:hidden px-4 py-2 bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="font-semibold">{completed}/{total} étapes</span>
          <span>{percent}% complété</span>
        </div>
        <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </>
  );
}
export { ProgressBar };
