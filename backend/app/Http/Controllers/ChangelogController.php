<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class ChangelogController extends Controller
{
    /**
     * GET /changelog — Page de changelog public de SECRETIS.
     */
    public function index(): Response
    {
        return Inertia::render('Help/Changelog', [
            'versions' => self::versions(),
        ]);
    }

    /**
     * Données statiques du changelog (sources de vérité pour la page).
     *
     * @return list<array<string, mixed>>
     */
    private static function versions(): array
    {
        return [
            [
                'version'      => '2.0.0',
                'codename'     => 'Vague 5',
                'released_at'  => '2026-01-15',
                'highlight'    => 'Performance, observabilité et déploiement enterprise',
                'entries'      => [
                    ['type' => 'new',      'text' => 'Tests de charge k6 avec scénarios multi-tenant (10 000 users simultanés)'],
                    ['type' => 'new',      'text' => 'Report Builder visuel — glisser-déposer, 12 types de graphiques, export PDF/Excel'],
                    ['type' => 'new',      'text' => 'Push notifications Web & mobile (FCM + APNs) avec templates personnalisables'],
                    ['type' => 'new',      'text' => 'Interface Backup & Restore — planification, chiffrement, stockage S3 ou local'],
                    ['type' => 'new',      'text' => 'Dashboard SuperAdmin v2 — MRR, churn, cohortes, health score par organisation'],
                    ['type' => 'new',      'text' => '6 landing pages sectorielles (BTP, Santé, Éducation, ONG, Hôtellerie, Finance)'],
                    ['type' => 'improved', 'text' => 'SARA v2 — mémoire persistante, suggestions proactives, intégration calendrier'],
                    ['type' => 'improved', 'text' => 'API REST publique documentée (OpenAPI 3.1) avec portail développeurs'],
                    ['type' => 'fixed',    'text' => 'Correction des fuseaux horaires pour les organisations en Afrique centrale'],
                ],
            ],
            [
                'version'      => '1.5.0',
                'codename'     => 'Vague 4',
                'released_at'  => '2025-10-01',
                'highlight'    => 'Mobile, CI/CD et accessibilité',
                'entries'      => [
                    ['type' => 'new',      'text' => 'Application mobile React Native (iOS & Android) — 8 modules ERP offline-first'],
                    ['type' => 'new',      'text' => 'Tests E2E Playwright couvrant 47 scénarios critiques'],
                    ['type' => 'new',      'text' => 'Stack Docker production avec Nginx, PHP-FPM optimisé, Redis cluster'],
                    ['type' => 'new',      'text' => 'Pipeline CI/CD GitHub Actions — lint, tests, build, déploiement blue/green'],
                    ['type' => 'improved', 'text' => 'Conformité WCAG 2.1 AA — navigation clavier, ARIA, contrastes vérifiés'],
                    ['type' => 'improved', 'text' => 'Performance SQL — 23 index ajoutés, temps de réponse médian réduit de 40 %'],
                    ['type' => 'fixed',    'text' => 'Correction de la pagination infinie sur le module GED (> 1 000 documents)'],
                    ['type' => 'fixed',    'text' => 'Résolution du conflit de timezone lors des réunions planifiées hors OHADA'],
                ],
            ],
            [
                'version'      => '1.0.0',
                'codename'     => 'Vague 3',
                'released_at'  => '2025-07-01',
                'highlight'    => 'Console SuperAdmin, CRM et Académie',
                'entries'      => [
                    ['type' => 'new',      'text' => 'Console SuperAdmin complète — gestion organisations, licences, feature flags'],
                    ['type' => 'new',      'text' => 'CRM Prospects intégré — pipeline Kanban, scoring, import CSV/Excel'],
                    ['type' => 'new',      'text' => 'Académie SECRETIS — cours vidéo, quiz, certification, progression gamifiée'],
                    ['type' => 'new',      'text' => 'PWA installable — mode hors-ligne pour les 5 modules les plus utilisés'],
                    ['type' => 'new',      'text' => 'Journal d\'audit complet — toutes les actions tracées, export JSON/CSV'],
                    ['type' => 'improved', 'text' => 'Refonte UI complète en dark mode natif (TailwindCSS v3)'],
                    ['type' => 'improved', 'text' => 'Onboarding wizard 6 étapes avec emails de relance automatisés'],
                ],
            ],
            [
                'version'      => '0.9.0',
                'codename'     => 'Version initiale',
                'released_at'  => '2025-04-01',
                'highlight'    => 'Lancement des 10 modules ERP fondamentaux',
                'entries'      => [
                    ['type' => 'new', 'text' => '10 modules ERP : Agenda, Courrier, GED, Réunions, Tâches, Visiteurs, Budget, RH, Ressources, Projets'],
                    ['type' => 'new', 'text' => 'Authentification MFA (TOTP + SMS) avec sessions multi-appareils'],
                    ['type' => 'new', 'text' => 'SARA v1 — assistant IA basé sur GPT-4o, intégré à tous les modules'],
                    ['type' => 'new', 'text' => 'Paiements OHADA — 11 familles de dépenses, export SYSCOHADA'],
                    ['type' => 'new', 'text' => 'Multi-tenant avec isolation complète des données par organisation'],
                    ['type' => 'new', 'text' => 'Support 4 langues : Français, Anglais, Arabe, Portugais'],
                ],
            ],
        ];
    }
}
