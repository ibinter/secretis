<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Correspondance entre les opérations de gestion et les comptes SYSCOHADA.
 *
 * Sans elle, le pont facturation → comptabilité devrait coder les numéros de
 * comptes en dur — la même erreur que les taux de cotisation figés dans le
 * code. Or le compte de produit dépend de l'activité : un secrétariat vend des
 * services (706), un négociant des marchandises (701). Et une organisation peut
 * avoir subdivisé son plan (4111 plutôt que 411).
 *
 * Les valeurs par défaut suivent le plan SYSCOHADA révisé. Elles sont posées
 * par organisation et modifiables : c'est un paramétrage comptable, pas une
 * constante de programme.
 */
return new class extends Migration
{
    /** Opérations couvertes, avec le compte SYSCOHADA usuel. */
    private const DEFAUTS = [
        'clients'          => ['411',  'Créances clients (facture de vente)'],
        'sales_services'   => ['706',  'Produits — services vendus'],
        'sales_goods'      => ['701',  'Produits — ventes de marchandises'],
        'vat_collected'    => ['4431', 'TVA collectée sur les ventes'],
        'bank'             => ['521',  'Banque (encaissement)'],
        'cash'             => ['571',  'Caisse (encaissement)'],
        'suppliers'        => ['401',  'Dettes fournisseurs'],
        'vat_deductible'   => ['4451', 'TVA déductible sur achats'],
        'discount_granted' => ['709',  'Rabais, remises et ristournes accordés'],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('accounting_mappings')) {
            Schema::create('accounting_mappings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

                // Opération de gestion : clients, sales_services, vat_collected…
                $table->string('purpose', 40);
                $table->string('account_number', 20);
                $table->string('label')->nullable();

                $table->timestamps();

                $table->unique(['organization_id', 'purpose']);
            });
        }

        // Poser les défauts pour les organisations qui ont un plan comptable,
        // en ne retenant que les comptes qui existent RÉELLEMENT chez elles :
        // une organisation ayant subdivisé son plan n'a pas forcément « 411 ».
        if (! Schema::hasTable('chart_of_accounts')) {
            return;
        }

        $maintenant = now();

        foreach (DB::table('chart_of_accounts')->select('organization_id')->distinct()->pluck('organization_id') as $orgId) {
            $comptes = DB::table('chart_of_accounts')
                ->where('organization_id', $orgId)
                ->pluck('account_number')
                ->flip();

            foreach (self::DEFAUTS as $purpose => [$numero, $libelle]) {
                if (! isset($comptes[$numero])) {
                    continue;
                }

                DB::table('accounting_mappings')->updateOrInsert(
                    ['organization_id' => $orgId, 'purpose' => $purpose],
                    [
                        'account_number' => $numero,
                        'label'          => $libelle,
                        'updated_at'     => $maintenant,
                        'created_at'     => $maintenant,
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_mappings');
    }
};
