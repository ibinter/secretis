/**
 * IBIG SECRETIS — AccessibleForm.jsx
 * Wrapper de formulaire WCAG 2.1 AA compliant
 *
 * Conformité :
 *   - Chaque <input> a son <label> associé via htmlFor/id (criterion 1.3.1)
 *   - Messages d'erreur via aria-describedby (criterion 1.3.1 + 3.3.1)
 *   - Champs requis : aria-required="true" + indicateur visuel * (criterion 3.3.2)
 *   - Focus visible : ring 3px #F39C12 (criterion 2.4.7)
 *   - aria-invalid="true" sur les champs en erreur (criterion 1.3.1)
 *   - role="alert" sur les messages d'erreur (criterion 4.1.3)
 *   - Groupes : fieldset + legend (criterion 1.3.1)
 *   - Mode sombre complet
 */

import React, { useId, forwardRef, useCallback } from 'react';

// ─── Classes de base ──────────────────────────────────────────────────────────
const INPUT_BASE = `
  w-full rounded-lg border transition-all duration-150 text-sm
  bg-white dark:bg-[#162230]
  text-gray-900 dark:text-[#E8F1FA]
  placeholder-gray-400 dark:placeholder-[#6B8BA4]
  outline-none
  focus:ring-2 focus:ring-[#F39C12] focus:ring-offset-0
  focus:border-[#F39C12] dark:focus:border-[#F39C12]
  disabled:opacity-50 disabled:cursor-not-allowed
  disabled:bg-gray-50 dark:disabled:bg-[#0F1923]
`;

const INPUT_VALID = `
  border-gray-300 dark:border-[#2A3F55]
  hover:border-gray-400 dark:hover:border-[#3A5570]
`;

const INPUT_ERROR = `
  border-red-500 dark:border-[#eb5757]
  focus:ring-red-400 dark:focus:ring-red-500/40
  focus:border-red-500 dark:focus:border-[#eb5757]
  bg-red-50 dark:bg-[#2b0d0d]
`;

const INPUT_SUCCESS = `
  border-green-500 dark:border-[#27ae60]
  focus:ring-green-400 dark:focus:ring-green-500/40
`;

// ─── FormField ────────────────────────────────────────────────────────────────
/**
 * Conteneur de champ avec label, description, message d'erreur
 *
 * @param {string}  props.label        — Libellé du champ
 * @param {string}  props.id           — ID du champ (associé au label)
 * @param {boolean} props.required     — Champ obligatoire
 * @param {string}  props.description  — Texte d'aide sous le label
 * @param {string}  props.error        — Message d'erreur
 * @param {string}  props.success      — Message de succès
 * @param {boolean} props.hideLabel    — Masquer le label visuellement
 * @param {node}    props.children     — Le champ input
 * @param {string}  props.className
 */
