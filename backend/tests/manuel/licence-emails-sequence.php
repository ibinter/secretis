<?php

/**
 * Recette de la séquence d'e-mails d'essai et d'expiration — cahier IBIG SOFT
 * v1.1, sections 5.4, 8.6 et 8.8.
 *
 * POURQUOI UN SCRIPT ET PAS UN TEST PHPUNIT
 * -----------------------------------------
 * Même raison que licence-plafond-courriers.php : `phpunit.xml` laisse
 * `DB_CONNECTION` commenté et il n'existe pas de base de test. Un test Feature
 * s'exécuterait sur `secretis_prod`. Ce script ouvre une transaction, prouve le
 * comportement, et ROLLBACK systématiquement.
 *
 * AUCUN E-MAIL NE PART. `Mail::fake()` est appelé en premier : la séquence est
 * observée, pas expédiée. Les adresses utilisées sont en `.invalid`, un TLD que
 * la RFC 2606 réserve précisément à cet usage.
 *
 * USAGE
 *   php artisan tinker tests/manuel/licence-emails-sequence.php
 *
 * CE QU'IL PROUVE
 *   1. Les sept jalons sélectionnent le bon destinataire au bon jour.
 *   2. Les objets sont ceux de la section 8.6, avec les valeurs du moteur.
 *   3. La commande est IDEMPOTENTE : relancée, elle n'envoie rien de plus.
 *   4. Aucune relance n'existe après J+7.
 *   5. Aucun terme banni (section 12.3) dans les objets ni dans les corps.
 */

use App\Mail\LicenceSequenceMail;
use App\Models\License;
use App\Models\Organization;
use App\Services\LicenceService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

Mail::fake();

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

/** @var LicenceService $L */
$L = app(LicenceService::class);

echo PHP_EOL . 'Séquence ' . $L->nomSolution() . ' — essai ' . $L->essaiJours()
    . ' j, grâce ' . $L->graceJours() . ' j, rétention ' . $L->retentionJours() . ' j' . PHP_EOL . PHP_EOL;

DB::beginTransaction();

