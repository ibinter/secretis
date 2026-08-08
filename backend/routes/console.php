<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| SECRETIS ERP — Tâches planifiées (Laravel 11)
|--------------------------------------------------------------------------
| Spec IBIG SOFT §20 (cycle de vie email) + maintenance système.
| Toutes les commandes listées existent (php artisan list).
*/

// ── Temps réel / fréquent ────────────────────────────────────────────────
Schedule::command('secretis:health-check')->everyFiveMinutes()->withoutOverlapping(4)->runInBackground();
Schedule::command('horizon:snapshot')->everyFiveMinutes();
Schedule::command('secretis:sync-outlook')->everyFifteenMinutes()->withoutOverlapping(12)->runInBackground();
Schedule::command('secretis:gdpr-process')->everyThirtyMinutes()->withoutOverlapping(20)->runInBackground();

// ── Horaire ──────────────────────────────────────────────────────────────
Schedule::command('secretis:expire-unpaid-orders')->hourly()->withoutOverlapping(30)->runInBackground();
Schedule::command('visitors:alerts')->hourly()->withoutOverlapping(30)->runInBackground();
Schedule::command('crm:daily-tasks')->everySixHours()->withoutOverlapping(20)->runInBackground();

// ── Cycle de vie licences & emails (spec §20) — nuit ────────────────────
// secretis:trial-reminders retiré : modèle Organisation/trial_ends_at inexistants — couvert par check-expiring-licenses
Schedule::command('secretis:remind-expiration')->dailyAt('03:05')->withoutOverlapping()->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler-trials.log'));
Schedule::command('secretis:check-expiring-licenses')->dailyAt('03:08')->withoutOverlapping()->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler-trials.log'));
Schedule::command('secretis:process-license-grace')->dailyAt('03:10')->withoutOverlapping()->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler-trials.log'));
Schedule::command('secretis:process-expired-licenses')->dailyAt('03:30')->withoutOverlapping()->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler-trials.log'));

// ── Quotidien — maintenance & rapports ──────────────────────────────────
Schedule::command('secretis:cache:warmup')->dailyAt('00:30')->withoutOverlapping(20)->runInBackground();
Schedule::command('secretis:sync-ldap')->dailyAt('01:00')->withoutOverlapping(30)->runInBackground();
Schedule::command('secretis:clean-email-logs')->dailyAt('01:30')->withoutOverlapping()->runInBackground();
Schedule::command('queue:prune-failed --hours=168')->dailyAt('01:45')->withoutOverlapping();
Schedule::command('secretis:backup')->dailyAt('02:00')->withoutOverlapping()->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler-backup.log'));
Schedule::command('secretis:gdpr-retention')->dailyAt('03:45')->withoutOverlapping()->runInBackground();
Schedule::command('secretis:fetch-rates')->dailyAt('06:00')->withoutOverlapping()->runInBackground();
Schedule::command('secretis:monitor')->dailyAt('08:00')->withoutOverlapping()->runInBackground();
Schedule::command('secretis:accounting:overdue-reminders')->dailyAt('09:00')->withoutOverlapping(30)->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler-accounting.log'));
// Relances du registre du courrier : en début de matinée, sur les jours ouvrés
// uniquement — inutile d'alerter le samedi sur un délai qui court le lundi.
Schedule::command('secretis:courrier:overdue-alerts')->weekdays()->dailyAt('07:30')
    ->withoutOverlapping(30)->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduler-courrier.log'));
Schedule::command('saas:compute-metrics')->dailyAt('04:00')->withoutOverlapping()->runInBackground();
Schedule::command('model:prune')->daily();
Schedule::command('activitylog:clean')->daily();
Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('auth:clear-resets')->daily();
