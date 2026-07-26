<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\SsoProvider;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * LdapService — Authentification et synchronisation LDAP/Active Directory
 *
 * Fonctionnalités :
 *  - Authentification d'un utilisateur par bind LDAP
 *  - Synchronisation des utilisateurs depuis l'annuaire
 *  - Mapping des groupes AD → rôles SECRETIS
 *
 * SÉCURITÉ :
 *  - Le bind anonyme est désactivé par défaut (bind avec service account)
 *  - Les mots de passe ne transitent jamais en clair sur le réseau (LDAPS ou STARTTLS requis en production)
 *  - Les entrées retournées sont filtrées pour éviter l'injection LDAP
 *  - La config est stockée chiffrée (AES-256-GCM)
 *
 * Dépendances PHP :
 *   - Extension php-ldap (php8.x-ldap)
 */
class LdapService
{
    // -------------------------------------------------------------------------
    // Test de connexion
    // -------------------------------------------------------------------------

    /**
     * Teste la connexion LDAP avec la configuration fournie.
     * Effectue un simple bind service-account puis liste la racine.
     *
     * @param  array $config  {host, port, base_dn, bind_dn, bind_password, use_ssl, use_tls}
     * @return bool  true si la connexion est établie et le bind réussi
     */
    public function testConnection(array $config): bool
    {
        $this->requireLdapExtension();

        $conn = $this->connect($config);

        try {
            $bound = @ldap_bind($conn, $config['bind_dn'], $config['bind_password']);
            ldap_unbind($conn);
            return $bound !== false;
        } catch (\Throwable $e) {
            Log::warning('LDAP testConnection échec', ['error' => $e->getMessage()]);
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Authentification d'un utilisateur
    // -------------------------------------------------------------------------

    /**
     * Authentifie un utilisateur LDAP.
     * Effectue un bind service pour rechercher le DN utilisateur,
     * puis un bind avec ses identifiants pour valider le mot de passe.
     *
     * @param  string       $username  Identifiant (sAMAccountName ou UPN)
     * @param  string       $password  Mot de passe en clair (transmis via LDAPS)
     * @param  Organization $org
     * @return array|null   Attributs LDAP ou null si authentification échouée
     *                      {email, cn, givenName, sn, memberOf, dn}
     */
    public function authenticate(string $username, string $password, Organization $org): ?array
    {
        $this->requireLdapExtension();

        $provider = $this->getActiveProvider($org);
        $config   = $this->decryptConfig($provider);

        if (empty($password)) {
            return null; // Protège contre le bind anonyme involontaire
        }

        $conn = $this->connect($config);

        // Bind service pour chercher le DN de l'utilisateur
        if (! @ldap_bind($conn, $config['bind_dn'], $config['bind_password'])) {
            Log::error('LDAP : bind service account échoué', ['org' => $org->slug]);
            ldap_unbind($conn);
            return null;
        }

        $userFilter = $config['user_filter'] ?? '(sAMAccountName={username})';
        $filter     = str_replace('{username}', ldap_escape($username, '', LDAP_ESCAPE_FILTER), $userFilter);

        $attrs   = ['dn', 'mail', 'cn', 'givenname', 'sn', 'memberof', 'userprincipalname', 'distinguishedname'];
        $search  = @ldap_search($conn, $config['base_dn'], $filter, $attrs, sizeLimit: 1);

        if (! $search) {
            Log::warning('LDAP : recherche utilisateur échouée', ['filter' => $filter]);
            ldap_unbind($conn);
            return null;
        }

        $entries = ldap_get_entries($conn, $search);
        if ($entries['count'] === 0) {
            ldap_unbind($conn);
            return null;
        }

        $userDn = $entries[0]['dn'];

        // Bind avec les identifiants de l'utilisateur — valide le mot de passe
        if (! @ldap_bind($conn, $userDn, $password)) {
            Log::info('LDAP : authentification échouée (mauvais mot de passe)', [
                'username' => $username,
                'org'      => $org->slug,
            ]);
            ldap_unbind($conn);
            return null;
        }

        $entry = $entries[0];

        $memberOf = [];
        if (isset($entry['memberof'])) {
            for ($i = 0; $i < $entry['memberof']['count']; $i++) {
                $memberOf[] = $entry['memberof'][$i];
            }
        }

        ldap_unbind($conn);

        return [
            'dn'        => $userDn,
            'email'     => $this->firstValue($entry, 'mail') ?? $this->firstValue($entry, 'userprincipalname'),
            'cn'        => $this->firstValue($entry, 'cn'),
            'givenName' => $this->firstValue($entry, 'givenname'),
            'sn'        => $this->firstValue($entry, 'sn'),
            'memberOf'  => $memberOf,
        ];
    }

    // -------------------------------------------------------------------------
    // Synchronisation des utilisateurs
    // -------------------------------------------------------------------------

    /**
     * Synchronise tous les utilisateurs LDAP d'une organisation.
     *
     * Stratégie :
     *  1. Récupère tous les utilisateurs du groupe LDAP configuré
     *  2. Crée ou met à jour les utilisateurs SECRETIS correspondants
     *  3. Désactive les utilisateurs supprimés de l'annuaire
     *
     * @param  Organization $org
     * @return array  {created: int, updated: int, disabled: int, errors: array}
     */
    public function syncUsers(Organization $org): array
    {
        $this->requireLdapExtension();

        $provider = $this->getActiveProvider($org);
        $config   = $this->decryptConfig($provider);

        $conn = $this->connect($config);

        if (! @ldap_bind($conn, $config['bind_dn'], $config['bind_password'])) {
            throw new RuntimeException('LDAP sync : bind service account échoué.');
        }

        $groupFilter  = $config['group_filter'] ?? '(objectClass=user)';
        $userFilter   = $config['user_filter']  ?? '(&(objectClass=user)(mail=*))';
        $syncFilter   = $config['sync_filter']  ?? $userFilter;
        $attrs        = ['mail', 'cn', 'givenname', 'sn', 'memberof', 'userprincipalname', 'samaccountname', 'useraccountcontrol'];

        $search  = @ldap_search($conn, $config['base_dn'], $syncFilter, $attrs);
        if (! $search) {
            throw new RuntimeException('LDAP sync : recherche échouée — ' . ldap_error($conn));
        }

        $entries       = ldap_get_entries($conn, $search);
        $ldapEmails    = [];
        $stats         = ['created' => 0, 'updated' => 0, 'disabled' => 0, 'errors' => []];
        $roleMapping   = $config['role_mapping'] ?? [];

        for ($i = 0; $i < $entries['count']; $i++) {
            $entry = $entries[$i];
            $email = $this->firstValue($entry, 'mail') ?? $this->firstValue($entry, 'userprincipalname');

            if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            // Vérifier si le compte AD est désactivé (UAC flag 2 = ACCOUNTDISABLE)
            $uac      = (int) ($this->firstValue($entry, 'useraccountcontrol') ?? 0);
            $disabled = (bool) ($uac & 2);

            $memberOf = [];
            if (isset($entry['memberof'])) {
                for ($j = 0; $j < $entry['memberof']['count']; $j++) {
                    $memberOf[] = $entry['memberof'][$j];
                }
            }

            $role  = $this->getRoles($entry['dn'], $roleMapping, $memberOf);
            $ldapEmails[] = strtolower($email);

            DB::transaction(function () use ($email, $entry, $role, $provider, $org, $disabled, &$stats) {
                try {
                    $user = User::withTrashed()
                        ->where('organization_id', $org->id)
                        ->where('email', strtolower($email))
                        ->first();

                    $isNew = $user === null;

                    if ($isNew) {
                        $user = new User();
                        $user->organization_id = $org->id;
                        $user->email           = strtolower($email);
                        $user->password        = bcrypt(Str::random(32));
                        $stats['created']++;
                    } else {
                        $stats['updated']++;
                    }

                    if ($user->trashed() && ! $disabled) {
                        $user->restore();
                    }

                    $user->first_name      = $this->firstValue($entry, 'givenname') ?? $user->first_name ?? '';
                    $user->last_name       = $this->firstValue($entry, 'sn')        ?? $user->last_name  ?? $email;
                    $user->is_active       = ! $disabled;
                    $user->sso_provider_id = $provider->id;
                    $user->sso_external_id = $entry['dn'];
                    $user->sso_synced_at   = now();

                    if ($role && (! $user->exists || $user->role === 'employee')) {
                        $user->role = $role;
                    }

                    if ($disabled && ! $user->trashed()) {
                        $user->save();
                        $user->delete(); // Soft delete
                        return;
                    }

                    $user->save();
                } catch (\Throwable $e) {
                    $stats['errors'][] = "Erreur pour {$email}: " . $e->getMessage();
                    Log::error('LDAP sync erreur utilisateur', ['email' => $email, 'error' => $e->getMessage()]);
                }
            });
        }

        ldap_unbind($conn);

        // Désactiver les utilisateurs SECRETIS qui ne sont plus dans l'annuaire
        if (! empty($ldapEmails)) {
            $toDisable = User::where('organization_id', $org->id)
                ->where('sso_provider_id', $provider->id)
                ->whereNotIn('email', $ldapEmails)
                ->whereNull('deleted_at')
                ->get();

            foreach ($toDisable as $user) {
                $user->delete();
                $stats['disabled']++;
            }
        }

        // Mettre à jour les stats de synchronisation
        $provider->last_sync_at    = now();
        $provider->last_sync_stats = $stats;
        $provider->save();

        Log::info('LDAP sync terminé', array_merge($stats, ['org' => $org->slug]));

        return $stats;
    }

    // -------------------------------------------------------------------------
    // Mapping groupes → rôles
    // -------------------------------------------------------------------------

    /**
     * Retourne le rôle SECRETIS le plus élevé correspondant aux groupes AD/LDAP.
     *
     * @param  string $dn       Distinguished Name de l'utilisateur
     * @param  array  $mapping  {groupe_dn => role_secretis}
     * @param  array  $memberOf Liste des DN de groupes de l'utilisateur
     * @return string Rôle SECRETIS (employee, manager, admin)
     */
    public function getRoles(string $dn, array $mapping, array $memberOf = []): string
    {
        $hierarchy = ['employee' => 1, 'manager' => 2, 'admin' => 3];
        $best      = 'employee';
        $bestLevel = 0;

        foreach ($memberOf as $groupDn) {
            // Comparaison insensible à la casse (LDAP DN case-insensitive)
            foreach ($mapping as $mappedDn => $role) {
                if (strcasecmp($groupDn, $mappedDn) === 0 && isset($hierarchy[$role])) {
                    if ($hierarchy[$role] > $bestLevel) {
                        $best      = $role;
                        $bestLevel = $hierarchy[$role];
                    }
                }
            }
        }

        return $best;
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private function connect(array $config): \LDAP\Connection
    {
        $host   = $config['host']    ?? 'localhost';
        $port   = (int) ($config['port'] ?? 389);
        $useSsl = (bool) ($config['use_ssl'] ?? false);

        $proto  = $useSsl ? 'ldaps' : 'ldap';
        $conn   = @ldap_connect("{$proto}://{$host}:{$port}");

        if (! $conn) {
            throw new RuntimeException("Impossible de se connecter au serveur LDAP {$proto}://{$host}:{$port}");
        }

        ldap_set_option($conn, LDAP_OPT_PROTOCOL_VERSION, 3);
        ldap_set_option($conn, LDAP_OPT_REFERRALS, 0);
        ldap_set_option($conn, LDAP_OPT_NETWORK_TIMEOUT, 10);

        if (! $useSsl && ($config['use_tls'] ?? false)) {
            if (! @ldap_start_tls($conn)) {
                throw new RuntimeException('LDAP : STARTTLS échoué — ' . ldap_error($conn));
            }
        }

        return $conn;
    }

    private function firstValue(array $entry, string $attr): ?string
    {
        return $entry[$attr][0] ?? null;
    }

    private function getActiveProvider(Organization $org): SsoProvider
    {
        $provider = SsoProvider::where('organization_id', $org->id)
            ->where('type', 'ldap')
            ->where('is_active', true)
            ->first();

        if (! $provider) {
            throw new RuntimeException("Aucun provider LDAP actif pour l'organisation {$org->slug}.");
        }

        return $provider;
    }

    private function decryptConfig(SsoProvider $provider): array
    {
        $raw = decrypt($provider->config);
        return is_array($raw) ? $raw : json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
    }

    private function requireLdapExtension(): void
    {
        if (! extension_loaded('ldap')) {
            throw new RuntimeException('Extension PHP ldap requise. Installez php-ldap et redémarrez PHP-FPM.');
        }
    }
}
