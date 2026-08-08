/**
 * SECRETIS ERP — Help/Guide/Index.jsx
 * Accueil du guide utilisateur : grille des sections + filtre par rôle.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ─── Icônes par slug de section ───────────────────────────────────────────────
const SectionIcon = ({ name, className = 'w-7 h-7' }) => {
    const icons = {
        RocketLaunch: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
        ),
        CalendarDays: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
        ),
        FolderOpen: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
        ),
        CheckSquare: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        UserGroup: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
        ),
        CreditCard: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
        ),
        Cog6Tooth: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        Puzzle: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
            </svg>
        ),
    };
    return icons[name] ?? icons['RocketLaunch'];
};

// ─── Rôles disponibles ────────────────────────────────────────────────────────
const ROLES = [
    { key: 'all',       labelFr: 'Tous',         labelEn: 'All' },
    { key: 'secretaire',labelFr: 'Secrétaire',   labelEn: 'Secretary' },
    { key: 'dirigeant', labelFr: 'Dirigeant',    labelEn: 'Executive' },
    { key: 'admin',     labelFr: 'Admin',        labelEn: 'Admin' },
    { key: 'rh',        labelFr: 'RH',           labelEn: 'HR' },
    { key: 'comptable', labelFr: 'Comptable',    labelEn: 'Accountant' },
];

export default function GuideIndex({ sections = [] }) {
    const [locale, setLocale] = useState(() => localStorage.getItem('secretis_guide_locale') || 'fr');
    const [role, setRole]     = useState('all');

    useEffect(() => {
        localStorage.setItem('secretis_guide_locale', locale);
    }, [locale]);

    const filteredSections = useMemo(() => {
        if (role === 'all') return sections;
        return sections.filter(s => s.role_target === 'all' || s.role_target === role);
    }, [sections, role]);

    // Premiers pas : 3 premiers articles de la section 1
    const firstSection = sections.find(s => s.slug === 'premiers-pas');
    const startArticles = firstSection?.first_article ? [firstSection.first_article] : [];

    const t = (fr, en) => locale === 'fr' ? fr : en;

    return (
        <AppLayout>
            <Head title={t('Guide utilisateur | IBIG SECRETIS', 'User Guide | IBIG SECRETIS')} />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

                {/* Hero */}
                <div className="bg-gradient-to-br from-[#9333EA] to-[#7e22ce] text-white py-14 px-4">
                    <div className="max-w-5xl mx-auto">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-sm text-purple-200 mb-6">
                            <Link href="/aide" className="hover:text-white">{t('Aide', 'Help')}</Link>
                            <span>/</span>
                            <span className="text-white">{t('Guide utilisateur', 'User Guide')}</span>
                        </nav>
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                                    {t('Guide utilisateur', 'User Guide')}
                                </h1>
                                <p className="text-purple-100 text-lg">
                                    {t(
                                        `${sections.length} sections · ${sections.reduce((acc, s) => acc + (s.articles_count || 0), 0)} articles détaillés`,
                                        `${sections.length} sections · ${sections.reduce((acc, s) => acc + (s.articles_count || 0), 0)} detailed articles`
                                    )}
                                </p>
                            </div>
                            {/* Langue */}
                            <div className="flex items-center gap-2">
                                {['fr', 'en'].map(l => (
                                    <button key={l} onClick={() => setLocale(l)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                            locale === l ? 'bg-white text-[#9333EA]' : 'bg-white/20 hover:bg-white/30 text-white'
                                        }`}>
                                        {l === 'fr' ? 'Français' : 'English'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 py-10">

                    {/* Filtre par rôle */}
                    <div className="mb-8">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                            {t('Je suis…', 'I am…')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {ROLES.map(r => (
                                <button key={r.key} onClick={() => setRole(r.key)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                        role === r.key
                                            ? 'bg-[#9333EA] text-white'
                                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#7e22ce] hover:text-[#7e22ce]'
                                    }`}>
                                    {locale === 'fr' ? r.labelFr : r.labelEn}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Par où commencer */}
                    {firstSection && role === 'all' && (
                        <div className="mb-10 bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-[#9333EA] dark:text-purple-300 mb-4">
                                🚀 {t('Par où commencer ?', 'Where to start?')}
                            </h2>
                            <div className="grid sm:grid-cols-3 gap-3">
                                {/* Les 3 premiers articles de "Premiers pas" */}
                                {sections.find(s => s.slug === 'premiers-pas') && (
                                    <>
                                        {[
                                            { slug: 'creer-votre-compte-et-configurer-votre-organisation', fr: 'Créer votre compte', en: 'Create your account', num: 1 },
                                            { slug: 'comprendre-le-tableau-de-bord', fr: 'Comprendre le tableau de bord', en: 'Understand the dashboard', num: 2 },
                                            { slug: 'inviter-votre-equipe', fr: 'Inviter votre équipe', en: 'Invite your team', num: 3 },
                                        ].map(item => (
                                            <Link
                                                key={item.slug}
                                                href={`/guide/premiers-pas/${item.slug}`}
                                                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                                            >
                                                <span className="w-8 h-8 rounded-full bg-[#9333EA] text-white text-sm font-bold flex items-center justify-center shrink-0">
                                                    {item.num}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-[#7e22ce] transition-colors">
                                                    {locale === 'fr' ? item.fr : item.en}
                                                </span>
                                            </Link>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Grille des sections */}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">
                        {t('Toutes les sections', 'All sections')}
                        {role !== 'all' && (
                            <span className="ml-2 text-sm font-normal text-gray-400">
                                — {filteredSections.length} {t('section(s) correspondant à votre rôle', 'section(s) for your role')}
                            </span>
                        )}
                    </h2>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredSections.map((section) => {
                            const title       = section.translations?.[locale]?.title ?? section.translations?.fr?.title ?? '';
                            const description = section.translations?.[locale]?.description ?? section.translations?.fr?.description ?? '';

                            return (
                                <Link
                                    key={section.id}
                                    href={`/guide/${section.slug}`}
                                    className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 hover:border-transparent hover:-translate-y-0.5"
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                                        style={{ backgroundColor: section.color }}
                                    >
                                        <SectionIcon name={section.icon} className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-[#7e22ce] transition-colors">
                                        {title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                        {description}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                                        <span>
                                            {section.articles_count} {t('article', 'article')}{section.articles_count > 1 ? 's' : ''}
                                        </span>
                                        <span>·</span>
                                        <span>~{section.total_read_time} min</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {filteredSections.length === 0 && (
                        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                            {t('Aucune section disponible pour ce rôle.', 'No sections available for this role.')}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
export { GuideIndex };
