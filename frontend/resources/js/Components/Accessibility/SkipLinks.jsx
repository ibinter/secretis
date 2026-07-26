/**
 * IBIG SECRETIS — SkipLinks.jsx
 * Liens de saut WCAG 2.1 — 2.4.1 Bypass Blocks (Niveau A).
 *
 * Invisibles au rendu normal, apparaissent sur focus clavier.
 * À placer en tout premier enfant du <body> ou du layout racine.
 *
 * @example
 *   <SkipLinks />
 *   <Header />
 *   <main id="main-content">…</main>
 */

import React from 'react'

const LINKS = [
  { href: '#main-content', label: 'Aller au contenu principal' },
  { href: '#sidebar-nav',  label: 'Aller à la navigation'      },
  { href: '#footer',       label: 'Aller au pied de page'      },
]

export default function SkipLinks() {
  return (
    <nav aria-label="Liens de navigation rapide" className="sr-only focus-within:not-sr-only">
      <ul className="fixed top-0 left-0 z-[9999] flex flex-col gap-1 p-2 list-none m-0">
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <a
              href={href}
              data-testid="skip-to-content"
              className={[
                // Invisible par défaut, visible sur focus
                'block px-4 py-2.5 rounded-lg text-sm font-semibold text-white',
                'bg-[#F39C12] shadow-lg',
                // Focus visible
                'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#F39C12]',
                // Transition de sortie du sr-only
                'translate-y-0 transition-transform',
              ].join(' ')}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
export { SkipLinks };
