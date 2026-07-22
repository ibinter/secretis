<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DemoCourrierSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('📬 Création des courriers...');

        $org = DB::table('organizations')->where('slug', 'cabinet-conseil-demo')->first();
        if (! $org) {
            $this->command->error('Organisation démo introuvable.');
            return;
        }
        $orgId = $org->id;
        $users = DB::table('users')->where('organization_id', $orgId)->pluck('id')->toArray();

        $year  = now()->year;
        $month = now()->format('m');

        // ── Fonction référence auto ──────────────────────────────────────────
        $refCounter = ['incoming' => 1, 'outgoing' => 1, 'internal' => 1];
        $makeRef = function (string $type) use (&$refCounter, $year, $month): string {
            $prefix = ['incoming' => 'CI', 'outgoing' => 'CO', 'internal' => 'IN'][$type];
            $ref = sprintf('%s-%s%s-%04d', $prefix, $year, $month, $refCounter[$type]++);
            return $ref;
        };

        // ── 40 Courriers entrants ────────────────────────────────────────────
        $incomingMails = [
            // urgency, subject, sender_name, sender_org, days_ago, status
            ['urgent', 'Mise en demeure paiement facture N°2024-089',     'Me Coulibaly Adama',    'Cabinet Juridique ACA',       1,  'in_progress'],
            ['urgent', 'Convocation inspection du travail',                'Inspecteur Koné',       'Inspection du Travail Abidjan',2, 'assigned'],
            ['urgent', 'Demande urgente de documents fiscaux',             'Directeur Fiscal',      'DGI Côte d\'Ivoire',          0,  'registered'],
            ['urgent', 'Appel d\'offres urgent - Deadline 72h',           'Directeur Achats',      'SOTRA',                        1,  'assigned'],
            ['urgent', 'Alerte : Non-conformité sécurité bâtiment',       'Inspecteur Sécurité',   'Mairie du Plateau',            3,  'in_progress'],

            ['high', 'Renouvellement contrat de maintenance',              'M. Yapo Jean',          'CFAO Technologies',            5,  'in_progress'],
            ['high', 'Demande de partenariat commercial',                  'Mme Gbané Aminata',     'NSIA Banque',                  7,  'in_progress'],
            ['high', 'Invitation forum investisseurs CGECI',               'Secrétariat CGECI',     'CGECI',                        4,  'replied'],
            ['high', 'Réclamation client - Prestation non conforme',       'M. Sangaré Oumar',      'GIC Industries',               6,  'in_progress'],
            ['high', 'Proposition de contrat cadre 2025-2026',            'Dr. Bamba Korotoum',    'Université Félix H. Boigny',   8,  'assigned'],

            ['normal', 'Facture N°2024-0456 - Fournitures bureau',        'Service Facturation',   'Bureau Express CI',           12,  'replied'],
            ['normal', 'Compte rendu réunion interconsulaire',            'Secrétaire Général',    'CCI Abidjan',                  10,  'archived'],
            ['normal', 'Rapport audit externe Q3 2024',                   'Cabinet Deloitte CI',   'Deloitte & Touche CI',         15,  'archived'],
            ['normal', 'Invitation atelier PME digitale',                  'Coordinatrice',         'Orange Digital Center',       20,  'archived'],
            ['normal', 'Communiqué nouvelles réglementations sociales',   'Direction Juridique',   'Ministère du Travail',         18,  'archived'],
            ['normal', 'Demande de stage Mlle Fofana Mariame',           'Mlle Fofana Mariame',   'Université Cocody',            3,   'assigned'],
            ['normal', 'Devis installation réseau informatique',          'Directeur Technique',   'IT Solutions Abidjan',         5,   'in_progress'],
            ['normal', 'Invitation cérémonie vœux 2025 FIPME',           'Président FIPME',       'FIPME',                        7,   'replied'],
            ['normal', 'Note de service logement corps préfectoral',      'Préfet du Plateau',     'Préfecture Abidjan-Plateau',   9,   'registered'],
            ['normal', 'Courrier confirmation partenariat formation',      'DRH Partenaire',        'Centre CFPA Abidjan',         11,  'archived'],

            ['normal', 'Relance cotisations CNPS décembre',              'Agent CNPS',            'CNPS',                        14,  'replied'],
            ['normal', 'Programme séminaire OHADA 2025',                  'Secrétariat OHADA',     'OHADA',                       16,  'archived'],
            ['normal', 'Demande de référence fournisseur',                'Service Achats',        'SIFCA Group',                  2,  'registered'],
            ['normal', 'Réponse appel d\'offres N°AO-2024-112',          'Direction Générale',    'MTN Côte d\'Ivoire',           4,  'in_progress'],
            ['normal', 'Invitation inauguration nouveau siège',           'Protocole',             'Chambre des Métiers',          6,  'replied'],
            ['normal', 'Commande fournitures N°CF-2024-089',             'Service Logistique',    'Papeterie du Plateau',         8,  'archived'],
            ['normal', 'Convocation assemblée générale annuelle',        'Président CA',          'Association Patronale CI',    10,  'archived'],
            ['normal', 'Rapport performance réseau Q4',                   'Responsable Réseau',    'Orange Business CI',          12,  'archived'],
            ['low',    'Newsletter mensuelle partenaires',                 'Communication',         'APEX-CI',                     30,  'archived'],
            ['low',    'Bulletin veille juridique novembre',               'Veille Juridique',      'Cabinet Légalis',             25,  'archived'],
            ['low',    'Catalogue fournitures 2025',                       'Commercial',            'Staples Côte d\'Ivoire',      22,  'archived'],
            ['low',    'Vœux de fin d\'année 2024',                       'Direction',             'Société Générale CI',         28,  'archived'],
            ['low',    'Guide bonnes pratiques RH Afrique',               'Auteur',                'Editions Harmattan',          35,  'archived'],
            ['low',    'Rapport trimestriel UEMOA',                       'Secrétariat UEMOA',     'Commission UEMOA',            40,  'archived'],
            ['low',    'Invitation webinaire transformation digitale',    'Organisateur',          'Club DSI Afrique',            15,  'archived'],
            ['low',    'Prospectus imprimerie nouvelle gamme',            'Commercial',            'Imprimerie Graphique Plus',   20,  'archived'],
            ['normal', 'Demande autorisation travaux aménagement',        'Locataire',             'Régie Immobilière Plateau',    2,  'registered'],
            ['high',   'Convocation médecine du travail',                 'Médecin du Travail',    'Centre Médical Entreprise',    1,  'assigned'],
            ['normal', 'Facture eau et électricité décembre',            'Service Facturation',   'CIE/SODECI',                   5,  'replied'],
            ['high',   'Résultats audit conformité RGPD',               'Auditeur',              'Cabinet Compliance Africa',    3,  'in_progress'],
        ];

        foreach ($incomingMails as $i => $mail) {
            $receivedAt = now()->subDays($mail[4]);
            DB::table('mail_registry')->insert([
                'organization_id'     => $orgId,
                'reference'           => $makeRef('incoming'),
                'type'                => 'incoming',
                'urgency'             => $mail[0],
                'status'              => $mail[5],
                'subject'             => $mail[1],
                'sender_name'         => $mail[2],
                'sender_email'        => strtolower(str_replace(' ', '.', $mail[2])) . '@exemple.ci',
                'sender_organization' => $mail[3],
                'received_at'         => $receivedAt,
                'due_date'            => $mail[0] === 'urgent' ? $receivedAt->copy()->addDays(3) : null,
                'assigned_to'         => $users[array_rand($users)],
                'registered_by'       => $users[array_rand(array_slice($users, 0, 3))],
                'notes'               => null,
                'tags'                => json_encode([$mail[0], 'entrant']),
                'created_at'          => $receivedAt,
                'updated_at'          => now(),
            ]);
        }

        // ── 20 Courriers sortants ────────────────────────────────────────────
        $outgoingMails = [
            ['high',   'Réponse à la mise en demeure du Cabinet ACA',        'Me Coulibaly Adama',    'Cabinet Juridique ACA',      2,  'replied'],
            ['urgent', 'Transmission dossier complet DGI',                    'Directeur Fiscal',      'DGI Côte d\'Ivoire',         1,  'replied'],
            ['normal', 'Offre de services conseil stratégique',              'Direction Générale',    'PALMAFRIQUE SA',             5,  'replied'],
            ['normal', 'Confirmation participation forum CGECI',              'Secrétariat CGECI',     'CGECI',                      4,  'replied'],
            ['normal', 'Proposition partenariat formation professionnelle',   'DRH Partenaire',        'Centre CFPA Abidjan',        6,  'replied'],
            ['high',   'Courrier de relance client GIC Industries',          'M. Sangaré Oumar',      'GIC Industries',             3,  'replied'],
            ['normal', 'Rapport d\'activités mensuel - Octobre 2024',        'Direction',             'Conseil d\'Administration',  8,  'replied'],
            ['normal', 'Lettre de recommandation Mlle Kouassi',             'Direction RH',          'NSIA Assurances',            10, 'replied'],
            ['normal', 'Envoi contrat signé N°CT-2024-056',                 'Service Juridique',     'MTN Côte d\'Ivoire',         7,  'replied'],
            ['normal', 'Accusé de réception AO-2024-112',                   'Direction Achats',      'MTN Côte d\'Ivoire',         4,  'replied'],
            ['high',   'Note d\'information restructuration département',    'DRH',                   'Ensemble du personnel',      2,  'replied'],
            ['normal', 'Réponse demande devis - Réseau informatique',        'Directeur Technique',   'IT Solutions Abidjan',       5,  'replied'],
            ['urgent', 'Réponse inspection du travail - Documents joints',   'Inspecteur Koné',       'Inspection du Travail',      1,  'replied'],
            ['normal', 'Invitation réunion partenaires Q1 2025',            'Partenaires Stratégiques','Divers partenaires',        3,  'replied'],
            ['normal', 'Bon de commande fournitures N°BC-2024-124',         'Service Logistique',    'Papeterie du Plateau',       6,  'replied'],
            ['normal', 'Compte rendu réunion 15 novembre 2024',             'Participants',          'Membres CODIR',              9,  'replied'],
            ['high',   'Demande de prorogation délai CNPS',                  'Agent CNPS',            'CNPS',                       4,  'replied'],
            ['normal', 'Envoi rapport audit interne Q3',                    'Commissaire aux Comptes','Cabinet Ernst & Young',     11, 'replied'],
            ['normal', 'Lettre de félicitations performance commerciale',   'Équipe Commerciale',    'Employés distincts',         8,  'replied'],
            ['normal', 'Transmission PV assemblée générale',               'Actionnaires',          'Greffe du Tribunal',         12, 'replied'],
        ];

        foreach ($outgoingMails as $i => $mail) {
            $sentAt = now()->subDays($mail[4]);
            DB::table('mail_registry')->insert([
                'organization_id'     => $orgId,
                'reference'           => $makeRef('outgoing'),
                'type'                => 'outgoing',
                'urgency'             => $mail[0],
                'status'              => $mail[5],
                'subject'             => $mail[1],
                'recipient_name'      => $mail[2],
                'recipient_email'     => strtolower(str_replace([' ', '\''], ['.', ''], $mail[2])) . '@exemple.ci',
                'sender_name'         => 'Cabinet Conseil DEMO SARL',
                'sender_email'        => 'contact@demo-cabinet.ci',
                'sender_organization' => 'Cabinet Conseil DEMO SARL',
                'sent_at'             => $sentAt,
                'registered_by'       => $users[array_rand(array_slice($users, 0, 3))],
                'assigned_to'         => null,
                'notes'               => null,
                'tags'                => json_encode([$mail[0], 'sortant']),
                'created_at'          => $sentAt,
                'updated_at'          => now(),
            ]);
        }

        $this->command->info('  ✅ 40 courriers entrants + 20 courriers sortants créés.');
    }
}
