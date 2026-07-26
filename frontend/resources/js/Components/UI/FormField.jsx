/**
 * IBIG SECRETIS — FormField.jsx
 * Champ de formulaire accessible — WCAG 2.1 AA
 *
 * Conformité :
 *   - Label associé via htmlFor/id (criterion 1.3.1, 4.1.2)
 *   - Description/aide via aria-describedby (criterion 1.3.1)
 *   - Erreur via aria-describedby + aria-invalid (criterion 3.3.1, 3.3.2)
 *   - État requis via aria-required (criterion 3.3.2)
 *   - Focus visible (outline WCAG AA) (criterion 2.4.7)
 *   - Mode sombre complet
 *
 * @example
 *   <FormField
 *     label="Adresse email"
 *     id="email"
 *     type="email"
 *     required
 *     error="Format invalide"
 *     description="Nous n'enverrons pas de spam."
 *   />
 */

import React, { forwardRef, useId } from 'react';

// ─── Icône erreur ─────────────────────────────────────────────────────────────
const ErrorIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
      clipRule="evenodd" />
  </svg>
);

const SuccessIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd" />
  </svg>
);

// ─── Composant principal ──────────────────────────────────────────────────────
const FormField = forwardRef(function FormField({
  // Champ
  id,
  name,
  type        = 'text',
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  disabled    = false,
  readOnly    = false,
  autoComplete,
  maxLength,
  minLength,
  min,
  max,
  pattern,
  rows,           // pour textarea

  // Labels et descriptions
  label,
  labelHidden = false,
  description,
  hint,           // alias de description

  // Validation
  required    = false,
  error,
  success,    // message de succès

  // Style
  size        = 'md',
  className   = '',
  inputClassName = '',
  labelClassName = '',
  wrapperClassName = '',

  // Rendu personnalisé
  prefix,     // élément avant l'input (icône, texte…)
  suffix,     // élément après l'input
  children,   // contenu custom (select, etc.)

  // Autres
  autoFocus,
  inputMode,
  'data-testid': testId,
  ...rest
}, ref) {
  const reactId     = useId();
  const fieldId     = id || `field-${reactId}`;
  const descId      = (description || hint) ? `${fieldId}-desc`    : undefined;
  const errorId     = error                  ? `${fieldId}-error`   : undefined;
  const successId   = success                ? `${fieldId}-success` : undefined;

  const describedBy = [descId, errorId, successId].filter(Boolean).join(' ') || undefined;

  const sizes = {
    sm: 'h-8  text-xs  px-2.5',
    md: 'h-10 text-sm  px-3',
    lg: 'h-12 text-base px-4',
  };

  const baseInputClass = `
    w-full rounded-lg border transition-all outline-none
    bg-white dark:bg-[#162230]
    text-gray-900 dark:text-[#E8F1FA]
    placeholder-gray-400 dark:placeholder-[#6B8BA4]
    disabled:opacity-50 disabled:cursor-not-allowed
    read-only:bg-gray-50 dark:read-only:bg-[#0F1923]
    ${error
      ? 'border-red-500 dark:border-[#a23024] focus:ring-2 focus:ring-red-200 dark:focus:ring-[#a23024]/30 focus:border-red-500 dark:focus:border-[#a23024]'
      : success
      ? 'border-green-500 dark:border-[#1a7040] focus:ring-2 focus:ring-green-200 dark:focus:ring-[#1a7040]/30 focus:border-green-500 dark:focus:border-[#1a7040]'
      : 'border-gray-200 dark:border-[#2A3F55] focus:ring-2 focus:ring-purple-200 dark:focus:ring-[#7e22ce]/30 focus:border-purple-500 dark:focus:border-[#7e22ce]'
    }
    ${type === 'textarea' ? 'py-2.5 resize-y' : sizes[size] || sizes.md}
    ${prefix ? 'pl-9' : ''}
    ${suffix || error || success ? 'pr-9' : ''}
    ${inputClassName}
  `.trim().replace(/\s+/g, ' ');

  const commonProps = {
    ref,
    id: fieldId,
    name: name || fieldId,
    disabled,
    readOnly,
    required,
    autoFocus,
    autoComplete,
    maxLength,
    minLength,
    placeholder,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    'aria-required':    required    ? 'true'    : undefined,
    'aria-invalid':     error       ? 'true'    : undefined,
    'aria-describedby': describedBy,
    'aria-disabled':    disabled    ? 'true'    : undefined,
    'data-testid':      testId,
    className: baseInputClass,
    ...rest,
  };

  const renderInput = () => {
    if (children) return children;

    if (type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          rows={rows || 4}
        />
      );
    }

    return (
      <input
        {...commonProps}
        type={type}
        min={min}
        max={max}
        pattern={pattern}
        inputMode={inputMode}
      />
    );
  };

  return (
    <div className={`w-full ${wrapperClassName}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={fieldId}
          className={`
            block text-sm font-medium mb-1
            text-gray-700 dark:text-[#A8C0D6]
            ${labelHidden ? 'sr-only' : ''}
            ${labelClassName}
          `}
        >
          {label}
          {required && (
            <span
              className="ml-1 text-red-500 dark:text-[#eb5757]"
              aria-hidden="true"
              title="Champ obligatoire"
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Description / aide */}
      {(description || hint) && (
        <p
          id={descId}
          className="text-xs text-gray-500 dark:text-[#6B8BA4] mb-1.5"
        >
          {description || hint}
        </p>
      )}

      {/* Input wrapper */}
      <div className={`relative ${className}`}>
        {/* Préfixe */}
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2
            text-gray-400 dark:text-[#6B8BA4] pointer-events-none z-10"
            aria-hidden="true"
          >
            {prefix}
          </div>
        )}

        {renderInput()}

        {/* Suffixe / indicateur d'état */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true">
          {error   && <span className="text-red-500 dark:text-[#eb5757]"><ErrorIcon /></span>}
          {success && !error && <span className="text-green-500 dark:text-[#6fcf97]"><SuccessIcon /></span>}
          {suffix  && !error && !success && suffix}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-1.5 text-xs text-red-600 dark:text-[#eb5757] flex items-start gap-1.5"
        >
          <ErrorIcon />
          {error}
        </p>
      )}

      {/* Succès */}
      {success && !error && (
        <p
          id={successId}
          aria-live="polite"
          className="mt-1.5 text-xs text-green-600 dark:text-[#6fcf97] flex items-center gap-1.5"
        >
          <SuccessIcon />
          {success}
        </p>
      )}
    </div>
  );
});

export default FormField;

// ─── Composants spécialisés dérivés ──────────────────────────────────────────

/**
 * Champ de saisie de texte
 */
export const TextField = forwardRef((props, ref) => (
  <FormField ref={ref} type="text" {...props} />
));

/**
 * Zone de texte
 */
export const TextareaField = forwardRef((props, ref) => (
  <FormField ref={ref} type="textarea" {...props} />
));

/**
 * Champ email
 */
export const EmailField = forwardRef((props, ref) => (
  <FormField
    ref={ref}
    type="email"
    autoComplete="email"
    inputMode="email"
    {...props}
  />
));

/**
 * Champ mot de passe
 */
export const PasswordField = forwardRef(({ showToggle = true, ...props }, ref) => {
  const [show, setShow] = React.useState(false);
  return (
    <FormField
      ref={ref}
      type={show ? 'text' : 'password'}
      autoComplete={props.autoComplete || 'current-password'}
      suffix={showToggle ? (
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={show}
          className="pointer-events-auto text-gray-400 dark:text-[#6B8BA4]
            hover:text-gray-700 dark:hover:text-[#A8C0D6] transition-colors"
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      ) : undefined}
      {...props}
    />
  );
});
