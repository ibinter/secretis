/**
 * IBIG SECRETIS — AccessibleSelect.jsx
 * Dropdown custom accessible — WCAG 2.1 AA
 *
 * Conformité :
 *   - role="combobox" + aria-expanded + aria-haspopup (criterion 4.1.2)
 *   - aria-activedescendant pour l'élément actif
 *   - Navigation clavier : Flèches, Enter, Escape, Home, End
 *   - Type-ahead : frappe rapide de lettre pour filtrer
 *   - Compatible NVDA, VoiceOver, JAWS
 *   - Mode sombre complet
 */

import React, {
  useState, useRef, useEffect, useId, useCallback, forwardRef,
} from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { generateId, announceToScreenReader } from '@/utils/accessibility';
import useKeyboardNavigation from '@/hooks/useKeyboardNavigation';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const ChevronDown = ({ open }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd" />
  </svg>
);

// ─── Composant principal ──────────────────────────────────────────────────────
/**
 * @param {Object} props
 * @param {Array}  props.options       — [{ value, label, disabled?, group? }]
 * @param {*}      props.value         — valeur sélectionnée
 * @param {Function} props.onChange    — (value, option) => void
 * @param {string} props.placeholder   — texte par défaut
 * @param {string} props.label         — label visible (ou aria-label si labelHidden)
 * @param {boolean} props.labelHidden  — masquer le label visuellement
 * @param {string} props.id            — id pour l'association label-input
 * @param {boolean} props.disabled
 * @param {boolean} props.required
 * @param {string} props.error         — message d'erreur
 * @param {string} props.description   — texte d'aide
 * @param {boolean} props.searchable   — activer la recherche interne
 * @param {string} props.className
 */
