import React from 'react'
import { Loader2 } from 'lucide-react'

export default function Spinner({ size = 24, className = '', label = 'Chargement...' }) {
  return (
    <span role="status" aria-label={label} className={`inline-flex ${className}`}>
      <Loader2 size={size} className="animate-spin text-[#7e22ce]" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
export { Spinner };
