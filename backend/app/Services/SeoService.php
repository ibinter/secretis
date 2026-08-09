<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class SeoService
{
    /**
     * Durée d'essai — lue dans la source unique de vérité.
     *
     * Les méta-descriptions annonçaient « Essai gratuit 30 jours » alors que la
     * configuration en fixe 14. C'est la pire place possible pour une
     * contradiction : ce texte est ce que le moteur de recherche affiche, donc
     * la première phrase que lit un prospect — et il la lira avant la page qui
     * dit autre chose. Le prix « à partir de 29 000 XOF/mois » a été retiré
     * pour la même raison : il ne correspondait à aucune ligne de `plans`, et
     * la correction C2 n'admet qu'une seule vérité tarifaire par page.
     */
    private function essaiJours(): int
    {
        return app(\App\Services\LicenceService::class)->essaiJours();
    }

    private const BASE_URL   = 'https://secretis.ibigsoft.com';
    private const OG_IMAGE   = 'https://secretis.ibigsoft.com/images/og-secretis.jpg';
    private const TWITTER_HANDLE = '@IBIGSoft';

    /**
     * Retourne toutes les balises méta pour une page donnée.
     */
    public function getMetaTags(string $page): array
    {
        $meta  = $this->getPageMeta($page);
        $canon = self::BASE_URL . $page;

        return [
            'title'            => $meta['title'],
            'description'      => $meta['description'],
            'keywords'         => $meta['keywords'] ?? '',
            'og_title'         => $meta['og_title'] ?? $meta['title'],
            'og_description'   => $meta['og_description'] ?? $meta['description'],
            'og_image'         => $meta['og_image'] ?? self::OG_IMAGE,
            'og_type'          => 'website',
            'og_url'           => $canon,
            'og_site_name'     => 'IBIG SECRETIS',
            'og_locale'        => 'fr_FR',
            'og_locale_alternate' => 'en_US',
            'twitter_card'     => 'summary_large_image',
            'twitter_site'     => self::TWITTER_HANDLE,
            'twitter_title'    => $meta['og_title'] ?? $meta['title'],
            'twitter_description' => $meta['og_description'] ?? $meta['description'],
            'twitter_image'    => $meta['og_image'] ?? self::OG_IMAGE,
            'canonical'        => $canon,
            'robots'           => $meta['robots'] ?? 'index, follow',
            'hreflang'         => [
                'fr'        => $canon,
                'en'        => self::BASE_URL . '/en' . $page,
                'x-default' => $canon,
            ],
        ];
    }

    /**
     * Retourne les données structurées JSON-LD pour un type de page donné.
     */
    public function getStructuredData(string $type, array $context = []): array
    {
        return match ($type) {
            'SoftwareApplication' => $this->softwareApplicationSchema(),
            'FAQPage'             => $this->faqPageSchema($context['faqs'] ?? []),
            'Organization'        => $this->organizationSchema(),
            'BreadcrumbList'      => $this->breadcrumbSchema($context['crumbs'] ?? []),
            default               => [],
        };
    }

    // ---------------------------------------------------------------------------
    // SCHÉMAS JSON-LD
    // ---------------------------------------------------------------------------

    private function softwareApplicationSchema(): array
    {
        return [
            '@context'            => 'https://schema.org',
            '@type'               => 'SoftwareApplication',
            'name'                => 'IBIG SECRETIS',
            'applicationCategory' => 'BusinessApplication',
            'applicationSubCategory' => 'ERP',
            'operatingSystem'     => 'Web, Android, iOS',
            'url'                 => self::BASE_URL,
            'description'         => 'ERP cloud complet pour entreprises africaines — comptabilité SYSCOHADA, gestion RH, CRM, GED, projets et bien plus.',
            'screenshot'          => self::OG_IMAGE,
            'softwareVersion'     => '2.0.0',
            'datePublished'       => '2026-07-22',
            'inLanguage'          => ['fr', 'en', 'ar', 'pt-BR', 'sw'],
            'offers'              => [
                '@type'           => 'Offer',
                'priceCurrency'   => 'XOF',
                'price'           => '0',
                'description'     => 'Essai de ' . $this->essaiJours() . ' jours, sans carte bancaire.',
                'url'             => self::BASE_URL . '/tarifs',
            ],
            'aggregateRating'     => [
                '@type'       => 'AggregateRating',
                'ratingValue' => '4.8',
                'ratingCount' => '312',
                'bestRating'  => '5',
                'worstRating' => '1',
            ],
            'author' => [
                '@type' => 'Organization',
                'name'  => 'IBIG Soft',
                'url'   => 'https://ibigsoft.com',
            ],
        ];
    }

    private function faqPageSchema(array $faqs): array
    {
        if (empty($faqs)) {
            return [];
        }

        return [
            '@context'   => 'https://schema.org',
            '@type'      => 'FAQPage',
            'mainEntity' => array_map(fn ($faq) => [
                '@type'          => 'Question',
                'name'           => $faq['question'],
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text'  => $faq['answer'],
                ],
            ], $faqs),
        ];
    }

    private function organizationSchema(): array
    {
        return [
            '@context'    => 'https://schema.org',
            '@type'       => 'Organization',
            'name'        => 'IBIG Soft',
            'url'         => 'https://ibigsoft.com',
            'logo'        => self::BASE_URL . '/images/logo-ibig.png',
            'description' => 'Éditeur de logiciels ERP pour les entreprises d\'Afrique subsaharienne.',
            'foundingDate' => '2020',
            'contactPoint' => [
                '@type'             => 'ContactPoint',
                'contactType'       => 'customer support',
                'availableLanguage' => ['French', 'English'],
                'email'             => 'support@ibigsoft.com',
            ],
            'address' => [
                '@type'           => 'PostalAddress',
                'addressCountry'  => 'CI',
                'addressLocality' => 'Abidjan',
            ],
            'sameAs' => [
                'https://www.linkedin.com/company/ibigsoft',
                'https://twitter.com/IBIGSoft',
            ],
        ];
    }

    private function breadcrumbSchema(array $crumbs): array
    {
        if (empty($crumbs)) {
            return [];
        }

        return [
            '@context'        => 'https://schema.org',
            '@type'           => 'BreadcrumbList',
            'itemListElement' => array_map(fn ($crumb, $idx) => [
                '@type'    => 'ListItem',
                'position' => $idx + 1,
                'name'     => $crumb['label'],
                'item'     => self::BASE_URL . $crumb['url'],
            ], $crumbs, array_keys($crumbs)),
        ];
    }

    // ---------------------------------------------------------------------------
    // MÉTA PAR PAGE
    // ---------------------------------------------------------------------------

    private function getPageMeta(string $page): array
    {
        $map = [
            '/' => [
                'title'       => 'IBIG SECRETIS — ERP cloud pour l\'Afrique | Essai de ' . $this->essaiJours() . ' jours',
                'description' => 'Gérez votre entreprise avec le premier ERP pensé pour l\'Afrique : comptabilité SYSCOHADA, RH, CRM, GED, projets. Démarrez gratuitement.',
                'keywords'    => 'ERP Afrique, logiciel gestion entreprise, SYSCOHADA, comptabilité Côte d\'Ivoire, CRM Afrique',
            ],
            '/fonctionnalites' => [
                'title'       => 'Fonctionnalités — IBIG SECRETIS ERP',
                'description' => 'Découvrez les 100+ fonctionnalités de SECRETIS : comptabilité, RH, CRM, GED, projets, budgets, conformité OHADA et bien plus.',
                'keywords'    => 'fonctionnalités ERP, modules gestion entreprise, OHADA, RH Africa',
            ],
            '/modules' => [
                'title'       => 'Modules — IBIG SECRETIS ERP',
                'description' => 'Explorez les 20+ modules de SECRETIS adaptés aux besoins spécifiques des entreprises africaines.',
            ],
            '/tarifs' => [
                'title'       => 'Tarifs — IBIG SECRETIS ERP | Plans Starter, Pro, Enterprise',
                'description' => 'Des tarifs transparents adaptés à votre taille. Essai de ' . $this->essaiJours() . ' jours, sans carte bancaire.',
                'keywords'    => 'tarifs ERP Afrique, prix logiciel gestion, abonnement ERP',
            ],
            '/demonstration' => [
                'title'       => 'Demander une démo — IBIG SECRETIS ERP',
                'description' => 'Réservez une démonstration gratuite avec un expert SECRETIS et découvrez comment transformer la gestion de votre entreprise.',
            ],
            '/assistance' => [
                'title'       => 'Assistance — IBIG SECRETIS ERP',
                'description' => 'Notre équipe support est disponible pour vous aider. Centre d\'aide, chat en direct, WhatsApp et formation inclus.',
            ],
            '/a-propos' => [
                'title'       => 'À propos — IBIG Soft, éditeur de SECRETIS ERP',
                'description' => 'IBIG Soft est un éditeur africain de logiciels ERP. Découvrez notre mission, notre équipe et notre engagement pour la transformation digitale en Afrique.',
            ],
        ];

        return $map[$page] ?? [
            'title'       => 'IBIG SECRETIS — ERP cloud pour l\'Afrique',
            'description' => 'Gérez votre entreprise avec le premier ERP pensé pour l\'Afrique.',
        ];
    }
}
