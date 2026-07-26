import React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

function highlight(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 rounded px-0.5">{part}</mark>
      : part
  );
}

export default function HelpSearch({ query = '', results = [], count = 0, categories = [] }) {
  function handleCategoryFilter(slug) {
    router.get(route('help.search'), { q: query, category: slug }, { preserveState: true });
  }

  return (
    <AppLayout>
      <Head title={`Recherche "${query}" — Centre d'aide`} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href={route('help.index')} className="hover:text-[#7e22ce]">Centre d'aide</Link>
            <ChevronRight />
            <span className="text-gray-900 dark:text-white">Recherche</span>
          </nav>
          <form action={route('help.search')} method="GET" className="flex gap-3">
            <input name="q" defaultValue={query} type="text" placeholder="Rechercher…"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800
                text-gray-900 dark:text-white outline-none focus:border-[#7e22ce] focus:ring-1 focus:ring-[#7e22ce]" />
            <button type="submit"
              className="px-6 py-3 bg-[#7e22ce] hover:bg-[#9333EA] text-white font-medium rounded-xl transition-colors">
              Rechercher
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Résultats */}
          <div className="lg:col-span-3">
            {query && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {count} résultat{count !== 1 ? 's' : ''} pour <strong className="text-gray-900 dark:text-white">« {query} »</strong>
              </p>
            )}

            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map(article => (
                  <Link key={article.id}
                    href={route('help.article', { category: article.category?.slug, article: article.slug })}
                    className="block p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700
                      hover:border-[#7e22ce] hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <span>{article.category?.icon}</span>
                      <span>{article.category?.name}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#7e22ce] transition-colors mb-1">
                      {highlight(article.title, query)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {highlight(article.excerpt, query)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <EyeIcon /><span>{article.view_count} vues</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : query ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <p className="text-4xl mb-4">🔍</p>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Aucun résultat pour « {query} »</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Essayez d'autres mots-clés ou ouvrez un ticket pour obtenir de l'aide.
                </p>
                <Link href={route('support.tickets.create')}
                  className="inline-flex items-center gap-2 bg-[#F39C12] hover:bg-amber-500 text-white font-semibold
                    px-6 py-3 rounded-xl transition-colors">
                  🎫 Ouvrir un ticket support
                </Link>
              </div>
            ) : null}
          </div>

          {/* Sidebar catégories */}
          <aside>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Filtrer par catégorie</h3>
              <ul className="space-y-1">
                <li>
                  <button onClick={() => handleCategoryFilter('')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Toutes les catégories
                  </button>
                </li>
                {categories.map(cat => (
                  <li key={cat.id}>
                    <button onClick={() => handleCategoryFilter(cat.slug)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <span>{cat.icon}</span><span className="flex-1 truncate">{cat.name}</span>
                      <span className="text-xs text-gray-400">{cat.articles_count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 bg-gradient-to-br from-[#9333EA] to-[#7e22ce] rounded-xl p-4 text-white">
              <p className="text-sm font-medium mb-3">Vous n'avez pas trouvé ?</p>
              <Link href={route('support.tickets.create')}
                className="block text-center bg-[#F39C12] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-500 transition-colors">
                Ouvrir un ticket
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
export { HelpSearch };
