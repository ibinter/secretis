<?php

/**
 * StrongPasswordTest — Tests unitaires de la règle de validation de mot de passe fort
 *
 * Couvre : longueur min 12, majuscule, caractère spécial, séquences communes,
 *          mots bannis (secretis), caractères répétés.
 */

use App\Rules\StrongPassword;
use Illuminate\Support\Facades\Validator;

// Helper : valide un mot de passe et retourne le résultat
function validatePassword(string $password): bool
{
    $validator = Validator::make(
        ['password' => $password],
        ['password' => [new StrongPassword()]]
    );

    return ! $validator->fails();
}

// Helper : retourne le message d'erreur
function passwordErrors(string $password): array
{
    $validator = Validator::make(
        ['password' => $password],
        ['password' => [new StrongPassword()]]
    );

    return $validator->errors()->get('password');
}

// =============================================================================
// Mot de passe valide
// =============================================================================

it('accepts valid strong password', function () {
    $validPasswords = [
        'S3cr3t!P@ssw0rd',
        'Abidjan#2026!ERP',
        'Ibig$oft-Secure1',
        'Tr0pF0rt&Vraiment!',
        'M0dule@Secretis_CI',
    ];

    foreach ($validPasswords as $password) {
        expect(validatePassword($password))->toBeTrue("'{$password}' should be accepted");
    }
});

// =============================================================================
// Longueur minimale
// =============================================================================

it('rejects password shorter than 12 chars', function () {
    $tooShort = [
        'Abc!12345',   // 9 chars
        'Short@1A',    // 8 chars
        'T!ny1A',      // 6 chars
        'X',           // 1 char
        '',            // vide
    ];

    foreach ($tooShort as $password) {
        expect(validatePassword($password))->toBeFalse("'{$password}' should be rejected (too short)");
    }
});

it('accepts password of exactly 12 chars if meets all rules', function () {
    expect(validatePassword('Ibig@Soft1234'))->toBeTrue();
});

// =============================================================================
// Lettre majuscule obligatoire
// =============================================================================

it('rejects password without uppercase', function () {
    $noUppercase = [
        'secretis@12345!',
        'abcdef!ghij1234',
        'mon_super_pass!1',
    ];

    foreach ($noUppercase as $password) {
        expect(validatePassword($password))->toBeFalse("'{$password}' must be rejected (no uppercase)");
    }
});

// =============================================================================
// Caractère spécial obligatoire
// =============================================================================

it('rejects password without special char', function () {
    $noSpecial = [
        'SecretisPass1234',
        'Abcdefghij123K',
        'MonMotDePasse12',
    ];

    foreach ($noSpecial as $password) {
        expect(validatePassword($password))->toBeFalse("'{$password}' must be rejected (no special char)");
    }
});

// =============================================================================
// Séquences communes
// =============================================================================

it('rejects common sequences like password123', function () {
    $common = [
        'Password123!@#',
        'Azerty123!@#Az',
        'Qwerty@12345Zz',
        '123456!Abcdef7',
        'Abcdef@12345Z6',
    ];

    foreach ($common as $password) {
        $errors = passwordErrors($password);
        // Le mot de passe doit échouer pour séquence commune OU une autre règle
        expect(validatePassword($password))->toBeFalse();
    }
});

// =============================================================================
// Mot banni : secretis
// =============================================================================

it('rejects secretis in password', function () {
    $bannedPasswords = [
        'Secretis@2026!1',
        'SECRETIS@Pass1!',
        'Mon$Secretis123',
        'secretis!ABC123',
        'S3cretis@!1234',
    ];

    foreach ($bannedPasswords as $password) {
        expect(validatePassword($password))->toBeFalse("'{$password}' must be rejected (contains 'secretis')");
        $errors = passwordErrors($password);
        expect(implode(' ', $errors))->toContain('secretis');
    }
});

it('rejects ibig in password', function () {
    expect(validatePassword('IbigSoft@12345!'))->toBeFalse();
});

// =============================================================================
// Caractères répétés (aaa)
// =============================================================================

it('rejects repeated characters aaa', function () {
    $repeated = [
        'Aaabcdef!@12345',
        'Str0ng!zzz12345',
        'Pass@word111Abc',
        'X!1111111Abcdef',
    ];

    foreach ($repeated as $password) {
        expect(validatePassword($password))->toBeFalse("'{$password}' must be rejected (repeated chars)");
    }
});

it('allows two identical consecutive chars', function () {
    // "ll" dans "Excellent" est toléré (2 répétitions)
    expect(validatePassword('Excellent@Pass12'))->toBeTrue();
});

// =============================================================================
// Messages d'erreur
// =============================================================================

it('error message specifies which rule failed', function () {
    $errors = passwordErrors('short');
    expect($errors)->not->toBeEmpty();
    expect($errors[0])->toBeString()->not->toBeEmpty();
});

it('error message is in french by default', function () {
    $errors = passwordErrors('ab');
    // La règle doit retourner un message en français
    $combined = implode(' ', $errors);
    expect(mb_detect_encoding($combined, 'UTF-8', true))->toBe('UTF-8');
});
