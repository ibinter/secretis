/**
 * IBIG SECRETIS — useIntersectionObserver.js
 * Détecte l'entrée/sortie d'un élément dans le viewport.
 * Utilisé pour :
 *   - Lazy loading d'images hors viewport
 *   - Animations on-scroll (avec prefers-reduced-motion)
 *   - Pagination infinie (sentinel trigger)
 *   - Tracking de visibilité (analytics)
 *
 * @example
 *   const imgRef = useRef(null)
 *   const { hasIntersected } = useIntersectionObserver(imgRef)
 *
 *   return (
 *     <img
 *       ref={imgRef}
 *       src={hasIntersected ? actualSrc : undefined}
 *       alt="…"
 *     />
 *   )
 */

import { useState, useEffect, useRef } from 'react'

/**
 * @param {React.RefObject<Element>} ref       — référence à l'élément observé
 * @param {IntersectionObserverInit} [options] — options IntersectionObserver
 * @param {number}  [options.threshold]        — seuil de visibilité (0–1, défaut: 0.1)
 * @param {string}  [options.rootMargin]       — marge autour du root (défaut: '0px')
 * @param {boolean} [options.once]             — arrêter d'observer après la première intersection
 * @returns {{
 *   isIntersecting: boolean,   — actuellement visible
 *   hasIntersected: boolean,   — a déjà été visible au moins une fois
 *   entry: IntersectionObserverEntry|null
 * }}
 */
export function useIntersectionObserver(ref, options = {}) {
  const {
    threshold   = 0.1,
    rootMargin  = '0px',
    root        = null,
    once        = false,
    ...rest
  } = options

  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const [entry, setEntry]                   = useState(null)
  const observerRef                         = useRef(null)

  useEffect(() => {
    const element = ref?.current
    if (!element || typeof IntersectionObserver === 'undefined') return

    // Nettoyer l'observer précédent
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      ([observerEntry]) => {
        setEntry(observerEntry)
        setIsIntersecting(observerEntry.isIntersecting)

        if (observerEntry.isIntersecting) {
          setHasIntersected(true)
          // Si once=true : on arrête d'observer dès la première intersection
          if (once) observerRef.current?.disconnect()
        }
      },
      { threshold, rootMargin, root, ...rest }
    )

    observerRef.current.observe(element)

    return () => observerRef.current?.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, threshold, rootMargin, root, once])

  return { isIntersecting, hasIntersected, entry }
}

export default useIntersectionObserver
