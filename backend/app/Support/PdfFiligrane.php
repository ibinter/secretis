<?php

namespace App\Support;

use App\Services\FiligraneService;
use Barryvdh\DomPDF\PDF as PdfDeBase;
use Dompdf\Dompdf;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Contracts\View\Factory as ViewFactory;
use Illuminate\Filesystem\Filesystem;

/**
 * PdfFiligrane — le pied de page du cahier, apposé une fois pour toutes.
 *
 * SECRETIS génère ses PDF par un seul moteur : `barryvdh/laravel-dompdf`.
 * Tous les points de génération — facade `Pdf::`, `app('dompdf.wrapper')`,
 * `loadView()` comme `loadHTML()` — passent par l'instance liée à
 * `dompdf.wrapper`. Cette classe la remplace (voir `AppServiceProvider`), ce
 * qui donne UN SEUL endroit où le filigrane est décidé et écrit.
 *
 * Le choix du canevas plutôt que d'un pied de page HTML est délibéré :
 *
 *  · il couvre aussi les documents chargés en HTML brut, qui n'ont pas de vue
 *    Blade où glisser un `@include` ;
 *  · `page_text()` écrit sur TOUTES les pages, y compris celles qu'un tableau
 *    long ajoute au dernier moment ;
 *  · il ne peut pas être retiré par une modification de gabarit. Un filigrane
 *    copié dans douze vues se retire onze fois.
 *
 * Le texte n'est jamais écrit ici : il vient de `FiligraneService`, donc de
 * `LicenceService::filigrane()`, donc de `licence.config.json`.
 */
class PdfFiligrane extends PdfDeBase
{
    /** Distance au bas de page, en points (≈ 8 mm). */
    private const MARGE_BASSE = 22.0;

    private const TAILLE = 7.5;

    /** Gris lisible sans concurrencer le contenu du document. */
    private const GRIS = [0.42, 0.42, 0.42];

    private bool $appose = false;

    private bool $exempte = false;

    private ?int $organisation = null;

    public function __construct(
        Dompdf $dompdf,
        ConfigRepository $config,
        Filesystem $files,
        ViewFactory $view,
        private FiligraneService $filigrane,
    ) {
        parent::__construct($dompdf, $config, $files, $view);
    }

    /**
     * Espace au nom duquel le document est produit.
     *
     * À renseigner partout où il n'y a pas d'utilisateur authentifié — travaux
     * de file d'attente, services appelés par un événement — et partout où le
     * document appartient à un espace précis. Sans cet appel, l'organisation
     * est celle de l'utilisateur connecté.
     */
    public function pourOrganisation(?int $orgId): static
    {
        $this->organisation = $orgId;

        return $this;
    }

    /**
     * Dispense explicite, réservée aux documents de l'ÉDITEUR.
     *
     * Un locataire ne peut pas s'en servir : la dispense s'écrit dans le code,
     * jamais dans un réglage d'organisation. Le motif est obligatoire pour que
     * la relecture puisse contester chaque exemption une par une.
     */
    public function sansFiligrane(string $motif): static
    {
        $this->exempte = true;

        return $this;
    }

    /** Recharger un document annule l'apposition précédente. */
    public function loadHTML(string $string, ?string $encoding = null): self
    {
        $this->appose = false;

        return parent::loadHTML($string, $encoding);
    }

    public function render(): void
    {
        parent::render();

        $this->apposer();
    }

    /**
     * Écrit la mention sur chaque page.
     *
     * Appelée après `render()` : toutes les pages existent, et `page_text()`
     * les traite toutes, sans qu'il faille les compter.
     */
    private function apposer(): void
    {
        if ($this->appose || $this->exempte) {
            return;
        }

        // Posé avant l'écriture : une exception de lecture de licence ne doit
        // pas provoquer une seconde tentative d'apposition au ré-appel.
        $this->appose = true;

        $texte = $this->filigrane->texte($this->organisation);

        if ($texte === null || $texte === '') {
            return;
        }

        $dompdf  = $this->getDomPDF();
        $canevas = $dompdf->getCanvas();
        $metrics = $dompdf->getFontMetrics();

        // DejaVu Sans est la police embarquée de dompdf qui porte les accents :
        // « Généré » sans elle sort en losanges.
        $police = $metrics->getFont('DejaVu Sans', 'normal')
            ?? $metrics->getFont('sans-serif', 'normal');

        $largeur = $canevas->get_width();
        $texteL  = $police ? (float) $metrics->getTextWidth($texte, $police, self::TAILLE) : 0.0;

        $canevas->page_text(
            max(0.0, ($largeur - $texteL) / 2),
            $canevas->get_height() - self::MARGE_BASSE,
            $texte,
            $police,
            self::TAILLE,
            self::GRIS,
        );
    }
}
