<?php

/**
 * Recette de bout en bout du plafond `courriers_mois` — cahier IBIG SOFT v1.1,
 * sections 3.7, 9.5 et 9.8.
 *
 * POURQUOI UN SCRIPT ET PAS SEULEMENT UN TEST PHPUNIT
 * ---------------------------------------------------
 * La suite PHPUnit démarre (`php8.3 vendor/bin/phpunit --testsuite Unit` passe),
 * mais elle n'a PAS de base de test : `phpunit.xml` laisse `DB_CONNECTION`
 * commenté et il n'existe ni `.env.testing` ni base `*_test` sur le serveur.
 * Un test Feature s'exécuterait donc sur `secretis_prod`. Ce script est le
 * chemin sûr : il ouvre une transaction, prouve le comportement, et
 * ROLLBACK systématiquement — la base ressort exactement comme elle est entrée.
 *
 * USAGE
 *   php artisan tinker tests/manuel/licence-plafond-courriers.php
 *
 * Il n'écrit aucun plafond ni aucune durée en dur : tout vient du moteur.
 */

use App\Models\MailRegistry;
use App\Models\Organization;
use App\Models\User;
use App\Services\CourrierService;
use App\Services\LicenceService;
use Illuminate\Support\Facades\DB;

$ok = 0;
$ko = 0;

$verifier = function (string $intitule, bool $condition, string $detail = '') use (&$ok, &$ko): void {
    if ($condition) {
        $ok++;
        echo "  [OK]  {$intitule}" . ($detail ? "  — {$detail}" : '') . PHP_EOL;
    } else {
        $ko++;
        echo "  [KO]  {$intitule}" . ($detail ? "  — {$detail}" : '') . PHP_EOL;
    }
};

$licence  = app(LicenceService::class);
$courrier = app(CourrierService::class);
$compteur = CourrierService::COMPTEUR;
$plafond  = $licence->plafond($compteur);

echo PHP_EOL;
echo "=== Recette plafond « {$compteur} » — palier {$licence->config()['gratuit']['nom']} ===" . PHP_EOL;
echo "Plafond lu dans licence.config.json : {$plafond}" . PHP_EOL . PHP_EOL;

DB::beginTransaction();

