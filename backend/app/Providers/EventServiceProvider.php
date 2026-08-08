<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

/**
 * EventServiceProvider — ce fichier n'existait pas.
 *
 * Conséquence : les deux abonnés (`SmartNotificationListener`, 619 lignes de
 * logique de notification multi-canal, et `LogSecurityEvent`) n'étaient
 * enregistrés nulle part, et les 5 observers non plus. Résultat concret :
 *   - aucune notification métier ne partait (ni in-app, ni email, ni WhatsApp/SMS) ;
 *   - l'invalidation de cache ne se déclenchait jamais.
 */
class EventServiceProvider extends ServiceProvider
{
    /**
     * Abonnés : chaque classe déclare elle-même ses événements via `subscribe()`.
     */
    protected $subscribe = [
        \App\Listeners\SmartNotificationListener::class,
    ];

    /**
     * `LogSecurityEvent` n'expose pas de `subscribe()` mais des méthodes
     * `handleXxx()` : on les mappe explicitement.
     */
    protected $listen = [
        \Illuminate\Auth\Events\Failed::class => [
            [\App\Listeners\LogSecurityEvent::class, 'handleLoginFailed'],
        ],
        \Illuminate\Auth\Events\PasswordReset::class => [
            [\App\Listeners\LogSecurityEvent::class, 'handlePasswordReset'],
        ],
        \App\Events\MfaFailed::class => [
            [\App\Listeners\LogSecurityEvent::class, 'handleMfaFailed'],
        ],
        \App\Events\SuspiciousActivity::class => [
            [\App\Listeners\LogSecurityEvent::class, 'handleSuspiciousActivity'],
        ],
    ];

    public function boot(): void
    {
        parent::boot();

        // Observers (existaient sans jamais être branchés).
        $observers = [
            \App\Models\Task::class     => \App\Observers\TaskObserver::class,
            \App\Models\Document::class => \App\Observers\DocumentObserver::class,
            \App\Models\Event::class    => \App\Observers\EventObserver::class,
            \App\Models\User::class     => \App\Observers\UserObserver::class,
        ];

        foreach ($observers as $model => $observer) {
            if (class_exists($model) && class_exists($observer)) {
                $model::observe($observer);
            }
        }
    }

    /**
     * La découverte automatique reste désactivée : les abonnements sont explicites.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
