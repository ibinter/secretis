/**
 * SECRETIS ERP — HelpCenter/Index.jsx
 * Page principale du centre d'aide
 *
 * Fonctionnalités :
 * - Recherche globale en temps réel (debounce 300ms)
 * - 8 catégories d'articles
 * - Articles mis en avant (is_featured=true)
 * - Accès rapide SARA
 * - Accès rapide tickets
 * - Statut des services (placeholder)
 * - Articles récemment consultés (localStorage)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { debounce } from 'lodash';

// ─── Icônes SVG inline ────────────────────────────────────────────────────────
const Icon = {
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  Bot: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ─── Données des catégories ───────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'getting_started',
    label: 'Démarrage',
    emoji: '🚀',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    textColor: 'text-purple-700',
    description: 'Première connexion, configuration, onboarding',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    emoji: '📅',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    textColor: 'text-purple-700',
    description: 'Événements, réunions, salles, synchronisation',
  },
  {
    id: 'ged',
    label: 'GED & Courrier',
    emoji: '📁',
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    textColor: 'text-yellow-700',
    description: 'Documents, courriers, workflows, archivage',
  },
  {
    id: 'reunions',
    label: 'Réunions',
    emoji: '🤝',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    textColor: 'text-green-700',
    description: 'Planification, CR, actions de suivi, IA',
  },
  {
    id: 'taches',
    label: 'Tâches & Projets',
    emoji: '✅',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    textColor: 'text-orange-700',
    description: 'Kanban, Gantt, feuilles de temps, équipes',
  },
  {
    id: 'ressources',
    label: 'Ressources',
    emoji: '🏢',
    color: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
    textColor: 'text-teal-700',
    description: 'Salles, matériel, parc auto, visiteurs',
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    emoji: '⚙️',
    color: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
    textColor: 'text-gray-700',
    description: 'Utilisateurs, rôles, intégrations, sécurité',
  },
  {
    id: 'comptabilite',
    label: 'Comptabilité',
    emoji: '💼',
    color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    textColor: 'text-indigo-700',
    description: 'SYSCOHADA, budget, achats, facturation',
  },
];

const RECENTLY_VIEWED_KEY = 'secretis_help_recently_viewed';
const MAX_RECENT = 5;

// ─── Composant principal ─────────────────────────────────────────────────────
export default function HelpCenterIndex() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [servicesStatus, setServicesStatus] = useState('operational'); // operational | degraded | down
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const searchRef = useRef(null);

  // ── Chargement des articles mis en avant ──────────────────────────────────
  useEffect(() => {
    axios.get('/api/v1/help/articles?featured=true&limit=6')
      .then(r => setFeaturedArticles(r.data.data ?? []))
      .catch(() => setFeaturedArticles([]))
      .finally(() => setLoadingFeatured(false));
  }, []);

  // ── Articles récemment consultés (localStorage) ───────────────────────────
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) ?? '[]');
      setRecentlyViewed(stored.slice(0, MAX_RECENT));
    } catch {
      setRecentlyViewed([]);
    }
  }, []);

  // ── Fermer dropdown si clic ailleurs ─────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Recherche avec debounce ───────────────────────────────────────────────
  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q || q.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const { data } = await axios.get('/api/v1/help/search', {
          params: { q: q.trim(), limit: 8 },
        });
        setSearchResults(data.results ?? []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    doSearch(val);
    if (val.length > 1) setShowDropdown(true);
    else setShowDropdown(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      navigate(`/help/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleResultClick = (article) => {
    setShowDropdown(false);
    navigate(`/help/articles/${article.slug}`);
  };

  // ── Ouvrir SARA ──────────────────────────────────────────────────────────
  const openSara = () => {
    window.dispatchEvent(new CustomEvent('sara:open', { detail: { context: 'help_center' } }));
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── En-tête héro ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-3">Centre d'aide IBIG SECRETIS</h1>
          <p className="text-purple-100 text-lg mb-10">
            Guides, FAQ et support — trouvez des réponses en quelques secondes
          </p>

          {/* Barre de recherche ──────────────────────────────────────────── */}
          <div ref={searchRef} className="relative max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon.Search />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => query.length > 1 && setShowDropdown(true)}
                  placeholder="Rechercher dans le centre d'aide..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 text-lg
                             shadow-lg border-0 focus:ring-2 focus:ring-purple-300 focus:outline-none"
                  aria-label="Recherche dans le centre d'aide"
                />
                {isSearching && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </span>
                )}
              </div>
            </form>

            {/* Dropdown résultats ────────────────────────────────────────── */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl
                              shadow-2xl border border-gray-200 overflow-hidden z-50 text-left">
                {searchResults.map((article) => (
                  <button
                    key={article.slug}
                    onClick={() => handleResultClick(article)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-purple-50
                               border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <span className="text-xl mt-0.5">
                      {CATEGORIES.find(c => c.id === article.category)?.emoji ?? '📄'}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{article.title?.fr ?? article.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {CATEGORIES.find(c => c.id === article.category)?.label ?? article.category}
                      </p>
                    </div>
                    <span className="ml-auto text-gray-400 mt-1"><Icon.ChevronRight /></span>
                  </button>
                ))}
                <button
                  onClick={handleSearchSubmit}
                  className="w-full px-4 py-3 text-sm text-purple-600 hover:bg-purple-50
                             font-medium flex items-center gap-2 justify-center"
                >
                  <Icon.Search />
                  Voir tous les résultats pour « {query} »
                </button>
              </div>
            )}

            {showDropdown && query.length > 1 && searchResults.length === 0 && !isSearching && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl
                              shadow-2xl border border-gray-200 z-50 text-left p-6 text-center">
                <p className="text-gray-500">Aucun résultat pour « {query} »</p>
                <button onClick={openSara}
                  className="mt-3 text-purple-600 text-sm hover:underline">
                  Poser la question à SARA
                </button>
              </div>
            )}
          </div>

          {/* Liens rapides sous la recherche ─────────────────────────────── */}
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {['Créer un événement', 'Importer un document', 'Inviter un utilisateur',
              'Réinitialiser un mot de passe', 'Exporter en PDF'].map((kw) => (
              <button
                key={kw}
                onClick={() => navigate(`/help/search?q=${encodeURIComponent(kw)}`)}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5
                           rounded-full border border-white/30 transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Statut des services ──────────────────────────────────────── */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-8 text-sm
          ${servicesStatus === 'operational'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          <Icon.CheckCircle />
          <span>
            {servicesStatus === 'operational'
              ? 'Tous les services SECRETIS fonctionnent normalement'
              : 'Dégradation de service en cours — consultez status.ibigsoft.com'}
          </span>
          <a href="https://status.ibigsoft.com" target="_blank" rel="noreferrer"
            className="ml-auto underline opacity-70 hover:opacity-100">
            Statut
          </a>
        </div>

        {/* ── Accès rapide SARA + Tickets ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={openSara}
            className="flex items-center gap-4 p-5 bg-purple-600 hover:bg-purple-700
                       text-white rounded-xl shadow-md transition-colors group"
          >
            <div className="bg-white/20 rounded-lg p-2">
              <Icon.Bot />
            </div>
            <div className="text-left">
              <p className="font-semibold">Poser une question à SARA</p>
              <p className="text-sm text-purple-200">Notre assistante IA répond en temps réel</p>
            </div>
            <span className="ml-auto opacity-70 group-hover:translate-x-1 transition-transform">
              <Icon.ChevronRight />
            </span>
          </button>

          <Link
            to="/help/tickets/create"
            className="flex items-center gap-4 p-5 bg-white hover:bg-gray-50
                       text-gray-800 rounded-xl shadow-md border border-gray-200
                       transition-colors group"
          >
            <div className="bg-orange-100 rounded-lg p-2 text-orange-600">
              <Icon.Ticket />
            </div>
            <div className="text-left">
              <p className="font-semibold">Ouvrir un ticket support</p>
              <p className="text-sm text-gray-500">Signalez un problème à notre équipe</p>
            </div>
            <span className="ml-auto text-gray-400 group-hover:translate-x-1 transition-transform">
              <Icon.ChevronRight />
            </span>
          </Link>
        </div>

        {/* ── 8 catégories ─────────────────────────────────────────────── */}
        <h2 className="text-xl font-semibold text-gray-900 mb-5">Parcourir par catégorie</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/help/categories/${cat.id}`}
              className={`flex flex-col items-start gap-2 p-4 border rounded-xl
                          transition-colors ${cat.color}`}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className={`font-medium text-sm ${cat.textColor}`}>{cat.label}</span>
              <span className="text-xs text-gray-500 leading-tight">{cat.description}</span>
            </Link>
          ))}
        </div>

        {/* ── Articles mis en avant ─────────────────────────────────────── */}
        <h2 className="text-xl font-semibold text-gray-900 mb-5">Articles populaires</h2>
        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        ) : featuredArticles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {featuredArticles.map((article) => (
              <Link
                key={article.slug}
                to={`/help/articles/${article.slug}`}
                className="flex items-center gap-3 p-4 bg-white border border-gray-200
                           rounded-xl hover:shadow-md hover:border-purple-300 transition-all group"
              >
                <span className="text-xl">
                  {CATEGORIES.find(c => c.id === article.category)?.emoji ?? '📄'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {article.title?.fr ?? article.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CATEGORIES.find(c => c.id === article.category)?.label}
                  </p>
                </div>
                <span className="text-gray-300 group-hover:text-purple-500 transition-colors">
                  <Icon.ChevronRight />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-12">Aucun article mis en avant pour le moment.</p>
        )}

        {/* ── Articles récemment consultés ──────────────────────────────── */}
        {recentlyViewed.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Icon.Clock />
              Récemment consultés
            </h2>
            <div className="flex flex-col gap-2 mb-12">
              {recentlyViewed.map((article) => (
                <Link
                  key={article.slug}
                  to={`/help/articles/${article.slug}`}
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200
                             rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-400"><Icon.Clock /></span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{article.title}</span>
                  <span className="text-gray-300"><Icon.ChevronRight /></span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── Liens supplémentaires ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 text-sm justify-center border-t border-gray-200 pt-8">
          <Link to="/help/faq" className="text-purple-600 hover:underline">100 Questions fréquentes</Link>
          <span className="text-gray-300">|</span>
          <Link to="/help/tickets" className="text-purple-600 hover:underline">Mes tickets support</Link>
          <span className="text-gray-300">|</span>
          <a href="https://ibigsoft.com/changelog" target="_blank" rel="noreferrer"
            className="text-purple-600 hover:underline">Notes de version</a>
          <span className="text-gray-300">|</span>
          <a href="https://status.ibigsoft.com" target="_blank" rel="noreferrer"
            className="text-purple-600 hover:underline">Statut des services</a>
        </div>
      </div>
    </div>
  );
}
export { HelpCenterIndex };