try {
    // ── Espace de recette, créé et détruit dans la transaction ───────────────
    $suffixe = 'recette-licence-' . bin2hex(random_bytes(4));

    $org = Organization::create([
        'name'     => 'Espace de recette licence',
        'slug'     => $suffixe,
        'email'    => "{$suffixe}@exemple.test",
        'country'  => 'CI',
        'timezone' => 'Africa/Abidjan',
    ]);

    $user = User::create([
        'organization_id' => $org->id,
        'name'            => 'Agent de recette',
        'email'           => "agent-{$suffixe}@exemple.test",
        'password'        => bcrypt(bin2hex(random_bytes(8))),
    ]);

    // ── Contournement d'un DÉFAUT PRODUIT, étranger au chantier licence ─────
    // `mail_registry.reference` porte une contrainte d'unicité GLOBALE, alors
    // que `CourrierService::generateReference()` numérote PAR ORGANISATION :
    // le premier courrier d'un nouvel espace tente donc d'écrire une référence
    // (REF-ENTRANT-{année}-00001) que le premier espace détient déjà. Le défaut
    // ne s'est pas encore manifesté parce qu'un seul espace enregistre du
    // courrier ; il se déclenchera au deuxième — c'est-à-dire dès le premier
    // espace Découverte. Signalé, non corrigé ici : il n'appartient pas à cette
    // surface.
    //
    // Pour que la recette puisse s'exécuter malgré lui, on écarte les seules
    // références qui entreraient en collision. Comme tout le reste, c'est
    // annulé par le ROLLBACK final.
    $collisions = [];
    foreach (['ENTRANT', 'SORTANT'] as $prefixe) {
        for ($i = 1; $i <= $plafond + 3; $i++) {
            $collisions[] = sprintf('REF-%s-%d-%05d', $prefixe, now()->year, $i);
        }
    }
    DB::table('mail_registry')
        ->whereIn('reference', $collisions)
        ->update(['reference' => DB::raw("reference || '-ecartee-par-la-recette'")]);

    // Aucune licence pour cet espace : le moteur le place en FREE, l'état où
    // les plafonds s'appliquent. C'est exactement la situation d'un espace
    // Découverte fraîchement ouvert.
    $verifier("L'espace neuf est en FREE", $licence->etat($org->id) === 'FREE', 'état = ' . $licence->etat($org->id));
    $verifier('Le compteur part de zéro', $licence->usage($org->id, $compteur) === 0);

    // ── 1. Les N premiers courriers passent ─────────────────────────────────
    $references = [];

    for ($i = 1; $i <= $plafond; $i++) {
        $mail = $courrier->registerIncoming([
            'subject' => "Courrier de recette n°{$i}",
            'urgency' => 'normal',
        ], $user);

        $references[] = $mail->reference;
    }

    $verifier(
        "Les {$plafond} premiers courriers sont acceptés",
        count($references) === $plafond,
        implode(', ', $references)
    );
    $verifier(
        'Le compteur suit exactement les écritures',
        $licence->usage($org->id, $compteur) === $plafond,
        'usage = ' . $licence->usage($org->id, $compteur)
    );
    $verifier('Le moteur annonce le plafond atteint', $licence->peutCreer($org->id, $compteur) === false);
    $verifier(
        'Le quota exposé au front est cohérent',
        $licence->quota($org->id, $compteur)['restant'] === 0
            && $licence->quota($org->id, $compteur)['autorise'] === false
    );

    // ── 2. Le suivant est refusé ────────────────────────────────────────────
    $hitsAvant   = DB::table('quota_hits')->where('organization_id', $org->id)->count();
    $courriersOk = MailRegistry::where('organization_id', $org->id)->count();

    $refus = null;

    try {
        $courrier->registerIncoming([
            'subject' => 'Courrier de recette au-delà du plafond',
            'urgency' => 'normal',
        ], $user);
    } catch (\App\Exceptions\PlafondAtteintException $e) {
        $refus = $e;
    }

    $verifier('Le courrier au-delà du plafond est refusé', $refus !== null);
    $verifier(
        'Le refus porte le texte officiel de la section 8.5',
        $refus !== null && $refus->getMessage() === $licence->messageRefus($compteur),
        $refus?->getMessage() ?? '—'
    );
    $verifier(
        'Le refus ne contient aucun terme banni',
        $refus !== null && ! collect($licence->config()['termes_bannis'])
            ->contains(fn ($terme) => str_contains(mb_strtolower($refus->getMessage()), mb_strtolower($terme)))
    );

    // ── 3. Données intactes ─────────────────────────────────────────────────
    $verifier(
        'Aucun courrier fantôme n\'a été écrit',
        MailRegistry::where('organization_id', $org->id)->count() === $courriersOk,
        MailRegistry::where('organization_id', $org->id)->count() . " courriers"
    );
    $verifier(
        'Les courriers déjà enregistrés restent lisibles',
        MailRegistry::where('organization_id', $org->id)->pluck('reference')->sort()->values()->all()
            === collect($references)->sort()->values()->all()
    );
    $verifier(
        'Le refus n\'a pas consommé de quota',
        $licence->usage($org->id, $compteur) === $plafond
    );

    // ── 4. Tentative journalisée (section 9.8) ──────────────────────────────
    $hits = DB::table('quota_hits')->where('organization_id', $org->id)->get();

    $verifier('La tentative de dépassement est journalisée', $hits->count() === $hitsAvant + 1);
    $verifier(
        'Le journal porte le compteur, le plafond et l\'auteur',
        $hits->last() !== null
            && $hits->last()->compteur === $compteur
            && (int) $hits->last()->plafond === $plafond
            && (int) $hits->last()->valeur_tentee === $plafond + 1
            && (int) $hits->last()->user_id === (int) $user->id
    );

    // ── 5. Remise à zéro au changement de mois ──────────────────────────────
    // On ne déplace pas l'horloge : on lit la période telle que le moteur la
    // calcule, et on vérifie que la période SUIVANTE est vierge. C'est
    // exactement ce que verra l'espace le 1er du mois à 00h00.
    $periodeCourante = trim($licence->periode($compteur));
    $periodeSuivante = \Carbon\Carbon::createFromFormat('Y-m', $periodeCourante)->addMonth()->format('Y-m');

    $usageMoisSuivant = (int) DB::table('quotas_usage')
        ->where('organization_id', $org->id)
        ->where('solution', $licence->solution())
        ->where('compteur', $compteur)
        ->where('periode', $periodeSuivante)
        ->value('valeur');

    $verifier(
        "Le compteur est mensuel ({$periodeCourante} → {$periodeSuivante})",
        $licence->estMensuel($compteur)
    );
    $verifier(
        'Le mois suivant repart de zéro',
        $usageMoisSuivant === 0,
        "usage {$periodeSuivante} = {$usageMoisSuivant}"
    );

    // Preuve par simulation : on écrit la ligne du mois suivant comme le ferait
    // le premier courrier de ce mois-là, et on vérifie qu'elle est indépendante.
    DB::table('quotas_usage')->insert([
        'organization_id' => $org->id,
        'solution'        => $licence->solution(),
        'compteur'        => $compteur,
        'periode'         => $periodeSuivante,
        'valeur'          => 1,
        'created_at'      => now(),
        'updated_at'      => now(),
    ]);

    $verifier(
        'Les périodes sont bien cloisonnées',
        $licence->usage($org->id, $compteur) === $plafond,
        'le mois courant est inchangé après écriture sur le mois suivant'
    );

    // ── 6. La suppression rend la place du mois en cours ────────────────────
    $dernier = MailRegistry::where('organization_id', $org->id)->orderByDesc('id')->first();
    $dernier->delete();
    $courrier->decompterCourrier($dernier);

    $verifier(
        'La suppression restitue une unité de compteur',
        $licence->usage($org->id, $compteur) === $plafond - 1,
        'usage = ' . $licence->usage($org->id, $compteur)
    );
    $verifier('L\'écriture redevient possible', $licence->peutCreer($org->id, $compteur) === true);

    // ── 7. Un espace en lecture seule n'écrit plus, mais ne perd rien ────────
    \App\Models\License::create([
        'organization_id' => $org->id,
        // `plan_id` et `plan_name` sont NOT NULL en base. `status` n'est PAS
        // écrit ici : le déclencheur `licenses_sync_status_trg` l'aligne sur
        // `etat`, et le brief interdit de l'écrire à la main.
        'plan_id'         => 'recette',
        'plan_name'       => 'Recette',
        'etat'            => 'EXPIRED',
        'solution'        => $licence->solution(),
        'origine'         => 'migration',
        'cle_licence'     => 'RECETTE-' . bin2hex(random_bytes(8)),
        'starts_at'       => now()->subYear(),
        'ends_at'         => now()->subMonths(4),
        'grace_until'     => now()->subMonths(4)->addDays($licence->graceJours()),
        'date_purge'      => now()->addDays($licence->retentionJours()),
    ]);

    $verifier('L\'espace échu est en EXPIRED', $licence->etat($org->id) === 'EXPIRED', $licence->etat($org->id));
    $verifier('L\'écriture est fermée en lecture seule', $licence->peutCreer($org->id, $compteur) === false);
    $verifier('L\'export est fermé en lecture seule', $licence->peut($org->id, 'export') === false);
    $verifier(
        'Les courriers restent lisibles en lecture seule',
        MailRegistry::where('organization_id', $org->id)->count() === $plafond - 1
    );
} catch (\Throwable $e) {
    $ko++;
    echo PHP_EOL . '  [EXCEPTION] ' . get_class($e) . ' : ' . $e->getMessage() . PHP_EOL;
    echo '              ' . $e->getFile() . ':' . $e->getLine() . PHP_EOL;
} finally {
    // Systématique : cette recette ne laisse jamais rien derrière elle.
    DB::rollBack();
}

echo PHP_EOL . "=== {$ok} vérification(s) réussie(s), {$ko} échec(s) — base restaurée par ROLLBACK ===" . PHP_EOL . PHP_EOL;