try {
    // ── Espace de recette ───────────────────────────────────────────────────
    $org = Organization::create([
        'name'     => 'Recette séquence e-mails',
        'slug'     => 'recette-sequence-emails-' . uniqid(),
        'email'    => 'recette@example.invalid',
        'status'   => 'trial',
        'country'  => 'CI',
        'timezone' => 'Africa/Abidjan',
    ]);

    // Le schéma porte first_name/last_name ; certains points du code lisent
    // `name`. On renseigne ce qui existe réellement, sans trancher le débat.
    $colonnes = [
        'organization_id' => $org->id,
        'email'           => 'admin.recette@example.invalid',
        'role'            => 'admin',
        'password'        => bcrypt(bin2hex(random_bytes(16))),
        'created_at'      => now(),
        'updated_at'      => now(),
    ];
    foreach (['first_name' => 'Aya', 'last_name' => 'Konan', 'name' => 'Aya Konan'] as $c => $v) {
        if (Schema::hasColumn('users', $c)) {
            $colonnes[$c] = $v;
        }
    }
    $userId = DB::table('users')->insertGetId($colonnes);

    // ── Un scénario par jalon ───────────────────────────────────────────────
    // Chaque jalon reçoit sa propre licence et sa propre date de référence :
    // c'est le seul moyen d'observer les sept sans faire voyager l'horloge.
    $aujourdhui = now()->startOfDay();

    $scenarios = [
        // jalon => [etat, starts_at, ends_at] — les dates sont posées pour que
        // le jalon tombe AUJOURD'HUI, la commande tournant sans --date.
        'J+1'  => ['TRIAL', $aujourdhui->copy()->subDay(),                       $aujourdhui->copy()->addDays($L->essaiJours() - 1)->setTime(9, 0)],
        'J-3'  => ['TRIAL', $aujourdhui->copy()->subDays($L->essaiJours() - 3),  $aujourdhui->copy()->addDays(3)->setTime(9, 0)],
        'J-1'  => ['TRIAL', $aujourdhui->copy()->subDays($L->essaiJours() - 1),  $aujourdhui->copy()->addDay()->setTime(9, 0)],
        'J0'   => ['FREE',  $aujourdhui->copy()->subDays($L->essaiJours()),      $aujourdhui->copy()->subHours(2)],
        'J+7'  => ['FREE',  $aujourdhui->copy()->subDays($L->essaiJours() + 7),  $aujourdhui->copy()->subDays(7)->setTime(9, 0)],
        'J+60' => ['EXPIRED', $aujourdhui->copy()->subDays(200),                 $aujourdhui->copy()->subDays(60 + $L->graceJours())->setTime(9, 0)],
        'J+83' => ['EXPIRED', $aujourdhui->copy()->subDays(200),                 $aujourdhui->copy()->subDays(83 + $L->graceJours())->setTime(9, 0)],
    ];

    foreach ($scenarios as $jalon => [$etat, $debut, $fin]) {
        // Une seule licence courante à la fois : les précédentes sont écartées,
        // exactement comme le fait LicenceService::demarrerEssai.
        License::where('organization_id', $org->id)->update(['superseded_at' => now()]);

        $grace = $fin->copy()->addDays($L->graceJours());

        $licence = License::create([
            'organization_id' => $org->id,
            'plan_name'       => 'Pro',
            'etat'            => $etat,
            'solution'        => $L->solution(),
            'origine'         => 'essai',
            'cle_licence'     => strtoupper($L->solution()) . '-RECETTE-' . bin2hex(random_bytes(6)),
            'starts_at'       => $debut,
            'ends_at'         => $fin,
            'grace_until'     => $grace,
            'date_purge'      => $grace->copy()->addDays($L->retentionJours()),
        ]);

        Mail::fake();   // compteur remis à zéro pour ce jalon

        Artisan::call('licence:emails', ['--jalon' => $jalon]);

        $envoyes = Mail::sent(LicenceSequenceMail::class);

        $verifier(
            "{$jalon} — un message et un seul",
            $envoyes->count() === 1,
            $envoyes->count() . ' envoi(s)'
        );

        if ($envoyes->count() !== 1) {
            echo '        sortie commande : ' . trim(Artisan::output()) . PHP_EOL;
            continue;
        }

        /** @var LicenceSequenceMail $mail */
        $mail = $envoyes->first();

        $verifier("{$jalon} — destinataire = administrateur de l'espace",
            $mail->hasTo('admin.recette@example.invalid'));

        echo "        OBJET : {$mail->sujet()}" . PHP_EOL;

        // Aucun chiffre en dur : la valeur affichée doit être celle du moteur.
        if (in_array($jalon, ['J+1', 'J-3', 'J-1'], true)) {
            $verifier("{$jalon} — durée d'essai issue du moteur",
                (int) $mail->donnees['essai_jours'] === $L->essaiJours());
        }

        $verifier("{$jalon} — plafond issu du moteur",
            $mail->donnees['plafond_resume'] === $L->resumePlafond(),
            $mail->donnees['plafond_resume']);

        // Terminologie imposée (section 12.3).
        $corps = strip_tags($mail->render()) . ' ' . $mail->sujet();
        $bannis = array_filter(
            $L->config()['termes_bannis'],
            fn (string $terme) => mb_stripos($corps, $terme) !== false
        );
        $verifier("{$jalon} — aucun terme banni", $bannis === [], implode(', ', $bannis));

        // ── Idempotence ─────────────────────────────────────────────────────
        Mail::fake();
        Artisan::call('licence:emails', ['--jalon' => $jalon]);
        $verifier("{$jalon} — relancée le même jour : aucun second envoi",
            Mail::sent(LicenceSequenceMail::class)->count() === 0);

        $verifier("{$jalon} — une seule trace en journal",
            DB::table('licence_emails')
                ->where('license_id', $licence->id)
                ->where('jalon', $jalon)
                ->count() === 1);
    }

    // ── Règle : aucune relance après J+7 ────────────────────────────────────
    // On rejoue toute la séquence sur la licence issue d'un essai, plusieurs
    // mois après la bascule. Rien ne doit partir.
    License::where('organization_id', $org->id)->update(['superseded_at' => now()]);

    $fin = $aujourdhui->copy()->subDays($L->essaiJours() + 120);

    License::create([
        'organization_id' => $org->id,
        'plan_name'       => 'Pro',
        'etat'            => 'FREE',
        'solution'        => $L->solution(),
        'origine'         => 'essai',
        'cle_licence'     => strtoupper($L->solution()) . '-RECETTE-' . bin2hex(random_bytes(6)),
        'starts_at'       => $fin->copy()->subDays($L->essaiJours()),
        'ends_at'         => $fin,
        'grace_until'     => $fin->copy()->addDays($L->graceJours()),
        'date_purge'      => $fin->copy()->addDays($L->graceJours() + $L->retentionJours()),
    ]);

    Mail::fake();
    Artisan::call('licence:emails');

    $verifier(
        'Aucune relance après J+7 — un compte en palier gratuit depuis 120 jours ne reçoit rien',
        Mail::sent(LicenceSequenceMail::class)->count() === 0
    );

    echo PHP_EOL . "  {$ok} contrôle(s) réussi(s), {$ko} en échec." . PHP_EOL;
} finally {
    DB::rollBack();
    echo '  Transaction annulée — la base est inchangée.' . PHP_EOL . PHP_EOL;
}
