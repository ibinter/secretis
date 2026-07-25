import React, { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { announceToScreenReader } from '../../utils/accessibility'
import { useFocusTrap } from '../../hooks/useFocusTrap'

const SIZE_CLASSES = {
  sm:   'max-w-md',
  md:   'max-w-xl',
  lg:   'max-w-3xl',
  xl:   'max-w-5xl',
  full: 'max-w-[95vw] h-[90vh]',
}

export default function Modal({
  open      = false,
  onClose,
  title,
  description,
  children,
  footer,
  size      = 'md',
  closeOnOverlay = true,
  closeOnEsc     = true,
  className = '',
}) {
  const uid        = useId()
  const titleId    = `modal-title-${uid}`
  const descId     = `modal-desc-${uid}`
  const overlayRef = useRef(null)

  // Focus trap via hook (gère Tab/Shift+Tab + Échap + retour focus)
  const { trapRef } = useFocusTrap({
    active:      open,
    onEscape:    closeOnEsc ? onClose : undefined,
    returnFocus: true,
  })

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Annonce d'ouverture aux lecteurs d'écran
  useEffect(() => {
    if (open && title) {
      announceToScreenReader(`Dialogue ouvert : ${title}`, 'assertive')
    }
  }, [open, title])

  if (!open) return null

  const content = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (closeOnOverlay && e.target === overlayRef.current) onClose?.() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" aria-hidden="true" />

      {/* Panel — focus trap ici */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title       ? titleId : undefined}
        aria-describedby={description ? descId  : undefined}
        className={[
          'relative w-full bg-white dark:bg-[#162032] rounded-2xl shadow-2xl flex flex-col',
          'animate-in zoom-in-95 fade-in duration-200',
          SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
          size === 'full' ? 'overflow-hidden' : 'max-h-[90vh]',
          className,
        ].join(' ')}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1E3048] shrink-0">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#9333EA] focus:ring-offset-1"
                aria-label="Fermer la boîte de dialogue"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Description (SR) */}
        {description && (
          <p id={descId} className="sr-only">{description}</p>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#1E3048] bg-gray-50/50 dark:bg-[#0F1923]/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
export { Modal };
