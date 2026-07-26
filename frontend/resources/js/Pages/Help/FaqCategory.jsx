/**
 * SECRETIS ERP — Help/FaqCategory.jsx
 * Liste des FAQ d'une catégorie avec accordéon
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  ChevronDown: ({ open }) => (
    <svg
      className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  BookOpen: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

const CATEGORY_ICONS = {
  agenda: '📅', courrier: '📬', reunion: '🤝', tache: '✅',
  visiteur: '🪪', ressource: '🏢', rh: '👥', rapport: '📊',
  facturation: '💳', technique: '⚙️',
};

// ─── Composant Accordéon ──────────────────────────────────────────────────────
function FaqItem({ faq, defaultOpen = false }) {
  const [open, setOpen]     = useState(defaultOpen);
  const [rated, setRated]   = useState(null); // 'up' | 'down'
  const [upCount, setUpCount]   = useState(faq.helpful_count ?? 0);
  const [downCount, setDownCount] = useState(faq.not_helpful_count ?? 0);

  async function rate(vote) {
    if (rated) return;
    setRated(vote);
    if (vote === 'up') setUpCount(c => c + 1);
    else setDownCount(c => c + 1);
    try {
      await axios.post(`/api/help/faq/${faq.id}/rate`, { vote });
    } catch {
      // rollback silencieux
      if (vote === 'up') setUpCount(c => c - 1);
      else setDownCount(c => c - 1);
      setRated(null);
    }
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-200
      ${open ? 'border-purple-200 shadow-sm' : 'border-gray-200'}`}>
      {/* Question */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-start justify-between gap-4 p-5 text-left transition-colors
          ${open ? 'bg-purple-50' : 'bg-white hover:bg-gray-50'}`}
        aria-expanded={open}
      >
        <h3 className={`text-sm font-semibold leading-relaxed ${open ? 'text-purple-700' : 'text-gray-900'}`}>
          {faq.question}
        </h3>
        <div className="flex-shrink-0 mt-0.5 text-gray-400">
          <Icon.ChevronDown open={open} />
        </div>
      </button>

      {/* Réponse avec animation */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? '2000px' : '0px' }}
      >
        <div className="px-5 pb-5 bg-white">
          <div
            className="prose prose-sm max-w-none text-gray-700 mt-3"
            dangerouslySetInnerHTML={{ __html: faq.answer_html || faq.answer }}
          />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between
            gap-3 mt-5 pt-4 border-t border-gray-100">
            {/* Rating */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Cet article vous a-t-il aidé ?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => rate('up')}
                  disabled={!!rated}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all border
                    ${rated === 'up'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : rated
                      ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300'}
                  `}
                >
                  <Icon.ThumbUp />
                  Oui {upCount > 0 && <span>({upCount})</span>}
                </button>
                <button
                  onClick={() => rate('down')}
                  disabled={!!rated}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all border
                    ${rated === 'down'
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : rated
                      ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300'}
                  `}
                >
                  <Icon.ThumbDown />
                  Non {downCount > 0 && <span>({downCount})</span>}
                </button>
              </div>
              {rated && (
                <span className="text-xs text-gray-400 italic">
                  {rated === 'up' ? 'Merci pour votre retour !' : 'Nous allons améliorer cet article.'}
                </span>
              )}
            </div>

            {/* Lien guide */}
            {faq.guide_section_url && (
              <a
                href={faq.guide_section_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800
                  font-medium transition-colors"
              >
                <Icon.BookOpen />
                Voir dans le guide
                <Icon.ExternalLink />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function FaqCategory() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const { t }       = useTranslation();

  const [category, setCategory]   = useState(null);
  const [faqs, setFaqs]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`/api/help/category/${slug}`),
      axios.get('/api/help/categories'),
    ]).then(([catRes, allRes]) => {
      setCategory(catRes.data.category);
      setFaqs(catRes.data.faqs);
      setCategories(allRes.data);
    }).catch(() => navigate('/help', { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── En-tête ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link to="/help" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900
            transition-colors mb-4">
            <Icon.ChevronLeft /> Centre d'aide
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{CATEGORY_ICONS[slug] || '📖'}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{category?.name}</h1>
              {category?.description && (
                <p className="text-gray-500 mt-0.5">{category.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* ── Colonne principale ── */}
        <div className="flex-1 min-w-0">
          {/* Recherche locale */}
          <div className="relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Filtrer dans "${category?.name}"…`}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white
                text-sm outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Compteur */}
          <p className="text-sm text-gray-500 mb-4">
            {filteredFaqs.length} article{filteredFaqs.length !== 1 ? 's' : ''}
            {searchQuery ? ` pour "${searchQuery}"` : ''}
          </p>

          {/* Liste FAQ */}
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-lg font-medium text-gray-600 mb-1">Aucun article trouvé</p>
              <p className="text-sm">Essayez des termes différents ou</p>
              <Link to="/help/ticket" className="text-sm text-purple-600 hover:underline">
                ouvrez un ticket de support
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => (
                <FaqItem key={faq.id} faq={faq} defaultOpen={idx === 0 && faqs.length === 1} />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar catégories ── */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
              Autres catégories
            </h3>
            <nav className="space-y-0.5">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  to={`/help/category/${cat.slug}`}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg
                    text-sm transition-colors
                    ${cat.slug === slug
                      ? 'bg-purple-50 text-purple-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  <span className="flex items-center gap-2">
                    <span>{CATEGORY_ICONS[cat.slug] || '📖'}</span>
                    {cat.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{cat.count}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                to="/help/ticket"
                className="flex items-center gap-2 text-sm text-purple-600 font-medium hover:text-purple-800"
              >
                <span>🎫</span> Ouvrir un ticket
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
export { FaqCategory };
