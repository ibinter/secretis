import React, { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'

const FormInput = forwardRef(function FormInput({
  label,
  id,
  error,
  hint,
  required,
  prefix,
  suffix,
  className = '',
  inputClass= '',
  as        = 'input',
  ...props
}, ref) {
  const Tag = as
  const hasError = Boolean(error)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-[#C0392B] ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex items-stretch">
        {prefix && (
          <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-[#0F1923] text-gray-500 dark:text-gray-400 text-sm">
            {prefix}
          </span>
        )}

        <Tag
          ref={ref}
          id={id}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={[
            'flex-1 px-3 py-2 text-sm border rounded-lg transition-shadow',
            'bg-white dark:bg-[#0F1923] text-gray-900 dark:text-white',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2',
            prefix ? 'rounded-l-none' : '',
            suffix ? 'rounded-r-none' : '',
            hasError
              ? 'border-[#C0392B] focus:ring-[#C0392B]/30'
              : 'border-gray-300 dark:border-gray-600 focus:ring-[#2E86C1]/30 focus:border-[#2E86C1]',
            as === 'textarea' ? 'min-h-[100px] resize-y' : 'h-10',
            inputClass,
          ].filter(Boolean).join(' ')}
          {...props}
        />

        {suffix && (
          <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg bg-gray-50 dark:bg-[#0F1923] text-gray-500 dark:text-gray-400 text-sm">
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1 text-xs text-[#C0392B]" role="alert">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  )
})

export default FormInput
