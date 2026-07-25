/**
 * SECRETIS ERP — HelpCenter/Article.jsx
 * Page d'affichage d'un article d'aide
 *
 * Fonctionnalités :
 * - Titre, date, auteur, module concerné
 * - Table des matières auto-générée depuis les H2/H3
 * - Contenu HTML rendu
 * - Boutons "Cet article vous a-t-il aidé ?" (Oui/Non)
 * - Articles connexes (même catégorie, mêmes tags)
 * - CTA "Ouvrir un ticket si le problème persiste"
 * - SARA contextuelle pré-chargée sur l'article
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

const RECENTLY_VIEWED_KEY = 'secretis_help_recently_viewed';
const MAX_RECENT = 5;

// ─── Icônes ─────────────────────────────────────────────────────────────────
const Icon = {
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ThumbUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  ),
  ThumbDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
    </svg>
  ),
  Ticket: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  Bot: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  List: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
};

// ─── Génération de la table des matières ─────────────────────────────────────
function buildToc(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const headings = doc.querySelectorAll('h2, h3');
  const items = [];
  headings.forEach((el) => {
    const id = el.id || el.textContent.replace(/\s+/g, '-').toLowerCase().replace(/[^\w-]/g, '');
    el.id = id;
    items.push({ level: el.tagName, text: el.textContent, id });
  });
  return items;
}

// ─── Composant article ────────────────────────────────────────────────────────
export default function HelpArticle() {
  const { slug } = useParams();

  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toc, setToc] = useState([]);
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'yes' | 'no' | null
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const contentRef = useRef(null);

  // ── Chargement de l'article ───────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get(`/api/v1/help/articles/${slug}`)
      .then(({ data }) => {
        const art = data.article;
        setArticle(art);

        // Table des matières depuis le contenu HTML
        const content = art.content?.fr ?? art.content ?? '';
        setToc(buildToc(content));

        // Incrémenter les vues
        axios.post(`/api/v1/help/articles/${slug}/view`).catch(() => {});

        // Sauvegarder dans "récemment consultés"
        try {
          const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) ?? '[]');
          const updated = [
            { slug, title: art.title?.fr ?? art.title, category: art.category },
            ...stored.filter(a => a.slug !== slug),
          ].slice(0, MAX_RECENT);
          localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
        } catch {}

        // Articles connexes
        if (art.category) {
          axios.get('/api/v1/help/articles', {
            params: { category: art.category, exclude: slug, limit: 4 },
          }).then(r => setRelatedArticles(r.data.data ?? [])).catch(() => {});
        }
      })
      .catch(() => setError('Article introuvable.'))
      .finally(() => setLoading(false));
  }, [slug]);

  // ── Suivi de la section active (scroll) ──────────────────────────────────
  useEffect(() => {
    if (!toc.length) return;
    const handleScroll = () => {
      const scrollY = window.scrollY + 100;
      let active = '';
      toc.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) active = id;
      });
      setActiveSection(active);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc]);

  // ── Feedback ─────────────────────────────────────────────────────────────
  const sendFeedback = async (isHelpful) => {
    setFeedbackGiven(isHelpful ? 'yes' : 'no');
    try {
      await axios.post(`/api/v1/help/articles/${slug}/feedback`, { is_helpful: isHelpful });
    } catch {}
    setFeedbackSent(true);
  };

  // ── Ouvrir SARA avec contexte de l'article ───────────────────────────────
  const openSaraContextual = () => {
    window.dispatchEvent(new CustomEvent('sara:open', {
      detail: {
        context: 'help_article',
        articleSlug: slug,
        articleTitle: article?.title?.fr ?? article?.title,
      },
    }));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
        <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">{error ?? 'Article introuvable.'}</p>
        <Link to="/help" className="text-purple-600 hover:underline">
          Retour au Centre d'aide
        </Link>
      </div>
    );
  }

  const title = article.title?.fr ?? article.title ?? '';
  const content = article.content?.fr ?? article.content ?? '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fil d'Ariane */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-1.5 text-sm text-gray-500">
          <Link to="/help" className="hover:text-purple-600">Centre d'aide</Link>
          <Icon.ChevronRight />
          {article.category && (
            <>
              <Link to={`/help/categories/${article.category}`} className="hover:text-purple-600">
                {article.category}
              </Link>
              <Icon.ChevronRight />
            </>
          )}
          <span className="text-gray-900 truncate max-w-xs">{title}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex gap-8">

          {/* ── Contenu principal ─────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* En-tête article */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {article.module && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    Module : {article.module}
                  </span>
                )}
                {article.version && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    v{article.version}
                  </span>
                )}
              </div>

              {/* Titre */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>

              {/* Méta */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                {article.author && <span>Par {article.author}</span>}
                {article.published_at && (
                  <span>
                    Mis à jour le{' '}
                    {new Date(article.published_at).toLocaleDateString('fr-FR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                )}
                {article.views > 0 && <span>{article.views.toLocaleString()} vues</span>}
              </div>
            </div>

            {/* Contenu HTML */}
            <div
              ref={contentRef}
              className="bg-white rounded-xl border border-gray-200 p-8 mb-6
                         prose prose-blue max-w-none
                         prose-headings:scroll-mt-20
                         prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
                         prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
                         prose-pre:bg-gray-900 prose-pre:text-gray-100"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* ── Feedback ─────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              {!feedbackSent ? (
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-700">Cet article vous a-t-il aidé ?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => sendFeedback(true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border
                                  transition-colors text-sm font-medium
                                  ${feedbackGiven === 'yes'
                                    ? 'bg-green-100 border-green-300 text-green-700'
                                    : 'border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300'}`}
                    >
                      <Icon.ThumbUp />
                      Oui, merci
                    </button>
                    <button
                      onClick={() => sendFeedback(false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border
                                  transition-colors text-sm font-medium
                                  ${feedbackGiven === 'no'
                                    ? 'bg-red-100 border-red-300 text-red-700'
                                    : 'border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300'}`}
                    >
                      <Icon.ThumbDown />
                      Pas vraiment
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-600">
                  {feedbackGiven === 'yes'
                    ? 'Merci pour votre retour positif !'
                    : 'Merci ! Nous allons améliorer cet article.'}
                </p>
              )}
            </div>

            {/* ── CTA : Ticket + SARA ───────────────────────────────── */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-8">
              <p className="text-sm font-medium text-orange-800 mb-3">
                Le problème persiste ? Notre équipe est là pour vous aider.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/help/tickets/create"
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700
                             text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Icon.Ticket />
                  Ouvrir un ticket support
                </Link>
                <button
                  onClick={openSaraContextual}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-orange-300
                             text-orange-700 hover:bg-orange-50 rounded-lg text-sm font-medium
                             transition-colors"
                >
                  <Icon.Bot />
                  Parler à SARA
                </button>
              </div>
            </div>

            {/* ── Articles connexes ─────────────────────────────────── */}
            {relatedArticles.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles connexes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relatedArticles.map((rel) => (
                    <Link
                      key={rel.slug}
                      to={`/help/articles/${rel.slug}`}
                      className="flex items-center gap-3 p-4 bg-white border border-gray-200
                                 rounded-lg hover:shadow-sm hover:border-purple-300 transition-all group"
                    >
                      <span className="flex-1 text-sm text-gray-700 group-hover:text-purple-700">
                        {rel.title?.fr ?? rel.title}
                      </span>
                      <Icon.ChevronRight />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* ── Table des matières (sticky, desktop) ─────────────────── */}
          {toc.length > 2 && (
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-8 bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                  <Icon.List />
                  Sur cette page
                </div>
                <nav className="space-y-1">
                  {toc.map(({ id, text, level }) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className={`block text-xs py-1 transition-colors truncate
                                  ${level === 'H3' ? 'pl-3' : ''}
                                  ${activeSection === id
                                    ? 'text-purple-600 font-medium'
                                    : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      {text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
export { HelpArticle };
