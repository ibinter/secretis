<?php

namespace Tests\Unit\Licence;

use App\Services\LicenceService;
use App\Support\LicenceDocuments;
use Tests\TestCase;

/**
 * DOCUMENTS JURIDIQUES — cahier IBIG SOFT v1.1, section 11, et porte de recette
 * « JURIDIQUE » de la section 13.
 *
 * Ces tests ne touchent pas la base : les documents sont engendrés à partir de
 * `config/licence.config.json` seul. C'est délibéré — ils doivent pouvoir tourner
 * partout, y compris là où aucune base de recette n'existe encore, parce que
 * publier des CGU fausses coûte plus cher qu'un test manquant.
 */
class DocumentsJuridiquesTest extends TestCase
{
    private LicenceDocuments $docs;
    private LicenceService $licence;

    protected function setUp(): void
    {
        parent::setUp();

        $this->docs    = app(LicenceDocuments::class);
        $this->licence = app(LicenceService::class);
    }

    // ─── 11.1 Conditions d'essai ─────────────────────────────────────────────

    public function test_les_conditions_d_essai_disent_la_duree_l_absence_de_carte_et_la_bascule(): void
    {
        $html = $this->docs->html('conditions-essai');
        $c    = $this->licence->config();

        $this->assertStringContainsString((string) $this->licence->essaiJours() . ' jours', $html);
        $this->assertStringContainsString('aucune carte bancaire', mb_strtolower($html));
        $this->assertStringContainsString('reconduit pas', $html);
        $this->assertStringContainsString('bascule automatiquement', $html);
        $this->assertStringContainsString($c['gratuit']['nom'], $html);

        // Prolongation : durée, unicité, motif, caractère manuel.
        $this->assertStringContainsString((string) $c['prolongation_jours'] . ' jours', $html);
        $this->assertStringContainsString('une seule fois', mb_strtolower($html));
        $this->assertStringContainsString('motif', mb_strtolower($html));
        $this->assertStringContainsString('manuellement', mb_strtolower($html));

        // Et la promesse qui compte le plus.
        $this->assertStringContainsString("Aucune donnée n'est supprimée", $html);
    }

    // ─── 11.2 CGU / CLUF ─────────────────────────────────────────────────────

    public function test_les_cgu_definissent_les_six_etats(): void
    {
        $html = $this->docs->html('cgu');

        $this->assertStringContainsString('six états', $html);

        // Le tableau des états est engendré : il ne peut pas en oublier un.
        $tableau = $this->docs->tableauEtats();

        foreach (['Démonstration publique', 'Essai', 'Période de grâce', 'Lecture seule'] as $libelle) {
            $this->assertStringContainsString($libelle, $tableau);
        }

        $this->assertSame(
            count(LicenceService::ETATS),
            substr_count($tableau, '<tr>'),
            'Le tableau doit comporter exactement une ligne par état officiel.'
        );
    }

    public function test_les_cgu_annoncent_les_plafonds_et_leur_evolution_sans_effet_retroactif(): void
    {
        $html = $this->docs->html('cgu');

        $this->assertStringContainsString($this->licence->resumePlafond(), $html);

        foreach ($this->licence->plafonds() as $plafond) {
            $this->assertStringContainsString((string) $plafond, $html);
        }

        // Le texte est mis en forme sur plusieurs lignes : on compare sur une
        // version aplatie, sinon un simple retour à la ligne ferait échouer un
        // test qui n'a rien à dire sur la mise en page.
        $plat = $this->aplatir($html);

        $this->assertStringContainsString('sans effet rétroactif', $plat);
        $this->assertStringContainsString('postérieurement à son entrée en vigueur', $plat);
    }

    public function test_les_cgu_interdisent_le_contournement_par_comptes_multiples(): void
    {
        $html = mb_strtolower($this->docs->html('cgu'));

        $this->assertStringContainsString('contourner', $html);
        $this->assertStringContainsString('plusieurs espaces', $html);
        $this->assertStringContainsString('raison sociale', $html);
    }

