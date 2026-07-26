/**
 * IBIG SECRETIS — Input.jsx
 * Champ de saisie accessible (WCAG 2.1 AA).
 *
 * - label toujours présent et lié au champ (htmlFor)
 * - texte d'aide lié via aria-describedby
 * - erreur liée via aria-errormessage + aria-invalid
 * - champs requis : astérisque visible + aria-required
 * - icône d'erreur visible (⚠) + message descriptif
 * - focus visible : ring 2px couleur brand
 *
 * @example
 *   <Input
 *     label="Adresse e-mail"
 *     type="email"
 *     required
 *     hint="Utilisée pour la connexion"
 *     error={errors.email}
 *   />
 */

import React, { useId, forwardRef } from 'react'
import { AlertTriangle } from 'lucide-react'

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
}

const Input = forwardRef(function Input(
  {
    label,
    type      = 'text',
    hint,
    error,
    required  = false,
    disabled  = false,
    size      = 'md',
    id: idProp,
    className = '',
    inputClassName = '',
    prefix,        // icône ou texte avant le champ
    suffix,        // icône ou texte après le champ
    ...props
  },
  ref
) {
  const uid     = useId()
  const id      = idProp ?? `input-${uid}`
  const hintId  = hint  ? `${id}-hint`  : undefined
  const errorId = error ? `${id}-error` : undefined

  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight"
        >
          {label}
          {required && (
            <span
              aria-hidden="true"
              className="ml-1 text-[#C0392B] dark:text-red-400 font-semibold"
              title="Champ obligatoire"
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Champ + affixes */}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500" aria-hidden="true">
            {prefix}
          </div>
        )}

        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          required={required}
          aria-required={required ? 'true' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-errormessage={errorId}
          className={[
            'w-full rounded-lg border transition-colors',
            'text-gray-900 dark:text-gray-100',
            'bg-white dark:bg-[#162032]',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            // focus
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            // states
            error
              ? 'border-[#C0392B] dark:border-red-500 focus:ring-[#C0392B]/50'
              : 'border-gray-300 dark:border-gray-600 focus:border-[#9333EA] focus:ring-[#9333EA]/30',
            disabled
              ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
              : '',
            SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
            prefix ? 'pl-9' : '',
            suffix || error ? 'pr-9' : '',
            inputClassName,
          ].filter(Boolean).join(' ')}
          {...props}
        />

        {/* Icône d'erreur ou suffix */}
        {(error || suffix) && (
          <div className="absolute right-3 flex items-center pointer-events-none" aria-hidden="true">
            {error
              ? <AlertTriangle className="w-4 h-4 text-[#C0392B] dark:text-red-400" />
              : suffix
            }
          </div>
        )}
      </div>

      {/* Hint */}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {hint}
        </p>
      )}

      {/* Erreur */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-[#C0392B] dark:text-red-400 leading-relaxed flex items-center gap-1"
        >
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
