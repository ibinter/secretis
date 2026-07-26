import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

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

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HelpCategory({ category, articles, allCategories = [] }) {
  return (
    <AppLayout>
      <Head title={`${category.name} — Centre d'aide`} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href={route('help.index')} className="hover:text-[#7e22ce]">Centre d'aide</Link>
          <ChevronRight />
          <span className="text-gray-900 dark:text-white font-medium">{category.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-3">
            {/* En-tête catégorie */}
            <div className="flex items-center gap-4 mb-8">
              <span className="text-5xl">{category.icon}</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{category.name}</h1>
                {category.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{category.description}</p>
                )}
              </div>
            </div>

            {/* Liste articles */}
            {articles.data && articles.data.length > 0 ? (
              <div className="space-y-3">
                {articles.data.map(article => (
                  <Link
                    key={article.id}
                    href={route('help.article', { category: category.slug, article: article.slug })}
                    className="flex items-start gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100
                      dark:border-gray-700 hover:border-[#7e22ce] hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#7e22ce] transition-colors line-clamp-1">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{article.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        {article.published_at && <span>{formatDate(article.published_at)}</span>}
                        <span className="flex items-center gap-1"><EyeIcon />{article.view_count} vues</span>
                        {article.is_featured && <span className="text-[#F39C12] font-medium">⭐ Mis en avant</span>}
                      </div>
                    </div>
                    <ChevronRight />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-4">📭</p>
                <p>Aucun article dans cette catégorie pour le moment.</p>
              </div>
            )}

            {/* Pagination */}
            {articles.links && articles.links.length > 3 && (
              <div className="flex justify-center gap-2 mt-8">
                {articles.links.map((link, i) => (
                  <Link key={i} href={link.url || '#'}
                    className={`px-3 py-2 rounded-lg text-sm ${link.active
                      ? 'bg-[#7e22ce] text-white'
                      : link.url ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      : 'text-gray-300 cursor-not-allowed'}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Recherche */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <form action={route('help.search')} method="GET">
                <div className="relative">
                  <input name="q" type="text" placeholder="Rechercher…"
                    className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600
                      bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none
                      focus:border-[#7e22ce] focus:ring-1 focus:ring-[#7e22ce]" />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#7e22ce]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>

            {/* Catégories */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Toutes les catégories</h3>
              <ul className="space-y-1">
                {allCategories.map(cat => (
                  <li key={cat.id}>
                    <Link
                      href={route('help.category', cat.slug)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        cat.is_current
                          ? 'bg-[#7e22ce]/10 text-[#7e22ce] font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="flex-1 truncate">{cat.name}</span>
                      <span className="text-xs text-gray-400">{cat.articles_count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Ticket */}
            <div className="bg-gradient-to-br from-[#9333EA] to-[#7e22ce] rounded-xl p-4 text-white">
              <p className="text-sm font-medium mb-1">Besoin d'aide ?</p>
              <p className="text-xs text-purple-200 mb-3">Notre équipe est là pour vous.</p>
              <Link href={route('support.tickets.create')}
                className="block text-center bg-[#F39C12] hover:bg-amber-500 text-white text-sm font-semibold
                  px-4 py-2 rounded-lg transition-colors">
                Ouvrir un ticket
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
export { HelpCategory };