    /** 11.5 — le filigrane doit être ANNONCÉ, sinon il surprend l'utilisateur. */
    public function test_les_cgu_annoncent_le_filigrane_et_sa_disparition_au_premier_paiement(): void
    {
        $html = $this->docs->html('cgu');

        $this->assertStringContainsString($this->licence->filigrane(), $html);
        $this->assertStringContainsString('filigrane', mb_strtolower($html));
        $this->assertStringContainsString('dès le premier paiement', $html);
    }

    // ─── 11.3 CGV ────────────────────────────────────────────────────────────

    public function test_les_cgv_portent_la_grace_la_lecture_seule_et_l_absence_de_licence_perpetuelle(): void
    {
        $html = $this->docs->html('cgv');

        $this->assertStringContainsString((string) $this->licence->graceJours() . ' jours', $html);
        $this->assertStringContainsString('lecture seule', mb_strtolower($html));
        $this->assertStringContainsString('aucune licence perpétuelle', mb_strtolower($html));
        $this->assertStringContainsString('date de fin', mb_strtolower($html));
    }

    public function test_les_cgv_encadrent_la_licence_sur_site_a_duree_limitee(): void
    {
        $html = $this->docs->html('cgv');
        $c    = $this->licence->config();

        $this->assertStringContainsString('on-premise', mb_strtolower($html));
        $this->assertStringContainsString('durée déterminée', $html);
        $this->assertStringContainsString(
            (string) $c['tolerance_hors_ligne_jours'] . ' jours',
            $html,
            'La tolérance hors ligne doit venir de la configuration, pas d\'une note commerciale.'
        );
    }

    // ─── 11.4 Sauvegarde et résiliation ──────────────────────────────────────

    public function test_la_politique_de_sauvegarde_annonce_la_conservation_et_deux_avertissements(): void
    {
        $html = $this->docs->html('politique-sauvegarde');

        $this->assertStringContainsString((string) $this->licence->retentionJours() . ' jours', $html);
        $this->assertStringContainsString('deux avertissements', mb_strtolower($html));
        $this->assertStringContainsString('dernier rappel', mb_strtolower($html));
        $this->assertStringContainsString('date exacte', mb_strtolower($html));

        // Modalités d'export : qui, comment, dans quel format, à quel coût.
        $plat = $this->aplatir($html);

        $this->assertStringContainsString('export', mb_strtolower($plat));
        $this->assertStringContainsString('format structuré', $plat);
        $this->assertStringContainsString("n'est pas facturé", $plat);
        $this->assertStringContainsString('administrateur de l\'organisation', $plat);
    }

    public function test_la_politique_de_resiliation_decrit_la_chronologie_complete(): void
    {
        $html = mb_strtolower($this->docs->html('politique-resiliation'));

        $this->assertStringContainsString('période de grâce', $html);
        $this->assertStringContainsString('lecture seule', $html);
        $this->assertStringContainsString((string) $this->licence->retentionJours() . ' jours', $html);
        $this->assertStringContainsString('deux avertissements', $html);
        $this->assertStringContainsString('réactiv', $html);
    }

    // ─── 11.6 Protection des données ─────────────────────────────────────────

    public function test_le_bloc_protection_des_donnees_dit_que_la_demo_ne_collecte_rien(): void
    {
        $bloc = $this->docs->supplement('politique-confidentialite');

        $plat = mb_strtolower($this->aplatir((string) $bloc));

        $this->assertNotNull($bloc);
        $this->assertStringContainsString("aucune donnée personnelle n'y est collectée", $plat);
        $this->assertStringContainsString('ne demande ni inscription', $plat);
        $this->assertStringContainsString('fictives', $plat);
        $this->assertStringContainsString('effacé chaque nuit', $plat);
        $this->assertStringContainsString('aucun profilage', $plat);
    }

