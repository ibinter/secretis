/**
 * BudgetGauge.jsx — Jauge SVG demi-cercle réutilisable
 *
 * Props :
 *   pct        : number  — Pourcentage d'exécution (0-150)
 *   budget     : number  — Montant budgété
 *   actual     : number  — Montant réel consommé
 *   remaining  : number  — Montant restant
 *   size       : 'small' | 'medium' | 'large'  (défaut: 'medium')
 *   label      : string  (optionnel)
 */

const SIZES = {
  small:  { width: 160, height: 90,  r: 60,  strokeW: 14, fontSize: 18, subSize: 10 },
  medium: { width: 240, height: 135, r: 90,  strokeW: 18, fontSize: 26, subSize: 12 },
  large:  { width: 360, height: 200, r: 130, strokeW: 24, fontSize: 36, subSize: 14 },
};

const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(v) + ' FCFA';

function getColor(pct) {
  if (pct >= 100) return '#E74C3C';
  if (pct >= 80)  return '#F39C12';
  if (pct >= 50)  return '#F5A623';
  return '#27AE60';
}

/**
 * Coordonnées d'un point sur un demi-cercle (de 180° à 0° dans le repère SVG).
 * angle 0 = gauche, 1 = droite
 */
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * Arc SVG path pour un demi-cercle de startAngle à endAngle.
 */
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start  = polarToCartesian(cx, cy, r, endAngle);
  const end    = polarToCartesian(cx, cy, r, startAngle);
  const large  = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

export default function BudgetGauge({
  pct      = 0,
  budget   = 0,
  actual   = 0,
  remaining= 0,
  size     = 'medium',
  label    = null,
}) {
  const cfg    = SIZES[size] || SIZES.medium;
  const { width, height, r, strokeW, fontSize, subSize } = cfg;

  const cx = width / 2;
  const cy = height * 0.82;  // Centre légèrement vers le bas

  // Le demi-cercle va de -180° (gauche) à 0° (droite), soit 180° d'arc.
  // On mappe pct 0-100 sur 0°-180°.
  const clampedPct = Math.min(pct, 150);
  const filledAngle = Math.min((clampedPct / 100) * 180, 180);

  const trackPath  = describeArc(cx, cy, r, -180, 0);
  const fillPath   = describeArc(cx, cy, r, -180, -180 + filledAngle);

  // Position aiguille
  const needleAngle = -180 + filledAngle;
  const needleTip   = polarToCartesian(cx, cy, r - strokeW / 2 - 4, needleAngle);
  const needleBase1 = polarToCartesian(cx, cy, 10, needleAngle - 90);
  const needleBase2 = polarToCartesian(cx, cy, 10, needleAngle + 90);

  const fillColor = getColor(pct);

  // Marqueurs 50%, 80%, 100%
  const markers = [
    { pct: 50,  label: '50%' },
    { pct: 80,  label: '80%' },
    { pct: 100, label: '100%' },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      )}

      <svg
        width={width}
        height={height + 10}
        viewBox={`0 0 ${width} ${height + 10}`}
        className="overflow-visible"
        aria-label={`Taux d'exécution : ${pct}%`}
        role="img"
      >
        {/* Gradient arc fond */}
        <defs>
          <linearGradient id={`gauge-fill-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#27AE60" />
            <stop offset="50%"  stopColor="#F39C12" />
            <stop offset="100%" stopColor="#E74C3C" />
          </linearGradient>
        </defs>

        {/* Arc de fond */}
        <path
          d={trackPath}
          fill="none"
          stroke="#E8ECF0"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Arc rempli (gradient) */}
        {filledAngle > 0 && (
          <path
            d={fillPath}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        )}

        {/* Marqueurs */}
        {markers.map(({ pct: mp, label: ml }) => {
          const angle = -180 + (mp / 100) * 180;
          const outer = polarToCartesian(cx, cy, r + strokeW / 2 + 6, angle);
          const inner = polarToCartesian(cx, cy, r - strokeW / 2 - 6, angle);
          const lPos  = polarToCartesian(cx, cy, r + strokeW / 2 + 16, angle);
          return (
            <g key={mp}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="#CBD5E1"
                strokeWidth={1.5}
              />
              <text
                x={lPos.x}
                y={lPos.y + 4}
                textAnchor="middle"
                fontSize={subSize - 1}
                fill="#94A3B8"
              >
                {ml}
              </text>
            </g>
          );
        })}

        {/* Aiguille */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill="#1A3A5C"
          opacity={0.85}
          style={{ transition: 'all 0.8s ease-out' }}
        />
        <circle cx={cx} cy={cy} r={8} fill="#1A3A5C" />

        {/* Valeur centrale */}
        <text
          x={cx}
          y={cy - r * 0.25}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="bold"
          fill={fillColor}
        >
          {pct.toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy - r * 0.25 + fontSize * 0.9}
          textAnchor="middle"
          fontSize={subSize}
          fill="#64748B"
        >
          d'exécution
        </text>
      </svg>

      {/* Légende */}
      {size !== 'small' && (
        <div className="flex gap-4 text-xs text-center">
          <div className="flex flex-col items-center">
            <span className="font-bold text-gray-800">{fcfa(budget)}</span>
            <span className="text-gray-400">Budget</span>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="flex flex-col items-center">
            <span className="font-bold" style={{ color: fillColor }}>{fcfa(actual)}</span>
            <span className="text-gray-400">Réel</span>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="flex flex-col items-center">
            <span className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
              {fcfa(Math.abs(remaining))}
            </span>
            <span className="text-gray-400">{remaining < 0 ? 'Dépassement' : 'Restant'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
