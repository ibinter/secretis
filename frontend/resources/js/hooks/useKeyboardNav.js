/**
 * IBIG SECRETIS — useKeyboardNav.js
 * Hook de navigation clavier dans les listes, menus et grilles.
 * WCAG 2.1 — 2.1.1 Keyboard (Niveau A)
 *
 * @example
 *   const listRef = useRef(null)
 *   useKeyboardNav(listRef, {
 *     orientation: 'vertical',
 *     loop: true,
 *     selector: '[role="menuitem"]',
 *   })
 *   return <ul ref={listRef}>…</ul>
 */

import { useEffect } from 'react'

/**
 * @param {React.RefObject<HTMLElement>} ref          — conteneur de la liste
 * @param {Object}  options
 * @param {'vertical'|'horizontal'|'grid'} options.orientation — axe de navigation
 * @param {boolean} options.loop                     — revenir au début/fin en boucle
 * @param {string}  options.selector                 — sélecteur des items navigables
 * @param {number}  options.columns                  — colonnes (mode grid)
 */
export function useKeyboardNav(ref, options = {}) {
  const {
    orientation = 'vertical',
    loop        = true,
    selector    = '[data-nav-item], button:not([disabled]), a[href], [role="menuitem"], [role="option"], [role="tab"]',
    columns     = 1,
  } = options

  useEffect(() => {
    const container = ref.current
    if (!container) return

    function getItems() {
      return Array.from(container.querySelectorAll(selector)).filter(el => {
        if (el.closest('[hidden]')) return false
        const style = getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
    }

    function moveFocus(items, currentIndex, delta) {
      const count = items.length
      if (count === 0) return

      let next = currentIndex + delta
      if (loop) {
        next = ((next % count) + count) % count
      } else {
        next = Math.max(0, Math.min(next, count - 1))
      }
      items[next]?.focus()
    }

    function handler(e) {
      const items   = getItems()
      const current = document.activeElement
      const index   = items.indexOf(current)

      // Ne rien faire si l'élément actif n'est pas dans ce container
      if (index === -1 && !container.contains(current)) return

      const isVertical   = orientation === 'vertical'
      const isHorizontal = orientation === 'horizontal'
      const isGrid       = orientation === 'grid'

      switch (e.key) {
        case 'ArrowDown':
          if (isVertical || isGrid) {
            e.preventDefault()
            moveFocus(items, index, isGrid ? columns : 1)
          }
          break

        case 'ArrowUp':
          if (isVertical || isGrid) {
            e.preventDefault()
            moveFocus(items, index, isGrid ? -columns : -1)
          }
          break

        case 'ArrowRight':
          if (isHorizontal || isGrid) {
            e.preventDefault()
            moveFocus(items, index, 1)
          }
          break

        case 'ArrowLeft':
          if (isHorizontal || isGrid) {
            e.preventDefault()
            moveFocus(items, index, -1)
          }
          break

        case 'Home':
          e.preventDefault()
          items[0]?.focus()
          break

        case 'End':
          e.preventDefault()
          items[items.length - 1]?.focus()
          break

        default:
          // Type-ahead : aller au premier item commençant par la lettre tapée
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const char  = e.key.toLowerCase()
            const start = index + 1
            const found = [
              ...items.slice(start),
              ...items.slice(0, start),
            ].find(el => el.textContent?.trim().toLowerCase().startsWith(char))
            found?.focus()
          }
          break
      }
    }

    container.addEventListener('keydown', handler)
    return () => container.removeEventListener('keydown', handler)
  }, [ref, orientation, loop, selector, columns])
}

export default useKeyboardNav
