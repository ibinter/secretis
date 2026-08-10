/**
 * IBIG SECRETIS — useVirtualList.js
 * Virtualisation de longues listes sans dépendance externe.
 * Rend uniquement les items visibles + un overscan, pour les listes de milliers d'éléments.
 *
 * @example
 *   const { visibleItems, containerStyle, innerStyle, offsetY } = useVirtualList({
 *     items: auditLogs,
 *     itemHeight: 48,
 *     containerHeight: 600,
 *   })
 *
 *   return (
 *     <div style={containerStyle} className="overflow-auto">
 *       <div style={innerStyle}>
 *         <div style={{ transform: `translateY(${offsetY}px)` }}>
 *           {visibleItems.map(({ item, index }) => (
 *             <Row key={index} data={item} />
 *           ))}
 *         </div>
 *       </div>
 *     </div>
 *   )
 */

import { useState, useCallback, useRef } from 'react'

/**
 * @param {Object} options
 * @param {Array}  options.items           — tableau complet des données
 * @param {number} options.itemHeight      — hauteur fixe de chaque item (px)
 * @param {number} options.containerHeight — hauteur visible du conteneur (px)
 * @param {number} [options.overscan=3]    — nb d'items supplémentaires hors viewport
 * @returns {{
 *   visibleItems:     { item: any, index: number }[],
 *   containerStyle:   React.CSSProperties,
 *   innerStyle:       React.CSSProperties,
 *   offsetY:          number,
 *   onScroll:         (e: Event) => void,
 *   scrollToIndex:    (index: number) => void,
 *   scrollContainerRef: React.RefObject,
 * }}
 */
export function useVirtualList({
  items           = [],
  itemHeight      = 40,
  containerHeight = 400,
  overscan        = 3,
}) {
  const [scrollTop, setScrollTop]         = useState(0)
  const scrollContainerRef                = useRef(null)

  const totalHeight = items.length * itemHeight

  // Calcul de la fenêtre visible
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex   = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({ item: items[i], index: i })
  }

  const offsetY = startIndex * itemHeight

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const scrollToIndex = useCallback((index) => {
    if (!scrollContainerRef.current) return
    const targetScroll = index * itemHeight
    scrollContainerRef.current.scrollTop = targetScroll
    setScrollTop(targetScroll)
  }, [itemHeight])

  /** Style pour le conteneur scrollable */
  const containerStyle = {
    height:   containerHeight,
    overflowY: 'auto',
    position: 'relative',
  }

  /** Style pour l'espace intérieur total (crée la scrollbar proportionnelle) */
  const innerStyle = {
    height:   totalHeight,
    position: 'relative',
  }

  return {
    visibleItems,
    containerStyle,
    innerStyle,
    offsetY,
    onScroll,
    scrollToIndex,
    scrollContainerRef,
    // Métas utiles
    totalCount:  items.length,
    startIndex,
    endIndex,
  }
}

export default useVirtualList
