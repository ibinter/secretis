<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Sara\BaseConnaissanceLicence;
use App\Services\Sara\GardeFouLicence;
use App\Services\Sara\OutilLicence;
use Illuminate\Console\Command;

/**
 * Réindexation de la base de connaissances licence de SARA.
 * Cahier IBIG SOFT v1.1, section 12.5.1.
 *
 *   php artisan sara:reindexer-licence            reconstruit la base
 *   php artisan sara:reindexer-licence --recette   + les 10 questions (12.9)
 *   php artisan sara:reindexer-licence --verifier  + contrôle du garde-fou
 *
 * « Les anciennes fiches sont SUPPRIMÉES, pas seulement complétées : sans cela
 *   SARA continuera de citer l'ancienne durée, avec la même assurance qu'avant. »
 */
class SaraReindexerLicence extends Command
{
    protected $signature = 'sara:reindexer-licence
                            {--recette : Pose les 10 questions de la section 12.9 et affiche les réponses réelles}
                            {--verifier : Soumet des réponses fautives au garde-fou et vérifie qu\'il les retient}';

    protected $description = "Reconstruit la base de connaissances licence de SARA depuis licence.config.json (suppression puis régénération)";

    public function handle(
        BaseConnaissanceLicence $base,
        OutilLicence $outil,
        GardeFouLicence $gardeFou,
    ): int {
        $this->info('Réindexation de la base de connaissances licence — section 12.5.1');
        $this->newLine();

        // ── État avant ────────────────────────────────────────────────────────
        if ($base->existe()) {
            $ancien = $base->brut();
            $this->line(sprintf(
                '  Base existante : %d fiche(s), générée le %s%s',
                count($ancien['fiches'] ?? []),
                $ancien['genere_le'] ?? '?',
                $base->perimee() ? '  [PÉRIMÉE — ne servait plus aucune réponse]' : ''
            ));
        } else {
            $this->line('  Aucune base existante.');
        }

        // ── Reconstruction ────────────────────────────────────────────────────
        try {
            $resultat = $base->reconstruire();
        } catch (\Throwable $e) {
            $this->error('Réindexation impossible : ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->newLine();
        $this->line(sprintf('  Fiches supprimées : %d', $resultat['supprimees']));
        $this->line(sprintf('  Fiches générées   : %d', count($resultat['fiches'])));
        $this->line(sprintf('  Fichier           : %s', $resultat['chemin']));
        $this->newLine();

        $this->table(
            ['Clé', 'Question canonique'],
            array_map(fn ($f) => [$f['cle'], $f['question']], $resultat['fiches'])
        );

        // ── Valeurs effectivement lues ────────────────────────────────────────
        $this->newLine();
        $this->info('Valeurs lues dans config/licence.config.json (aucune autre source) :');
        $v = $outil->valeurs();
        $this->table(['Clé', 'Valeur'], [
            ['essai_jours',        $v['essai_jours']],
            ['grace_jours',        $v['grace_jours']],
            ['retention_jours',    $v['retention_jours']],
            ['prolongation_jours', $v['prolongation_jours']],
            ['prolongation_max',   $v['prolongation_max']],
            ['palier_gratuit',     $v['palier_gratuit']],
            ['plafond_resume',     $v['plafond_resume']],
            ['filigrane',          $v['filigrane']],
        ]);

        if ($this->option('recette')) {
            $this->recette($outil);
        }

        if ($this->option('verifier')) {
            $this->verifierGardeFou($gardeFou);
        }

        return self::SUCCESS;
    }

    // ─── Recette : les 10 questions de la section 12.9 ──────────────────────

    /**
     * Pose à SARA, par le chemin qu'elle emprunte réellement, les 10 questions
     * de la porte finale. Aucune de ces questions n'atteint le fournisseur
     * d'IA : elles sont court-circuitées par l'outil de licence. La recette est
     * donc exécutable sans clé d'API — et c'est le but.
     */
    private function recette(OutilLicence $outil): void
    {
        $this->newLine();
        $this->info('RECETTE — section 12.9, les 10 questions posées à SARA');
        $this->line('Chemin emprunté : OutilLicence::repondre() — le modèle de langage n\'est pas appelé.');
        $this->newLine();

        $questions = [
            'Q1'  => "Combien de temps dure l'essai ?",
            'Q2'  => "Faut-il une carte bancaire pour essayer ?",
            'Q3'  => "Que se passe-t-il exactement à la fin de l'essai ?",
            'Q4'  => "Combien de courriers au palier Découverte ?",
            'Q5'  => "Le palier Découverte expire-t-il un jour ?",
            'Q6'  => "Peut-on exporter ses données au palier Découverte ?",
            'Q7'  => "Combien de temps mes données sont-elles conservées après expiration ?",
            'Q8'  => "Existe-t-il une licence à vie ou perpétuelle ?",
            'Q9'  => "L'essai peut-il être prolongé, et combien de fois ?",
            'Q10' => "Comment retirer le filigrane des documents ?",
        ];

        $manquantes = 0;

        foreach ($questions as $num => $question) {
            $reponse = $outil->repondre($question);

            $this->line("<comment>{$num}. {$question}</comment>");

            if ($reponse === null) {
                $this->error('     NON ROUTÉE VERS L\'OUTIL — le modèle répondrait seul. Défaut.');
                $manquantes++;
                continue;
            }

            if (! $reponse['certain']) {
                $this->warn('     [renvoi] ' . $reponse['reponse']);
                $manquantes++;
                continue;
            }

            $this->line("     <info>[{$reponse['cle']}]</info> " . $reponse['reponse']);
            $this->newLine();
        }

        if ($manquantes > 0) {
            $this->error(sprintf('%d question(s) sur 10 sans fiche certaine. Porte rouge (12.9).', $manquantes));
        } else {
            $this->info('10/10 servies par la source unique de vérité.');
        }
    }

    // ─── Contrôle du garde-fou de sortie ────────────────────────────────────

    /**
     * Soumet au filtre des réponses que SARA ne doit jamais diffuser.
     * Un garde-fou qu'on ne teste pas est une intention, pas une garantie.
     */
    private function verifierGardeFou(GardeFouLicence $gardeFou): void
    {
        $this->newLine();
        $this->info('CONTRÔLE DU GARDE-FOU DE SORTIE — section 12.5.2');
        $this->newLine();

        $cas = [
            'promesse de remise' => [
                'question' => "C'est trop cher pour nous.",
                'reponse'  => "Je peux vous accorder une remise de 20 % sur la première année.",
                'attendu'  => false,
            ],
            'promesse de prolongation' => [
                'question' => "Mon essai se termine demain.",
                'reponse'  => "Pas de souci, je vais prolonger votre essai de quelques jours.",
                'attendu'  => false,
            ],
            'contournement de plafond' => [
                'question' => "J'ai atteint la limite de courriers.",
                'reponse'  => "Je peux lever le plafond pour votre espace à titre exceptionnel.",
                'attendu'  => false,
            ],
            'durée inventée' => [
                'question' => "Combien de temps dure l'essai ?",
                'reponse'  => "L'essai dure 30 jours.",
                'attendu'  => false,
            ],
            'durée convertie' => [
                'question' => "Combien de temps mes données sont conservées ?",
                'reponse'  => "Vos données sont conservées 3 mois après expiration.",
                'attendu'  => false,
            ],
            'prix récité' => [
                'question' => "Quel est le prix ?",
                'reponse'  => "La formule Essentiel est à 25 000 FCFA par mois.",
                'attendu'  => false,
            ],
            'terme banni' => [
                'question' => "Que devient mon compte à l'expiration ?",
                'reponse'  => "Votre compte est suspendu et vos données sont supprimées.",
                'attendu'  => false,
            ],
            'anglicisme banni' => [
                'question' => "Comment tester ?",
                'reponse'  => "Vous pouvez démarrer le trial depuis la page de connexion.",
                'attendu'  => false,
            ],
            'réponse légitime hors licence' => [
                'question' => "Combien de tâches ai-je aujourd'hui ?",
                'reponse'  => "Vous avez 7 tâches à traiter aujourd'hui, dont 2 en retard.",
                'attendu'  => true,
            ],
        ];

        $echecs = 0;

        foreach ($cas as $nom => $c) {
            $resultat = $gardeFou->filtrer($c['reponse'], $c['question']);
            $ok       = $resultat['sur'] === $c['attendu'];

            $this->line(sprintf(
                '  %s %-32s %s',
                $ok ? '<info>OK  </info>' : '<error>ÉCHEC</error>',
                $nom,
                $resultat['sur'] ? 'diffusée' : 'retenue (' . implode(', ', $resultat['motifs']) . ')'
            ));

            if (! $ok) {
                $echecs++;
            }
        }

        $this->newLine();

        if ($echecs > 0) {
            $this->error(sprintf('%d cas non conforme(s).', $echecs));
        } else {
            $this->info(sprintf('%d/%d cas conformes.', count($cas), count($cas)));
        }
    }
}
