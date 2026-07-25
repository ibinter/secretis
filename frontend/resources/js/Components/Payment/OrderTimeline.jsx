/**
 * OrderTimeline — Timeline verticale réutilisable pour le suivi de commande.
 *
 * Props :
 *   steps         {Array}   — liste des étapes : { key, label, sub, timestamp? }
 *   currentStatus {string}  — clé du statut courant
 *   failed        {boolean} — si true, colore l'étape courante en rouge
 *   cancelled     {boolean} — si true, colore tout en gris
 */

const STATUS_ICONS = {
  done: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  current: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  failed: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

function StepNode({ state }) {
  const styles = {
    done:     'bg-emerald-500 border-emerald-500 text-white',
    current:  'bg-indigo-100 border-indigo-500 text-indigo-600',
    failed:   'bg-red-100 border-red-400 text-red-600',
    pending:  'bg-white border-gray-300 text-transparent',
    cancelled:'bg-gray-100 border-gray-300 text-gray-400',
  };

  return (
    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${styles[state] ?? styles.pending}`}>
      {STATUS_ICONS[state === 'cancelled' ? 'done' : state] ?? null}
    </div>
  );
}

function fmtTs(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function OrderTimeline({ steps = [], currentStatus, failed = false, cancelled = false }) {
  const currentIdx = steps.findIndex(s => s.key === currentStatus);

  return (
    <div className="relative flex flex-col gap-0">
      {steps.map((step, i) => {
        const isDone    = cancelled ? true : i < currentIdx && !failed;
        const isCurrent = i === currentIdx;
        const isFailed  = isCurrent && failed;
        const isAfter   = i > currentIdx;

        let nodeState = 'pending';
        if (cancelled)     nodeState = 'cancelled';
        else if (isFailed) nodeState = 'failed';
        else if (isDone)   nodeState = 'done';
        else if (isCurrent) nodeState = 'current';

        const labelColor = cancelled
          ? 'text-gray-400'
          : isFailed   ? 'text-red-700'
          : isCurrent  ? 'text-indigo-700'
          : isDone     ? 'text-gray-900'
          :              'text-gray-400';

        return (
          <div key={step.key} className="relative flex gap-4">
            {/* Ligne verticale */}
            {i < steps.length - 1 && (
              <div
                className={`absolute left-4 top-8 bottom-0 w-0.5 -translate-x-0.5 ${
                  isDone && !cancelled ? 'bg-emerald-300' : 'bg-gray-200'
                }`}
                style={{ height: 'calc(100% - 0px)' }}
              />
            )}

            {/* Nœud */}
            <div className="z-10 pt-0.5">
              <StepNode state={nodeState} />
            </div>

            {/* Texte */}
            <div className="pb-6 min-w-0 flex-1">
              <p className={`text-sm font-medium leading-snug ${labelColor}`}>
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                  {fmtTs(step.timestamp)}
                </p>
              )}
              {isCurrent && step.sub && !failed && !cancelled && (
                <p className="text-xs text-gray-500 mt-1">{step.sub}</p>
              )}
              {isFailed && step.failSub && (
                <p className="text-xs text-red-600 mt-1">{step.failSub}</p>
              )}
              {cancelled && step.cancelSub && (
                <p className="text-xs text-gray-400 mt-1">{step.cancelSub}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export { OrderTimeline };
