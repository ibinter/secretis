<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Complétion du module stock.
 *
 * L'existant tenait en deux tables : `supplies` (une quantité, un prix
 * unitaire figé) et `supply_movements` (entrée / sortie). Il en manquait trois
 * choses pour qu'un stock soit exploitable :
 *
 *  1. UNE VALEUR. `unit_price` était saisi une fois et ne bougeait plus : deux
 *     réapprovisionnements à des prix différents laissaient le stock valorisé
 *     au premier. Aucun bilan ne peut s'appuyer là-dessus. On ajoute un coût
 *     moyen unitaire pondéré, recalculé à chaque entrée.
 *
 *  2. UNE TRAÇABILITÉ DE L'ORIGINE. Un mouvement ne disait pas d'où il venait —
 *     réception de commande, facture fournisseur, régularisation d'inventaire.
 *     Sans cela, un écart constaté n'est rattachable à rien.
 *
 *  3. UN INVENTAIRE PHYSIQUE. Le stock théorique dérive toujours du réel
 *     (casse, perte, erreur de saisie). Sans comptage ni régularisation
 *     tracée, l'écart s'accumule en silence et la valeur devient fausse.
 *
 * `goods_receipts` est créée au passage : le modèle et le service l'utilisaient
 * déjà, mais LA TABLE N'EXISTAIT PAS — toute réception de commande levait une
 * exception. Personne ne s'en était aperçu parce que `purchase_orders` est
 * vide.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Valorisation ────────────────────────────────────────────────────
        Schema::table('supplies', function (Blueprint $table) {
            if (! Schema::hasColumn('supplies', 'average_cost')) {
                // 4 décimales : un coût moyen pondéré tombe rarement juste, et
                // arrondir à l'unité monétaire à chaque entrée fait dériver la
                // valeur du stock au fil des mouvements.
                $table->decimal('average_cost', 15, 4)->default(0)->after('unit_price');
            }
            if (! Schema::hasColumn('supplies', 'last_cost')) {
                $table->decimal('last_cost', 15, 4)->default(0)->after('average_cost');
            }
        });

        // Le coût moyen part du prix unitaire connu : à défaut, tout le stock
        // existant serait valorisé à zéro dès la première ouverture de l'écran.
        DB::table('supplies')->whereNotNull('unit_price')->update([
            'average_cost' => DB::raw('unit_price'),
            'last_cost'    => DB::raw('unit_price'),
        ]);

        // ── Origine et coût des mouvements ──────────────────────────────────
        Schema::table('supply_movements', function (Blueprint $table) {
            if (! Schema::hasColumn('supply_movements', 'organization_id')) {
                // Dénormalisé volontairement : sans lui, toute lecture du
                // journal des mouvements impose une jointure sur `supplies`
                // pour rester dans le périmètre du locataire — et une jointure
                // oubliée est une fuite inter-organisations.
                $table->unsignedBigInteger('organization_id')->nullable()->after('id');
                $table->index(['organization_id', 'created_at']);
            }
            if (! Schema::hasColumn('supply_movements', 'stock_before')) {
                $table->integer('stock_before')->default(0)->after('quantity');
            }
            if (! Schema::hasColumn('supply_movements', 'unit_cost')) {
                $table->decimal('unit_cost', 15, 4)->default(0)->after('stock_after');
                $table->decimal('total_cost', 15, 2)->default(0)->after('unit_cost');
            }
            if (! Schema::hasColumn('supply_movements', 'source_type')) {
                // manual | goods_receipt | supplier_invoice | stock_count
                $table->string('source_type', 40)->nullable()->after('reason');
                $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
                $table->index(['source_type', 'source_id']);
            }
        });

        // Rattacher les mouvements déjà enregistrés à leur organisation.
        DB::statement('
            UPDATE supply_movements m
               SET organization_id = s.organization_id
              FROM supplies s
             WHERE s.id = m.supply_id
               AND m.organization_id IS NULL
        ');

        // ── Bon de réception : le modèle existait, pas la table ─────────────
        if (! Schema::hasTable('goods_receipts')) {
            Schema::create('goods_receipts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('purchase_order_id')->nullable()
                      ->constrained('purchase_orders')->nullOnDelete();
                $table->string('receipt_number');
                $table->foreignId('received_by')->constrained('users')->cascadeOnDelete();
                $table->date('received_date');
                // Le détail reçu ligne à ligne, tel que constaté au déballage.
                $table->jsonb('items_received')->nullable();
                // complet | partiel | rejete
                $table->string('status', 20)->default('complet');
                $table->text('notes')->nullable();
                $table->string('signature_path')->nullable();
                $table->timestamps();

                $table->unique(['organization_id', 'receipt_number']);
                $table->index(['organization_id', 'received_date']);
            });
        }

        // ── Inventaire physique ─────────────────────────────────────────────
        if (! Schema::hasTable('stock_counts')) {
            Schema::create('stock_counts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('reference');
                $table->date('count_date');
                $table->string('location')->nullable();
                // open : comptage en cours — closed : écarts régularisés
                // Un inventaire clos ne se rouvre pas : les régularisations
                // ont déjà produit des mouvements de stock.
                $table->string('status', 20)->default('open');
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('closed_at')->nullable();
                $table->timestamps();

                $table->unique(['organization_id', 'reference']);
                $table->index(['organization_id', 'status']);
            });
        }

        if (! Schema::hasTable('stock_count_lines')) {
            Schema::create('stock_count_lines', function (Blueprint $table) {
                $table->id();
                $table->foreignId('stock_count_id')->constrained('stock_counts')->cascadeOnDelete();
                $table->foreignId('supply_id')->constrained('supplies')->cascadeOnDelete();

                // Quantité théorique FIGÉE à l'ouverture du comptage : la
                // comparer au stock courant au moment de la clôture donnerait
                // un écart faussé par les mouvements survenus entre-temps.
                $table->integer('expected_quantity');
                // NULL tant que la ligne n'a pas été comptée — à distinguer
                // d'un comptage à zéro, qui est une information.
                $table->integer('counted_quantity')->nullable();
                $table->decimal('unit_cost', 15, 4)->default(0);
                $table->text('note')->nullable();
                $table->timestamps();

                $table->unique(['stock_count_id', 'supply_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_count_lines');
        Schema::dropIfExists('stock_counts');
        Schema::dropIfExists('goods_receipts');

        Schema::table('supply_movements', function (Blueprint $table) {
            $table->dropColumn(['organization_id', 'stock_before', 'unit_cost', 'total_cost', 'source_type', 'source_id']);
        });

        Schema::table('supplies', function (Blueprint $table) {
            $table->dropColumn(['average_cost', 'last_cost']);
        });
    }
};
