/**
 * IBIG SECRETIS — useDebounce.js
 * Retarde la propagation d'une valeur changeante (recherche, resize, etc.).
 *
 * @example
 *   const [query, setQuery] = useState('')
 *   const debouncedQuery = useDebounce(query, 300)
 *
 *   useEffect(() => {
 *     if (debouncedQuery) fetchResults(debouncedQuery)
 *   }, [debouncedQuery])
 */

import { useState, useEffect } from 'react'

/**
 * @template T
 * @param {T}      value — valeur à débouncer
 * @param {number} delay — délai en ms (défaut: 300)
 * @returns {T}    valeur debouncée
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
