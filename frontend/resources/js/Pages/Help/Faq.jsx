/**
 * SECRETIS ERP — Help/Faq.jsx
 * Page FAQ : 100 questions-réponses bilingues avec recherche et filtres.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ─── Icônes inline ───────────────────────────────────────────────────────────
const Icon = {
    Search: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    ChevronDown: () => (
        <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    ),
    Star: () => (
        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    ),
    MessageCircle: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    ),
    Globe: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
    ),
    X: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
};

// ─── Composant Accordion Item ─────────────────────────────────────────────────
function FaqItem({ faq, locale, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    const bodyRef = useRef(null);

    const question = faq.translations?.[locale]?.question ?? faq.translations?.fr?.question ?? '';
    const answer   = faq.translations?.[locale]?.answer   ?? faq.translations?.fr?.answer   ?? '';

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-3 transition-shadow hover:shadow-md">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                aria-expanded={open}
            >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {faq.is_featured && (
                        <span className="mt-0.5 shrink-0" title="FAQ populaire">
                            <Icon.Star />
                        </span>
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white leading-snug">
                        {question}
                    </span>
                </div>
                <span className={`shrink-0 mt-0.5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                    <Icon.ChevronDown />
                </span>
            </button>

            <div
                ref={bodyRef}
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: open ? '600px' : '0' }}
            >
                <div className="px-5 pb-5 pt-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                        {answer}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Faq({ faqs = [], categories = {}, total = 0, featured = [] }) {
    const [locale, setLocale]   = useState(() => localStorage.getItem('secretis_faq_locale') || 'fr');
    const [search, setSearch]   = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    // Persister la locale
    useEffect(() => {
        localStorage.setItem('secretis_faq_locale', locale);
    }, [locale]);

    // Filtrage côté client
    const filtered = useMemo(() => {
        let result = faqs;

        if (activeCategory !== 'all') {
            result = result.filter(f => f.category === activeCategory);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(f => {
                const question = (f.translations?.[locale]?.question ?? f.translations?.fr?.question ?? '').toLowerCase();
                const answer   = (f.translations?.[locale]?.answer   ?? f.translations?.fr?.answer   ?? '').toLowerCase();
                return question.includes(q) || answer.includes(q);
            });
        }

        return result;
    }, [faqs, search, activeCategory, locale]);

    // Grouper par catégorie pour l'affichage
    const grouped = useMemo(() => {
        const g = {};
        filtered.forEach(f => {
            if (!g[f.category]) g[f.category] = [];
            g[f.category].push(f);
        });
        return g;
    }, [filtered]);

    const catKeys = Object.keys(categories);

    const getCatLabel = (key) => categories[key]?.[locale] ?? categories[key]?.fr ?? key;

    const clearSearch = () => setSearch('');

    return (
        <AppLayout>
            <Head title="FAQ — 100 questions répondues | IBIG SECRETIS" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

                {/* ── Hero ──────────────────────────────────────────────── */}
                <div className="bg-gradient-to-br from-[#9333EA] to-[#7e22ce] text-white py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
                            <Icon.MessageCircle />
                            <span>
                                {locale === 'fr'
                                    ? `${total} questions répondues`
                                    : `${total} questions answered`}
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                            {locale === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}
                        </h1>
                        <p className="text-purple-100 text-lg mb-8">
                            {locale === 'fr'
                                ? 'Trouvez rapidement la réponse à vos questions sur IBIG SECRETIS.'
                                : 'Quickly find answers to your questions about IBIG SECRETIS.'}
                        </p>

                        {/* Barre de recherche */}
                        <div className="relative max-w-xl mx-auto">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                <Icon.Search />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={locale === 'fr' ? 'Rechercher une question…' : 'Search a question…'}
                                className="w-full pl-12 pr-10 py-4 rounded-2xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-0 shadow-lg focus:ring-4 focus:ring-white/30 focus:outline-none text-base"
                            />
                            {search && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <Icon.X />
                                </button>
                            )}
                        </div>

                        {/* Sélecteur de langue */}
                        <div className="flex items-center justify-center gap-3 mt-6">
                            <Icon.Globe />
                            <button
                                onClick={() => setLocale('fr')}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                    locale === 'fr'
                                        ? 'bg-white text-[#9333EA]'
                                        : 'bg-white/20 hover:bg-white/30 text-white'
                                }`}
                            >
                                Français
                            </button>
                            <button
                                onClick={() => setLocale('en')}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                    locale === 'en'
                                        ? 'bg-white text-[#9333EA]'
                                        : 'bg-white/20 hover:bg-white/30 text-white'
                                }`}
                            >
                                English
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Corps ────────────────────────────────────────────── */}
                <div className="max-w-4xl mx-auto px-4 py-10">

                    {/* Filtres par catégorie */}
                    <div className="flex gap-2 flex-wrap mb-8">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                activeCategory === 'all'
                                    ? 'bg-[#9333EA] text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-[#7e22ce] hover:text-[#7e22ce]'
                            }`}
                        >
                            {locale === 'fr' ? 'Toutes' : 'All'}
                            <span className="ml-1.5 text-xs opacity-70">({total})</span>
                        </button>
                        {catKeys.map(key => {
                            const count = faqs.filter(f => f.category === key).length;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveCategory(key)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                        activeCategory === key
                                            ? 'bg-[#9333EA] text-white'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-[#7e22ce] hover:text-[#7e22ce]'
                                    }`}
                                >
                                    {getCatLabel(key)}
                                    <span className="ml-1.5 text-xs opacity-70">({count})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* FAQ featured (si aucun filtre ni recherche) */}
                    {!search && activeCategory === 'all' && featured.length > 0 && (
                        <div className="mb-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Icon.Star />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {locale === 'fr' ? 'Questions populaires' : 'Popular questions'}
                                </h2>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
                                {featured.map(faq => (
                                    <FaqItem key={faq.id} faq={faq} locale={locale} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Résultats de recherche */}
                    {search && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {filtered.length > 0
                                ? (locale === 'fr'
                                    ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} pour « ${search} »`
                                    : `${filtered.length} result${filtered.length > 1 ? 's' : ''} for "${search}"`)
                                : (locale === 'fr'
                                    ? `Aucun résultat pour « ${search} »`
                                    : `No results for "${search}"`)}
                        </p>
                    )}

                    {/* FAQ groupées par catégorie */}
                    {filtered.length > 0 ? (
                        activeCategory === 'all' && !search ? (
                            Object.entries(grouped).map(([cat, items]) => (
                                <section key={cat} className="mb-10">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="w-1 h-6 rounded-full bg-[#7e22ce] inline-block" />
                                        {getCatLabel(cat)}
                                        <span className="text-sm font-normal text-gray-400 ml-1">({items.length})</span>
                                    </h2>
                                    {items.map(faq => (
                                        <FaqItem key={faq.id} faq={faq} locale={locale} />
                                    ))}
                                </section>
                            ))
                        ) : (
                            <div>
                                {filtered.map(faq => (
                                    <FaqItem key={faq.id} faq={faq} locale={locale} defaultOpen={!!search} />
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="text-center py-16">
                            <p className="text-gray-400 dark:text-gray-500 text-lg">
                                {locale === 'fr' ? 'Aucune FAQ trouvée.' : 'No FAQ found.'}
                            </p>
                        </div>
                    )}

                    {/* CTA support */}
                    <div className="mt-12 rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white p-8 text-center">
                        <h3 className="text-xl font-bold mb-2">
                            {locale === 'fr'
                                ? 'Vous n\'avez pas trouvé votre réponse ?'
                                : 'Didn\'t find your answer?'}
                        </h3>
                        <p className="text-purple-100 mb-6">
                            {locale === 'fr'
                                ? 'Notre équipe de support est disponible pour vous aider.'
                                : 'Our support team is available to help you.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/aide/ticket"
                                className="inline-flex items-center justify-center gap-2 bg-white text-[#9333EA] px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
                            >
                                {locale === 'fr' ? 'Ouvrir un ticket support' : 'Open a support ticket'}
                            </Link>
                            <a
                                href="mailto:support@ibig-secretis.com"
                                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-colors border border-white/20"
                            >
                                support@ibig-secretis.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
export { Faq };
