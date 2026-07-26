/**
 * usePerformance — Hooks de mesure et reporting des performances frontend
 *
 * Exports :
 *   useWebVitals(options?)  — mesure LCP, FID/INP, CLS, TTFB via PerformanceObserver
 *   usePageData(selector)   — memo-ise les sélecteurs Inertia coûteux
 *   useDeferredValue(val)   — wraps React.useDeferredValue avec fallback
 *
 * Seuils (Core Web Vitals — Google 2024) :
 *   LCP  : bon < 2 500 ms  / à améliorer < 4 000 ms / mauvais ≥ 4 000 ms
 *   INP  : bon < 200 ms    / à améliorer < 500 ms   / mauvais ≥ 500 ms
 *   CLS  : bon < 0.1       / à améliorer < 0.25     / mauvais ≥ 0.25
 *   TTFB : bon < 800 ms    / à améliorer < 1 800 ms / mauvais ≥ 1 800 ms
 *
 * En développement : les métriques sont affichées dans la console avec
 * un code couleur (vert / orange / rouge).
 * En production : les violations sont envoyées à /api/metrics (POST, fire & forget).
 */

import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue as reactUseDeferredValue } from 'react';
import { usePage } from '@inertiajs/react';

// ─── Constantes ───────────────────────────────────────────────────────────────

const THRESHOLDS = {
  lcp:  { good: 2500,  needsImprovement: 4000 },
  inp:  { good: 200,   needsImprovement: 500 },
  fid:  { good: 100,   needsImprovement: 300 },  // FID — remplacé par INP en 2024
  cls:  { good: 0.1,   needsImprovement: 0.25 },
  ttfb: { good: 800,   needsImprovement: 1800 },
};

const METRICS_ENDPOINT = '/api/metrics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calcule le rating d'une métrique.
 * @returns {'good'|'needs-improvement'|'poor'}
 */
function getRating(name, value) {
  const t = THRESHOLDS[name];
  if (!t) return 'good';
  if (value <= t.good) return 'good';
  if (value <= t.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Affiche la métrique dans la console avec couleur.
 */
function logVital(name, value, rating, attribution) {
  const colors = {
    good:              'color: #22c55e; font-weight: bold',
    'needs-improvement': 'color: #f59e0b; font-weight: bold',
    poor:              'color: #ef4444; font-weight: bold',
  };
  const unit = name === 'cls' ? '' : 'ms';
  const formatted = name === 'cls' ? value.toFixed(4) : Math.round(value);

  console.groupCollapsed(
    `%c[WebVital] ${name.toUpperCase()} = ${formatted}${unit} (${rating})`,
    colors[rating]
  );
  if (attribution) console.log('Attribution:', attribution);
  console.groupEnd();
}

/**
 * Envoie la métrique vers le backend si le seuil est dépassé.
 * Fire & forget — ne jamais bloquer le thread principal.
 */
function reportVital(name, value, rating, url) {
  if (rating === 'good') return; // pas de bruit pour les bons scores

  const payload = {
    metric:    name,
    value:     Math.round(name === 'cls' ? value * 10000 : value), // CLS × 10 000 pour int
    rating,
    url:       url || window.location.href,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  };

  // sendBeacon est préféré : survit à la fermeture de l'onglet
  if (navigator.sendBeacon) {
    navigator.sendBeacon(METRICS_ENDPOINT, JSON.stringify(payload));
  } else {
    fetch(METRICS_ENDPOINT, {
      method:    'POST',
      body:      JSON.stringify(payload),
      headers:   { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {}); // silence — métrique non critique
  }
}

// ─── Hook useWebVitals ────────────────────────────────────────────────────────

/**
 * Mesure les Core Web Vitals via l'API PerformanceObserver native.
 *
 * @param {Object}  options
 * @param {boolean} options.reportToServer  Envoyer les violations vers /api/metrics (défaut: true en prod)
 * @param {boolean} options.logToConsole    Afficher dans la console (défaut: true en dev)
 * @param {Function} options.onVital        Callback optionnel (name, value, rating)
 *
 * @returns {{ lcp: number|null, inp: number|null, cls: number|null, ttfb: number|null }}
 */
export function useWebVitals(options = {}) {
  const isDev = process.env.NODE_ENV === 'development';

  const {
    reportToServer = !isDev,
    logToConsole   = isDev,
    onVital        = null,
  } = options;

  const [vitals, setVitals] = useState({
    lcp:  null,
    inp:  null,
    cls:  null,
    ttfb: null,
    fid:  null,
  });

  const observersRef = useRef([]);
  const pageUrl      = useRef(window.location.href);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    const handleVital = (name, value, attribution) => {
      const rating = getRating(name, value);

      setVitals((prev) => ({ ...prev, [name]: value }));

      if (logToConsole) logVital(name, value, rating, attribution);
      if (reportToServer) reportVital(name, value, rating, pageUrl.current);
      if (onVital) onVital(name, value, rating);
    };

    // ── LCP — Largest Contentful Paint ────────────────────────────────────
    try {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last    = entries[entries.length - 1];
        if (last) {
          handleVital('lcp', last.startTime, {
            element: last.element?.tagName,
            url:     last.url,
          });
        }
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
      observersRef.current.push(lcpObs);
    } catch (_) {}

    // ── INP — Interaction to Next Paint (remplace FID) ────────────────────
    try {
      const inpObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId) {
            const duration = entry.processingEnd - entry.startTime;
            handleVital('inp', duration, { type: entry.name });
          }
        }
      });
      inpObs.observe({ type: 'event', buffered: true, durationThreshold: 40 });
      observersRef.current.push(inpObs);
    } catch (_) {}

    // ── CLS — Cumulative Layout Shift ─────────────────────────────────────
    try {
      let clsValue = 0;
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            handleVital('cls', clsValue, {
              sources: entry.sources?.slice(0, 3).map((s) => s.node?.tagName),
            });
          }
        }
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
      observersRef.current.push(clsObs);
    } catch (_) {}

    // ── TTFB — Time to First Byte ─────────────────────────────────────────
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        handleVital('ttfb', nav.responseStart - nav.requestStart, {
          serverTiming: nav.serverTiming,
        });
      }
    } catch (_) {}

    // ── FID — First Input Delay (legacy) ──────────────────────────────────
    try {
      const fidObs = new PerformanceObserver((list) => {
        const first = list.getEntries()[0];
        if (first) {
          handleVital('fid', first.processingStart - first.startTime, {
            type: first.name,
          });
        }
      });
      fidObs.observe({ type: 'first-input', buffered: true });
      observersRef.current.push(fidObs);
    } catch (_) {}

    return () => {
      observersRef.current.forEach((obs) => obs.disconnect());
      observersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return vitals;
}

