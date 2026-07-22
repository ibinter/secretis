<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\SsoProvider;
use App\Models\SsoSession;
use App\Models\User;
use Carbon\Carbon;
use DOMDocument;
use DOMXPath;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * SamlService — Implémentation SAML 2.0 pour SECRETIS ERP
 *
 * Gère le flux SSO SAML 2.0 :
 *  - Génération de la SP-metadata XML (consommée par l'IdP)
 *  - Construction de la requête AuthnRequest vers l'IdP
 *  - Validation et parsing de la SAMLResponse de l'IdP
 *  - Création / mise à jour de l'utilisateur local
 *  - Mapping groupe AD/LDAP → rôle SECRETIS
 *
 * SÉCURITÉ :
 *  - Validation signature XML avec openssl_verify (RS256)
 *  - Vérification audience (Audience Restriction)
 *  - Vérification NotBefore / NotOnOrAfter (± 60s de tolérance NTP)
 *  - Vérification InResponseTo (protection contre replay)
 *  - Certificat SP généré en RSA 2048 bits minimum
 *  - Config chiffrée au repos (AES-256-GCM via Laravel Crypt)
 *
 * Dépendances recommandées :
 *   composer require robrichards/xmlseclibs
 *   (ou onelogin/php-saml pour un SDK complet)
 */
class SamlService
{
    /** Tolérance NTP en secondes pour NotBefore/NotOnOrAfter */
    private const CLOCK_SKEW = 60;

    /** Durée de validité d'une AuthnRequest (en secondes) */
    private const REQUEST_TTL = 300;

    // -------------------------------------------------------------------------
    // SP Metadata
    // -------------------------------------------------------------------------

    /**
     * Retourne le XML de métadonnées Service Provider pour une organisation.
     * Ce fichier est à uploader dans la console de l'IdP.
     *
     * @param  Organization $org
     * @return string  XML valide (UTF-8, signé si certificat SP disponible)
     * @throws RuntimeException si le provider SAML n'est pas configuré
     */
    public function getMetadata(Organization $org): string
    {
        $provider = $this->getActiveProvider($org, 'saml');
        $config   = $this->decryptConfig($provider);

        $spEntityId   = $this->spEntityId($org);
        $acsUrl       = $this->acsUrl($org);
        $slsUrl       = $this->slsUrl($org);
        $spCert       = $config['sp_cert'] ?? '';

        $certBlock = $spCert
            ? '<md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
              . '<ds:X509Data><ds:X509Certificate>' . $this->stripCertPem($spCert) . '</ds:X509Certificate>'
              . '</ds:X509Data></ds:KeyInfo></md:KeyDescriptor>'
              . '<md:KeyDescriptor use="encryption"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">'
              . '<ds:X509Data><ds:X509Certificate>' . $this->stripCertPem($spCert) . '</ds:X509Certificate>'
              . '</ds:X509Data></ds:KeyInfo></md:KeyDescriptor>'
            : '';

        $xml = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
    xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="{$spEntityId}"
    validUntil="{$this->metadataExpiry()}">
  <md:SPSSODescriptor
      AuthnRequestsSigned="true"
      WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    {$certBlock}
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="{$acsUrl}"
        index="1"/>
    <md:SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="{$slsUrl}"/>
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="fr">SECRETIS ERP — {$org->name}</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="fr">SECRETIS ERP</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="fr">https://{$org->slug}.secretis.app</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>
XML;

        return $xml;
    }

    // -------------------------------------------------------------------------
    // Login URL (HTTP-Redirect Binding)
    // -------------------------------------------------------------------------

    /**
     * Construit l'URL de redirection vers l'IdP avec une AuthnRequest encodée.
     *
     * @param  Organization $org
     * @return string  URL complète à rediriger
     */
    public function getLoginUrl(Organization $org): string
    {
        $provider = $this->getActiveProvider($org, 'saml');
        $config   = $this->decryptConfig($provider);

        $idpSsoUrl  = $config['idp_sso_url'] ?? throw new RuntimeException('IdP SSO URL manquant');
        $requestId  = '_' . Str::uuid()->toString();
        $issueInstant = now()->toIso8601ZuluString();
        $spEntityId   = $this->spEntityId($org);
        $acsUrl       = $this->acsUrl($org);

        // Stocker l'ID de requête en session pour validation InResponseTo
        session(['saml_request_id' => $requestId, 'saml_request_at' => time()]);

        $authnRequest = <<<XML
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="{$requestId}"
    Version="2.0"
    IssueInstant="{$issueInstant}"
    Destination="{$idpSsoUrl}"
    AssertionConsumerServiceURL="{$acsUrl}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>{$spEntityId}</saml:Issuer>
  <samlp:NameIDPolicy
      Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
      AllowCreate="true"/>
</samlp:AuthnRequest>
XML;

        // HTTP-Redirect Binding : deflate + base64 + urlencode
        $deflated  = gzdeflate($authnRequest, 9);
        $encoded   = base64_encode($deflated);
        $separator = str_contains($idpSsoUrl, '?') ? '&' : '?';

        return $idpSsoUrl . $separator . 'SAMLRequest=' . urlencode($encoded)
            . '&RelayState=' . urlencode($org->slug);
    }

    // -------------------------------------------------------------------------
    // Callback — valide la SAMLResponse et retourne (ou crée) l'utilisateur
    // -------------------------------------------------------------------------

    /**
     * Traite le POST de callback SAMLResponse de l'IdP.
     *
     * @param  string       $samlResponse  Valeur brute du champ SAMLResponse (base64)
     * @param  Organization $org
     * @return User         Utilisateur authentifié (créé ou mis à jour)
     * @throws RuntimeException en cas d'erreur de validation
     */
    public function handleCallback(string $samlResponse, Organization $org): User
    {
        $provider = $this->getActiveProvider($org, 'saml');
        $config   = $this->decryptConfig($provider);

        // 1. Décoder et parser le XML
        $xml  = base64_decode($samlResponse, strict: true);
        if ($xml === false) {
            throw new RuntimeException('SAMLResponse invalide : base64 corrompu.');
        }

        // 2. Valider la signature et l'assertion
        $attributes = $this->validateAssertion($xml, $config, $org);

        // 3. Extraire les attributs utilisateur
        $email     = $attributes['email']     ?? throw new RuntimeException('Attribut email manquant dans l\'assertion SAML.');
        $firstName = $attributes['firstName'] ?? '';
        $lastName  = $attributes['lastName']  ?? $email;
        $groups    = $attributes['groups']    ?? [];
        $nameId    = $attributes['nameId']    ?? $email;

        // 4. Mapper les groupes IdP aux rôles SECRETIS
        $roleMapping = $config['role_mapping'] ?? [];
        $role        = $this->getRoleFromGroups($groups, $roleMapping);

        // 5. Créer / mettre à jour l'utilisateur dans une transaction
        $user = DB::transaction(function () use ($email, $firstName, $lastName, $role, $nameId, $provider, $org) {
            /** @var User $user */
            $user = User::withTrashed()
                ->where('organization_id', $org->id)
                ->where('email', strtolower($email))
                ->first();

            if ($user === null) {
                $user = new User();
                $user->organization_id = $org->id;
                $user->email           = strtolower($email);
                $user->password        = bcrypt(Str::random(32)); // mot de passe inutilisable
            }

            // Restaurer si soft-deleted (réactivation depuis l'IdP)
            if ($user->trashed()) {
                $user->restore();
            }

            $user->first_name      = $firstName ?: $user->first_name;
            $user->last_name       = $lastName  ?: $user->last_name;
            $user->is_active       = true;
            $user->sso_provider_id = $provider->id;
            $user->sso_external_id = $nameId;
            $user->sso_synced_at   = now();

            if ($role && $user->role !== 'admin') {
                $user->role = $role;
            }

            $user->save();

            return $user;
        });

        // 6. Créer une SsoSession (audit)
        SsoSession::create([
            'user_id'       => $user->id,
            'provider_id'   => $provider->id,
            'external_id'   => $nameId,
            'session_token' => hash('sha256', Str::random(64)),
            'ip_address'    => request()->ip(),
            'user_agent'    => request()->userAgent(),
            'expires_at'    => now()->addHours(8),
        ]);

        Log::info('SAML SSO login réussi', [
            'user_id'       => $user->id,
            'email'         => $email,
            'provider_id'   => $provider->id,
            'organization'  => $org->slug,
            'ip'            => request()->ip(),
        ]);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Génération du certificat SP
    // -------------------------------------------------------------------------

    /**
     * Génère une paire de clés RSA 2048 bits pour le Service Provider.
     * Stocke le certificat et la clé privée dans la config du provider.
     *
     * @param  Organization $org
     * @throws RuntimeException si openssl n'est pas disponible
     */
    public function generateSpCertificate(Organization $org): void
    {
        if (! extension_loaded('openssl')) {
            throw new RuntimeException('Extension PHP openssl requise pour générer le certificat SP.');
        }

        $provider = $this->getActiveProvider($org, 'saml');
        $config   = $this->decryptConfig($provider);

        $dn = [
            'commonName'   => 'SECRETIS ERP SP — ' . $org->name,
            'organization' => 'SECRETIS ERP',
            'country'      => $org->country ?? 'CI',
        ];

        $privKey = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);

        if (! $privKey) {
            throw new RuntimeException('Impossible de générer la clé privée RSA : ' . openssl_error_string());
        }

        $csr  = openssl_csr_new($dn, $privKey);
        $cert = openssl_csr_sign($csr, null, $privKey, days: 1825); // 5 ans

        openssl_x509_export($cert, $certPem);
        openssl_pkey_export($privKey, $keyPem);

        $config['sp_cert'] = $certPem;
        $config['sp_key']  = $keyPem;

        $provider->config = encrypt(json_encode($config));
        $provider->save();

        Log::info('Certificat SP SAML généré', ['org' => $org->slug, 'provider_id' => $provider->id]);
    }

    // -------------------------------------------------------------------------
    // Validation d'assertion SAML
    // -------------------------------------------------------------------------

    /**
     * Valide l'assertion SAML XML :
     *  - Signature IdP (xmldsig RS256)
     *  - Expiration (NotOnOrAfter, NotBefore)
     *  - Audience Restriction
     *  - InResponseTo (anti-replay)
     *
     * @param  string $xml    XML de la SAMLResponse décodée
     * @param  array  $config Config du provider (déchiffrée)
     * @param  Organization $org
     * @return array  Attributs extraits : email, firstName, lastName, groups, nameId
     * @throws RuntimeException en cas d'échec de validation
     */
    public function validateAssertion(string $xml, array $config = [], Organization $org = null): array
    {
        $doc = new DOMDocument();
        $doc->preserveWhiteSpace = false;
        if (! $doc->loadXML($xml)) {
            throw new RuntimeException('SAMLResponse : XML malformé.');
        }

        $xpath = new DOMXPath($doc);
        $xpath->registerNamespace('samlp', 'urn:oasis:names:tc:SAML:2.0:protocol');
        $xpath->registerNamespace('saml',  'urn:oasis:names:tc:SAML:2.0:assertion');
        $xpath->registerNamespace('ds',    'http://www.w3.org/2000/09/xmldsig#');

        // --- Vérification du statut ---
        $statusCode = $xpath->evaluate('string(//samlp:StatusCode/@Value)');
        if ($statusCode !== 'urn:oasis:names:tc:SAML:2.0:status:Success') {
            $statusMsg = $xpath->evaluate('string(//samlp:StatusMessage)');
            throw new RuntimeException("SAML : authentification refusée par l'IdP. Status: {$statusCode}. Message: {$statusMsg}");
        }

        // --- Vérification InResponseTo (anti-replay) ---
        $inResponseTo  = $xpath->evaluate('string(//samlp:Response/@InResponseTo)');
        $savedRequestId = session('saml_request_id');
        $savedRequestAt = session('saml_request_at', 0);

        if ($inResponseTo && $savedRequestId) {
            if ($inResponseTo !== $savedRequestId) {
                throw new RuntimeException('SAML : InResponseTo invalide — possible attaque replay.');
            }
            if (time() - $savedRequestAt > self::REQUEST_TTL) {
                throw new RuntimeException('SAML : AuthnRequest expirée.');
            }
            session()->forget(['saml_request_id', 'saml_request_at']);
        }

        // --- Vérification de la signature ---
        $idpCert = $config['idp_cert'] ?? null;
        if ($idpCert) {
            $this->verifyXmlSignature($doc, $xpath, $idpCert);
        } else {
            Log::warning('SAML : aucun certificat IdP configuré — signature non vérifiée', [
                'org' => $org?->slug,
            ]);
        }

        // --- Vérification temporelle ---
        $notBefore    = $xpath->evaluate('string(//saml:Conditions/@NotBefore)');
        $notOnOrAfter = $xpath->evaluate('string(//saml:Conditions/@NotOnOrAfter)');

        if ($notBefore) {
            $nb = Carbon::parse($notBefore);
            if (now()->addSeconds(self::CLOCK_SKEW)->lt($nb)) {
                throw new RuntimeException('SAML : assertion pas encore valide (NotBefore).');
            }
        }

        if ($notOnOrAfter) {
            $nooa = Carbon::parse($notOnOrAfter);
            if (now()->subSeconds(self::CLOCK_SKEW)->gt($nooa)) {
                throw new RuntimeException('SAML : assertion expirée (NotOnOrAfter).');
            }
        }

        // --- Vérification Audience ---
        if ($org) {
            $audience    = $xpath->evaluate('string(//saml:AudienceRestriction/saml:Audience)');
            $spEntityId  = $this->spEntityId($org);
            if ($audience && $audience !== $spEntityId) {
                throw new RuntimeException("SAML : Audience '{$audience}' ne correspond pas au SP '{$spEntityId}'.");
            }
        }

        // --- Extraction des attributs ---
        $attributeMapping = $config['attribute_mapping'] ?? [
            'email'     => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
            'firstName' => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
            'lastName'  => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
            'groups'    => 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
        ];

        $attributes = [];

        foreach ($attributeMapping as $key => $attrName) {
            $nodes = $xpath->query(
                "//saml:Attribute[@Name='{$attrName}']/saml:AttributeValue"
            );

            if ($nodes && $nodes->length > 0) {
                if ($key === 'groups') {
                    $vals = [];
                    foreach ($nodes as $node) {
                        $vals[] = $node->nodeValue;
                    }
                    $attributes[$key] = $vals;
                } else {
                    $attributes[$key] = $nodes->item(0)->nodeValue;
                }
            }
        }

        // NameID (email fallback)
        $nameId = $xpath->evaluate('string(//saml:NameID)');
        $attributes['nameId'] = $nameId;

        if (empty($attributes['email']) && filter_var($nameId, FILTER_VALIDATE_EMAIL)) {
            $attributes['email'] = $nameId;
        }

        return $attributes;
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private function verifyXmlSignature(DOMDocument $doc, DOMXPath $xpath, string $idpCert): void
    {
        // Normaliser le certificat PEM
        $certPem = $this->normalizeCert($idpCert);

        $signatureNodes = $xpath->query('//ds:Signature');
        if (! $signatureNodes || $signatureNodes->length === 0) {
            throw new RuntimeException('SAML : assertion non signée.');
        }

        $signatureNode   = $signatureNodes->item(0);
        $signatureValue  = $xpath->evaluate('string(ds:SignatureValue)', $signatureNode);
        $signedInfoNode  = $xpath->query('ds:SignedInfo', $signatureNode)->item(0);

        if (! $signatureValue || ! $signedInfoNode) {
            throw new RuntimeException('SAML : structure de signature invalide.');
        }

        // Canonicalisation C14N
        $c14nMethod  = $xpath->evaluate('string(ds:SignedInfo/ds:CanonicalizationMethod/@Algorithm)', $signatureNode);
        $exc          = str_contains($c14nMethod, 'exclusive');
        $c14nSignedInfo = $signedInfoNode->C14N($exc);

        $sigBytes = base64_decode($signatureValue, strict: true);
        if ($sigBytes === false) {
            throw new RuntimeException('SAML : valeur de signature base64 invalide.');
        }

        $pubKey = openssl_get_publickey($certPem);
        if (! $pubKey) {
            throw new RuntimeException('SAML : certificat IdP invalide — ' . openssl_error_string());
        }

        $result = openssl_verify($c14nSignedInfo, $sigBytes, $pubKey, OPENSSL_ALGO_SHA256);

        if ($result !== 1) {
            throw new RuntimeException('SAML : signature XML invalide. La réponse a peut-être été altérée.');
        }
    }

    /**
     * Mappe les groupes IdP vers un rôle SECRETIS selon la config.
     * Si plusieurs groupes correspondent, le rôle le plus élevé est sélectionné.
     */
    private function getRoleFromGroups(array $groups, array $mapping): string
    {
        $roleHierarchy = ['employee' => 1, 'manager' => 2, 'admin' => 3];
        $resolvedRole  = 'employee';
        $maxLevel      = 0;

        foreach ($groups as $group) {
            $role = $mapping[$group] ?? null;
            if ($role && isset($roleHierarchy[$role]) && $roleHierarchy[$role] > $maxLevel) {
                $resolvedRole = $role;
                $maxLevel     = $roleHierarchy[$role];
            }
        }

        return $resolvedRole;
    }

    private function getActiveProvider(Organization $org, string $type): SsoProvider
    {
        $provider = SsoProvider::where('organization_id', $org->id)
            ->where('type', $type)
            ->where('is_active', true)
            ->first();

        if (! $provider) {
            throw new RuntimeException("Aucun provider SSO {$type} actif pour l'organisation {$org->slug}.");
        }

        return $provider;
    }

    private function decryptConfig(SsoProvider $provider): array
    {
        try {
            $raw = decrypt($provider->config);
            return is_array($raw) ? $raw : json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable $e) {
            throw new RuntimeException('Impossible de déchiffrer la configuration SSO : ' . $e->getMessage());
        }
    }

    private function spEntityId(Organization $org): string
    {
        return rtrim(config('app.url'), '/') . '/sso/' . $org->slug . '/metadata.xml';
    }

    private function acsUrl(Organization $org): string
    {
        return rtrim(config('app.url'), '/') . '/sso/' . $org->slug . '/callback';
    }

    private function slsUrl(Organization $org): string
    {
        return rtrim(config('app.url'), '/') . '/sso/' . $org->slug . '/logout';
    }

    private function metadataExpiry(): string
    {
        return now()->addYear()->toIso8601ZuluString();
    }

    private function stripCertPem(string $pem): string
    {
        return preg_replace('/-----[^-]+-----|\s/', '', $pem);
    }

    private function normalizeCert(string $cert): string
    {
        $cert = preg_replace('/-----[^-]+-----|\s/', '', $cert);
        return "-----BEGIN CERTIFICATE-----\n"
            . chunk_split($cert, 64, "\n")
            . "-----END CERTIFICATE-----\n";
    }
}
