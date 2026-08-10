<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Facture fournisseur — dernière étape du cycle achat, et seul document qui
 * porte la TVA déductible.
 *
 * Le cycle « demande → appel d'offres → commande → réception → FACTURE » n'avait
 * pas de table pour sa dernière étape. `purchase_orders` porte un total sans
 * ventilation HT/TVA, `expenses` un simple montant : ni l'un ni l'autre ne
 * permet de récupérer la TVA. C'est pourquoi la TVA déductible était à zéro,
 * symétriquement à la TVA collectée avant le pont sur les ventes.
 *
 * Le montant est ventilé dès la saisie — HT, taux, TVA, TTC — parce que c'est
 * ainsi que la facture arrive du fournisseur, et que reconstituer une TVA a
 * posteriori à partir d'un TTC est une source d'écart au centime.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Le compte de TVA déductible manquait au plan ────────────────────
        // Asymétrie du seeder : 4431 (TVA collectée) y était, pas 4451.
        if (Schema::hasTable('chart_of_accounts')) {
            $maintenant = now();

            $orgs = DB::table('chart_of_accounts')
                ->where('account_number', '4431')
                ->select('organization_id')->distinct()->pluck('organization_id');

            foreach ($orgs as $orgId) {
                $existe = DB::table('chart_of_accounts')
                    ->where('organization_id', $orgId)
                    ->where('account_number', '4451')
                    ->exists();

                if ($existe) {
                    continue;
                }

                // On recopie la forme d'un compte voisin pour rester cohérent
                // avec ce que le seeder a produit (type, classe, devise).
                $modele = DB::table('chart_of_accounts')
                    ->where('organization_id', $orgId)
                    ->where('account_number', '4431')
                    ->first();

                DB::table('chart_of_accounts')->insert([
                    'organization_id'       => $orgId,
                    'account_number'        => '4451',
                    'account_name'          => 'TVA déductible sur achats',
                    'account_type'          => $modele->account_type,
                    'parent_account_number' => '445',
                    'is_system'             => $modele->is_system,
                    'ohada_class'           => $modele->ohada_class,
                    'is_leaf'               => true,
                    'currency_code'         => $modele->currency_code,
                    'created_at'            => $maintenant,
                    'updated_at'            => $maintenant,
                ]);

                DB::table('accounting_mappings')->updateOrInsert(
                    ['organization_id' => $orgId, 'purpose' => 'vat_deductible'],
                    [
                        'account_number' => '4451',
                        'label'          => 'TVA déductible sur achats',
                        'updated_at'     => $maintenant,
                        'created_at'     => $maintenant,
                    ]
                );
            }

            // Compte de charge par défaut, si l'organisation le possède.
            foreach ($orgs as $orgId) {
                $charge = DB::table('chart_of_accounts')
                    ->where('organization_id', $orgId)
                    ->whereIn('account_number', ['605', '604', '601'])
                    ->orderByRaw("CASE account_number WHEN '605' THEN 1 WHEN '604' THEN 2 ELSE 3 END")
                    ->value('account_number');

                if ($charge) {
                    DB::table('accounting_mappings')->updateOrInsert(
                        ['organization_id' => $orgId, 'purpose' => 'purchases'],
                        [
                            'account_number' => $charge,
                            'label'          => 'Achats et charges externes',
                            'updated_at'     => now(),
                            'created_at'     => now(),
                        ]
                    );
                }
            }
        }

        if (Schema::hasTable('supplier_invoices')) {
            return;
        }

        Schema::create('supplier_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            // Rattachement facultatif : une facture peut arriver sans commande
            // (achat de gré à gré, abonnement, régularisation).
            $table->foreignId('purchase_order_id')->nullable()
                  ->constrained('purchase_orders')->nullOnDelete();

            // Le numéro du FOURNISSEUR, celui qui figure sur son document.
            $table->string('invoice_number');
            $table->string('internal_reference')->nullable();

            $table->date('invoice_date');
            $table->date('due_date')->nullable();

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('currency', 3)->default('XOF');

            // draft : saisie en cours — received : reçue et vérifiée
            // paid : réglée — disputed : contestée — cancelled : annulée
            $table->string('status', 20)->default('draft');

            // Compte de charge : dépend de la nature de l'achat (fournitures,
            // loyer, maintenance…). Renseigné à la saisie, sinon celui par
            // défaut du paramétrage s'applique.
            $table->string('expense_account', 20)->nullable();

            $table->string('file_path')->nullable();
            $table->text('notes')->nullable();

            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
            // Un même fournisseur ne facture pas deux fois sous le même numéro :
            // c'est le garde-fou le plus efficace contre le double paiement.
            $table->unique(['organization_id', 'supplier_id', 'invoice_number'], 'supplier_invoice_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_invoices');
    }
};
