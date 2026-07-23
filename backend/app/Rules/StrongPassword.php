<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * StrongPassword — Règle de validation de mot de passe renforcée pour SECRETIS.
 *
 * Critères :
 *  - Minimum 12 caractères
 *  - Au moins 1 majuscule
 *  - Au moins 1 minuscule
 *  - Au moins 1 chiffre
 *  - Au moins 1 caractère spécial (@$!%*?&_-)
 *  - Aucun mot de passe courant / séquence évidente
 *  - Pas de répétition de 3+ caractères identiques consécutifs
 *
 * Usage dans un FormRequest :
 *   'password' => ['required', 'confirmed', new StrongPassword()],
 */
class StrongPassword implements ValidationRule
{
    /**
     * Mots de passe et séquences interdits (insensible à la casse).
     */
    private const FORBIDDEN_SEQUENCES = [
        'password',
        'motdepasse',
        'passwort',
        'contraseña',
        '123456',
        '12345678',
        '123456789',
        '1234567890',
        'azerty',
        'qwerty',
        'qwertyuiop',
        'azertyuiop',
        'secretis',
        'ibig',
        'ibigsoft',
        'admin',
        'administrateur',
        'administrator',
        'welcome',
        'bienvenue',
        'changeme',
        'letmein',
        'monkey',
        'dragon',
        'master',
        'login',
    ];

    /**
     * Caractères spéciaux acceptés.
     */
    private const SPECIAL_CHARS_PATTERN = '/[@$!%*?&_\-]/';

    /**
     * Valide le mot de passe et appelle $fail avec un message explicite
     * pour chaque règle manquante.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Le mot de passe doit être une chaîne de caractères.');
            return;
        }

        $errors = $this->collectErrors($value);

        foreach ($errors as $error) {
            $fail($error);
        }
    }

    /**
     * Retourne tous les messages d'erreur pour un mot de passe donné.
     * Retourne un tableau vide si le mot de passe est valide.
     *
     * @return string[]
     */
    public function collectErrors(string $password): array
    {
        $errors = [];

        if (mb_strlen($password) < 12) {
            $errors[] = 'Le mot de passe doit contenir au moins 12 caractères.';
        }

        if (! preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Le mot de passe doit contenir au moins une lettre majuscule (A-Z).';
        }

        if (! preg_match('/[a-z]/', $password)) {
            $errors[] = 'Le mot de passe doit contenir au moins une lettre minuscule (a-z).';
        }

        if (! preg_match('/[0-9]/', $password)) {
            $errors[] = 'Le mot de passe doit contenir au moins un chiffre (0-9).';
        }

        if (! preg_match(self::SPECIAL_CHARS_PATTERN, $password)) {
            $errors[] = 'Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&_-).';
        }

        if ($this->containsForbiddenSequence($password)) {
            $errors[] = 'Le mot de passe contient un mot ou une séquence trop commun(e) et facilement devinable.';
        }

        if ($this->hasConsecutiveRepeats($password)) {
            $errors[] = 'Le mot de passe ne doit pas contenir 3 caractères identiques consécutifs ou plus (ex: aaa, 111).';
        }

        return $errors;
    }

    /**
     * Vérifie si le mot de passe contient une séquence interdite.
     * La comparaison est insensible à la casse.
     */
    private function containsForbiddenSequence(string $password): bool
    {
        $lower = mb_strtolower($password);

        foreach (self::FORBIDDEN_SEQUENCES as $sequence) {
            if (str_contains($lower, $sequence)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Vérifie s'il y a 3+ caractères identiques consécutifs.
     * Exemples : "aaa", "111", "...".
     */
    private function hasConsecutiveRepeats(string $password): bool
    {
        // Regex : un caractère quelconque répété 3 fois ou plus de suite
        return (bool) preg_match('/(.)\1{2,}/', $password);
    }

    /**
     * Vérifie si un mot de passe est valide (sans générer de messages).
     * Utile pour les vérifications programmatiques.
     */
    public function passes(string $password): bool
    {
        return empty($this->collectErrors($password));
    }
}
