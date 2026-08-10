/**
 * IBIG SECRETIS — FocusTrap.jsx
 * Composant wrapper qui capture le focus pour les modales et drawers.
 * Délègue à useFocusTrap pour la logique (Tab cyclique, Échap, retour focus).
 *
 * @example
 *   <FocusTrap active={isOpen} onClose={() => setOpen(false)}>
 *     <div role="dialog" aria-modal="true">…</div>
 *   </FocusTrap>
 */

import React from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'

/**
 * @param {Object}  props
 * @param {boolean} props.active         — active le piège quand true
 * @param {Function} props.onClose       — appelé sur Échap
 * @param {string}  [props.initialFocus] — sélecteur CSS de l'élément à focaliser en premier
 * @param {boolean} [props.returnFocus]  — restaurer le focus à la fermeture (défaut: true)
 * @param {React.ReactNode} props.children
 * @param {string}  [props.className]
 */
export default function FocusTrap({
  active       = true,
  onClose,
  initialFocus,
  returnFocus  = true,
  children,
  className    = '',
}) {
  const { trapRef } = useFocusTrap({
    active,
    onEscape: onClose,
    initialFocus,
    returnFocus,
  })

  return (
    <div ref={trapRef} className={className || undefined}>
      {children}
    </div>
  )
}
export { FocusTrap };
