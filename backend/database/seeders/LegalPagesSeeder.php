<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * SECRETIS ERP — LegalPagesSeeder
 *
 * Insère les 18 pages légales d'IBIG SECRETIS ERP.
 * Contenu adapté au droit OHADA + RGPD + loi ivoirienne ARTCI.
 * Chaque page : titre bilingue FR/EN, contenu FR complet, version 1.0.
 */
class LegalPagesSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('   → Insertion des 18 pages légales SECRETIS...');

        $effectiveDate = Carbon::parse('2026-01-01');
        $now = Carbon::now();

        $pages = $this->getPages();

        foreach ($pages as $page) {
            DB::table('legal_pages')->updateOrInsert(
                ['slug' => $page['slug']],
                array_merge($page, [
                    'version'        => '1.0',
                    'is_active'      => true,
                    'is_public'      => true,
                    'published_at'   => $now,
                    'effective_date' => $effectiveDate,
                    'created_at'     => $now,
                    'updated_at'     => $now,
                ])
            );
        }

        $this->command->info('   ✓ ' . count($pages) . ' pages légales insérées.');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Définition des 18 pages
    // ──────────────────────────────────────────────────────────────────────────

    private function getPages(): array
    {
        return [

            // ── 1. Mentions légales ──────────────────────────────────────────
            [
                'slug'                => 'mentions-legales',
                'title'               => json_encode(['fr' => 'Mentions légales', 'en' => 'Legal Notice']),
                'icon'                => 'building-office-2',
                'category'            => 'general',
                'display_order'       => 1,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->mentionsLegales(), 'en' => 'See French version.']),
            ],

            // ── 2. Conditions générales d'utilisation ────────────────────────
            [
                'slug'                => 'cgu',
                'title'               => json_encode(['fr' => "Conditions générales d'utilisation", 'en' => 'Terms of Use']),
                'icon'                => 'document-check',
                'category'            => 'usage',
                'display_order'       => 2,
                'requires_acceptance' => true,
                'content'             => json_encode(['fr' => $this->cgu(), 'en' => 'See French version.']),
            ],

            // ── 3. Conditions générales de vente ────────────────────────────
            [
                'slug'                => 'cgv',
                'title'               => json_encode(['fr' => 'Conditions générales de vente', 'en' => 'General Terms of Sale']),
                'icon'                => 'currency-dollar',
                'category'            => 'commercial',
                'display_order'       => 3,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->cgv(), 'en' => 'See French version.']),
            ],

            // ── 4. Contrat de licence ────────────────────────────────────────
            [
                'slug'                => 'contrat-licence',
                'title'               => json_encode(['fr' => 'Contrat de licence utilisateur final (CLUF)', 'en' => 'End-User License Agreement (EULA)']),
                'icon'                => 'key',
                'category'            => 'commercial',
                'display_order'       => 4,
                'requires_acceptance' => true,
                'content'             => json_encode(['fr' => $this->contratLicence(), 'en' => 'See French version.']),
            ],

            // ── 5. Politique de confidentialité ─────────────────────────────
            [
                'slug'                => 'politique-confidentialite',
                'title'               => json_encode(['fr' => 'Politique de confidentialité', 'en' => 'Privacy Policy']),
                'icon'                => 'eye-slash',
                'category'            => 'privacy',
                'display_order'       => 5,
                'requires_acceptance' => true,
                'content'             => json_encode(['fr' => $this->politiqueConfidentialite(), 'en' => 'See French version.']),
            ],

            // ── 6. Politique des cookies ─────────────────────────────────────
            [
                'slug'                => 'politique-cookies',
                'title'               => json_encode(['fr' => 'Politique des cookies', 'en' => 'Cookie Policy']),
                'icon'                => 'cursor-arrow-ripple',
                'category'            => 'privacy',
                'display_order'       => 6,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->politiqueCookies(), 'en' => 'See French version.']),
            ],

            // ── 7. Politique de sauvegarde ───────────────────────────────────
            [
                'slug'                => 'politique-sauvegarde',
                'title'               => json_encode(['fr' => 'Politique de sauvegarde des données', 'en' => 'Data Backup Policy']),
                'icon'                => 'server',
                'category'            => 'support',
                'display_order'       => 7,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->politiqueSauvegarde(), 'en' => 'See French version.']),
            ],

            // ── 8. Politique de support ──────────────────────────────────────
            [
                'slug'                => 'politique-support',
                'title'               => json_encode(['fr' => 'Politique de support technique', 'en' => 'Technical Support Policy']),
                'icon'                => 'lifebuoy',
                'category'            => 'support',
                'display_order'       => 8,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->politiqueSupport(), 'en' => 'See French version.']),
            ],

            // ── 9. Politique de résiliation ──────────────────────────────────
            [
                'slug'                => 'politique-resiliation',
                'title'               => json_encode(['fr' => 'Politique de résiliation', 'en' => 'Termination Policy']),
                'icon'                => 'x-circle',
                'category'            => 'commercial',
                'display_order'       => 9,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->politiqueResiliation(), 'en' => 'See French version.']),
            ],

            // ── 10. Politique de remboursement ───────────────────────────────
            [
                'slug'                => 'politique-remboursement',
                'title'               => json_encode(['fr' => 'Politique de remboursement', 'en' => 'Refund Policy']),
                'icon'                => 'arrow-uturn-left',
                'category'            => 'commercial',
                'display_order'       => 10,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->politiqueRemboursement(), 'en' => 'See French version.']),
            ],

            // ── 11. Accord de traitement des données (DPA) ──────────────────
            [
                'slug'                => 'traitement-donnees',
                'title'               => json_encode(['fr' => 'Accord de traitement des données (DPA)', 'en' => 'Data Processing Agreement (DPA)']),
                'icon'                => 'shield-check',
                'category'            => 'privacy',
                'display_order'       => 11,
                'requires_acceptance' => true,
                'content'             => json_encode(['fr' => $this->traitementDonnees(), 'en' => 'See French version.']),
            ],

            // ── 12. Propriété intellectuelle ─────────────────────────────────
            [
                'slug'                => 'propriete-intellectuelle',
                'title'               => json_encode(['fr' => 'Propriété intellectuelle', 'en' => 'Intellectual Property']),
                'icon'                => 'light-bulb',
                'category'            => 'general',
                'display_order'       => 12,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->proprieteIntellectuelle(), 'en' => 'See French version.']),
            ],

            // ── 13. Protection des marques ───────────────────────────────────
            [
                'slug'                => 'protection-marque',
                'title'               => json_encode(['fr' => 'Protection des marques déposées', 'en' => 'Trademark Protection']),
                'icon'                => 'tag',
                'category'            => 'general',
                'display_order'       => 13,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->protectionMarque(), 'en' => 'See French version.']),
            ],

            // ── 14. Conditions d'essai ───────────────────────────────────────
            [
                'slug'                => 'conditions-essai',
                'title'               => json_encode(['fr' => "Conditions d'essai gratuit (Trial)", 'en' => 'Free Trial Terms']),
                'icon'                => 'beaker',
                'category'            => 'usage',
                'display_order'       => 14,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->conditionsEssai(), 'en' => 'See French version.']),
            ],

            // ── 15. Conditions d'utilisation de SARA ────────────────────────
            [
                'slug'                => 'conditions-sara',
                'title'               => json_encode(['fr' => "Conditions d'utilisation de SARA (IA)", 'en' => 'SARA AI Terms of Use']),
                'icon'                => 'cpu-chip',
                'category'            => 'usage',
                'display_order'       => 15,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->conditionsSara(), 'en' => 'See French version.']),
            ],

            // ── 16. Limitation de responsabilité IA ─────────────────────────
            [
                'slug'                => 'limitation-responsabilite-ia',
                'title'               => json_encode(['fr' => "Limitation de responsabilité liée à l'IA", 'en' => 'AI Liability Limitation']),
                'icon'                => 'exclamation-triangle',
                'category'            => 'usage',
                'display_order'       => 16,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->limitationResponsabiliteIa(), 'en' => 'See French version.']),
            ],

            // ── 17. Gestion du compte ────────────────────────────────────────
            [
                'slug'                => 'gestion-compte',
                'title'               => json_encode(['fr' => 'Gestion et clôture du compte', 'en' => 'Account Management & Closure']),
                'icon'                => 'user-circle',
                'category'            => 'general',
                'display_order'       => 17,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->gestionCompte(), 'en' => 'See French version.']),
            ],

            // ── 18. Gestion des réclamations ─────────────────────────────────
            [
                'slug'                => 'gestion-reclamations',
                'title'               => json_encode(['fr' => 'Procédure de réclamation', 'en' => 'Claims & Dispute Resolution']),
                'icon'                => 'chat-bubble-left-right',
                'category'            => 'support',
                'display_order'       => 18,
                'requires_acceptance' => false,
                'content'             => json_encode(['fr' => $this->gestionReclamations(), 'en' => 'See French version.']),
            ],
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Contenus FR des 18 pages
    // ──────────────────────────────────────────────────────────────────────────

    private function mentionsLegales(): string
    {
        return <<<HTML
<h2>Mentions légales</h2>
<p><em>En vigueur au 1er janvier 2026</em></p>

<h3>1. Éditeur du logiciel</h3>
<p>
  <strong>Dénomination sociale :</strong> IBIG SARL (Intermark Business International Group)<br>
  <strong>Forme juridique :</strong> Société à Responsabilité Limitée de droit ivoirien<br>
  <strong>Capital social :</strong> 10 000 000 FCFA<br>
  <strong>Siège social :</strong> Abidjan, Cocody Les Deux Plateaux – Côte d'Ivoire<br>
  <strong>RCCM :</strong> CI-ABJ-2020-B-12456<br>
  <strong>Numéro CNPS :</strong> CNPS-CI-2020-XXX-001<br>
  <strong>Email général :</strong> contact@ibigsoft.com<br>
  <strong>Téléphone :</strong> +225 27 22 XX XX XX
</p>

<h3>2. Directeur de la publication</h3>
<p>
  Le Directeur Général d'IBIG SARL est responsable de la publication du logiciel IBIG SECRETIS ERP et de son contenu.
  Toute demande relative au contenu éditorial peut être adressée à : <a href="mailto:direction@ibigsoft.com">direction@ibigsoft.com</a>.
</p>

<h3>3. Hébergement</h3>
<p>
  IBIG SECRETIS ERP est hébergé sur des infrastructures cloud conformes aux normes ISO 27001.
  Le prestataire d'hébergement retenu est soumis à des obligations contractuelles strictes en matière de sécurité, de disponibilité et de confidentialité des données.
  L'hébergement des données des clients est localisé dans des datacenters situés en Afrique de l'Ouest et/ou en Europe, conformément aux engagements contractuels.
</p>

<h3>4. Propriété intellectuelle</h3>
<p>
  L'ensemble des éléments constituant IBIG SECRETIS ERP — code source, interfaces graphiques, architecture logicielle, base de données, documentation, logo, marque SECRETIS, assistant IA SARA — sont la propriété exclusive d'IBIG SARL et sont protégés par les dispositions de l'Accord de Bangui révisé (OAPI), le Code de propriété intellectuelle ivoirien et les conventions internationales applicables.
</p>
<p>
  Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie du logiciel, par quelque procédé que ce soit, sans l'autorisation préalable écrite d'IBIG SARL, est strictement interdite sous peine de poursuites judiciaires.
</p>

<h3>5. Contact éditeur</h3>
<p>
  Pour toute question juridique ou relative aux présentes mentions légales :<br>
  <strong>Email :</strong> <a href="mailto:legal@ibigsoft.com">legal@ibigsoft.com</a><br>
  <strong>Adresse :</strong> IBIG SARL — Service Juridique, Abidjan – Côte d'Ivoire
</p>

<h3>6. Droit applicable et juridiction</h3>
<p>
  Les présentes mentions légales sont régies par le droit ivoirien. En cas de litige, et à défaut de résolution amiable dans un délai de 30 jours, les parties conviennent de soumettre leur différend à la compétence exclusive des juridictions compétentes d'Abidjan, Côte d'Ivoire.
</p>
HTML;
    }

    private function cgu(): string
    {
        return <<<HTML
<h2>Conditions générales d'utilisation (CGU)</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>Article 1 — Objet</h3>
<p>
  Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme logicielle IBIG SECRETIS ERP (ci-après « SECRETIS » ou « la Plateforme »), éditée par IBIG SARL (ci-après « IBIG Soft »).
  En accédant à SECRETIS, l'utilisateur reconnaît avoir pris connaissance des présentes CGU et les accepte sans réserve.
</p>

<h3>Article 2 — Accès à la Plateforme</h3>
<p>
  L'accès à SECRETIS est réservé aux utilisateurs disposant d'un compte valide, créé dans le cadre d'un abonnement souscrit par leur organisation. L'accès s'effectue via un navigateur web moderne ou l'application mobile SECRETIS, par authentification sécurisée (identifiant + mot de passe, ou SSO selon le plan souscrit).
</p>
<p>
  IBIG Soft garantit une disponibilité de la Plateforme de 99,5% par mois calendaire, hors maintenance planifiée annoncée 48 heures à l'avance.
</p>

<h3>Article 3 — Création et gestion du compte</h3>
<p>
  L'administrateur de l'organisation est responsable de la création et de la gestion des comptes utilisateurs au sein de son espace SECRETIS. Il lui appartient de s'assurer que les informations renseignées sont exactes et à jour, et de révoquer sans délai les accès des utilisateurs ayant quitté l'organisation.
</p>
<p>
  Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion. Tout accès au compte avec les identifiants de l'utilisateur est présumé effectué par cet utilisateur.
</p>

<h3>Article 4 — Utilisation autorisée</h3>
<p>
  SECRETIS est mis à disposition des utilisateurs pour un usage professionnel dans le cadre des activités de leur organisation. L'utilisateur s'engage à utiliser la Plateforme conformément à sa destination et aux présentes CGU.
</p>

<h3>Article 5 — Interdictions</h3>
<p>Il est expressément interdit à l'utilisateur de :</p>
<ul>
  <li>Tenter d'accéder aux données d'une autre organisation ;</li>
  <li>Procéder à des tentatives de piratage, d'intrusion ou de déni de service ;</li>
  <li>Introduire des virus ou codes malveillants dans la Plateforme ;</li>
  <li>Utiliser SECRETIS à des fins illégales, frauduleuses ou contraires aux bonnes mœurs ;</li>
  <li>Revendre, sous-licencier ou transférer l'accès à des tiers non autorisés ;</li>
  <li>Tenter d'effectuer de la rétro-ingénierie sur le logiciel.</li>
</ul>

<h3>Article 6 — Responsabilité de l'utilisateur</h3>
<p>
  L'utilisateur est seul responsable des données qu'il saisit, importe ou génère dans SECRETIS. IBIG Soft ne peut être tenu responsable des dommages résultant d'une utilisation non conforme aux présentes CGU.
</p>

<h3>Article 7 — Résiliation</h3>
<p>
  IBIG Soft se réserve le droit de suspendre ou de résilier l'accès de tout utilisateur en cas de violation des présentes CGU, sans préavis ni indemnité, et sans préjudice de toute action en justice.
</p>

<h3>Article 8 — Modifications des CGU</h3>
<p>
  IBIG Soft peut modifier les présentes CGU à tout moment. Les utilisateurs sont informés par notification in-app et par email au moins 15 jours avant l'entrée en vigueur des modifications. La poursuite de l'utilisation de la Plateforme après cette date vaut acceptation des nouvelles CGU.
</p>

<h3>Article 9 — Droit applicable</h3>
<p>
  Les présentes CGU sont soumises au droit ivoirien. Tout litige sera soumis, à défaut d'accord amiable, à la compétence des juridictions compétentes d'Abidjan (Côte d'Ivoire).
</p>
HTML;
    }

    private function cgv(): string
    {
        return <<<HTML
<h2>Conditions générales de vente (CGV)</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>Article 1 — Champ d'application</h3>
<p>
  Les présentes Conditions Générales de Vente régissent les relations commerciales entre IBIG SARL (ci-après « IBIG Soft ») et toute personne morale ou physique (ci-après « le Client ») souscrivant un abonnement à la plateforme IBIG SECRETIS ERP.
</p>

<h3>Article 2 — Prix et tarification</h3>
<p>
  Les prix des abonnements sont exprimés en Francs CFA (FCFA) hors taxes. La TVA applicable est celle en vigueur en Côte d'Ivoire au jour de la facturation (actuellement 18%).
  Les tarifs en vigueur sont consultables sur la page tarifaire officielle de SECRETIS. IBIG Soft se réserve le droit de modifier ses tarifs avec un préavis de 30 jours calendaires.
</p>

<h3>Article 3 — Modalités de paiement</h3>
<p>
  Les abonnements sont facturés mensuellement ou annuellement selon le choix du Client lors de la souscription. Les paiements sont effectués par virement bancaire, carte bancaire, ou tout autre moyen de paiement accepté par IBIG Soft.
  En cas de retard de paiement supérieur à 15 jours, IBIG Soft se réserve le droit de suspendre l'accès à la Plateforme jusqu'à régularisation.
</p>

<h3>Article 4 — Durée et renouvellement</h3>
<p>
  L'abonnement est souscrit pour une durée d'un mois ou d'un an (selon l'offre choisie) et se renouvelle tacitement pour une période identique, sauf résiliation adressée par email à <a href="mailto:resiliation@ibigsoft.com">resiliation@ibigsoft.com</a> au moins 30 jours avant la date d'échéance.
</p>

<h3>Article 5 — Politique de remboursement</h3>
<p>
  Conformément à la nature du service (licence logicielle SaaS), aucun remboursement n'est accordé après activation de l'abonnement. Pour les cas d'incidents graves confirmés par IBIG Soft, un crédit commercial peut être accordé. Voir la <a href="/legal/politique-remboursement">Politique de remboursement</a> pour les détails.
</p>

<h3>Article 6 — Livraison du service</h3>
<p>
  L'accès à SECRETIS est ouvert immédiatement après confirmation du paiement et création du compte organisation. IBIG Soft s'engage à fournir un service conforme aux spécifications techniques décrites dans la documentation officielle.
</p>

<h3>Article 7 — Résiliation</h3>
<p>
  Le Client peut résilier son abonnement à tout moment avec un préavis de 30 jours. La résiliation prend effet à la fin de la période d'abonnement en cours. Les données du Client sont conservées pendant 90 jours après la date effective de résiliation, puis supprimées définitivement.
</p>

<h3>Article 8 — Droit applicable et juridiction compétente</h3>
<p>
  Les présentes CGV sont soumises au droit ivoirien et aux règlements de l'OHADA. Tout litige sera soumis, à défaut d'accord amiable dans un délai de 30 jours, à la compétence des juridictions d'Abidjan (Côte d'Ivoire), ou à la médiation de la CCJA (Cour Commune de Justice et d'Arbitrage) selon le choix du demandeur.
</p>
HTML;
    }

    private function contratLicence(): string
    {
        return <<<HTML
<h2>Contrat de Licence Utilisateur Final (CLUF)</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>Article 1 — Objet</h3>
<p>
  Le présent Contrat de Licence Utilisateur Final (CLUF) est conclu entre IBIG SARL (ci-après « le Concédant ») et l'organisation abonnée (ci-après « le Licencié »). Il définit les droits et obligations relatifs à l'utilisation de la plateforme IBIG SECRETIS ERP (ci-après « le Logiciel »).
</p>

<h3>Article 2 — Droits accordés</h3>
<p>Le Concédant accorde au Licencié, pour la durée de l'abonnement actif, une licence :</p>
<ul>
  <li><strong>Non-exclusive :</strong> d'autres licenciés peuvent bénéficier des mêmes droits ;</li>
  <li><strong>Non-transférable :</strong> la licence est strictement personnelle à l'organisation ;</li>
  <li><strong>Révocable :</strong> en cas de violation du présent CLUF ou des CGU ;</li>
  <li><strong>Limitée au nombre d'utilisateurs</strong> prévu par le plan souscrit.</li>
</ul>

<h3>Article 3 — Restrictions</h3>
<p>Il est expressément interdit au Licencié de :</p>
<ul>
  <li>Reproduire, copier ou dupliquer le Logiciel ou sa documentation ;</li>
  <li>Procéder à de la décompilation, du déassemblage ou de la rétro-ingénierie ;</li>
  <li>Sous-licencier, vendre, louer ou céder les droits attachés à la licence ;</li>
  <li>Modifier, adapter ou créer des œuvres dérivées du Logiciel ;</li>
  <li>Supprimer ou altérer les mentions de propriété intellectuelle du Logiciel.</li>
</ul>

<h3>Article 4 — Propriété du code et du logiciel</h3>
<p>
  Le Logiciel, son code source, son architecture, ses interfaces et toute documentation associée restent la propriété exclusive d'IBIG SARL. La présente licence ne confère au Licencié aucun droit de propriété sur le Logiciel.
</p>

<h3>Article 5 — Mises à jour et évolutions</h3>
<p>
  Le Concédant s'engage à maintenir le Logiciel à jour et à communiquer les notes de version. Les mises à jour majeures (nouvelles fonctionnalités) sont incluses dans l'abonnement actif. Les modules supplémentaires peuvent faire l'objet d'une facturation séparée.
</p>

<h3>Article 6 — Garanties limitées</h3>
<p>
  Le Logiciel est fourni « tel quel », avec les efforts raisonnables de IBIG Soft pour assurer son bon fonctionnement. IBIG Soft ne garantit pas que le Logiciel sera exempt de bugs ou d'interruptions, mais s'engage à les corriger dans des délais raisonnables selon la sévérité.
</p>

<h3>Article 7 — Limitation de responsabilité</h3>
<p>
  La responsabilité d'IBIG Soft au titre du présent CLUF est limitée au montant des abonnements payés par le Licencié au cours des 12 mois précédant le fait générateur. IBIG Soft ne peut être tenu responsable des dommages indirects, pertes de données, pertes de chiffre d'affaires ou interruptions d'activité.
</p>

<h3>Article 8 — Droit applicable — OHADA</h3>
<p>
  Le présent CLUF est soumis au droit OHADA (Organisation pour l'Harmonisation en Afrique du Droit des Affaires) et au droit ivoirien. Tout différend sera porté devant les juridictions compétentes d'Abidjan, ou soumis à l'arbitrage de la CCJA.
</p>
HTML;
    }

    private function politiqueConfidentialite(): string
    {
        return <<<HTML
<h2>Politique de confidentialité</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026 — Conforme RGPD et loi ivoirienne ARTCI</em></p>

<h3>1. Identité du responsable du traitement</h3>
<p>
  IBIG SARL (Intermark Business International Group), Abidjan – Côte d'Ivoire.<br>
  Contact DPO : <a href="mailto:dpo@ibigsoft.com">dpo@ibigsoft.com</a>
</p>

<h3>2. Données collectées</h3>
<p>Dans le cadre de l'utilisation de SECRETIS, IBIG Soft collecte :</p>
<ul>
  <li><strong>Données d'identification :</strong> nom, prénom, email professionnel, fonction, photo de profil ;</li>
  <li><strong>Données d'organisation :</strong> nom de l'entreprise, secteur, pays, RCCM, coordonnées ;</li>
  <li><strong>Données de connexion :</strong> adresse IP, navigateur, horodatages de connexion ;</li>
  <li><strong>Données métier :</strong> documents, courriers, agenda, tâches, données RH — gérées par l'organisation cliente ;</li>
  <li><strong>Données de facturation :</strong> coordonnées de facturation, historique des paiements ;</li>
  <li><strong>Données d'usage :</strong> fonctionnalités utilisées, erreurs, métriques de performance (anonymisées).</li>
</ul>

<h3>3. Finalités et bases légales</h3>
<ul>
  <li><strong>Exécution du contrat :</strong> fourniture du service SECRETIS, gestion des comptes et de la facturation ;</li>
  <li><strong>Intérêt légitime :</strong> sécurité de la Plateforme, amélioration du service, prévention de la fraude ;</li>
  <li><strong>Consentement :</strong> communications marketing, utilisation de cookies non-essentiels, IA SARA ;</li>
  <li><strong>Obligation légale :</strong> conservation des données de facturation selon les obligations OHADA.</li>
</ul>

<h3>4. Durée de conservation</h3>
<ul>
  <li>Données de compte actif : durée de l'abonnement + 90 jours après résiliation ;</li>
  <li>Données de facturation : 10 ans (obligation OHADA) ;</li>
  <li>Logs de connexion et de sécurité : 12 mois ;</li>
  <li>Données de conversations SARA : 6 mois ;</li>
  <li>Données archivées sur demande RGPD : 30 jours.</li>
</ul>

<h3>5. Droits des personnes concernées</h3>
<p>Conformément au RGPD et à la réglementation ARTCI, vous disposez des droits suivants :</p>
<ul>
  <li>Droit d'accès à vos données personnelles ;</li>
  <li>Droit de rectification des données inexactes ;</li>
  <li>Droit à l'effacement (« droit à l'oubli ») ;</li>
  <li>Droit à la portabilité de vos données ;</li>
  <li>Droit d'opposition au traitement ;</li>
  <li>Droit à la limitation du traitement.</li>
</ul>
<p>Pour exercer vos droits : <a href="mailto:dpo@ibigsoft.com">dpo@ibigsoft.com</a></p>

<h3>6. Transferts internationaux</h3>
<p>
  Les données peuvent être traitées par des sous-traitants localisés en dehors de la Côte d'Ivoire. Dans ce cas, IBIG Soft s'assure que les transferts sont encadrés par des clauses contractuelles types ou des mécanismes équivalents.
</p>

<h3>7. Sécurité</h3>
<p>
  IBIG Soft met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement AES-256 au repos, TLS 1.3 en transit, authentification à deux facteurs, journaux d'audit.
</p>
HTML;
    }

    private function politiqueCookies(): string
    {
        return <<<HTML
<h2>Politique des cookies</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Qu'est-ce qu'un cookie ?</h3>
<p>
  Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de votre visite sur SECRETIS. Les cookies permettent à la Plateforme de mémoriser vos préférences et d'améliorer votre expérience.
</p>

<h3>2. Cookies utilisés par SECRETIS</h3>

<h4>2.1 Cookies strictement nécessaires (pas de consentement requis)</h4>
<ul>
  <li><code>secretis_session</code> — Maintien de la session utilisateur authentifiée (durée : session) ;</li>
  <li><code>secretis_csrf</code> — Protection contre les attaques CSRF (durée : session) ;</li>
  <li><code>secretis_locale</code> — Langue préférée de l'utilisateur (durée : 1 an) ;</li>
  <li><code>secretis_theme</code> — Thème de l'interface (clair/sombre) (durée : 1 an).</li>
</ul>

<h4>2.2 Cookies de préférences (consentement requis)</h4>
<ul>
  <li><code>secretis_sidebar</code> — État de la barre latérale (étendue/réduite) (durée : 6 mois) ;</li>
  <li><code>secretis_dashboard_layout</code> — Disposition des widgets du tableau de bord (durée : 6 mois).</li>
</ul>

<h4>2.3 Cookies de statistiques (consentement requis)</h4>
<ul>
  <li>Métriques d'usage anonymisées des fonctionnalités (durée : 13 mois) ;</li>
  <li>Journaux de performance de la Plateforme (durée : 30 jours).</li>
</ul>

<h4>2.4 Cookies marketing (consentement requis)</h4>
<p>SECRETIS n'utilise pas de cookies marketing tiers pour le ciblage publicitaire sur sa Plateforme applicative.</p>

<h3>3. Gestion du consentement</h3>
<p>
  Lors de votre première connexion, un bandeau de consentement vous permet de choisir les catégories de cookies que vous acceptez.
  Vous pouvez modifier vos préférences à tout moment depuis les Paramètres de votre compte > Confidentialité.
</p>

<h3>4. Opt-out et suppression</h3>
<p>
  Vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies. Notez que le blocage des cookies nécessaires peut empêcher le bon fonctionnement de SECRETIS.
  Voir les instructions pour : Chrome, Firefox, Safari, Edge.
</p>

<h3>5. Contact</h3>
<p>Pour toute question sur notre utilisation des cookies : <a href="mailto:dpo@ibigsoft.com">dpo@ibigsoft.com</a></p>
HTML;
    }

    private function politiqueSauvegarde(): string
    {
        return <<<HTML
<h2>Politique de sauvegarde des données</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Fréquence des sauvegardes</h3>
<p>IBIG Soft effectue des sauvegardes automatiques des données de chaque organisation selon le calendrier suivant :</p>
<ul>
  <li><strong>Sauvegarde incrémentale :</strong> toutes les heures ;</li>
  <li><strong>Sauvegarde complète quotidienne :</strong> chaque nuit entre 01h00 et 04h00 (UTC) ;</li>
  <li><strong>Sauvegarde hebdomadaire :</strong> chaque dimanche à 02h00 (UTC) ;</li>
  <li><strong>Sauvegarde mensuelle :</strong> le 1er de chaque mois.</li>
</ul>

<h3>2. Rétention des sauvegardes</h3>
<ul>
  <li>Sauvegardes horaires : conservées 48 heures ;</li>
  <li>Sauvegardes quotidiennes : conservées 30 jours ;</li>
  <li>Sauvegardes hebdomadaires : conservées 3 mois ;</li>
  <li>Sauvegardes mensuelles : conservées 12 mois.</li>
</ul>

<h3>3. Chiffrement et sécurité</h3>
<p>
  Toutes les sauvegardes sont chiffrées en AES-256 avant leur stockage. Les clés de chiffrement sont gérées séparément des données sauvegardées.
  Les sauvegardes sont répliquées sur au moins deux sites géographiquement distincts pour assurer la résilience en cas de sinistre.
</p>

<h3>4. Localisation des serveurs</h3>
<p>
  Les données primaires et leurs sauvegardes sont hébergées dans des datacenters conformes aux normes ISO 27001, localisés en Afrique de l'Ouest et/ou en Europe selon le plan souscrit.
  Les clients Enterprise peuvent demander une localisation exclusive de leurs données sur un datacenter de leur choix dans les zones supportées.
</p>

<h3>5. Procédure de restauration</h3>
<p>En cas de besoin de restauration de données :</p>
<ol>
  <li>Ouvrir un ticket de support prioritaire via SECRETIS ou à <a href="mailto:support@ibigsoft.com">support@ibigsoft.com</a> ;</li>
  <li>Préciser la date et l'heure de la sauvegarde souhaitée, et la portée de la restauration ;</li>
  <li>L'équipe technique IBIG Soft évalue la faisabilité et communique un délai (généralement 4 à 24 heures selon la volumétrie) ;</li>
  <li>La restauration est effectuée dans un environnement de test pour validation avant mise en production.</li>
</ol>

<h3>6. Responsabilité partagée</h3>
<p>
  IBIG Soft est responsable de l'infrastructure de sauvegarde et de la disponibilité des données de la Plateforme.
  L'organisation cliente est responsable de la qualité et de la complétude des données qu'elle saisit dans SECRETIS.
  Pour les modules On-Premise, la responsabilité de la sauvegarde incombe entièrement à l'organisation cliente.
</p>

<h3>7. Export des données</h3>
<p>
  Les administrateurs d'organisation peuvent à tout moment exporter leurs données depuis les Paramètres > Export des données.
  Les formats disponibles sont CSV, Excel et JSON selon les modules.
</p>
HTML;
    }

    private function politiqueSupport(): string
    {
        return <<<HTML
<h2>Politique de support technique</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Niveaux de support selon le plan</h3>

<table>
  <thead>
    <tr><th>Critère</th><th>Starter</th><th>Pro</th><th>Enterprise</th></tr>
  </thead>
  <tbody>
    <tr><td>Canaux</td><td>SARA + Base de connaissance</td><td>+ Tickets + Email</td><td>+ WhatsApp + Téléphone</td></tr>
    <tr><td>Délai de réponse (critique)</td><td>72h ouvrables</td><td>24h ouvrables</td><td>4h ouvrables</td></tr>
    <tr><td>Délai de réponse (standard)</td><td>5 jours ouvrables</td><td>48h ouvrables</td><td>24h ouvrables</td></tr>
    <tr><td>Prise en main à distance</td><td>Non</td><td>Sur demande</td><td>Incluse</td></tr>
    <tr><td>CSM dédié</td><td>Non</td><td>Non</td><td>Oui</td></tr>
  </tbody>
</table>

<h3>2. Canaux de support disponibles</h3>
<ul>
  <li><strong>SARA :</strong> assistant IA intégré, disponible 24h/24 — 7j/7 pour les questions fonctionnelles et techniques ;</li>
  <li><strong>Base de connaissances :</strong> articles, tutoriels vidéo, FAQ — accessibles sans connexion ;</li>
  <li><strong>Tickets :</strong> depuis Help > Nouveau ticket — suivi de l'avancement en temps réel ;</li>
  <li><strong>Email :</strong> <a href="mailto:support@ibigsoft.com">support@ibigsoft.com</a> (Pro et Enterprise) ;</li>
  <li><strong>WhatsApp Business :</strong> +225 07 XX XX XX XX (Enterprise uniquement).</li>
</ul>

<h3>3. Niveaux de sévérité</h3>
<ul>
  <li><strong>P1 — Critique :</strong> Plateforme inaccessible ou perte de données en cours ;</li>
  <li><strong>P2 — Majeur :</strong> Fonctionnalité principale bloquée, aucun contournement possible ;</li>
  <li><strong>P3 — Standard :</strong> Fonctionnalité dégradée, contournement existant ;</li>
  <li><strong>P4 — Mineur :</strong> Question d'usage, amélioration souhaitée.</li>
</ul>

<h3>4. Escalade</h3>
<p>
  Si votre demande n'est pas résolue dans les délais SLA, vous pouvez escalader en mentionnant le numéro de ticket à <a href="mailto:escalade@ibigsoft.com">escalade@ibigsoft.com</a>.
  Pour les clients Enterprise, votre CSM dédié prend en charge l'escalade automatiquement.
</p>

<h3>5. Exclusions du support</h3>
<p>Le support IBIG Soft ne couvre pas :</p>
<ul>
  <li>Les problèmes liés à votre infrastructure réseau ou équipements ;</li>
  <li>Les données saisies par votre organisation (responsabilité du client) ;</li>
  <li>Les intégrations tierces non développées par IBIG Soft ;</li>
  <li>Les personnalisations réalisées sans l'accord écrit d'IBIG Soft ;</li>
  <li>Les modules On-Premise pour les aspects liés à l'infrastructure client.</li>
</ul>
HTML;
    }

    private function politiqueResiliation(): string
    {
        return <<<HTML
<h2>Politique de résiliation</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Procédure de résiliation</h3>
<p>Pour résilier votre abonnement SECRETIS :</p>
<ol>
  <li>Envoyer un email de résiliation à <a href="mailto:resiliation@ibigsoft.com">resiliation@ibigsoft.com</a> depuis l'adresse email de l'administrateur principal ;</li>
  <li>Mentionner : le nom de l'organisation, le numéro d'abonnement, et la date souhaitée de résiliation ;</li>
  <li>Un accusé de réception vous sera envoyé sous 48 heures ouvrables ;</li>
  <li>La résiliation prend effet à la fin de la période d'abonnement en cours (minimum 30 jours de préavis).</li>
</ol>
<p>
  La résiliation peut également être initiée depuis Paramètres > Abonnement > Résilier mon abonnement (disponible pour les administrateurs).
</p>

<h3>2. Export des données avant clôture</h3>
<p>
  Avant la date effective de résiliation, nous recommandons vivement d'exporter toutes vos données depuis Paramètres > Export des données.
  IBIG Soft vous enverra un rappel 30 jours, puis 7 jours avant la date de clôture effective.
</p>

<h3>3. Conservation et suppression des données après résiliation</h3>
<ul>
  <li><strong>J+0 à J+90 :</strong> Les données restent accessibles en lecture seule. Vous pouvez encore exporter ;</li>
  <li><strong>J+90 :</strong> Suppression définitive de toutes les données opérationnelles ;</li>
  <li><strong>Exception :</strong> Les données de facturation sont conservées 10 ans conformément aux obligations OHADA.</li>
</ul>

<h3>4. Résiliation par IBIG Soft</h3>
<p>
  IBIG Soft peut résilier l'abonnement sans préavis en cas de :
</p>
<ul>
  <li>Non-paiement après 30 jours de retard et mise en demeure restée sans effet ;</li>
  <li>Violation grave des CGU ou du CLUF ;</li>
  <li>Activité frauduleuse ou illégale détectée.</li>
</ul>

<h3>5. Obligations légales de conservation — OHADA</h3>
<p>
  Conformément au droit OHADA (Acte Uniforme relatif au Droit Commercial Général), certaines données comptables et contractuelles doivent être conservées pendant une durée minimale de 10 ans. Ces données seront archivées dans un format sécurisé et non modifiable, et ne seront pas utilisées à d'autres fins.
</p>
HTML;
    }

    private function politiqueRemboursement(): string
    {
        return <<<HTML
<h2>Politique de remboursement</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Principe général — Absence de remboursement</h3>
<p>
  En raison de la nature du service fourni (licence logicielle SaaS activée immédiatement après paiement), <strong>aucun remboursement n'est accordé après l'activation de l'abonnement SECRETIS</strong>, qu'il s'agisse d'un abonnement mensuel ou annuel.
</p>
<p>
  En souscrivant, le Client reconnaît avoir pris connaissance des fonctionnalités du logiciel, notamment via la période d'essai gratuit de 14 jours proposée préalablement à tout engagement.
</p>

<h3>2. Exception — Incident grave confirmé</h3>
<p>Un remboursement ou un crédit commercial peut être accordé dans les cas suivants :</p>
<ul>
  <li><strong>Indisponibilité prolongée :</strong> inaccessibilité de la Plateforme pendant plus de 72 heures consécutives, non liée à la maintenance planifiée ni à un cas de force majeure ;</li>
  <li><strong>Perte de données :</strong> perte avérée et irrécouvrable de données due à une défaillance d'IBIG Soft, après enquête et confirmation par l'équipe technique ;</li>
  <li><strong>Facturation erronée :</strong> erreur de montant ou de période facturée, documentée et confirmée par IBIG Soft.</li>
</ul>

<h3>3. Crédit commercial</h3>
<p>
  Dans les cas ci-dessus, IBIG Soft peut proposer en premier lieu un crédit commercial (prolongation d'abonnement équivalente) plutôt qu'un remboursement en numéraire. Si un remboursement est accordé, il sera effectué par le même moyen de paiement que le paiement initial, dans un délai de 15 jours ouvrables.
</p>

<h3>4. Procédure de réclamation pour remboursement</h3>
<ol>
  <li>Adresser un email à <a href="mailto:facturation@ibigsoft.com">facturation@ibigsoft.com</a> avec l'objet « Demande de remboursement — [Nom Organisation] » ;</li>
  <li>Joindre : le numéro de facture, la description de l'incident, les preuves disponibles ;</li>
  <li>L'équipe facturation accuse réception sous 48 heures et instruit le dossier dans les 10 jours ouvrables ;</li>
  <li>La décision est communiquée par email avec justification.</li>
</ol>

<h3>5. Période d'essai</h3>
<p>
  La période d'essai gratuit de 14 jours n'engendre aucune facturation. Aucune carte bancaire n'est requise pour démarrer l'essai. La question du remboursement ne se pose donc pas pendant cette période.
</p>
HTML;
    }

    private function traitementDonnees(): string
    {
        return <<<HTML
<h2>Accord de traitement des données (DPA)</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026 — Conforme RGPD Art. 28</em></p>

<h3>1. Parties et rôles</h3>
<p>
  Dans le cadre de l'utilisation de SECRETIS :
</p>
<ul>
  <li><strong>Responsable du traitement :</strong> l'organisation cliente, qui détermine les finalités et les moyens du traitement des données de ses employés et de ses partenaires ;</li>
  <li><strong>Sous-traitant :</strong> IBIG SARL, qui traite les données personnelles pour le compte et sur instruction du Responsable du traitement.</li>
</ul>

<h3>2. Catégories de données traitées</h3>
<ul>
  <li>Données d'identification des employés (nom, prénom, email, téléphone, poste) ;</li>
  <li>Données RH (congés, notes de frais, évaluations, contrats) ;</li>
  <li>Données de correspondance professionnelle (courriers, emails, comptes-rendus) ;</li>
  <li>Données visiteurs (identité, motif de visite, badge) ;</li>
  <li>Données comptables et financières ;</li>
  <li>Données des contacts et partenaires professionnels.</li>
</ul>

<h3>3. Mesures techniques et organisationnelles de sécurité</h3>
<ul>
  <li>Chiffrement des données au repos (AES-256) et en transit (TLS 1.3) ;</li>
  <li>Authentification à deux facteurs disponible pour tous les comptes ;</li>
  <li>Journaux d'audit complets (qui a fait quoi, quand) ;</li>
  <li>Contrôle d'accès basé sur les rôles (RBAC) ;</li>
  <li>Isolation des données entre organisations (multi-tenancy sécurisé) ;</li>
  <li>Tests de pénétration annuels par un prestataire indépendant ;</li>
  <li>Plan de continuité d'activité et de reprise après sinistre documenté.</li>
</ul>

<h3>4. Sous-traitants d'IBIG Soft (sous-traitants ultérieurs)</h3>
<ul>
  <li><strong>Hébergeur cloud :</strong> infrastructure serveurs et stockage ;</li>
  <li><strong>Fournisseur SMTP :</strong> envoi des emails transactionnels ;</li>
  <li><strong>Fournisseur IA :</strong> traitement des requêtes de l'assistant SARA (données anonymisées) ;</li>
  <li><strong>Fournisseur SMS :</strong> notifications par SMS (si activé).</li>
</ul>
<p>
  IBIG Soft s'engage à informer le Responsable du traitement de tout changement de sous-traitant avec un préavis de 30 jours.
</p>

<h3>5. Transferts internationaux</h3>
<p>
  Les transferts de données hors de la Côte d'Ivoire et de l'Espace Économique Européen (EEE) sont encadrés par des clauses contractuelles types (CCT) ou des mécanismes de transfert équivalents approuvés par les autorités de protection des données compétentes.
</p>

<h3>6. Droits et obligations du Responsable du traitement</h3>
<p>
  Le Responsable du traitement peut, à tout moment, auditer les mesures de sécurité d'IBIG Soft, demander la suppression ou la portabilité des données, et obtenir une copie des garanties contractuelles avec les sous-traitants ultérieurs.
</p>

<h3>7. Notification des violations de données</h3>
<p>
  En cas de violation de données personnelles, IBIG Soft s'engage à notifier le Responsable du traitement dans les 72 heures suivant la découverte de l'incident, conformément à l'article 33 du RGPD.
</p>
HTML;
    }

    private function proprieteIntellectuelle(): string
    {
        return <<<HTML
<h2>Propriété intellectuelle</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Éléments protégés</h3>
<p>IBIG SARL est titulaire de l'ensemble des droits de propriété intellectuelle relatifs à :</p>
<ul>
  <li><strong>Code source :</strong> le code source de SECRETIS ERP, tous langages confondus, est la propriété exclusive d'IBIG SARL ;</li>
  <li><strong>Interfaces graphiques :</strong> les designs, maquettes, composants UI, iconographie propre à SECRETIS ;</li>
  <li><strong>Architecture logicielle :</strong> les modèles de données, les API, les workflows fonctionnels ;</li>
  <li><strong>Logo et charte graphique :</strong> le logo SECRETIS, les couleurs, les typographies officielles ;</li>
  <li><strong>Documentation :</strong> les guides utilisateur, tutoriels, vidéos de formation, articles de la base de connaissances ;</li>
  <li><strong>Base de données :</strong> la structure et l'organisation de la base de données SECRETIS ;</li>
  <li><strong>Assistant IA SARA :</strong> le nom, les prompts, la personnalité, les modèles de réponse de l'assistant SARA.</li>
</ul>

<h3>2. Protection légale</h3>
<p>Ces éléments sont protégés par :</p>
<ul>
  <li>L'Accord de Bangui révisé (OAPI — Organisation Africaine de la Propriété Intellectuelle) ;</li>
  <li>Le Code de propriété intellectuelle de Côte d'Ivoire ;</li>
  <li>La Convention de Berne pour la protection des œuvres littéraires et artistiques ;</li>
  <li>Les traités de l'OMPI (Organisation Mondiale de la Propriété Intellectuelle).</li>
</ul>

<h3>3. Contenu généré par l'utilisateur</h3>
<p>
  Les données et contenus créés par les organisations clientes dans SECRETIS (documents, courriers, comptes-rendus, etc.) restent la propriété exclusive de l'organisation cliente. IBIG Soft ne revendique aucun droit sur ces contenus.
</p>

<h3>4. Signalement de violation</h3>
<p>
  Toute reproduction, utilisation ou violation des droits de propriété intellectuelle d'IBIG SARL doit être signalée à :
  <a href="mailto:legal@ibigsoft.com">legal@ibigsoft.com</a>
</p>
<p>
  IBIG SARL se réserve le droit de poursuivre toute violation devant les juridictions compétentes et de réclamer des dommages et intérêts à hauteur du préjudice subi.
</p>
HTML;
    }

    private function protectionMarque(): string
    {
        return <<<HTML
<h2>Protection des marques déposées</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Marques déposées d'IBIG SARL</h3>
<p>Les marques suivantes sont déposées et protégées au nom d'IBIG SARL :</p>
<ul>
  <li><strong>IBIG</strong> — marque verbale ;</li>
  <li><strong>IBIG Soft</strong> — marque verbale (désigne la division logicielle) ;</li>
  <li><strong>IBIG SECRETIS</strong> — marque verbale (nom commercial du logiciel) ;</li>
  <li><strong>SECRETIS ERP</strong> — marque semi-figurative ;</li>
  <li><strong>SARA</strong> — marque verbale (assistant IA intégré).</li>
</ul>
<p>Ces marques sont déposées auprès de l'OAPI (Organisation Africaine de la Propriété Intellectuelle).</p>

<h3>2. Usages interdits</h3>
<p>Il est expressément interdit, sans autorisation préalable écrite d'IBIG SARL, de :</p>
<ul>
  <li>Reproduire, imiter ou utiliser les marques ci-dessus dans un contexte commercial ;</li>
  <li>Utiliser ces marques comme mots-clés de référencement publicitaire (SEA/SEM) pour des produits ou services concurrents ;</li>
  <li>Déposer des noms de domaine incorporant ces marques ;</li>
  <li>Créer des œuvres dérivées susceptibles de créer une confusion avec les marques IBIG ;</li>
  <li>Imiter les éléments graphiques (logo, couleurs, typographie) des produits IBIG.</li>
</ul>

<h3>3. Usages autorisés</h3>
<p>Les usages suivants sont autorisés sans accord préalable :</p>
<ul>
  <li>Référence aux marques IBIG dans un contexte éditorial, journalistique ou académique, avec attribution correcte ;</li>
  <li>Usage des marques par les partenaires revendeurs dans le cadre de leur accord de partenariat ;</li>
  <li>Témoignages et avis clients identifiant le produit utilisé.</li>
</ul>

<h3>4. Signalement</h3>
<p>
  Tout usage abusif ou contrefaçon constatée des marques IBIG doit être signalé à :<br>
  <a href="mailto:legal@ibigsoft.com">legal@ibigsoft.com</a><br>
  IBIG SARL engagera les procédures nécessaires pour faire cesser la violation et obtenir réparation.
</p>
HTML;
    }

    private function conditionsEssai(): string
    {
        return <<<HTML
<h2>Conditions d'essai gratuit — Trial 14 jours</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Nature de l'essai</h3>
<p>
  IBIG SECRETIS ERP propose une période d'essai gratuite de 14 jours calendaires, sans engagement et sans nécessité de fournir des coordonnées bancaires. L'essai permet de découvrir toutes les fonctionnalités de la plateforme dans un environnement réel.
</p>

<h3>2. Accès pendant l'essai</h3>
<p>Pendant la période d'essai, vous bénéficiez d'un accès complet au plan Pro, à l'exception de :</p>
<ul>
  <li>L'authentification SSO (Single Sign-On) — réservée aux abonnés Enterprise actifs ;</li>
  <li>Le déploiement On-Premise — disponible uniquement sur devis après signature de contrat ;</li>
  <li>Le support téléphonique et WhatsApp dédié ;</li>
  <li>Le nombre d'utilisateurs est limité à 5 pendant la période d'essai.</li>
</ul>

<h3>3. Conservation des données après expiration</h3>
<p>
  À l'expiration de la période d'essai sans souscription d'un abonnement payant :
</p>
<ul>
  <li>L'accès à la Plateforme est suspendu immédiatement ;</li>
  <li>Les données saisies pendant l'essai sont conservées pendant 30 jours ;</li>
  <li>Un email de rappel est envoyé 7 jours avant la suppression définitive ;</li>
  <li>Passé ce délai, toutes les données sont supprimées définitivement.</li>
</ul>

<h3>4. Conversion en abonnement payant</h3>
<p>
  Si vous souscrivez un abonnement payant avant l'expiration de l'essai, la conversion est automatique et immédiate. Toutes vos données et configurations sont conservées intégralement. La facturation commence à la date de souscription.
</p>
<p>
  Si vous souscrivez après l'expiration (dans le délai de 30 jours de conservation), vos données sont restaurées automatiquement à l'activation de l'abonnement.
</p>

<h3>5. Un seul essai par organisation</h3>
<p>
  Un seul essai gratuit est accordé par organisation (identifiée par son nom, son email administrateur, ou son numéro d'entreprise). Toute tentative de création de multiples comptes d'essai est contraire aux CGU.
</p>
HTML;
    }

    private function conditionsSara(): string
    {
        return <<<HTML
<h2>Conditions d'utilisation de SARA — Assistant IA</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Nature de SARA</h3>
<p>
  SARA (Secrétaire Artificielle et Ressource Adaptative) est un assistant conversationnel basé sur l'intelligence artificielle, intégré à IBIG SECRETIS ERP. <strong>SARA est un programme informatique, non un être humain.</strong> Ses réponses sont générées automatiquement sur la base de modèles de langage et des données de votre organisation.
</p>

<h3>2. Capacités de SARA</h3>
<p>SARA peut vous aider à :</p>
<ul>
  <li>Naviguer dans les fonctionnalités de SECRETIS et répondre aux questions d'usage ;</li>
  <li>Rédiger des documents, courriers et comptes-rendus ;</li>
  <li>Analyser et résumer des données de votre organisation ;</li>
  <li>Planifier des réunions et gérer votre agenda ;</li>
  <li>Répondre aux questions sur les procédures internes documentées.</li>
</ul>

<h3>3. Limitations et avertissements</h3>
<p>SARA ne peut pas et ne doit pas être sollicitée pour :</p>
<ul>
  <li><strong>Conseil médical :</strong> SARA n'est pas habilitée à fournir des diagnostics ou des conseils de santé ;</li>
  <li><strong>Conseil juridique :</strong> les réponses de SARA ne constituent pas un avis juridique professionnel ;</li>
  <li><strong>Conseil fiscal :</strong> les informations données ne remplacent pas l'avis d'un expert-comptable ou d'un fiscaliste ;</li>
  <li><strong>Conseil financier :</strong> SARA ne fournit pas de recommandations d'investissement.</li>
</ul>
<p>
  SARA peut commettre des erreurs. Ses réponses doivent toujours être vérifiées avant d'être utilisées dans un contexte professionnel critique. Voir également la <a href="/legal/limitation-responsabilite-ia">Politique de limitation de responsabilité liée à l'IA</a>.
</p>

<h3>4. Traitement des données des conversations</h3>
<p>
  Les conversations avec SARA sont traitées conformément à notre <a href="/legal/politique-confidentialite">Politique de confidentialité</a> et à l'<a href="/legal/traitement-donnees">Accord de traitement des données</a>. Les conversations peuvent être utilisées de manière anonymisée pour améliorer la qualité de SARA. Les données personnelles identifiables ne sont pas utilisées pour l'entraînement.
</p>

<h3>5. Désactivation de SARA</h3>
<p>
  Un administrateur d'organisation peut désactiver l'accès à SARA pour l'ensemble des utilisateurs depuis Paramètres > Fonctionnalités IA. La désactivation prend effet immédiatement.
</p>
HTML;
    }

    private function limitationResponsabiliteIa(): string
    {
        return <<<HTML
<h2>Limitation de responsabilité liée à l'intelligence artificielle</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Nature probabiliste de l'IA</h3>
<p>
  L'assistant SARA, comme tout système d'intelligence artificielle basé sur des modèles de langage de grande taille (LLM), fonctionne sur un principe probabiliste. Cela signifie que ses réponses sont des estimations statistiques basées sur des données d'entraînement et non des certitudes absolues.
</p>
<p>
  <strong>SARA peut produire des réponses incorrectes, incomplètes, inexactes ou obsolètes.</strong> Ce phénomène, connu sous le terme d'« hallucination », est inhérent à la technologie d'IA générative actuelle.
</p>

<h3>2. Absence de conseil professionnel</h3>
<p>
  Les réponses de SARA ne constituent en aucun cas :
</p>
<ul>
  <li>Un avis juridique ou une consultation d'avocat ;</li>
  <li>Un avis médical ou une consultation de médecin ;</li>
  <li>Un conseil fiscal ou comptable certifié ;</li>
  <li>Une recommandation financière ou d'investissement ;</li>
  <li>Une décision administrative ou réglementaire.</li>
</ul>
<p>
  Pour ces sujets, l'utilisateur doit consulter un professionnel qualifié et dûment habilité.
</p>

<h3>3. Limitation de responsabilité d'IBIG Soft</h3>
<p>
  IBIG SARL ne peut être tenu responsable, directement ou indirectement, de tout dommage résultant de :
</p>
<ul>
  <li>Décisions prises par l'utilisateur sur la base des réponses de SARA ;</li>
  <li>Erreurs ou inexactitudes dans les réponses générées ;</li>
  <li>Interprétations erronées des suggestions de SARA ;</li>
  <li>Préjudice subi par des tiers suite à l'utilisation des outputs de SARA.</li>
</ul>

<h3>4. Responsabilité de l'utilisateur</h3>
<p>
  L'utilisateur reconnaît utiliser SARA sous sa propre responsabilité. Il lui appartient de :
</p>
<ul>
  <li>Vérifier systématiquement les informations importantes fournies par SARA ;</li>
  <li>Ne pas transmettre à des tiers des réponses de SARA sans vérification préalable ;</li>
  <li>Consulter les professionnels compétents pour tout sujet nécessitant une expertise certifiée.</li>
</ul>

<h3>5. Amélioration continue</h3>
<p>
  IBIG Soft s'engage dans une démarche d'amélioration continue de SARA pour réduire les erreurs et améliorer la qualité des réponses. Les utilisateurs sont encouragés à signaler les réponses incorrectes via le bouton de retour disponible dans l'interface de SARA.
</p>
HTML;
    }

    private function gestionCompte(): string
    {
        return <<<HTML
<h2>Gestion et clôture du compte</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Modification des informations du compte</h3>
<p>
  Chaque utilisateur peut modifier ses informations personnelles (nom, prénom, email, téléphone, photo de profil, mot de passe) depuis son profil utilisateur. Les modifications de l'email principal nécessitent une confirmation par lien envoyé à la nouvelle adresse.
</p>
<p>
  Les informations de l'organisation (nom, secteur, coordonnées, logo) peuvent être modifiées par les administrateurs depuis Paramètres > Organisation.
</p>

<h3>2. Transfert de propriété du compte organisation</h3>
<p>
  Le transfert de la propriété du compte organisation (changement d'administrateur principal) s'effectue depuis Paramètres > Utilisateurs > Transférer la propriété. L'ancien administrateur et le nouvel administrateur reçoivent tous deux un email de confirmation. Le transfert prend effet après validation des deux parties.
</p>

<h3>3. Désactivation d'un utilisateur</h3>
<p>
  Un administrateur peut désactiver un compte utilisateur à tout moment depuis Paramètres > Utilisateurs. L'utilisateur désactivé ne peut plus se connecter, mais ses données (documents créés, tâches, historique) sont conservées.
</p>

<h3>4. Suppression d'un compte utilisateur</h3>
<p>
  La suppression définitive d'un compte utilisateur est soumise à un délai de 30 jours. Pendant ce délai, l'utilisateur peut demander la réactivation. Après 30 jours, les données personnelles identifiables sont anonymisées (pseudonymisation RGPD), et les données métier créées par cet utilisateur sont conservées dans l'historique de l'organisation.
</p>

<h3>5. Suppression du compte organisation</h3>
<p>
  Voir la <a href="/legal/politique-resiliation">Politique de résiliation</a> pour la procédure complète. Les données sont supprimées 90 jours après la date effective de clôture, à l'exception des données de facturation conservées 10 ans.
</p>

<h3>6. Héritage du compte</h3>
<p>
  En cas de décès de l'administrateur unique d'une organisation, les ayants droit peuvent contacter IBIG Soft à <a href="mailto:support@ibigsoft.com">support@ibigsoft.com</a> pour engager un processus de transfert de propriété, sous réserve de présentation des justificatifs légaux.
</p>

<h3>7. Anonymisation RGPD (droit à l'oubli)</h3>
<p>
  Tout utilisateur peut exercer son droit à l'effacement en contactant <a href="mailto:dpo@ibigsoft.com">dpo@ibigsoft.com</a>. L'anonymisation est effectuée dans les 30 jours suivant la demande, sauf obligation légale de conservation contraire.
</p>
HTML;
    }

    private function gestionReclamations(): string
    {
        return <<<HTML
<h2>Procédure de réclamation</h2>
<p><em>Version 1.0 — En vigueur au 1er janvier 2026</em></p>

<h3>1. Objet et champ d'application</h3>
<p>
  La présente procédure s'applique à toute réclamation relative à l'utilisation d'IBIG SECRETIS ERP, à la facturation, à la qualité du service, ou au non-respect de nos politiques.
</p>

<h3>2. Comment soumettre une réclamation</h3>
<p>Toute réclamation doit être adressée à :</p>
<ul>
  <li><strong>Email :</strong> <a href="mailto:reclamations@ibigsoft.com">reclamations@ibigsoft.com</a> ;</li>
  <li><strong>Objet de l'email :</strong> « Réclamation — [Nom Organisation] — [Type de réclamation] » ;</li>
  <li><strong>Contenu :</strong> description précise du problème, date(s) et heure(s) des faits, captures d'écran ou pièces justificatives.</li>
</ul>

<h3>3. Délais de traitement</h3>
<ul>
  <li><strong>Accusé de réception :</strong> sous 24 heures ouvrables ;</li>
  <li><strong>Réponse de fond :</strong> dans les 5 jours ouvrables suivant la réception de la réclamation ;</li>
  <li><strong>Réclamations complexes :</strong> un délai étendu peut être nécessaire, IBIG Soft communiquera un délai estimatif.</li>
</ul>

<h3>4. Escalade interne</h3>
<p>
  Si la réponse apportée ne vous satisfait pas, vous pouvez escalader auprès du Responsable Service Client en mentionnant le numéro de réclamation dans votre réponse. L'escalade sera traitée dans les 10 jours ouvrables.
</p>

<h3>5. Médiation et arbitrage</h3>
<p>
  En cas de désaccord persistant après épuisement de la procédure interne :
</p>
<ul>
  <li>Les parties s'engagent à tenter une médiation amiable dans les 30 jours ;</li>
  <li>À défaut d'accord à l'issue de la médiation, le différend sera soumis à l'arbitrage de la <strong>CCJA (Cour Commune de Justice et d'Arbitrage de l'OHADA)</strong> selon son règlement d'arbitrage ;</li>
  <li>Le siège de l'arbitrage est Abidjan, Côte d'Ivoire. La langue de la procédure est le français.</li>
</ul>

<h3>6. Contact dédié réclamations</h3>
<p>
  Email : <a href="mailto:reclamations@ibigsoft.com">reclamations@ibigsoft.com</a><br>
  Email général : <a href="mailto:contact@ibigsoft.com">contact@ibigsoft.com</a><br>
  Adresse : IBIG SARL — Service Réclamations, Abidjan – Côte d'Ivoire
</p>
HTML;
    }
}
