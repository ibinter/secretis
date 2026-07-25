/**
 * SECRETIS ERP — HelpCenter/Faq.jsx
 * Page FAQ — 100 questions fréquentes
 *
 * Fonctionnalités :
 * - Accordion par catégorie
 * - Recherche dans les FAQ
 * - CTA SARA si la FAQ n'a pas répondu
 */

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// ─── Catégories de FAQ ────────────────────────────────────────────────────────
const CATEGORY_META = {
  general:                  { label: 'Général',                     emoji: '🌐' },
  connexion_securite:       { label: 'Connexion & Sécurité',        emoji: '🔐' },
  utilisateurs_permissions: { label: 'Utilisateurs & Permissions',  emoji: '👥' },
  parametres:               { label: 'Paramètres',                  emoji: '⚙️' },
  modules_metier:           { label: 'Modules métier',              emoji: '🗂️' },
  imports_exports:          { label: 'Imports & Exports',           emoji: '📤' },
  documents_impressions:    { label: 'Documents & Impressions',     emoji: '🖨️' },
  abonnements_licences:     { label: 'Abonnements & Licences',      emoji: '💳' },
  sauvegardes_restauration: { label: 'Sauvegardes & Restauration',  emoji: '💾' },
  assistant_sara:           { label: 'Assistant SARA',              emoji: '🤖' },
};

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  ChevronDown: ({ open }) => (
    <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Bot: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ─── Composant item FAQ (accordion) ──────────────────────────────────────────
function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  const q = item.question?.fr ?? item.question ?? '';
  const a = item.answer?.fr ?? item.answer ?? '';

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left
                   hover:text-purple-600 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-gray-800 leading-relaxed">{q}</span>
        <span className="shrink-0 mt-0.5 text-gray-400">
          <Icon.ChevronDown open={open} />
        </span>
      </button>
      {open && (
        <div className="pb-4 pr-6">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{a}</p>
          {item.module && (
            <span className="inline-block mt-3 text-xs bg-purple-50 text-purple-600
                             px-2 py-0.5 rounded-full">
              Module : {item.module}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function FaqPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null); // null = toutes

  // ── Chargement depuis l'API ───────────────────────────────────────────────
  useEffect(() => {
    axios.get('/api/v1/help/faqs?limit=100')
      .then(({ data }) => setFaqs(data.data ?? []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = faqs;

    if (activeCategory) {
      result = result.filter(f => f.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => {
        const question = (f.question?.fr ?? f.question ?? '').toLowerCase();
        const answer   = (f.answer?.fr ?? f.answer ?? '').toLowerCase();
        const keywords = (f.keywords ?? []).join(' ').toLowerCase();
        return question.includes(q) || answer.includes(q) || keywords.includes(q);
      });
    }

    return result;
  }, [faqs, searchQuery, activeCategory]);

  // ── Groupement par catégorie ──────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(f => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return groups;
  }, [filtered]);

  const categories = Object.keys(CATEGORY_META).filter(c =>
    faqs.some(f => f.category === c)
  );

  const openSara = () => {
    window.dispatchEvent(new CustomEvent('sara:open', {
      detail: { context: 'faq', preMessage: 'Je n\'ai pas trouvé la réponse dans la FAQ...' },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Questions fréquentes</h1>
          <p className="text-gray-500 text-sm">100 réponses aux questions les plus posées sur IBIG SECRETIS</p>

          {/* Barre de recherche */}
          <div className="relative mt-5 max-w-lg">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon.Search />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une question..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Icon.X />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex gap-8">

        {/* ── Sidebar catégories ────────────────────────────────────── */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="sticky top-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Catégories
            </p>
            <nav className="space-y-0.5">
              <button
                onClick={() => setActiveCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                            ${!activeCategory
                              ? 'bg-purple-50 text-purple-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Toutes ({faqs.length})
              </button>
              {categories.map(cat => {
                const meta = CATEGORY_META[cat];
                const count = faqs.filter(f => f.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                                flex items-center gap-2
                                ${activeCategory === cat
                                  ? 'bg-purple-50 text-purple-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <span>{meta?.emoji}</span>
                    <span className="flex-1 truncate">{meta?.label ?? cat}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── Contenu FAQ ───────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-white rounded-xl border border-gray-200" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-400 mb-4">
                Aucune question ne correspond à « {searchQuery} »
              </p>
              <button
                onClick={openSara}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-purple-600
                           hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
              >
                <Icon.Bot />
                Poser la question à SARA
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, items]) => {
                const meta = CATEGORY_META[cat];
                return (
                  <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* En-tête catégorie */}
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
                      <span className="text-lg">{meta?.emoji}</span>
                      <span className="font-semibold text-gray-800 text-sm">
                        {meta?.label ?? cat}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">{items.length} questions</span>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-gray-50 px-5">
                      {items.map(item => (
                        <FaqItem key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA SARA en bas */}
          {!loading && filtered.length > 0 && (
            <div className="mt-8 bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
              <p className="text-gray-700 font-medium mb-2">
                Cette FAQ n'a pas répondu à votre question ?
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Notre assistante IA SARA peut vous aider en temps réel.
              </p>
              <button
                onClick={openSara}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600
                           hover:bg-purple-700 text-white rounded-lg text-sm font-medium
                           transition-colors"
              >
                <Icon.Bot />
                Parler à SARA
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
export { FaqPage };
