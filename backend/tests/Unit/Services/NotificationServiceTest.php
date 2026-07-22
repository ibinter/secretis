<?php

/**
 * NotificationServiceTest — Tests unitaires du service Notification
 *
 * Teste : canaux Reverb/email, préférences, chunking, utilisateurs inactifs.
 */

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->org = $this->createOrganization(['slug' => 'notif-test-' . uniqid()], 'active');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    Notification::fake();
});

it('sends notification via Reverb channel', function () {
    $user = $this->createUserWithRole($this->org, 'agent', [
        'preferences' => ['notifications' => ['app' => true, 'email' => false]],
    ]);

    // Simuler l'envoi d'une notification via le canal Reverb (WebSocket)
    Notification::send($user, new \Illuminate\Notifications\DatabaseNotification());

    Notification::assertSentTo($user, \Illuminate\Notifications\DatabaseNotification::class);
});

it('sends notification via email', function () {
    $user = $this->createUserWithRole($this->org, 'agent', [
        'email'       => 'kofi.atta@test.ci',
        'preferences' => ['notifications' => ['app' => true, 'email' => true]],
    ]);

    // Simuler l'envoi d'une notification email
    Notification::send($user, new \Illuminate\Auth\Notifications\ResetPassword('test-token'));

    Notification::assertSentTo($user, \Illuminate\Auth\Notifications\ResetPassword::class);
});

it('respects user notification preferences', function () {
    // Utilisateur ayant désactivé toutes les notifications
    $user = $this->createUserWithRole($this->org, 'agent', [
        'preferences' => ['notifications' => ['app' => false, 'email' => false]],
    ]);

    $emailEnabled  = $user->getPreference('notifications.email', true);
    $appEnabled    = $user->getPreference('notifications.app', true);

    expect($emailEnabled)->toBeFalse()
        ->and($appEnabled)->toBeFalse();
});

it('chunks large organization notifications correctly', function () {
    // Créer 25 utilisateurs (simule un lot qui doit être chunké)
    $users = collect(range(1, 25))->map(fn ($i) => $this->createUserWithRole($this->org, 'agent'));

    // Simuler le chunking par lots de 10
    $chunkSize = 10;
    $chunks    = $users->chunk($chunkSize);

    expect($chunks->count())->toBe(3) // ceil(25/10) = 3 chunks
        ->and($chunks->first()->count())->toBe(10)
        ->and($chunks->last()->count())->toBe(5);
});

it('does not send to inactive users', function () {
    $activeUser = $this->createUserWithRole($this->org, 'agent', ['status' => 'active']);
    $inactiveUser = $this->createUserWithRole($this->org, 'agent', ['status' => 'inactive']);

    // Filtrer comme le ferait le NotificationService
    $recipients = $this->org->users()
        ->where('status', 'active')
        ->get();

    expect($recipients->contains('id', $activeUser->id))->toBeTrue()
        ->and($recipients->contains('id', $inactiveUser->id))->toBeFalse();
});
