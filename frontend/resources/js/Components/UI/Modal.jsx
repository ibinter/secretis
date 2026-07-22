import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

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
  children,
  footer,
  size      = 'md',
  closeOnOverlay = true,
  closeOnEsc     = true,
  className = '',
}) {
  const overlayRef = useRef(null)
  const panelRef   = useRef(null)

  // ESC key
  useEffect(() => {
    if (!open || !closeOnEsc) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, closeOnEsc, onClose])

  // Focus trap
  useEffect(() => {
    if (!open || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    const trap = (e) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    first?.focus()
    return () => document.removeEventListener('keydown', trap)
  }, [open])

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const content = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => { if (closeOnOverlay && e.target === overlayRef.current) onClose?.() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Panel */}
      <div
        ref={panelRef}
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
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            )}
          </div>
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