    public function test_le_bloc_est_ajoute_aux_deux_slugs_de_confidentialite_et_a_aucun_autre(): void
    {
        $this->assertNotNull($this->docs->supplement('confidentialite'));
        $this->assertNotNull($this->docs->supplement('politique-confidentialite'));
        $this->assertNull($this->docs->supplement('cookies'));
        $this->assertNull($this->docs->supplement('mentions-legales'));
    }

    // ─── Règles transversales ────────────────────────────────────────────────

    /** Section 12.3 : les termes bannis ne doivent apparaître nulle part. */
    public function test_aucun_document_n_emploie_un_terme_banni(): void
    {
        foreach (LicenceDocuments::REMPLACES as $slug) {
            $html = mb_strtolower($this->docs->html($slug));

            foreach ($this->licence->config()['termes_bannis'] as $terme) {
                // « licence perpétuelle » est bannie comme PROMESSE ; les
                // documents doivent au contraire pouvoir la NIER. On n'accepte
                // la formule que précédée d'une négation explicite.
                if (in_array($terme, ['licence perpétuelle', 'licence à vie'], true)) {
                    $t = preg_quote(mb_strtolower($terme), '/');

                    $occurrences = preg_match_all("/{$t}/u", $html);
                    $niees       = preg_match_all("/(aucune|absence de|ne vend aucune|ne concède aucune)\s+{$t}/u", $html);

                    $this->assertSame(
                        $occurrences,
                        $niees,
                        "Dans « {$slug} », « {$terme} » ne peut apparaître que nié."
                    );

                    continue;
                }

                $this->assertStringNotContainsString(
                    mb_strtolower($terme),
                    $html,
                    "Le terme banni « {$terme} » apparaît dans « {$slug} »."
                );
            }
        }
    }

    /** Chaque document porte un numéro de version et une date (section 12.7). */
    public function test_chaque_document_porte_une_version_et_une_date(): void
    {
        foreach (LicenceDocuments::REMPLACES as $slug) {
            $html = $this->docs->html($slug);

            $this->assertStringContainsString('Version ' . LicenceDocuments::VERSION, $html);
            $this->assertStringContainsString($this->docs->dateMaj(), $html);
            $this->assertNotNull($this->docs->titre($slug));
        }
    }

    /**
     * Section 12.1 : aucune durée ni aucun plafond écrit en dur.
     *
     * Le contrôle porte sur le CODE SOURCE, pas sur le rendu : dans le rendu,
     * un « 14 jours » engendré et un « 14 jours » saisi sont indiscernables.
     * C'est justement l'erreur que ce test doit rendre impossible.
     */
    public function test_le_generateur_ne_contient_aucune_duree_ni_aucun_plafond_en_dur(): void
    {
        $source = file_get_contents(
            base_path('app/Support/LicenceDocuments.php')
        );

        // On retire les commentaires : ils ont le droit de citer un exemple.
        $sansCommentaires = preg_replace('#//[^\n]*|/\*.*?\*/#s', '', $source);

        $this->assertSame(
            0,
            preg_match_all('/\b\d+\s*(jours?|mois|FCFA|XOF)\b/i', $sansCommentaires, $trouvés),
            'Durées ou montants écrits en dur : ' . implode(', ', $trouvés[0] ?? [])
        );
    }

    /** Le contrôleur doit bien reconnaître les documents engendrés. */
    public function test_les_slugs_remplaces_et_completes_ne_se_chevauchent_pas(): void
    {
        $this->assertSame(
            [],
            array_intersect(LicenceDocuments::REMPLACES, LicenceDocuments::COMPLETES),
            'Un document ne peut pas être à la fois remplacé et complété.'
        );

        foreach (LicenceDocuments::REMPLACES as $slug) {
            $this->assertTrue($this->docs->remplace($slug));
            $this->assertFalse($this->docs->complete($slug));
            $this->assertNotEmpty($this->docs->html($slug));
        }
    }

    /** Ramène le HTML mis en forme à une seule ligne, espaces normalisés. */
    private function aplatir(string $html): string
    {
        return trim(preg_replace('/\s+/u', ' ', $html));
    }
}
