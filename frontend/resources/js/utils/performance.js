/**
 * performance.js — Utilitaires de performance React pour SECRETIS ERP
 *
 * Contient :
 *  - lazyLoad       : wrapper React.lazy + Suspense avec skeleton
 *  - debounce       : retarde l'exécution d'une fonction
 *  - throttle       : limite la fréquence d'exécution
 *  - memoizeComponent : wrapper React.memo intelligent
 *  - useIntersectionObserver : lazy loading d'images/sections
 *  - virtualizeList : helpers pour la virtualisation de listes longues
 */

import React, { lazy, Suspense, memo, useRef, useState, useEffect, useCallback } from 'react';

// =============================================================================
// Skeleton loader universel
// =============================================================================

/**
 * Skeleton animé utilisé comme fallback pendant le chargement lazy.
 * Accepte optionnellement une hauteur et un aspect-ratio pour préserver le layout.
 */
function SkeletonLoader({ height = '400px', className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`}
      style={{ height, minHeight: height }}
      aria-hidden="true"
      role="presentation"
    />
  );
}

// =============================================================================
// lazyLoad — Chargement paresseux de composants React
// =============================================================================

/**
 * Wrapper autour de React.lazy qui ajoute automatiquement un Suspense
 * avec un skeleton adapté.
 *
 * Usage :
 *   const CalendarPage = lazyLoad(() => import('../Pages/Agenda/Index'));
 *   const HeavyChart   = lazyLoad(() => import('./Charts/Revenue'), { height: '300px' });
 *
 * @param {() => Promise<{default: React.ComponentType}>} importFn  — dynamic import
 * @param {{ height?: string, fallback?: React.ReactNode }} options
 * @returns {React.ComponentType} Composant avec Suspense intégré
 */
export function lazyLoad(importFn, options = {}) {
  const LazyComponent = lazy(importFn);
  const { height = '400px', fallback = null } = options;

  // displayName pour le debugging React DevTools
  const displayName = importFn.toString().match(/import\(['"](.+?)['"]\)/)?.[1] ?? 'LazyComponent';

  function LazyWrapper(props) {
    return (
      <Suspense fallback={fallback ?? <SkeletonLoader height={height} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  LazyWrapper.displayName = `Lazy(${displayName.split('/').pop()})`;
  return LazyWrapper;
}

// =============================================================================
// debounce — Délai avant exécution
// =============================================================================

/**
 * Retarde l'exécution de fn jusqu'à ce que delay ms se soient écoulés
 * sans appel supplémentaire.
 *
 * Usage typique : champ de recherche, resize handler.
 *
 * @param {Function} fn     — Fonction à différer
 * @param {number}   delay  — Délai en millisecondes
 * @returns {Function} Fonction debouncée avec méthode .cancel()
 */
export function debounce(fn, delay) {
  let timer = null;

  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  }

  // Permet d'annuler le timer en attente
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  // Exécution immédiate optionnelle (flush)
  debounced.flush = (...args) => {
    debounced.cancel();
    fn.apply(this, args);
  };

  return debounced;
}

/**
 * Hook React pour utiliser debounce de façon stable (ref-based).
 * La référence est stable entre les rendus → aucune re-création inutile.
 *
 * Usage :
 *   const debouncedSearch = useDebouncedCallback(handleSearch, 300);
 */
export function useDebouncedCallback(fn, delay) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    debounce((...args) => fnRef.current(...args), delay),
    [delay] // recrée uniquement si delay change
  );
}

// =============================================================================
// throttle — Limitation de fréquence
// =============================================================================

/**
 * Garantit que fn n'est appelée au maximum qu'une fois par intervalle.
 *
 * Usage typique : scroll handler, mousemove, resize.
 *
 * @param {Function} fn        — Fonction à limiter
 * @param {number}   interval  — Intervalle minimum entre appels (ms)
 * @returns {Function} Fonction throttlée avec méthode .cancel()
 */
export function throttle(fn, interval) {
  let lastCall = 0;
  let timer    = null;

  function throttled(...args) {
    const now = Date.now();
    const remaining = interval - (now - lastCall);

    if (remaining <= 0) {
      // Exécution immédiate
      clearTimeout(timer);
      timer    = null;
      lastCall = now;
      fn.apply(this, args);
    } else if (! timer) {
      // Planifier le dernier appel à la fin de l'intervalle
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer    = null;
        fn.apply(this, args);
      }, remaining);
    }
  }

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return throttled;
}

// =============================================================================
// memoizeComponent — React.memo avec comparaison intelligente
// =============================================================================

/**
 * Wrapper React.memo avec une comparaison par défaut profonde sur les props
 * scalaires et shallow sur les tableaux/objets.
 *
 * La comparaison par défaut évite les re-rendus quand les props sont
 * structurellement identiques mais référentiellement différentes
 * (cas courant avec les objets créés inline dans le JSX parent).
 *
 * @param {React.ComponentType} Component
 * @param {((prevProps, nextProps) => boolean) | null} propsAreEqual
 *   Si fourni, remplace la comparaison par défaut.
 *   Si null, utilise React.memo standard (comparaison shallow).
 * @returns {React.MemoExoticComponent}
 */
export function memoizeComponent(Component, propsAreEqual = defaultPropsAreEqual) {
  const memoized = memo(Component, propsAreEqual);
  memoized.displayName = `Memo(${Component.displayName ?? Component.name ?? 'Component'})`;
  return memoized;
}

/**
 * Comparaison de props par défaut :
 *  - Primitives : égalité stricte
 *  - Fonctions   : égalité référentielle (les callbacks doivent être stables)
 *  - Tableaux    : comparaison élément par élément (shallow)
 *  - Objets      : comparaison clé par clé (shallow)
 */
function defaultPropsAreEqual(prev, next) {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    const p = prev[key];
    const n = next[key];

    if (p === n) continue;

    // Tableaux : comparaison shallow
    if (Array.isArray(p) && Array.isArray(n)) {
      if (p.length !== n.length) return false;
      if (p.some((item, i) => item !== n[i])) return false;
      continue;
    }

    // Null/undefined
    if (p == null || n == null) return false;

    // Objets simples (pas Date, RegExp, etc.) : comparaison shallow
    if (typeof p === 'object' && typeof n === 'object'
        && p.constructor === Object && n.constructor === Object) {
      if (! defaultPropsAreEqual(p, n)) return false;
      continue;
    }

    return false;
  }

  return true;
}

// =============================================================================
// useIntersectionObserver — Lazy loading basé sur la visibilité
// =============================================================================

/**
 * Hook qui observe si un élément est visible dans le viewport.
 * Idéal pour le lazy loading d'images, de sections lourdes, etc.
 *
 * Usage :
 *   const ref = useRef(null);
 *   const isVisible = useIntersectionObserver(ref, { threshold: 0.1 });
 *
 *   return <div ref={ref}>{isVisible ? <HeavyContent /> : <Placeholder />}</div>;
 *
 * @param {React.RefObject} ref         — Ref sur l'élément DOM à observer
 * @param {IntersectionObserverInit} options
 * @param {boolean} options.once        — Arrête d'observer après la première détection
 * @returns {boolean} true si l'élément est visible
 */
export function useIntersectionObserver(ref, options = {}) {
  const { once = true, threshold = 0.1, rootMargin = '100px', ...observerOptions } = options;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (! element) return;

    // Fallback pour les navigateurs sans support IntersectionObserver
    if (! window.IntersectionObserver) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Une fois visible, on n'a plus besoin d'observer (si once=true)
          if (once) {
            observer.unobserve(element);
          }
        } else if (! once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin, ...observerOptions }
    );

    observer.observe(element);

    return () => observer.unobserve(element);
  }, [ref, threshold, rootMargin, once]);

  return isVisible;
}

// =============================================================================
// virtualizeList — Helpers pour la virtualisation de listes
// =============================================================================

/**
 * Calcule les items visibles d'une liste virtualisée.
 * À utiliser avec un conteneur à scroll fixe.
 *
 * Note : Pour les listes très complexes, préférer @tanstack/react-virtual
 * qui gère également le sur-scan, les tailles dynamiques, etc.
 * Ce helper est un point d'entrée léger pour les cas simples.
 *
 * @param {Array}  items           — Tableau complet des items
 * @param {number} itemHeight      — Hauteur fixe de chaque item (px)
 * @param {number} containerHeight — Hauteur visible du conteneur (px)
 * @param {number} scrollTop       — Position de scroll courante (px)
 * @param {number} overscan        — Nombre d'items à rendre hors-vue (défaut: 3)
 *
 * @returns {{ visibleItems: Array, startIndex: number, totalHeight: number, offsetY: number }}
 */
export function virtualizeList(items, itemHeight, containerHeight, scrollTop = 0, overscan = 3) {
  const totalItems   = items.length;
  const totalHeight  = totalItems * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex   = Math.min(totalItems - 1, startIndex + visibleCount);

  return {
    visibleItems: items.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
    totalHeight,
    offsetY: startIndex * itemHeight, // translate Y à appliquer au wrapper des items
  };
}

/**
 * Hook React pour utiliser virtualizeList avec un scroll listener.
 *
 * Usage :
 *   const containerRef = useRef(null);
 *   const { visibleItems, totalHeight, offsetY } = useVirtualList(items, 56, 600);
 */
export function useVirtualList(items, itemHeight, containerHeight, overscan = 3) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const handleScroll = useCallback(
    throttle((e) => setScrollTop(e.target.scrollTop), 16), // ~60fps
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (! el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const virtual = virtualizeList(items, itemHeight, containerHeight, scrollTop, overscan);

  return { ...virtual, containerRef };
}
