/**
 * IBIG SECRETIS — SkipNavigation.jsx
 * Lien "Aller au contenu principal" visible au focus — WCAG 2.1 AA
 *
 * Critère WCAG 2.4.1 (Bypass Blocks) — niveau A
 *
 * Positionnement :
 *   - Premier élément dans le DOM (avant tout contenu)
 *   - Invisible visuellement sauf au focus clavier
 *   - Visible avec outline WCAG AA au focus
 *
 * @example
 *   // Dans App.jsx, avant tout le reste :
 *   <SkipNavigation />
 *   <Header />
 *   <main id="main-content">...</main>
 */

import React from 'react';

export default function SkipNavigation({
  links = [
    { href: '#main-content', label: 'Aller au contenu principal' },
    { href: '#main-nav',     label: 'Aller à la navigation' },
    { href: '#search',       label: 'Aller à la recherche' },
  ],
}) {
  return (
    <nav
      aria-label="Liens de navigation rapide"
      className="fixed top-0 left-0 z-[9999]"
    >
      {links.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className="
            sr-only focus:not-sr-only
            focus:fixed focus:top-2 focus:left-2
            focus:z-[9999]
            focus:px-4 focus:py-2
            focus:rounded-lg
            focus:text-sm focus:font-semibold
            focus:bg-purple-600 focus:text-white
            dark:focus:bg-[#7e22ce] dark:focus:text-white
            focus:outline-none
            focus:ring-2 focus:ring-white focus:ring-offset-2
            focus:ring-offset-blue-600 dark:focus:ring-offset-[#7e22ce]
            focus:shadow-lg
            transition-all duration-150
          "
          onClick={(e) => {
            const target = document.querySelector(href);
            if (target) {
              e.preventDefault();
              target.setAttribute('tabindex', '-1');
              target.focus({ preventScroll: false });
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
export { SkipNavigation };
