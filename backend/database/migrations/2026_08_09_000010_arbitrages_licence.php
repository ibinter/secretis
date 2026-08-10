<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Les trois arbitrages laissés ouverts par le chantier licence.
 *
 * Ils bloquaient la porte finale du cahier (section 12.9 : dix questions posées
 * à six canaux, mêmes réponses). Chacun est réversible et documenté ici plutôt
 * que dans une conversation.
 *
 * ─── 1. LA COLLISION DU NOM « DÉCOUVERTE » ──────────────────────────────────
 *
 * La section 3.1 impose « Découverte » comme nom du palier GRATUIT, pour les
 * quatorze solutions du catalogue. La table `plans` contenait déjà une formule
 * PAYANTE du même nom, à 4 900 FCFA. Le cahier se contredit sur ce point précis
 * — sa décision D1 protège par ailleurs les noms des formules payantes.
 *
 * Arbitrage : la formule payante est renommée « Démarrage ». Raisons —
 *   · « Découverte » est un standard de catalogue qui vaut pour quatorze
 *     produits, leurs vitrines et leurs supports ; ce nom de formule payante
 *     n'existe que pour SECRETIS ;
 *   · AUCUNE LICENCE ne l'utilise (vérifié : 0), le renommage n'atteint donc
 *     aucun client ;
 *   · le prix, le contenu et la position dans la grille sont INCHANGÉS, ce que
 *     D1 protège réellement.
 *
 * ─── 2. L'ORGANISATION 4 (IBIG SOFT, INTERNE) ───────────────────────────────
 *
 * Elle portait une licence contradictoire — `status = 'superseded'` avec
 * `superseded_at` à NULL — que la migration du modèle à six états a fait tomber
 * dans sa branche par défaut, `ELSE 'ACTIVE'`. L'espace de l'ÉDITEUR se
 * présentait donc comme un client payant, et son échéance tombait au 25/08/2026.
 *
 * Arbitrage : la ligne contradictoire est écartée pour de bon (son propre
 * statut le demandait), et une licence interne explicite la remplace. Elle
 * porte une date de fin — la décision D5 n'admet aucune exception, pas même
 * pour l'éditeur — fixée à dix ans, et sera renouvelée comme n'importe quelle
 * autre.
 *
 * ─── 3. LES DEUX CONSOLES SUPERADMIN ────────────────────────────────────────
 *
 * Traité hors migration, dans les routes : la console historique redirige vers
 * celle des six états. Rien à faire en base.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->renommerLaFormulePayante();
        $this->licenceInterneEditeur();
    }

    private function renommerLaFormulePayante(): void
    {
        if (! Schema::hasTable('plans')) {
            return;
        }

        $plan = DB::table('plans')->where('slug', 'decouverte')->first();

        if (! $plan) {
            return;
        }

        // Garde-fou : si des licences citent cette formule, le renommage n'est
        // plus une correction de vocabulaire mais un changement d'offre.
        $utilisee = DB::table('licenses')->where('plan_id', $plan->id)
            ->orWhere('plan_name', $plan->name)->count();

        if ($utilisee > 0) {
            throw new \RuntimeException(
                "La formule « {$plan->name} » est citée par {$utilisee} licence(s). "
                . "La renommer relève d'une décision commerciale, pas d'une migration."
            );
        }

        DB::table('plans')->where('id', $plan->id)->update([
            'slug'       => 'demarrage',
            'name'       => 'Démarrage',
            'updated_at' => now(),
        ]);
    }

    private function licenceInterneEditeur(): void
    {
        $org = DB::table('organizations')->where('type', 'internal')->first();

        if (! $org) {
            return;
        }

        // La ligne dont le statut dit « superseded » sans en porter la date.
        $contradictoires = DB::table('licenses')
            ->where('organization_id', $org->id)
            ->where('status', 'superseded')
            ->whereNull('superseded_at')
            ->get();

        foreach ($contradictoires as $licence) {
            DB::table('licenses')->where('id', $licence->id)->update([
                'superseded_at' => now(),
                'updated_at'    => now(),
            ]);
        }

        $courante = DB::table('licenses')
            ->where('organization_id', $org->id)
            ->whereNull('superseded_at')
            ->exists();

        if ($courante) {
            return;   // l'espace a déjà une licence valide
        }

        $fin = now()->addYears(10);

        // `licenses.plan_id` est NOT NULL : une licence doit designer une
        // formule, meme interne. On retient la plus complete, celle qui ouvre
        // tous les modules — c'est ce dont l'editeur a besoin sur son propre
        // espace.
        $formule = DB::table('plans')->where('is_active', true)
            ->orderByDesc('price_xof')->first();

        DB::table('licenses')->insert([
            'organization_id' => $org->id,
            'plan_id'         => $formule?->id,
            'plan_name'       => 'IBIG Soft — licence interne',
            'etat'            => 'ACTIVE',
            'status'          => 'active',
            'solution'        => 'secretis',
            'origine'         => 'migration',
            'cle_licence'     => 'SECRETIS-INTERNE-' . bin2hex(random_bytes(8)),
            'starts_at'       => now(),
            // Datée, comme toutes les autres : la décision D5 interdit la
            // licence perpétuelle sans exception pour l'éditeur.
            'ends_at'         => $fin,
            'grace_until'     => $fin->copy()->addDays(7),
            'date_purge'      => $fin->copy()->addDays(97),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('plans')->where('slug', 'demarrage')->update([
            'slug' => 'decouverte',
            'name' => 'Découverte',
        ]);
    }
};
