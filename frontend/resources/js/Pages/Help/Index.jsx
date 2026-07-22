/**
 * SECRETIS ERP — Help/Index.jsx
 * Page d'accueil du centre d'aide
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { debounce } from 'lodash';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  Search: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Ticket: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  Mail: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Video: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Bot: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Fire: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd"
        d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
        clipRule="evenodd" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ─── Données des catégories avec icônes emoji ─────────────────────────────────
const CATEGORY_ICONS = {
  agenda:     '📅',
  courrier:   '📬',
  reunion:    '🤝',
  tache:      '✅',
  visiteur:   '🪪',
  ressource:  '🏢',
  rh:         '👥',
  rapport:    '📊',
  facturation:'💳',
  technique:  '⚙️',
};

// ─── Composant Carte Catégorie ────────────────────────────────────────────────
function CategoryCard({ category }) {
  return (
    <Link
      to={`/help/category/${category.slug}`}
      className="group flex flex-col gap-3 p-5 bg-white rounded-2xl border border-gray-100
        shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl">{CATEGORY_ICONS[category.slug] || '📖'}</span>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {category.count} article{category.count > 1 ? 's' : ''}
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{category.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-blue-500 font-medium mt-auto">
        Voir les articles <Icon.ChevronRight />
      </div>
    </Link>
  );
}

// ─── Composant Article Populaire ──────────────────────────────────────────────
function PopularArticle({ faq, index }) {
  return (
    <Link
      to={`/help/faq/${faq.id}`}
      className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-sm font-bold
        flex items-center justify-center flex-shrink-0 mt-0.5">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600
          transition-colors line-clamp-2">
          {faq.question}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{faq.category_name}</span>
          {faq.views > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{faq.views} vues</span>
            </>
          )}
        </div>
      </div>
      <Icon.ChevronRight />
    </Link>
  );
}

// ─── Résultats de recherche ───────────────────────────────────────────────────
function SearchResults({ results, query, onClose }) {
  if (!query) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200
      shadow-xl z-30 overflow-hidden max-h-96 overflow-y-auto">
      {results.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500 text-sm mb-1">Aucun résultat pour « {query} »</p>
          <p className="text-xs text-gray-400">Essayez d'autres mots-clés ou posez la question à SARA</p>
        </div>
      ) : (
        <div className="py-2">
          {results.map(item => (
            <Link
              key={item.id}
              to={`/help/faq/${item.id}`}
              onClick={onClose}
              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg flex-shrink-0">{CATEGORY_ICONS[item.category_slug] || '📖'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.question}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.category_name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bouton flottant SARA ─────────────────────────────────────────────────────
function SaraFab({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-20 flex items-center gap-3 bg-blue-600 text-white
        px-5 py-3.5 rounded-2xl shadow-lg hover:bg-blue-700 hover:shadow-xl
        transition-all duration-200 hover:-translate-y-0.5 group"
    >
      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
        <Icon.Bot />
      </div>
      <div className="text-left">
        <div className="text-sm font-semibold">Poser une question</div>
        <div className="text-xs text-blue-200">SARA — IA intégrée</div>
      </div>
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function HelpIndex() {
  const { t }      = useTranslation();
  const navigate   = useNavigate();

  const [categories, setCategories]   = useState([]);
  const [popular, setPopular]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // ── Chargement initial ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      axios.get('/api/help/categories'),
      axios.get('/api/help/faq/popular'),
    ]).then(([catRes, popRes]) => {
      setCategories(catRes.data);
      setPopular(popRes.data);
    }).finally(() => setLoading(false));
  }, []);

  // ── Recherche avec debounce ──────────────────────────────────────────────────
  const doSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await axios.get('/api/help/faq/search', { params: { q: query, limit: 8 } });
        setSearchResults(res.data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  function handleSearch(value) {
    setSearchQuery(value);
    setShowResults(true);
    doSearch(value);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/help/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setShowResults(false)}>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-blue-100 text-lg mb-8">
            Parcourez notre base de connaissances ou posez une question à SARA
          </p>
          {/* Barre de recherche */}
          <div className="relative max-w-2xl mx-auto" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon.Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  onFocus={() => setShowResults(true)}
                  placeholder="Rechercher dans la base de connaissances…"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 bg-white shadow-lg
                    outline-none focus:ring-2 focus:ring-white/50 text-base placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <Icon.X />
                  </button>
                )}
              </div>
            </form>
            {showResults && (searchQuery.length >= 2) && (
              <SearchResults
                results={searchResults}
                query={searchLoading ? null : searchQuery}
                onClose={() => setShowResults(false)}
              />
            )}
          </div>
          <p className="text-blue-200 text-sm mt-4">
            {loading ? '…' : `${categories.reduce((a, c) => a + c.count, 0)} articles disponibles`}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* ── Liens rapides ── */}
        <section className="mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Icon.Ticket />, label: 'Ouvrir un ticket',       to: '/help/ticket',                 color: 'blue' },
              { icon: <Icon.Mail />,   label: 'Contacter le support',   to: '/help/contact',                color: 'green' },
              { icon: <Icon.Download />, label: 'Guide PDF',            href: '/docs/secretis-guide.pdf',   color: 'purple' },
              { icon: <Icon.Video />,  label: 'Tutoriels vidéo',        to: '/help/videos',                 color: 'orange' },
            ].map(({ icon, label, to, href, color }) => {
              const colors = {
                blue:   'bg-blue-50 text-blue-600 hover:bg-blue-100',
                green:  'bg-green-50 text-green-600 hover:bg-green-100',
                purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
                orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
              };
              const cls = `flex items-center gap-3 p-4 rounded-xl ${colors[color]} transition-colors font-medium text-sm`;
              if (href) return (
                <a key={label} href={href} target="_blank" rel="noreferrer" className={cls}>
                  {icon} {label}
                </a>
              );
              return (
                <Link key={label} to={to} className={cls}>
                  {icon} {label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Catégories ── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Parcourir par catégorie</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map(cat => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          )}
        </section>

        {/* ── Articles populaires ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-xl font-bold text-gray-900">Articles populaires</h2>
            <span className="flex items-center gap-1 text-orange-500 text-sm font-medium">
              <Icon.Fire /> Tendance
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : popular.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p>Aucun article disponible pour le moment.</p>
              </div>
            ) : (
              popular.map((faq, i) => (
                <PopularArticle key={faq.id} faq={faq} index={i} />
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── SARA FAB ── */}
      <SaraFab onClick={() => navigate('/help/sara')} />
    </div>
  );
}
