<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Les sept messages de la séquence d'essai et d'expiration.
 * Cahier IBIG SOFT v1.1, sections 5.4, 8.6 et 8.8.
 *
 * UN SEUL MAILABLE, SEPT VUES
 * ---------------------------
 * Sept classes auraient sept constructeurs, donc sept occasions d'oublier une
 * valeur et de la réécrire en dur. Ici le contexte est construit une seule fois
 * — par App\Console\Commands\LicenceEmails, à partir de LicenceService — et
 * cette classe ne fait que choisir un objet et une vue.
 *
 * AUCUN CHIFFRE N'EST ÉCRIT ICI. La durée d'essai, le plafond, le nom du palier
 * gratuit et les dates arrivent dans $donnees. Un objet qui dirait « 14 jours »
 * serait un défaut même le jour où c'est exact.
 *
 * La mise en page est celle du reste de l'application : `emails.layout`, le même
 * gabarit que WelcomeMail ou PaymentReceiptMail. Aucun second système d'envoi.
 *
 * PAS DE ShouldQueue, CONTRAIREMENT À WelcomeMail
 * -----------------------------------------------
 * L'appelant (licence:emails) réserve l'envoi en base AVANT d'envoyer, et lève
 * la réservation si l'envoi échoue. Mise en file, l'exception surviendrait dans
 * un worker, bien après le retour de la commande : la réservation resterait en
 * place et le message serait perdu sans que personne le sache. L'envoi
 * synchrone est ce qui rend le filet de sécurité vérifiable — le volume
 * quotidien d'une séquence d'essai le permet largement.
 */
class LicenceSequenceMail extends Mailable
{
    use Queueable, SerializesModels;

    /** Jalons du cahier → vues Blade. L'ordre est celui de la section 5.4. */
    public const VUES = [
        'J+1'  => 'emails.licence.j_plus_1',
        'J-3'  => 'emails.licence.j_moins_3',
        'J-1'  => 'emails.licence.j_moins_1',
        'J0'   => 'emails.licence.j_zero',
        'J+7'  => 'emails.licence.j_plus_7',
        'J+60' => 'emails.licence.purge_premier_avis',
        'J+83' => 'emails.licence.purge_dernier_rappel',
    ];

    /**
     * @param string               $jalon   L'un des sept jalons de self::VUES
     * @param array<string,mixed>  $donnees Contexte issu de LicenceService
     */
    public function __construct(
        public readonly string $jalon,
        public readonly array $donnees,
    ) {
        if (! isset(self::VUES[$jalon])) {
            throw new \InvalidArgumentException(
                "Jalon inconnu : {$jalon}. La séquence n'en compte que sept (sections 5.4 et 8.8)."
            );
        }
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->sujet());
    }

    /**
     * Objets de la section 8.6 — copiés, pas réécrits.
     *
     * Les deux derniers (section 8.8) n'ont PAS d'objet prescrit par le cahier :
     * la section ne donne que le corps. Ils sont formulés ici dans le même
     * registre que les autres — on annonce une échéance, on ne menace pas.
     */
    public function sujet(): string
    {
        $d = $this->donnees;

        return match ($this->jalon) {
            'J+1'  => "Vos premiers pas sur {$d['solution']}",
            'J-3'  => "Il vous reste {$d['jours_restants']} jours sur {$d['solution']}",
            'J-1'  => "Dernier jour d'essai — vos données sont conservées",
            'J0'   => "Votre espace est passé en {$d['palier_gratuit']}",
            'J+7'  => "Une question sur {$d['solution']} ?",
            'J+60' => "Conservation de vos données jusqu'au {$d['date_purge']}",
            'J+83' => "Dernier rappel — conservation de vos données jusqu'au {$d['date_purge']}",
        };
    }

    public function content(): Content
    {
        return new Content(
            view: self::VUES[$this->jalon],
            with: $this->donnees,
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
