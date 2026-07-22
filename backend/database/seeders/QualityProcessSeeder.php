<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class QualityProcessSeeder extends Seeder
{
    /**
     * Processus qualité types pré-configurés ISO 9001:2015.
     *
     * Ces processus sont des modèles système (organization_id = null).
     * Lors de l'activation du module Qualité pour une organisation, ces
     * processus sont copiés dans quality_processes avec l'organization_id correspondant.
     *
     * Catégories (approche processus ISO 9001) :
     *   management  — processus de management et de pilotage
     *   realization — processus de réalisation (création de valeur)
     *   support     — processus support (ressources et soutien)
     */
    public function run(): void
    {
        $this->command->info('  > QualityProcessSeeder : processus qualite ISO 9001 types...');

        $processes = [

            // ── Processus de Management ───────────────────────────────────────
            [
                'code'             => 'P-MAN-01',
                'name'             => "Management de l'organisation",
                'category'         => 'management',
                'description'      => "Définir et déployer la politique qualité, les objectifs stratégiques et "
                                    . "le contexte de l'organisation (parties intéressées, enjeux internes/externes).",
                'iso_reference'    => 'ISO 9001:2015 §4, §5, §6',
                'owner_role'       => 'dirigeant',
                'frequency'        => 'annual',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 1,
                'indicators'       => json_encode([
                    ['label' => 'Taux de réalisation des objectifs annuels', 'unit' => '%', 'target' => 90],
                    ['label' => 'Nombre de risques identifiés traités',      'unit' => 'nb','target' => null],
                ]),
                'organization_id'  => null,
            ],
            [
                'code'             => 'P-MAN-02',
                'name'             => 'Revue de Direction',
                'category'         => 'management',
                'description'      => "Évaluer périodiquement l'adéquation, la pertinence et l'efficacité du "
                                    . "Système de Management de la Qualité (SMQ). Inclut revue des indicateurs, "
                                    . "retours clients, résultats d'audits et actions d'amélioration.",
                'iso_reference'    => 'ISO 9001:2015 §9.3',
                'owner_role'       => 'dirigeant',
                'frequency'        => 'semi-annual',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 2,
                'indicators'       => json_encode([
                    ['label' => 'Nombre de revues de direction tenues',           'unit' => 'nb','target' => 2],
                    ['label' => 'Taux de clôture des actions issues des revues',  'unit' => '%', 'target' => 85],
                ]),
                'organization_id'  => null,
            ],
            [
                'code'             => 'P-MAN-03',
                'name'             => 'Gestion des Risques et Opportunités',
                'category'         => 'management',
                'description'      => "Identifier, évaluer et traiter les risques et opportunités susceptibles "
                                    . "d'affecter l'atteinte des objectifs qualité. Maintenir le registre des risques.",
                'iso_reference'    => 'ISO 9001:2015 §6.1',
                'owner_role'       => 'responsable_admin',
                'frequency'        => 'quarterly',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 3,
                'indicators'       => json_encode([
                    ['label' => 'Nombre de risques critiques (cotation >= 12)', 'unit' => 'nb','target' => 0],
                    ['label' => 'Taux de couverture des risques par des actions','unit' => '%', 'target' => 100],
                ]),
                'organization_id'  => null,
            ],

            // ── Processus de Réalisation ──────────────────────────────────────
            [
                'code'             => 'P-REA-01',
                'name'             => 'Gestion des Demandes Clients',
                'category'         => 'realization',
                'description'      => "Recevoir, enregistrer, analyser et répondre aux demandes clients "
                                    . "(appels, emails, formulaires). Qualification des besoins, chiffrage "
                                    . "et envoi de propositions commerciales.",
                'iso_reference'    => 'ISO 9001:2015 §8.2',
                'owner_role'       => 'secretaire_direction',
                'frequency'        => 'continuous',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 4,
                'indicators'       => json_encode([
                    ['label' => 'Délai moyen de traitement des demandes (heures)', 'unit' => 'h', 'target' => 24],
                    ['label' => 'Taux de transformation devis → commande',         'unit' => '%', 'target' => 40],
                ]),
                'organization_id'  => null,
            ],
            [
                'code'             => 'P-REA-02',
                'name'             => 'Réalisation des Prestations',
                'category'         => 'realization',
                'description'      => "Planifier, piloter et livrer les prestations (missions, projets, services). "
                                    . "Coordination des équipes, suivi de l'avancement, gestion des aléas "
                                    . "et validation interne avant livraison.",
                'iso_reference'    => 'ISO 9001:2015 §8.5',
                'owner_role'       => 'responsable_admin',
                'frequency'        => 'continuous',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 5,
                'indicators'       => json_encode([
                    ['label' => 'Taux de prestations livrées dans les délais', 'unit' => '%', 'target' => 90],
                    ['label' => 'Taux de satisfaction client (CSAT)',           'unit' => '%', 'target' => 85],
                    ['label' => "Nombre de non-conformités en cours de réalisation", 'unit' => 'nb','target' => 0],
                ]),
                'organization_id'  => null,
            ],
            [
                'code'             => 'P-REA-03',
                'name'             => 'Livraison et Facturation',
                'category'         => 'realization',
                'description'      => "Réception de la validation client, émission et envoi des factures, "
                                    . "suivi des encaissements et clôture des dossiers.",
                'iso_reference'    => 'ISO 9001:2015 §8.6, §8.7',
                'owner_role'       => 'secretaire_direction',
                'frequency'        => 'continuous',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 6,
                'indicators'       => json_encode([
                    ['label' => 'Délai moyen de facturation après livraison (jours)', 'unit' => 'j', 'target' => 3],
                    ['label' => 'Taux de factures réglées dans les délais',           'unit' => '%', 'target' => 80],
                ]),
                'organization_id'  => null,
            ],

            // ── Processus Support ─────────────────────────────────────────────
            [
                'code'             => 'P-SUP-01',
                'name'             => 'Gestion Documentaire',
                'category'         => 'support',
                'description'      => "Maîtriser la création, la mise à jour, la diffusion et l'archivage "
                                    . "des documents qualité (procédures, instructions, enregistrements). "
                                    . "Assurer la disponibilité des versions à jour.",
                'iso_reference'    => 'ISO 9001:2015 §7.5',
                'owner_role'       => 'secretaire_direction',
                'frequency'        => 'continuous',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 7,
                'indicators'       => json_encode([
                    ['label' => 'Taux de documents avec date de révision à jour', 'unit' => '%', 'target' => 100],
                    ['label' => 'Nombre de documents obsolètes en circulation',   'unit' => 'nb','target' => 0],
                ]),
                'organization_id'  => null,
            ],
            [
                'code'             => 'P-SUP-02',
                'name'             => 'Gestion des Ressources Humaines',
                'category'         => 'support',
                'description'      => "Recruter, intégrer, former et évaluer le personnel. Maintenir les "
                                    . "compétences requises, gérer les congés et la planification des effectifs.",
                'iso_reference'    => 'ISO 9001:2015 §7.1.2, §7.2',
                'owner_role'       => 'responsable_admin',
                'frequency'        => 'continuous',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 8,
                'indicators'       => json_encode([
                    ['label' => "Taux de réalisation du plan de formation annuel", 'unit' => '%', 'target' => 80],
                    ['label' => "Taux d'absentéisme mensuel",                     'unit' => '%', 'target' => 3],
                    ['label' => 'Turn-over annuel',                               'unit' => '%', 'target' => 10],
                ]),
                'organization_id'  => null,
            ],
            [
                'code'             => 'P-SUP-03',
                'name'             => 'Gestion des Achats',
                'category'         => 'support',
                'description'      => "Sélectionner, évaluer et surveiller les fournisseurs. Traiter les "
                                    . "demandes d'achat, gérer les bons de commande et réceptionner les "
                                    . "livraisons en conformité avec les spécifications.",
                'iso_reference'    => 'ISO 9001:2015 §8.4',
                'owner_role'       => 'responsable_admin',
                'frequency'        => 'continuous',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 9,
                'indicators'       => json_encode([
                    ['label' => "Taux de fournisseurs évalués annuellement",      'unit' => '%', 'target' => 100],
                    ['label' => "Taux de livraisons conformes à la commande",    'unit' => '%', 'target' => 95],
                    ['label' => "Délai moyen de traitement d'une commande (jours)",'unit' => 'j','target' => 5],
                ]),
                'organization_id'  => null,
            ],
            [
                'code'             => 'P-SUP-04',
                'name'             => 'Maintenance et Infrastructure',
                'category'         => 'support',
                'description'      => "Assurer la disponibilité et la conformité des équipements, locaux et "
                                    . "systèmes informatiques nécessaires aux activités. Planifier et suivre "
                                    . "la maintenance préventive et corrective.",
                'iso_reference'    => 'ISO 9001:2015 §7.1.3, §7.1.4',
                'owner_role'       => 'responsable_admin',
                'frequency'        => 'monthly',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 10,
                'indicators'       => json_encode([
                    ['label' => "Taux de réalisation du plan de maintenance préventive", 'unit' => '%', 'target' => 90],
                    ['label' => "Taux de disponibilité du SI (uptime)",                 'unit' => '%', 'target' => 99],
                    ['label' => "Délai moyen de résolution des pannes (heures)",        'unit' => 'h', 'target' => 4],
                ]),
                'organization_id'  => null,
            ],
            [
                'code'             => 'P-SUP-05',
                'name'             => 'Gestion de la Qualité',
                'category'         => 'support',
                'description'      => "Animer le SMQ : planifier et réaliser les audits internes, traiter les "
                                    . "non-conformités, gérer les actions correctives et préventives (CAPA), "
                                    . "surveiller les indicateurs et conduire l'amélioration continue.",
                'iso_reference'    => 'ISO 9001:2015 §9, §10',
                'owner_role'       => 'auditeur',
                'frequency'        => 'continuous',
                'is_template'      => true,
                'is_active'        => true,
                'sort_order'       => 11,
                'indicators'       => json_encode([
                    ['label' => "Nombre d'audits internes réalisés par an",          'unit' => 'nb','target' => 2],
                    ['label' => "Taux de clôture des actions correctives dans le délai",'unit' => '%','target' => 90],
                    ['label' => "Nombre de non-conformités majeures ouvertes",       'unit' => 'nb','target' => 0],
                ]),
                'organization_id'  => null,
            ],
        ];

        foreach ($processes as $process) {
            DB::table('quality_processes')->updateOrInsert(
                ['code' => $process['code'], 'organization_id' => null],
                array_merge($process, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $byCategory = array_count_values(array_column($processes, 'category'));
        $this->command->info(
            '    OK : ' . count($processes) . ' processus qualite inseres '
            . '(management=' . ($byCategory['management'] ?? 0) . ', '
            . 'realization=' . ($byCategory['realization'] ?? 0) . ', '
            . 'support=' . ($byCategory['support'] ?? 0) . ').'
        );
    }
}
