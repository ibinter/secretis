<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Supplier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Identifiants d'accès au portail fournisseur (mot de passe en clair, envoi unique).
 *
 * Point d'appel : App\Services\SupplierPortalService::generatePortalCredentials()
 * (actuellement commenté) : new SupplierPortalCredentialsMail($supplier, $email, $password)
 *
 * ATTENTION : ce Mailable transporte un mot de passe en clair. Il ne doit jamais
 * être journalisé ni renvoyé ; l'objet est sérialisé en file d'attente `emails`.
 */
class SupplierPortalCredentialsMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Supplier $supplier,
        public readonly string   $email,
        public readonly string   $password,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Vos accès au portail fournisseur SECRETIS');
    }

    public function content(): Content
    {
        $url = rtrim((string) config('app.url'), '/') . '/portail-fournisseur/connexion';

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Vos accès au portail fournisseur</h2>'
              . '<p>Bonjour ' . e((string) ($this->supplier->name ?? '')) . ',</p>'
              . '<p>Un accès au portail fournisseur vient d\'être créé pour vous.</p>'
              . '<table cellpadding="0" cellspacing="0">'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Identifiant</td><td style="padding:6px 0;font-weight:600">' . e($this->email) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Mot de passe</td><td style="padding:6px 0;font-weight:700">' . e($this->password) . '</td></tr>'
              . '</table>'
              . '<p style="margin-top:12px;color:#C0392B">Modifiez ce mot de passe dès votre première connexion. '
              . 'Ce message ne sera pas renvoyé.</p>'
              . '<p style="margin-top:16px"><a href="' . e($url) . '" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Accéder au portail</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
