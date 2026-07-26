/**
 * IBIG SECRETIS — useFocusTrap.js
 * Hook qui piège le focus dans un élément (modaux, drawers, panels).
 *
 * - Gère Tab + Shift+Tab cycliques
 * - Restaure le focus à l'élément ayant déclenché l'ouverture
 * - Compatible avec les portals React (createPortal)
 *
 * @example
 *   const { trapRef } = useFocusTrap({
 *     active: isOpen,
 *     onEscape: () => setOpen(false),
 *   });
 *
 *   return <div ref={trapRef}>...</div>;
 */

import { useRef, useEffect, useCallback } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]:not([disabled])',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'details > summary',
  'audio[controls]',
  'video[controls]',
].join(', ');

export function useFocusTrap({
  active       = true,
  onEscape,
  initialFocus, // sélecteur ou ref de l'élément à focaliser en premier
  returnFocus  = true, // restaurer le focus à la fermeture
} = {}) {
  const trapRef          = useRef(null);
  const previousFocusRef = useRef(null);
  const cleanupRef       = useRef(null);

  // Obtenir tous les éléments focusables dans le conteneur
  const getFocusables = useCallback(() => {
    if (!trapRef.current) return [];
    return Array.from(trapRef.current.querySelectorAll(FOCUSABLE_SELECTORS))
      .filter(el => {
        if (el.closest('[hidden]')) return false;
        if (el.closest('[aria-hidden="true"]')) return false;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape?.();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusables = getFocusables();
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      // Shift+Tab : aller vers l'arrière
      if (active === first || !trapRef.current?.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab : aller vers l'avant
      if (active === last || !trapRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [getFocusables, onEscape]);

  // Activation / désactivation du piège
  useEffect(() => {
    if (!active || !trapRef.current) return;

    // Sauvegarder le focus actuel
    previousFocusRef.current = document.activeElement;

    // Focus initial
    const setInitialFocus = () => {
      if (!trapRef.current) return;

      // Essayer l'élément initial personnalisé
      if (initialFocus) {
        const el = typeof initialFocus === 'string'
          ? trapRef.current.querySelector(initialFocus)
          : initialFocus?.current;
        if (el) { el.focus(); return; }
      }

      // Sinon, trouver le premier autofocus
      const autoFocus = trapRef.current.querySelector('[autofocus]');
      if (autoFocus) { autoFocus.focus(); return; }

      // Sinon, le premier focusable
      const focusables = getFocusables();
      if (focusables.length > 0) focusables[0].focus();
    };

    // Délai pour les animations d'entrée
    const focusTimer = requestAnimationFrame(setInitialFocus);

    // Attacher le listener
    document.addEventListener('keydown', handleKeyDown, true);

    // Prevent focus leaving the trap by watching focusin events
    const handleFocusIn = (e) => {
      if (trapRef.current && !trapRef.current.contains(e.target)) {
        const focusables = getFocusables();
        if (focusables.length > 0) focusables[0].focus();
      }
    };
    document.addEventListener('focusin', handleFocusIn);

    cleanupRef.current = () => {
      cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn);
    };

    return () => {
      cleanupRef.current?.();

      // Restaurer le focus
      if (returnFocus && previousFocusRef.current) {
        requestAnimationFrame(() => {
          previousFocusRef.current?.focus?.();
        });
      }
    };
  }, [active, handleKeyDown, getFocusables, initialFocus, returnFocus]);

  return {
    trapRef,
    getFocusables,
  };
}

export default useFocusTrap;