// ─── Hook usePageData ─────────────────────────────────────────────────────────

/**
 * Memo-ise un sélecteur appliqué aux props Inertia de la page courante.
 *
 * Evite de recalculer des transformations coûteuses (tri, filtre, aplatissement)
 * à chaque re-render quand les props Inertia n'ont pas changé.
 *
 * @param {Function} selector  (pageProps) => derivedValue
 * @returns {*}  Valeur dérivée memoïsée
 *
 * @example
 *   const sortedTasks = usePageData(({ tasks }) =>
 *     [...tasks].sort((a, b) => a.due_date.localeCompare(b.due_date))
 *   );
 */
export function usePageData(selector) {
  const { props } = usePage();
  return useMemo(() => selector(props), [props, selector]);
}

// ─── Hook useDeferredValue ─────────────────────────────────────────────────────

/**
 * Wraps React.useDeferredValue avec un fallback gracieux pour React < 18.
 * Utile pour déprioriser le rendu des listes longues ou des graphiques.
 *
 * @param {*} value
 * @returns {*}
 */
export function useDeferredValue(value) {
  if (typeof reactUseDeferredValue === 'function') {
    // React 18+ — rendu concurrent natif
    return reactUseDeferredValue(value);
  }

  // Fallback React 17 : retourner la valeur telle quelle
  return value;
}

// ─── Hook useRenderCount (dev only) ──────────────────────────────────────────

/**
 * Compte le nombre de re-renders d'un composant.
 * Affiche un avertissement si le composant se re-rend plus de {threshold} fois
 * dans une fenêtre de 2 secondes.
 *
 * Aucun effet en production (retourne 0 immédiatement).
 *
 * @param {string} componentName  Nom du composant (pour le log)
 * @param {number} threshold      Seuil de re-renders avant avertissement (défaut: 10)
 */
export function useRenderCount(componentName, threshold = 10) {
  if (process.env.NODE_ENV !== 'development') return 0;

  const countRef    = useRef(0);
  const windowStart = useRef(Date.now());

  countRef.current += 1;

  const now = Date.now();
  if (now - windowStart.current > 2000) {
    countRef.current = 0;
    windowStart.current = now;
  }

  if (countRef.current > threshold) {
    console.warn(
      `[useRenderCount] ${componentName} s'est re-rendu ${countRef.current} fois en 2s. Vérifier les dépendances useEffect/useMemo.`
    );
  }

  return countRef.current;
}
