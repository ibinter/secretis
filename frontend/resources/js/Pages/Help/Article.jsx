import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function extractHeadings(htmlContent) {
  const div = document.createElement('div');
  div.innerHTML = htmlContent;
  const headings = [];
  div.querySelectorAll('h2, h3').forEach((el, i) => {
    const id = `heading-${i}`;
    el.id = id;
    headings.push({ id, text: el.textContent, level: el.tagName.toLowerCase() });
  });
  return { headings, html: div.innerHTML };
}

export default function HelpArticle({ category, article, related = [] }) {
  const [helpful, setHelpful] = useState(null);
  const [counts, setCounts] = useState({
    helpful: article.helpful_count,
    not_helpful: article.not_helpful_count,
  });
  const [headings, setHeadings] = useState([]);
  const [content, setContent] = useState(article.content);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const result = extractHeadings(article.content);
      setHeadings(result.headings);
      setContent(result.html);
    }
  }, [article.content]);

  async function sendFeedback(isHelpful) {
    if (helpful !== null) return;
    try {
      const res = await axios.post(`/api/help/articles/${article.id}/feedback`, { helpful: isHelpful });
      setHelpful(isHelpful);
      setCounts({ helpful: res.data.helpful_count, not_helpful: res.data.not_helpful_count });
    } catch {}
  }

  return (
    <AppLayout>
      <Head title={`${article.title} — Centre d'aide`} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6 flex-wrap">
          <Link href={route('help.index')} className="hover:text-[#2E86C1]">Centre d'aide</Link>
          <ChevronRight />
          <Link href={route('help.category', category.slug)} className="hover:text-[#2E86C1]">{category.name}</Link>
          <ChevronRight />
          <span className="text-gray-900 dark:text-white font-medium line-clamp-1">{article.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Contenu */}
          <div className="lg:col-span-3">
            <article className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
              {/* En-tête */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <span>{category.icon}</span>
                  <Link href={route('help.category', category.slug)} className="hover:text-[#2E86C1]">{category.name}</Link>
                  {article.published_at && (
                    <><span>·</span><span>{formatDate(article.published_at)}</span></>
                  )}
                  {article.author && (
                    <><span>·</span><span>Par {article.author.name}</span></>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                  {article.title}
                </h1>
                {article.excerpt && (
                  <p className="text-gray-500 dark:text-gray-400 mt-3 text-lg leading-relaxed">{article.excerpt}</p>
                )}
              </div>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {article.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Contenu HTML */}
              <div
                className="prose prose-gray dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
                  prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-100 dark:prose-h2:border-gray-700 prose-h2:pb-2
                  prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                  prose-li:text-gray-700 dark:prose-li:text-gray-300
                  prose-strong:text-gray-900 dark:prose-strong:text-white
                  prose-a:text-[#2E86C1] prose-a:no-underline hover:prose-a:underline
                  prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
                dangerouslySetInnerHTML={{ __html: content }}
              />

              {/* Feedback */}
              <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Cet article vous a-t-il été utile ?</span>
                    <button onClick={() => sendFeedback(true)} disabled={helpful !== null}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${helpful === true ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : helpful !== null ? 'text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 hover:text-green-600'}`}>
                      👍 Oui {counts.helpful > 0 && <span className="text-xs">({counts.helpful})</span>}
                    </button>
                    <button onClick={() => sendFeedback(false)} disabled={helpful !== null}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${helpful === false ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : helpful !== null ? 'text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600'}`}>
                      👎 Non {counts.not_helpful > 0 && <span className="text-xs">({counts.not_helpful})</span>}
                    </button>
                  </div>
                  <Link href={route('support.tickets.create')}
                    className="text-sm text-[#2E86C1] hover:underline font-medium">
                    Besoin d'aide supplémentaire ? →
                  </Link>
                </div>
                {helpful !== null && (
                  <p className="text-sm text-gray-500 mt-3">Merci pour votre retour ! Il nous aide à améliorer notre documentation.</p>
                )}
              </div>
            </article>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 px-1">
              <span>👁 {article.view_count} vues</span>
              <span>👍 {counts.helpful} utile</span>
              <span>👎 {counts.not_helpful} pas utile</span>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Sommaire */}
            {headings.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 sticky top-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Sommaire</h3>
                <ul className="space-y-1">
                  {headings.map(h => (
                    <li key={h.id}>
                      <a href={`#${h.id}`}
                        className={`block text-xs py-1 text-gray-600 dark:text-gray-400 hover:text-[#2E86C1] transition-colors
                          ${h.level === 'h3' ? 'pl-3' : ''}`}>
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Articles liés */}
            {related.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Articles liés</h3>
                <ul className="space-y-2">
                  {related.map(r => (
                    <li key={r.id}>
                      <Link href={route('help.article', { category: category.slug, article: r.slug })}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#2E86C1] line-clamp-2 block transition-colors">
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA Ticket */}
            <div className="bg-gradient-to-br from-[#1A3A5C] to-[#2E86C1] rounded-xl p-4 text-white">
              <p className="text-sm font-medium mb-1">📩 Besoin d'aide ?</p>
              <p className="text-xs text-blue-200 mb-3">Cette documentation ne répond pas à votre question ?</p>
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
