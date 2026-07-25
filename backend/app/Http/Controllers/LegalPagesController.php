<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class LegalPagesController extends Controller
{
    private const PAGES = [
        'mentions-legales' => ['title' => 'Mentions légales', 'content' => '
<p><strong>Éditeur :</strong> IBIG Soft — Côte d\'Ivoire.<br>
<strong>Produit :</strong> SECRETIS ERP, solution de gestion du secrétariat et du courrier.<br>
<strong>Contact :</strong> <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a><br>
<strong>Hébergement :</strong> serveur privé virtuel exploité par IBIG Soft.</p>
<h2>Propriété intellectuelle</h2>
<p>L\'ensemble du site, sa structure, ses textes, logos et éléments graphiques sont la propriété exclusive d\'IBIG Soft. Toute reproduction sans autorisation est interdite.</p>'],
        'cgu' => ['title' => 'Conditions générales d\'utilisation', 'content' => '
<h2>1. Objet</h2><p>Les présentes CGU encadrent l\'utilisation de SECRETIS ERP, accessible sur abonnement.</p>
<h2>2. Compte et accès</h2><p>Chaque organisation dispose d\'un espace isolé. Les identifiants sont personnels et confidentiels.</p>
<h2>3. Abonnement</h2><p>L\'accès est conditionné à une licence active (essai gratuit de 14 jours, puis formule payante). Une période de grâce de 7 jours suit l\'expiration ; vos données sont conservées.</p>
<h2>4. Données</h2><p>Vos données vous appartiennent. Vous pouvez en demander l\'export ou la suppression à tout moment.</p>
<h2>5. Responsabilité</h2><p>IBIG Soft s\'engage à un service de qualité mais ne saurait être tenue responsable des interruptions indépendantes de sa volonté.</p>'],
        'confidentialite' => ['title' => 'Politique de confidentialité', 'content' => '
<p>SECRETIS ERP collecte uniquement les données nécessaires au service : identité professionnelle, email, données métier saisies par votre organisation.</p>
<h2>Utilisation</h2><p>Les données servent exclusivement au fonctionnement du service (authentification, notifications, support). Aucune revente à des tiers.</p>
<h2>Conservation et droits</h2><p>Les données sont conservées pendant la durée de l\'abonnement puis selon les obligations légales. Vous disposez de droits d\'accès, de rectification, de portabilité et de suppression : <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>.</p>
<h2>Sécurité</h2><p>Chiffrement TLS, isolation stricte par organisation, sauvegardes chiffrées régulières, journalisation des accès.</p>'],
        'cookies' => ['title' => 'Politique cookies', 'content' => '
<p>SECRETIS ERP utilise uniquement des cookies techniques indispensables : session authentifiée, protection CSRF et préférence de consentement. Aucun cookie publicitaire ni traceur tiers.</p>
<p>Vous pouvez supprimer les cookies via les réglages de votre navigateur ; la connexion au service nécessitera toutefois les cookies techniques.</p>'],
        'contrat-licence' => ['title' => 'Contrat de licence', 'content' => '
<p>La licence SECRETIS ERP est un droit d\'usage non exclusif et non transférable, limité à l\'organisation souscriptrice, au nombre d\'utilisateurs et aux modules de la formule choisie.</p>
<h2>Durée</h2><p>La licence est valable pour la période payée (mensuelle ou annuelle) et se renouvelle par paiement. À expiration, une période de grâce de 7 jours est accordée, puis l\'accès est suspendu — les données restent conservées et restituables.</p>
<h2>Restrictions</h2><p>Sont interdits : la revente, le partage d\'identifiants hors de l\'organisation, l\'ingénierie inverse et tout contournement du système de licence.</p>'],
    ];

    public function show(string $slug)
    {
        // Contenu personnalisé en base si disponible
        if (Schema::hasTable('legal_pages')) {
            $row = DB::table('legal_pages')->where('slug', $slug)->first();
            if ($row && !empty($row->content)) {
                return view('legal', ['title' => $row->title ?? ucfirst($slug), 'content' => $row->content]);
            }
        }
        $page = self::PAGES[$slug] ?? null;
        abort_unless($page, 404);
        return view('legal', $page);
    }

    public function demoForm()
    {
        $content = '
<p>Vous souhaitez découvrir SECRETIS ERP avec un membre de l\'équipe IBIG Soft ? Remplissez ce formulaire, nous vous recontactons sous 24 h ouvrées.</p>
<form method="POST" action="/demander-demonstration" style="display:grid;gap:14px;margin-top:18px">
<input type="hidden" name="_token" value="' . csrf_token() . '">
<input required name="name" placeholder="Votre nom complet" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px">
<input required type="email" name="email" placeholder="Email professionnel" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px">
<input name="phone" placeholder="Téléphone / WhatsApp" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px">
<input name="company" placeholder="Société / Organisation" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px">
<textarea name="message" rows="4" placeholder="Vos besoins (facultatif)" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px"></textarea>
<button type="submit" style="background:#9333EA;color:#fff;border:none;padding:14px;border-radius:8px;font-weight:bold;font-size:15px;cursor:pointer">Demander ma démonstration</button>
</form>';
        return view('legal', ['title' => 'Demander une démonstration', 'content' => $content]);
    }

    public function demoSubmit(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'phone'   => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'message' => 'nullable|string|max:2000',
        ]);

        try {
            Mail::raw(
                "Nouvelle demande de démonstration SECRETIS ERP :\n\n"
                . "Nom : {$data['name']}\nEmail : {$data['email']}\n"
                . "Téléphone : " . ($data['phone'] ?? '-') . "\nSociété : " . ($data['company'] ?? '-') . "\n\n"
                . "Message :\n" . ($data['message'] ?? '-'),
                fn ($m) => $m->to('secretis@ibigsoft.com')->replyTo($data['email'])->subject('[SECRETIS] Demande de démonstration — ' . $data['name'])
            );
        } catch (\Throwable $e) {
            report($e);
        }

        $content = '<p style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px">
✅ <strong>Merci ' . e($data['name']) . ' !</strong> Votre demande a bien été envoyée.
Un membre de l\'équipe IBIG Soft vous contactera sous 24 h ouvrées à <strong>' . e($data['email']) . '</strong>.</p>
<p><a href="/">Retour à l\'accueil</a></p>';
        return view('legal', ['title' => 'Demande envoyée', 'content' => $content]);
    }
}
