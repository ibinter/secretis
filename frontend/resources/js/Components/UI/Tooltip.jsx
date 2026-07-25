import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Tooltip({
  children,
  content,
  placement = 'top',
  delay     = 300,
  disabled  = false,
}) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos]         = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const timerRef   = useRef(null)

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay)
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const offsets = {
      top:    { top: rect.top  - 8,           left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + 8,          left: rect.left + rect.width / 2 },
      left:   { top: rect.top  + rect.height / 2, left: rect.left  - 8 },
      right:  { top: rect.top  + rect.height / 2, left: rect.right + 8 },
    }
    setPos(offsets[placement] ?? offsets.top)
  }

  const hide = () => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  if (disabled || !content) return children

  const TRANSLATE = {
    top:    '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left:   '-translate-x-full -translate-y-1/2',
    right:  '-translate-y-1/2',
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex"
      >
        {children}
      </span>
      {visible && createPortal(
        <div
          className={`fixed z-[9999] px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900/95 dark:bg-gray-700 rounded-lg shadow-lg pointer-events-none whitespace-nowrap max-w-[200px] ${TRANSLATE[placement] ?? TRANSLATE.top}`}
          style={{ top: pos.top, left: pos.left }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
export { Tooltip };