export function FormField({
  label,
  id,
  required    = false,
  description,
  error,
  success,
  hideLabel   = false,
  children,
  className   = '',
}) {
  const uid     = useId();
  const fieldId = id || uid;
  const descId  = description ? `${fieldId}-desc`    : undefined;
  const errId   = error       ? `${fieldId}-error`   : undefined;
  const succId  = success     ? `${fieldId}-success`  : undefined;

  // Injecter les props d'accessibilité sur le premier enfant
  const enhancedChild = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const ids = [descId, errId, succId].filter(Boolean).join(' ') || undefined;
    return React.cloneElement(child, {
      id:               fieldId,
      'aria-required':  required,
      'aria-invalid':   !!error,
      'aria-describedby': ids,
      ...(child.props),           // les props explicites ont priorité
      id:               child.props.id || fieldId,
      'aria-required':  child.props['aria-required'] ?? required,
      'aria-invalid':   child.props['aria-invalid'] ?? !!error,
      'aria-describedby': child.props['aria-describedby'] || ids,
    });
  });

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* ── Label ──────────────────────────────────────────────────────── */}
      {label && (
        <label
          htmlFor={fieldId}
          className={`
            block text-sm font-medium leading-tight
            text-gray-700 dark:text-[#A8C0D6]
            ${hideLabel ? 'sr-only' : ''}
          `}
        >
          {label}
          {required && (
            <span
              className="ml-1 text-red-500 dark:text-[#eb5757] font-bold"
              aria-hidden="true"
              title="Champ obligatoire"
            >
              *
            </span>
          )}
        </label>
      )}

      {/* ── Description ────────────────────────────────────────────────── */}
      {description && (
        <p id={descId} className="text-xs text-gray-500 dark:text-[#6B8BA4]">
          {description}
        </p>
      )}

      {/* ── Champ ──────────────────────────────────────────────────────── */}
      {enhancedChild}

      {/* ── Message d'erreur (annonce immédiate) ─────────────────────── */}
      {error && (
        <p
          id={errId}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-1.5 text-xs text-red-600 dark:text-[#eb5757] mt-0.5"
        >
          <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {/* ── Message de succès ───────────────────────────────────────────── */}
      {success && !error && (
        <p
          id={succId}
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-green-600 dark:text-[#27ae60] mt-0.5"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd" />
          </svg>
          <span>{success}</span>
        </p>
      )}
    </div>
  );
}

// ─── Input accessible ─────────────────────────────────────────────────────────
/**
 * @param {string}   props.type       — type HTML (text, email, password, number, tel…)
 * @param {string}   props.label      — libellé
 * @param {string}   props.name       — name de l'input
 * @param {string}   props.id
 * @param {boolean}  props.required
 * @param {string}   props.error      — message d'erreur
 * @param {string}   props.success    — message de succès
 * @param {string}   props.description— texte d'aide
 * @param {boolean}  props.hideLabel
 * @param {string}   props.size       — 'sm' | 'md' | 'lg'
 * @param {string}   props.className  — classes du conteneur
 * @param {string}   props.inputClassName — classes de l'input
 * @param {node}     props.prefix     — contenu avant l'input
 * @param {node}     props.suffix     — contenu après l'input
 */
export const AccessibleInput = forwardRef(function AccessibleInput(
  {
    type          = 'text',
    label,
    name,
    id,
    required      = false,
    error,
    success,
    description,
    hideLabel     = false,
    size          = 'md',
    className     = '',
    inputClassName= '',
    prefix,
    suffix,
    ...rest
  },
  ref
) {
  const uid     = useId();
  const fieldId = id || `input-${uid}`;
  const descId  = description ? `${fieldId}-desc`  : undefined;
  const errId   = error       ? `${fieldId}-error` : undefined;
  const succId  = success     ? `${fieldId}-succ`  : undefined;

  const describedBy = [descId, errId, succId].filter(Boolean).join(' ') || undefined;

  const sizes = {
    sm: 'h-8  px-3 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
  };

  const inputEl = (
    <input
      ref={ref}
      type={type}
      id={fieldId}
      name={name}
      aria-required={required}
      aria-invalid={!!error}
      aria-describedby={describedBy}
      className={`
        ${INPUT_BASE}
        ${sizes[size] || sizes.md}
        ${error ? INPUT_ERROR : success ? INPUT_SUCCESS : INPUT_VALID}
        ${prefix ? 'rounded-l-none' : ''}
        ${suffix ? 'rounded-r-none' : ''}
        ${inputClassName}
      `}
      {...rest}
    />
  );

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={`block text-sm font-medium text-gray-700 dark:text-[#A8C0D6] ${hideLabel ? 'sr-only' : ''}`}>
          {label}
          {required && <span className="ml-1 text-red-500 dark:text-[#eb5757]" aria-hidden="true">*</span>}
        </label>
      )}

      {description && (
        <p id={descId} className="text-xs text-gray-500 dark:text-[#6B8BA4]">{description}</p>
      )}

      {prefix || suffix ? (
        <div className="flex">
          {prefix && (
            <span className="flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-[#2A3F55] bg-gray-50 dark:bg-[#243447] text-gray-500 dark:text-[#6B8BA4] text-sm">
              {prefix}
            </span>
          )}
          {inputEl}
          {suffix && (
            <span className="flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 dark:border-[#2A3F55] bg-gray-50 dark:bg-[#243447] text-gray-500 dark:text-[#6B8BA4] text-sm">
              {suffix}
            </span>
          )}
        </div>
      ) : inputEl}

      {error && (
        <p id={errId} role="alert" aria-live="assertive" className="flex items-start gap-1.5 text-xs text-red-600 dark:text-[#eb5757]">
          <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {success && !error && (
        <p id={succId} role="status" aria-live="polite" className="text-xs text-green-600 dark:text-[#27ae60]">{success}</p>
      )}
    </div>
  );
});

// ─── Textarea accessible ──────────────────────────────────────────────────────
export const AccessibleTextarea = forwardRef(function AccessibleTextarea(
  { label, id, required = false, error, description, rows = 4, className = '', textareaClassName = '', hideLabel = false, ...rest },
  ref
) {
  const uid     = useId();
  const fieldId = id || `textarea-${uid}`;
  const descId  = description ? `${fieldId}-desc`  : undefined;
  const errId   = error       ? `${fieldId}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={`block text-sm font-medium text-gray-700 dark:text-[#A8C0D6] ${hideLabel ? 'sr-only' : ''}`}>
          {label}{required && <span className="ml-1 text-red-500 dark:text-[#eb5757]" aria-hidden="true">*</span>}
        </label>
      )}
      {description && <p id={descId} className="text-xs text-gray-500 dark:text-[#6B8BA4]">{description}</p>}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={[descId, errId].filter(Boolean).join(' ') || undefined}
        className={`
          ${INPUT_BASE} py-2.5 px-3 resize-y
          ${error ? INPUT_ERROR : INPUT_VALID}
          ${textareaClassName}
        `}
        {...rest}
      />
      {error && (
        <p id={errId} role="alert" aria-live="assertive" className="flex items-start gap-1.5 text-xs text-red-600 dark:text-[#eb5757]">
          <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

// ─── Checkbox / Radio accessibles ────────────────────────────────────────────
export const AccessibleCheckbox = forwardRef(function AccessibleCheckbox(
  { label, id, description, error, className = '', checkboxClassName = '', ...rest },
  ref
) {
  const uid     = useId();
  const fieldId = id || `check-${uid}`;
  const descId  = description ? `${fieldId}-desc`  : undefined;
  const errId   = error       ? `${fieldId}-error` : undefined;

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="flex items-center h-5 mt-0.5">
        <input
          ref={ref}
          type="checkbox"
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={[descId, errId].filter(Boolean).join(' ') || undefined}
          className={`
            w-4 h-4 rounded border-gray-300 dark:border-[#2A3F55]
            text-purple-600 dark:text-purple-500
            bg-white dark:bg-[#162230]
            focus:ring-2 focus:ring-[#F39C12] focus:ring-offset-0
            cursor-pointer
            ${checkboxClassName}
          `}
          {...rest}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-gray-700 dark:text-[#A8C0D6] cursor-pointer">
            {label}
          </label>
        )}
        {description && <p id={descId} className="text-xs text-gray-500 dark:text-[#6B8BA4]">{description}</p>}
        {error && (
          <p id={errId} role="alert" aria-live="assertive" className="text-xs text-red-600 dark:text-[#eb5757]">{error}</p>
        )}
      </div>
    </div>
  );
});

// ─── Fieldset / Groupe de champs ──────────────────────────────────────────────
/**
 * Groupe de champs avec légende visible pour les screen readers
 */
export function AccessibleFieldset({ legend, hideLegend = false, children, className = '', description }) {
  const uid    = useId();
  const descId = description ? `fieldset-desc-${uid}` : undefined;

  return (
    <fieldset
      aria-describedby={descId}
      className={`border border-gray-200 dark:border-[#2A3F55] rounded-xl p-4 ${className}`}
    >
      <legend className={`px-2 text-sm font-semibold text-gray-900 dark:text-[#E8F1FA] ${hideLegend ? 'sr-only' : ''}`}>
        {legend}
      </legend>
      {description && (
        <p id={descId} className="text-xs text-gray-500 dark:text-[#6B8BA4] mb-3">{description}</p>
      )}
      {children}
    </fieldset>
  );
}

// ─── Formulaire global ────────────────────────────────────────────────────────
/**
 * Wrapper de formulaire avec gestion des erreurs globales
 *
 * @param {string}   props.title        — Titre du formulaire
 * @param {string}   props.description  — Description du formulaire
 * @param {string}   props.globalError  — Message d'erreur global (ex: "Vérifiez les champs")
 * @param {Function} props.onSubmit
 * @param {node}     props.children
 * @param {string}   props.className
 * @param {string}   props.submitLabel  — Texte du bouton submit
 * @param {boolean}  props.loading      — Désactive le bouton et affiche un loader
 * @param {Function} props.onCancel     — Si fourni, affiche un bouton annuler
 * @param {string}   props.cancelLabel
 */
export default function AccessibleForm({
  title,
  description,
  globalError,
  onSubmit,
  children,
  className   = '',
  submitLabel = 'Enregistrer',
  loading     = false,
  onCancel,
  cancelLabel = 'Annuler',
  noActions   = false,
}) {
  const uid      = useId();
  const titleId  = title       ? `form-title-${uid}`   : undefined;
  const descId   = description ? `form-desc-${uid}`    : undefined;
  const errId    = globalError ? `form-error-${uid}`   : undefined;

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit?.(e);
  }, [onSubmit]);

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={titleId}
      aria-describedby={[descId, errId].filter(Boolean).join(' ') || undefined}
      noValidate
      className={`flex flex-col gap-5 ${className}`}
    >
      {/* ── En-tête du formulaire ─────────────────────────────────────── */}
      {(title || description) && (
        <div>
          {title && (
            <h2 id={titleId} className="text-lg font-bold text-gray-900 dark:text-[#E8F1FA]">
              {title}
            </h2>
          )}
          {description && (
            <p id={descId} className="mt-1 text-sm text-gray-600 dark:text-[#A8C0D6]">
              {description}
            </p>
          )}
        </div>
      )}

      {/* ── Erreur globale ───────────────────────────────────────────── */}
      {globalError && (
        <div
          id={errId}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 p-4 rounded-xl
            bg-red-50 dark:bg-[#2b0d0d]
            border border-red-200 dark:border-[#a23024]
            text-red-700 dark:text-[#eb5757]
            text-sm"
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{globalError}</span>
        </div>
      )}

      {/* ── Contenu ──────────────────────────────────────────────────── */}
      {children}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      {!noActions && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            aria-disabled={loading}
            className="
              flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-[#7e22ce] hover:bg-[#1A6DA0] dark:bg-[#7e22ce] dark:hover:bg-[#1A6DA0]
              focus:outline-none focus:ring-2 focus:ring-[#F39C12] focus:ring-offset-2
              dark:focus:ring-offset-[#1E2D40]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150
            "
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'En cours…' : submitLabel}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="
                px-6 py-2.5 rounded-xl text-sm font-semibold
                border-2 border-gray-200 dark:border-[#2A3F55]
                text-gray-700 dark:text-[#A8C0D6]
                hover:bg-gray-50 dark:hover:bg-[#243447]
                focus:outline-none focus:ring-2 focus:ring-[#F39C12] focus:ring-offset-2
                dark:focus:ring-offset-[#1E2D40]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
              "
            >
              {cancelLabel}
            </button>
          )}
        </div>
      )}
    </form>
  );
}

// ─── Re-exports ───────────────────────────────────────────────────────────────
export { FormField as Field };
export { AccessibleForm };