const AccessibleSelect = forwardRef(function AccessibleSelect({
  options       = [],
  value,
  onChange,
  placeholder   = 'Sélectionner…',
  label,
  labelHidden   = false,
  id,
  disabled      = false,
  required      = false,
  error,
  description,
  searchable    = false,
  className     = '',
  size          = 'md',
}, ref) {
  const uniqueId    = useRef(generateId('select')).current;
  const selectId    = id || uniqueId;
  const listboxId   = `${selectId}-listbox`;
  const descId      = description ? `${selectId}-desc` : undefined;
  const errorId     = error       ? `${selectId}-error` : undefined;

  const [open, setOpen]               = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef                  = useRef(null);
  const inputRef                      = useRef(null);
  const searchRef                     = useRef(null);
  const optionRefs                    = useRef([]);

  // Filtrer les options
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt =>
        !opt.disabled &&
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => opt.value === value);

  // Navigation clavier
  const currentIndex = filteredOptions.findIndex(opt => opt.value === value);
  const { activeIndex, setActiveIndex, handleKeyDown: navKeyDown } = useKeyboardNavigation({
    items:    filteredOptions,
    onSelect: (item) => {
      if (!item.disabled) {
        onChange?.(item.value, item);
        announceToScreenReader(`${item.label} sélectionné`);
        setOpen(false);
        inputRef.current?.focus();
      }
    },
    onClose:  () => { setOpen(false); inputRef.current?.focus(); },
    defaultIndex: currentIndex,
    disabled: !open,
  });

  // Fermer sur clic extérieur
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Focus sur l'option active
  useEffect(() => {
    if (open && activeIndex >= 0 && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  // Reset search on close
  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  // Focus sur la recherche à l'ouverture
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else if (open && currentIndex >= 0) {
      setActiveIndex(currentIndex);
    }
  }, [open, searchable, currentIndex, setActiveIndex]);

  const handleTriggerKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setOpen(true);
        break;
      default:
        break;
    }
  };

  const sizes = {
    sm: 'h-8  text-xs px-3',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4',
  };

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={selectId}
          className={`block text-sm font-medium mb-1
            text-gray-700 dark:text-[#A8C0D6]
            ${labelHidden ? 'sr-only' : ''}`}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500 dark:text-[#eb5757]" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {/* Description */}
      {description && (
        <p id={descId} className="text-xs text-gray-500 dark:text-[#6B8BA4] mb-1">
          {description}
        </p>
      )}

      {/* Trigger (combobox) */}
      <div
        ref={(el) => {
          if (ref) ref.current = el;
          inputRef.current = el;
        }}
        id={selectId}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={open ? activeOptionId : undefined}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={[descId, errorId].filter(Boolean).join(' ') || undefined}
        aria-disabled={disabled}
        aria-label={labelHidden ? label : undefined}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={!disabled ? handleTriggerKeyDown : undefined}
        className={`
          relative flex items-center justify-between w-full
          ${sizes[size] || sizes.md}
          rounded-lg border transition-all cursor-pointer
          outline-none
          ${disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-[#0F1923] border-gray-200 dark:border-[#1F3144]'
            : error
            ? 'border-red-500 dark:border-[#a23024] bg-white dark:bg-[#162230] focus:ring-2 focus:ring-red-300 dark:focus:ring-[#a23024]/30'
            : open
            ? 'border-purple-500 dark:border-[#7e22ce] bg-white dark:bg-[#162230] ring-2 ring-purple-200 dark:ring-[#7e22ce]/30'
            : 'border-gray-200 dark:border-[#2A3F55] bg-white dark:bg-[#162230] focus:ring-2 focus:ring-purple-200 dark:focus:ring-[#7e22ce]/30 focus:border-purple-500 dark:focus:border-[#7e22ce] hover:border-gray-300 dark:hover:border-[#3A5570]'
          }
        `}
      >
        <span className={`flex-1 truncate ${
          selectedOption
            ? 'text-gray-900 dark:text-[#E8F1FA]'
            : 'text-gray-400 dark:text-[#6B8BA4]'
        }`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown open={open} />
      </div>

      {/* Listbox dropdown */}
      {open && (
        <div
          className="relative z-[300]"
          role="presentation"
        >
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label || placeholder}
            aria-multiselectable="false"
            className="absolute left-0 right-0 top-1 z-[300] max-h-60 overflow-y-auto
              rounded-xl py-1
              bg-white dark:bg-[#1E2D40]
              border border-gray-200 dark:border-[#2A3F55]
              shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.55)]
              outline-none"
            tabIndex={-1}
            onKeyDown={navKeyDown}
          >
            {/* Recherche intégrée */}
            {searchable && (
              <li role="presentation" className="px-2 py-1.5 border-b border-gray-100 dark:border-[#2A3F55]">
                <input
                  ref={searchRef}
                  type="text"
                  role="searchbox"
                  aria-label="Rechercher une option"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setOpen(false); inputRef.current?.focus(); }
                    else if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') e.stopPropagation();
                    else navKeyDown(e);
                  }}
                  placeholder="Rechercher…"
                  className="w-full text-sm px-2 py-1 rounded-md outline-none
                    bg-gray-50 dark:bg-[#162230]
                    border border-gray-200 dark:border-[#2A3F55]
                    text-gray-900 dark:text-[#E8F1FA]
                    placeholder-gray-400 dark:placeholder-[#6B8BA4]
                    focus:ring-2 focus:ring-purple-300 dark:focus:ring-[#7e22ce]/30"
                />
              </li>
            )}

            {filteredOptions.length === 0 ? (
              <li
                role="option"
                aria-selected="false"
                aria-disabled="true"
                className="px-4 py-2.5 text-sm text-gray-400 dark:text-[#6B8BA4] text-center"
              >
                Aucune option
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive   = index === activeIndex;
                const isGroupHeader = option.isGroup;

                if (isGroupHeader) {
                  return (
                    <li
                      key={`group-${option.label}`}
                      role="presentation"
                      className="px-4 py-1 text-xs font-semibold uppercase tracking-wide
                        text-gray-400 dark:text-[#6B8BA4] mt-1"
                    >
                      {option.label}
                    </li>
                  );
                }

                return (
                  <li
                    key={option.value}
                    id={`${listboxId}-option-${index}`}
                    ref={el => { optionRefs.current[index] = el; }}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange?.(option.value, option);
                        announceToScreenReader(`${option.label} sélectionné`);
                        setOpen(false);
                        inputRef.current?.focus();
                      }
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`
                      flex items-center justify-between gap-2
                      px-4 py-2.5 text-sm cursor-pointer transition-colors
                      ${option.disabled
                        ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-[#6B8BA4]'
                        : isActive
                        ? 'bg-purple-50 dark:bg-[#162230] text-purple-700 dark:text-purple-400'
                        : isSelected
                        ? 'bg-purple-50/50 dark:bg-[#162230]/50 text-purple-600 dark:text-purple-400'
                        : 'text-gray-700 dark:text-[#A8C0D6] hover:bg-gray-50 dark:hover:bg-[#243447]'
                      }
                    `}
                  >
                    <span className="flex-1">{option.label}</span>
                    {isSelected && (
                      <span className="text-purple-600 dark:text-purple-400 flex-shrink-0">
                        <CheckIcon />
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600 dark:text-[#eb5757] flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

export default AccessibleSelect;
