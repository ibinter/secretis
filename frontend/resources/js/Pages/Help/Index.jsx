import React, { useState, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const TicketIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

function CategoryCard({ category }) {
  return (
    <Link
      href={route('help.category', category.slug)}
      className="group flex flex-col gap-3 p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700
        shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl">{category.icon}</span>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {category.articles_count} article{category.articles_count !== 1 ? 's' : ''}
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#2E86C1] transition-colors">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{category.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-[#F39C12] font-medium mt-auto">
        Voir les articles <ChevronRight />
      </div>
    </Link>
  );
}

function ArticleCard({ article }) {
  return (
    <Link
      href={route('help.article', { category: article.category?.slug, article: article.slug })}
      className="flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700
        hover:border-[#2E86C1] hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>{article.category?.icon}</span>
        <span>{article.category?.name}</span>
      </div>
      <h4 className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-[#2E86C1] line-clamp-2 transition-colors">
        {article.title}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{article.excerpt}</p>
      <div className="flex items-center gap-1 text-xs text-gray-400 mt-auto">
        <EyeIcon /><span>{article.view_count} vues</span>
      </div>
    </Link>
  );
}

export default function HelpIndex({ categories = [], featured = [], recent = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const debounceRef = React.useRef(null);

  const doSearch = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q || q.length < 2) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get('/api/help/search', { params: { q, limit: 8 } });
        setResults(res.data.results || []);
        setShowDrop(true);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
  }, []);

  function handleInput(e) { const v = e.target.value; setQuery(v); doSearch(v); }
  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) router.visit(route('help.search', { q: query }));
  }

  const totalArticles = categories.reduce((s, c) => s + (c.articles_count || 0), 0);

  return (
    <AppLayout>
      <Head title="Centre d'aide" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A3A5C] via-[#2E86C1] to-[#1A3A5C] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Comment pouvons-nous vous aider ?</h1>
          <p className="text-blue-100 text-lg mb-8">Parcourez notre base de connaissances ou ouvrez un ticket support</p>
          <div className="relative max-w-2xl mx-auto" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></div>
                <input
                  type="text" value={query} onChange={handleInput} onFocus={() => query.length >= 2 && setShowDrop(true)}
                  placeholder="Rechercher dans la base de connaissances…"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 bg-white shadow-lg outline-none
                    focus:ring-2 focus:ring-white/50 text-base placeholder:text-gray-400"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-[#2E86C1] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </form>
            {showDrop && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl z-30 overflow-hidden max-h-80 overflow-y-auto">
                {results.map(r => (
                  <Link key={r.id} href={route('help.article', { category: r.category?.slug, article: r.slug })}
                    onClick={() => setShowDrop(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <span className="text-lg flex-shrink-0">{r.category?.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{r.title}</p>
                      <p className="text-xs text-gray-400">{r.category?.name}</p>
                    </div>
                  </Link>
                ))}
                <Link href={route('help.search', { q: query })} onClick={() => setShowDrop(false)}
                  className="block text-center py-3 text-sm text-[#2E86C1] font-medium hover:bg-gray-50 border-t">
                  Voir tous les résultats →
                </Link>
              </div>
            )}
            {showDrop && query.length >= 2 && results.length === 0 && !searching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl z-30 p-6 text-center">
                <p className="text-gray-500 text-sm mb-1">Aucun résultat pour « {query} »</p>
                <Link href={route('support.tickets.create')} className="text-[#F39C12] text-sm font-medium">
                  Ouvrir un ticket support →
                </Link>
              </div>
            )}
          </div>
          <p className="text-blue-200 text-sm mt-4">{totalArticles} articles disponibles</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Catégories */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Parcourir par catégorie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map(cat => <CategoryCard key={cat.id} category={cat} />)}
          </div>
        </section>

        {/* Articles populaires */}
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              Articles populaires <span className="text-[#F39C12] text-sm font-medium">⭐ Tendance</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        {/* Articles récents */}
        {recent.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Articles récents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recent.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        {/* CTA bas de page */}
        <section className="bg-gradient-to-r from-[#1A3A5C] to-[#2E86C1] rounded-2xl p-8 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Vous n'avez pas trouvé ce que vous cherchez ?</h3>
          <p className="text-blue-100 mb-6">Notre équipe support est disponible pour vous aider personnellement.</p>
          <Link
            href={route('support.tickets.create')}
            className="inline-flex items-center gap-2 bg-[#F39C12] hover:bg-amber-500 text-white font-semibold
              px-6 py-3 rounded-xl transition-colors shadow-lg"
          >
            <TicketIcon /> Ouvrir un ticket support
          </Link>
        </section>
      </div>
    </AppLayout>
  );
}
