/**
 * IBIG SECRETIS — useKeyboardNavigation.js
 * Hook pour la navigation clavier dans les listes, tableaux, menus.
 *
 * - Flèches haut/bas (ou gauche/droite) pour naviguer
 * - Enter / Space pour sélectionner
 * - Escape pour fermer / annuler
 * - Home / End pour aller au début / fin
 * - Recherche par lettre (type-ahead)
 *
 * @example
 *   const { activeIndex, handleKeyDown, setActiveIndex } = useKeyboardNavigation({
 *     items: myItems,
 *     onSelect: (item, index) => handleSelect(item),
 *     onClose: () => setOpen(false),
 *   });
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export function useKeyboardNavigation({
  items        = [],
  onSelect,
  onClose,
  defaultIndex = -1,
  wrap         = true,
  horizontal   = false,
  typeAhead    = true,
  disabled     = false,
}) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const typeAheadTimerRef = useRef(null);
  const typeAheadQueryRef = useRef('');

  // Réinitialiser l'index quand les items changent
  useEffect(() => {
    setActiveIndex(defaultIndex);
  }, [items.length, defaultIndex]);

  const moveTo = useCallback((index) => {
    const count = items.length;
    if (count === 0) return;
    const clamped = Math.max(0, Math.min(index, count - 1));
    setActiveIndex(clamped);
  }, [items.length]);

  const moveNext = useCallback(() => {
    const count = items.length;
    if (count === 0) return;
    setActiveIndex(prev => {
      if (prev >= count - 1) return wrap ? 0 : count - 1;
      return prev + 1;
    });
  }, [items.length, wrap]);

  const movePrev = useCallback(() => {
    const count = items.length;
    if (count === 0) return;
    setActiveIndex(prev => {
      if (prev <= 0) return wrap ? count - 1 : 0;
      return prev - 1;
    });
  }, [items.length, wrap]);

  const selectCurrent = useCallback(() => {
    if (activeIndex >= 0 && activeIndex < items.length) {
      onSelect?.(items[activeIndex], activeIndex);
    }
  }, [activeIndex, items, onSelect]);

  // Type-ahead : navigation par frappe de lettre
  const handleTypeAhead = useCallback((char) => {
    if (!typeAhead || !char) return;

    clearTimeout(typeAheadTimerRef.current);
    typeAheadQueryRef.current += char.toLowerCase();

    const query = typeAheadQueryRef.current;
    const startIndex = activeIndex + 1;

    // Chercher à partir de la position actuelle (puis depuis le début)
    const findMatch = (start, end) => {
      for (let i = start; i < end; i++) {
        const item = items[i];
        const label = (
          typeof item === 'string'      ? item :
          item?.label                   ? item.label :
          item?.name                    ? item.name :
          item?.text                    ? item.text :
          String(item)
        ).toLowerCase();

        if (label.startsWith(query)) return i;
      }
      return -1;
    };

    let match = findMatch(startIndex, items.length);
    if (match === -1) match = findMatch(0, startIndex);
    if (match !== -1) setActiveIndex(match);

    typeAheadTimerRef.current = setTimeout(() => {
      typeAheadQueryRef.current = '';
    }, 500);
  }, [activeIndex, items, typeAhead]);

  const handleKeyDown = useCallback((e) => {
    if (disabled) return;

    const prevKey = horizontal ? 'ArrowLeft'  : 'ArrowUp';
    const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        e.stopPropagation();
        movePrev();
        break;

      case nextKey:
        e.preventDefault();
        e.stopPropagation();
        moveNext();
        break;

      // Navigation verticale ET horizontale supportées simultanément
      case 'ArrowUp':
        if (!horizontal) break; // déjà géré via prevKey
        e.preventDefault();
        movePrev();
        break;

      case 'ArrowDown':
        if (!horizontal) break;
        e.preventDefault();
        moveNext();
        break;

      case 'Home':
        e.preventDefault();
        moveTo(0);
        break;

      case 'End':
        e.preventDefault();
        moveTo(items.length - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        selectCurrent();
        break;

      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;

      case 'Tab':
        // Laisser le Tab passer naturellement mais fermer le menu
        onClose?.();
        break;

      default:
        // Type-ahead
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          handleTypeAhead(e.key);
        }
        break;
    }
  }, [disabled, horizontal, movePrev, moveNext, moveTo, selectCurrent, onClose, handleTypeAhead, items.length]);

  // Nettoyage
  useEffect(() => {
    return () => clearTimeout(typeAheadTimerRef.current);
  }, []);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    moveNext,
    movePrev,
    moveTo,
    selectCurrent,
  };
}

export default useKeyboardNavigation;
