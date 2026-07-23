/**
 * SECRETIS ERP — Help/Guide/Article.jsx
 * Article complet du guide avec sommaire, navigation, sidebar, marquer comme lu.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const Icon = {
    Clock: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Check: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    CheckCircle: () => (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    ChevronLeft: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    ),
    ChevronRight: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    ),
    List: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    ),
    Globe: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
    ),
};

// ─── Extrait le sommaire (h2/h3) depuis du HTML ───────────────────────────────
function extractToc(html) {
    if (!html || typeof document === 'undefined') return [];
    const div = document.createElement('div');
    div.innerHTML = html;
    const headings = div.querySelectorAll('h2, h3');
    return Array.from(headings).map((h, i) => ({
        id:    `heading-${i}`,
        level: h.tagName.toLowerCase(),
        text:  h.textContent.trim(),
    }));
}

// ─── Injecte des IDs dans les h2/h3 du contenu HTML ──────────────────────────
function injectIds(html) {
    if (!html) return '';
    let i = 0;
    return html.replace(/<(h[23])([^>]*)>/gi, (match, tag, attrs) => {
        const id = `heading-${i++}`;
        return `<${tag} id="${id}"${attrs}>`;
    });
}

export default function GuideArticle({
    section,
    article,
    sectionArticles = [],
    prevArticle,
    nextArticle,
}) {
    const [locale, setLocale] = useState(() => localStorage.getItem('secretis_guide_locale') || 'fr');
    const [readArticles, setReadArticles] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(`guide_read_${section.slug}`) || '[]');
        } catch { return []; }
    });
    const [toc, setToc] = useState([]);
    const [activeHeading, setActiveHeading] = useState('');
    const contentRef = useRef(null);

    const t = (fr, en) => locale === 'fr' ? fr : en;

    const articleTitle   = article.translations?.[locale]?.title   ?? article.translations?.fr?.title   ?? '';
    const articleContent = article.translations?.[locale]?.content ?? article.translations?.fr?.content ?? '';
    const sectionTitle   = section.translations?.[locale]?.title   ?? section.translations?.fr?.title   ?? '';

    const contentWithIds = useMemo(() => injectIds(articleContent), [articleContent]);
    const isRead = readArticles.includes(article.slug);

    // Extraire le sommaire après le rendu
    useEffect(() => {
        setToc(extractToc(articleContent));
    }, [articleContent]);

    // Persist locale
    useEffect(() => {
        localStorage.setItem('secretis_guide_locale', locale);
    }, [locale]);

    // Intersection Observer pour l'heading actif
    useEffect(() => {
        if (!contentRef.current) return;
        const headings = contentRef.current.querySelectorAll('h2, h3');
        const observer = new IntersectionObserver(
            entries => {
                const visible = entries.find(e => e.isIntersecting);
                if (visible) setActiveHeading(visible.target.id);
            },
            { rootMargin: '-80px 0px -60% 0px' }
        );
        headings.forEach(h => observer.observe(h));
        return () => observer.disconnect();
    }, [contentWithIds]);

    const markAsRead = () => {
        if (!isRead) {
            const updated = [...readArticles, article.slug];
            setReadArticles(updated);
            localStorage.setItem(`guide_read_${section.slug}`, JSON.stringify(updated));
        }
    };

    const scrollToHeading = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const prevTitle = prevArticle?.translations?.[locale]?.title ?? prevArticle?.translations?.fr?.title ?? '';
    const nextTitle = nextArticle?.translations?.[locale]?.title ?? nextArticle?.translations?.fr?.title ?? '';

    return (
        <>
            <Head title={`${articleTitle} | ${sectionTitle} | Guide IBIG SECRETIS`} />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

                {/* Header compact */}
                <div className="text-white py-8 px-4" style={{ background: `linear-gradient(135deg, #1A3A5C, ${section.color})` }}>
                    <div className="max-w-6xl mx-auto">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
                            <Link href="/aide" className="hover:text-white">{t('Aide', 'Help')}</Link>
                            <span>/</span>
                            <Link href="/guide" className="hover:text-white">{t('Guide', 'Guide')}</Link>
                            <span>/</span>
                            <Link href={`/guide/${section.slug}`} className="hover:text-white">{sectionTitle}</Link>
                            <span>/</span>
                            <span className="text-white truncate max-w-[200px]">{articleTitle}</span>
                        </nav>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold">{articleTitle}</h1>
                                <div className="flex items-center gap-3 mt-2 text-white/70 text-sm">
                                    <span className="flex items-center gap-1"><Icon.Clock /> {article.read_time_minutes} min</span>
                                    {isRead && (
                                        <span className="flex items-center gap-1 text-green-300">
                                            <Icon.Check /> {t('Lu', 'Read')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Langue */}
                            <div className="flex items-center gap-2">
                                <Icon.Globe />
                                {['fr', 'en'].map(l => (
                                    <button key={l} onClick={() => setLocale(l)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                            locale === l ? 'bg-white text-[#1A3A5C]' : 'bg-white/20 hover:bg-white/30 text-white'
                                        }`}>
                                        {l === 'fr' ? 'FR' : 'EN'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Corps : Sidebar + Contenu + TOC */}
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="flex gap-8">

                        {/* ── Sidebar gauche : articles de la section ── */}
                        <aside className="hidden lg:block w-60 shrink-0">
                            <div className="sticky top-6">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                                    {sectionTitle}
                                </h2>
                                <ul className="space-y-1">
                                    {sectionArticles.map((a, i) => {
                                        const aTitle = a.translations?.[locale]?.title ?? a.translations?.fr?.title ?? '';
                                        const aRead  = readArticles.includes(a.slug);
                                        const isCurrent = a.slug === article.slug;

                                        return (
                                            <li key={a.id}>
                                                <Link
                                                    href={`/guide/${section.slug}/${a.slug}`}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                                        isCurrent
                                                            ? 'font-semibold text-white'
                                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                                    style={isCurrent ? { backgroundColor: section.color } : {}}
                                                >
                                                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center shrink-0 ${
                                                        aRead && !isCurrent
                                                            ? 'bg-green-100 dark:bg-green-900 text-green-600'
                                                            : isCurrent
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                                    }`}>
                                                        {aRead ? '✓' : i + 1}
                                                    </span>
                                                    <span className="truncate">{aTitle}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </aside>

                        {/* ── Contenu principal ── */}
                        <main className="flex-1 min-w-0">
                            <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-6 sm:px-10 py-8">
                                    <div
                                        ref={contentRef}
                                        className="prose prose-blue dark:prose-invert max-w-none
                                            prose-headings:font-bold
                                            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                                            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                                            prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                                            prose-ul:my-3 prose-li:my-1
                                            prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm
                                            prose-blockquote:border-l-4 prose-blockquote:border-[#2E86C1] prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:not-italic
                                            prose-strong:text-gray-900 dark:prose-strong:text-white"
                                        dangerouslySetInnerHTML={{ __html: contentWithIds }}
                                    />
                                </div>

                                {/* Bouton marquer comme lu */}
                                <div className="px-6 sm:px-10 pb-8">
                                    <button
                                        onClick={markAsRead}
                                        disabled={isRead}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                                            isRead
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                                                : 'text-white hover:opacity-90 shadow-md hover:shadow-lg'
                                        }`}
                                        style={!isRead ? { backgroundColor: section.color } : {}}
                                    >
                                        {isRead ? (
                                            <>
                                                <Icon.CheckCircle />
                                                {t('Article lu ✓', 'Article read ✓')}
                                            </>
                                        ) : (
                                            <>
                                                <Icon.Check />
                                                {t('Marquer comme lu', 'Mark as read')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </article>

                            {/* Navigation Précédent / Suivant */}
                            <div className="mt-6 grid sm:grid-cols-2 gap-4">
                                {prevArticle ? (
                                    <Link
                                        href={`/guide/${section.slug}/${prevArticle.slug}`}
                                        className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 group"
                                    >
                                        <Icon.ChevronLeft />
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t('Précédent', 'Previous')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#2E86C1] transition-colors truncate">
                                                {prevTitle}
                                            </p>
                                        </div>
                                    </Link>
                                ) : <div />}

                                {nextArticle ? (
                                    <Link
                                        href={`/guide/${section.slug}/${nextArticle.slug}`}
                                        className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 group sm:flex-row-reverse"
                                    >
                                        <Icon.ChevronRight />
                                        <div className="min-w-0 sm:text-right">
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t('Suivant', 'Next')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-[#2E86C1] transition-colors truncate">
                                                {nextTitle}
                                            </p>
                                        </div>
                                    </Link>
                                ) : <div />}
                            </div>
                        </main>

                        {/* ── TOC droite ── */}
                        {toc.length > 0 && (
                            <aside className="hidden xl:block w-52 shrink-0">
                                <div className="sticky top-6">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                                        <Icon.List />
                                        {t('Sommaire', 'Contents')}
                                    </div>
                                    <ul className="space-y-1 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                                        {toc.map(item => (
                                            <li key={item.id}>
                                                <button
                                                    onClick={() => scrollToHeading(item.id)}
                                                    className={`text-left w-full text-sm py-0.5 transition-colors ${
                                                        item.level === 'h3' ? 'pl-3' : ''
                                                    } ${
                                                        activeHeading === item.id
                                                            ? 'font-semibold'
                                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                    }`}
                                                    style={activeHeading === item.id ? { color: section.color } : {}}
                                                >
                                                    {item.text}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </aside>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
