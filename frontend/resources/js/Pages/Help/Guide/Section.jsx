/**
 * SECRETIS ERP — Help/Guide/Section.jsx
 * Page d'une section du guide : liste des articles avec progression.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const Icon = {
    Clock: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Check: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    ChevronRight: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    ),
};

export default function GuideSection({ section, articles = [] }) {
    const [locale, setLocale] = useState(() => localStorage.getItem('secretis_guide_locale') || 'fr');
    const [readArticles, setReadArticles] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(`guide_read_${section.slug}`) || '[]');
        } catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('secretis_guide_locale', locale);
    }, [locale]);

    const t = (fr, en) => locale === 'fr' ? fr : en;

    const sectionTitle = section.translations?.[locale]?.title ?? section.translations?.fr?.title ?? '';
    const progress = articles.length > 0 ? Math.round((readArticles.length / articles.length) * 100) : 0;

    const totalTime = articles.reduce((acc, a) => acc + (a.read_time_minutes || 0), 0);

    return (
        <AppLayout>
            <Head title={`${sectionTitle} | Guide | IBIG SECRETIS`} />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

                {/* Header de section */}
                <div className="text-white py-12 px-4" style={{ background: `linear-gradient(135deg, #9333EA, ${section.color})` }}>
                    <div className="max-w-3xl mx-auto">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-sm text-white/70 mb-6">
                            <Link href="/aide" className="hover:text-white">{t('Aide', 'Help')}</Link>
                            <span>/</span>
                            <Link href="/guide" className="hover:text-white">{t('Guide', 'Guide')}</Link>
                            <span>/</span>
                            <span className="text-white">{sectionTitle}</span>
                        </nav>

                        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{sectionTitle}</h1>
                        <p className="text-white/80 mb-6">
                            {articles.length} {t('article', 'article')}{articles.length > 1 ? 's' : ''} · {totalTime} min
                        </p>

                        {/* Barre de progression */}
                        <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-white/80">
                                    {t('Progression', 'Progress')}: {readArticles.length}/{articles.length} {t('article', 'article')}{readArticles.length > 1 ? 's' : ''}
                                </span>
                                <span className="font-semibold">{progress}%</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto px-4 py-10">

                    {/* Langue */}
                    <div className="flex items-center gap-2 mb-6 justify-end">
                        {['fr', 'en'].map(l => (
                            <button key={l} onClick={() => setLocale(l)}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                    locale === l
                                        ? 'text-white'
                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                                style={locale === l ? { backgroundColor: section.color } : {}}>
                                {l === 'fr' ? 'FR' : 'EN'}
                            </button>
                        ))}
                    </div>

                    {/* Liste des articles */}
                    <div className="space-y-3">
                        {articles.map((article, index) => {
                            const title   = article.translations?.[locale]?.title   ?? article.translations?.fr?.title   ?? '';
                            const summary = article.translations?.[locale]?.summary ?? article.translations?.fr?.summary ?? '';
                            const isRead  = readArticles.includes(article.slug);

                            return (
                                <Link
                                    key={article.id}
                                    href={`/guide/${section.slug}/${article.slug}`}
                                    className={`group flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${
                                        isRead
                                            ? 'border-green-200 dark:border-green-800'
                                            : 'border-gray-100 dark:border-gray-700'
                                    }`}
                                >
                                    {/* Numéro / check */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                                        isRead
                                            ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                                            : 'text-white'
                                    }`}
                                    style={!isRead ? { backgroundColor: section.color } : {}}>
                                        {isRead ? <Icon.Check /> : index + 1}
                                    </div>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5 group-hover:text-[#7e22ce] transition-colors truncate">
                                            {title}
                                        </h3>
                                        {summary && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                                {summary}
                                            </p>
                                        )}
                                    </div>

                                    {/* Temps de lecture + flèche */}
                                    <div className="shrink-0 flex items-center gap-3 text-gray-400 dark:text-gray-500">
                                        <span className="flex items-center gap-1 text-xs">
                                            <Icon.Clock />
                                            {article.read_time_minutes} min
                                        </span>
                                        <Icon.ChevronRight />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {articles.length === 0 && (
                        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                            {t('Aucun article dans cette section.', 'No articles in this section.')}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
export { GuideSection };
