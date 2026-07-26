<?php

namespace App\Console;

/**
 * =============================================================================
 * IBIG SECRETIS ERP — Console Kernel (Version Finale Production)
 * =============================================================================
 * Fichier : app/Console/Kernel.php
 * Version : 1.0.0
 * Auteur  : IBIG SOFT
 *
 * Toutes les tâches CRON de la plateforme SECRETIS, issues des vagues 1-10.
 *
 * Ordre d'exécution par fréquence :
 *   1. Temps-réel / 1 min  : Notifications, santé système
 *   2. Fréquent / 5-15 min : Rappels événements, sync calendriers
 *   3. Demi-heure / 30 min : IA proactive, GDPR
 *   4. Horaire             : Alertes courriers
 *   5. Toutes les 2-4h     : Backup, véhicules
 *   6. Quotidien (nuit)    : Nettoyage, statistiques, LDAP
 *   7. Hebdomadaire        : Rapport ressources
 *   8. Mensuel             : Rapport congés, rétention GDPR
 * =============================================================================
 */

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Définition de toutes les tâches planifiées SECRETIS ERP.
     */
    protected function schedule(Schedule $schedule): void
    {
        $this->scheduleRealtime($schedule);
        $this->scheduleFrequent($schedule);
        $this->scheduleHalfHourly($schedule);
        $this->scheduleHourly($schedule);
        $this->scheduleEveryFewHours($schedule);
        $this->scheduleDaily($schedule);
        $this->scheduleWeekly($schedule);
        $this->scheduleMonthly($schedule);
    }

    // =========================================================================
    // TEMPS-RÉEL (chaque minute / 5 minutes)
    // =========================================================================

    private function scheduleRealtime(Schedule $schedule): void
    {
        // ── Dispatch des notifications en file d'attente ──────────────────────
        // Envoie les notifications push/email/in-app accumulées
        $schedule->command('secretis:notifications:dispatch')
            ->everyMinute()
            ->withoutOverlapping(5)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-notifications.log'));

        // ── Health check système ──────────────────────────────────────────────
        // Vérifie la disponibilité des services critiques (Redis, BDD, S3, queue)
        // et envoie une alerte Slack si un service est dégradé
        $schedule->command('secretis:health:check')
            ->everyFiveMinutes()
            ->withoutOverlapping(4)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-health.log'));
    }

    // =========================================================================
    // FRÉQUENT (15 minutes)
    // =========================================================================

    private function scheduleFrequent(Schedule $schedule): void
    {
        // ── Rappels événements (J-1h et J-15min) ─────────────────────────────
        $schedule->command('secretis:events:remind')
            ->everyFifteenMinutes()
            ->withoutOverlapping(10)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-events.log'));

        // ── Synchronisation Outlook / Microsoft 365 ───────────────────────────
        // Sync bidirectionnelle des calendriers des organisations connectées
        $schedule->command('secretis:sync:outlook-calendars')
            ->everyFifteenMinutes()
            ->withoutOverlapping(12)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-outlook.log'));
    }

    // =========================================================================
    // DEMI-HEURE (30 minutes)
    // =========================================================================

    private function scheduleHalfHourly(Schedule $schedule): void
    {
        // ── SARA — Analyse proactive ──────────────────────────────────────────
        // SARA analyse les données de chaque organisation et génère des
        // suggestions proactives (retards, anomalies, opportunités)
        $schedule->command('secretis:sara:proactive-analysis')
            ->everyThirtyMinutes()
            ->withoutOverlapping(25)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-sara.log'));

        // ── Traitement des demandes GDPR en attente ───────────────────────────
        // Traite les demandes d'accès, portabilité et suppression reçues
        $schedule->command('secretis:gdpr:process-pending')
            ->everyThirtyMinutes()
            ->withoutOverlapping(20)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-gdpr.log'));
    }

    // =========================================================================
    // HORAIRE
    // =========================================================================

    private function scheduleHourly(Schedule $schedule): void
    {
        // ── Alertes courriers en retard ───────────────────────────────────────
        // Génère des alertes pour les courriers non traités après leur échéance
        $schedule->command('secretis:courriers:check-overdue')
            ->hourly()
            ->withoutOverlapping(30)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-courriers.log'));

        // ── Synchronisation des abonnements de paiement ───────────────────────
        // Vérifie l'état des abonnements auprès des passerelles de paiement
        $schedule->command('secretis:subscriptions:sync')
            ->hourly()
            ->withoutOverlapping(30)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-subscriptions.log'));
    }

    // =========================================================================
    // TOUTES LES 2-4 HEURES
    // =========================================================================

    private function scheduleEveryFewHours(Schedule $schedule): void
    {
        // ── Backup de la base de données ──────────────────────────────────────
        // Dump PostgreSQL chiffré AES-256 → upload S3 → rotation automatique
        $schedule->command('secretis:backup:database')
            ->everyTwoHours()
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-backup.log'))
            ->onFailure(function () {
                \Illuminate\Support\Facades\Log::critical(
                    '[CRITIQUE] Échec du backup base de données SECRETIS',
                    ['timestamp' => now()->toIso8601String()]
                );
            });

        // ── Vérification alertes véhicules ────────────────────────────────────
        // Contrôle : assurances (J-30/15/7/1), visites techniques, vignettes
        $schedule->command('secretis:vehicles:check-alerts')
            ->everySixHours()
            ->withoutOverlapping(30)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-vehicles.log'));

        // ── Tâches CRM quotidiennes (rappels activités, suivi prospects) ──────
        // Envoie des rappels aux commerciaux pour les activités CRM planifiées
        $schedule->command('secretis:crm:daily-tasks')
            ->everySixHours()
            ->withoutOverlapping(20)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-crm.log'));
    }

    // =========================================================================
    // QUOTIDIEN (tâches nocturnes et matinales)
    // =========================================================================

    private function scheduleDaily(Schedule $schedule): void
    {
        // ── Recalcul des statistiques en cache ────────────────────────────────
        // Prépare les KPIs du dashboard pour chaque organisation (00h30)
        $schedule->command('secretis:cache:refresh-stats')
            ->dailyAt('00:30')
            ->withoutOverlapping(20)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-cache.log'));

        // ── Nettoyage des données expirées ────────────────────────────────────
        $schedule->command('secretis:cleanup:expired-tokens')
            ->dailyAt('01:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-cleanup.log'));

        $schedule->command('secretis:cleanup:expired-share-links')
            ->dailyAt('01:15')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-cleanup.log'));

        $schedule->command('secretis:cleanup:old-logs')
            ->dailyAt('01:30')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-cleanup.log'));

        // Purge des jobs en échec (> 7 jours)
        $schedule->command('queue:prune-failed --hours=168')
            ->dailyAt('01:45')
            ->withoutOverlapping();

        // ── Synchronisation LDAP / Active Directory ───────────────────────────
        // Synchronise les utilisateurs depuis l'annuaire d'entreprise (01h00)
        $schedule->command('secretis:ldap:sync-users')
            ->dailyAt('01:00')
            ->withoutOverlapping(30)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-ldap.log'));

        // ── Backup complet (BDD + fichiers S3) ───────────────────────────────
        // Backup nuit complet — en complément des backups toutes les 2h
        $schedule->command('secretis:backup')
            ->dailyAt('02:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-backup.log'))
            ->onFailure(function () {
                \Illuminate\Support\Facades\Log::critical(
                    '[CRITIQUE] Échec du backup nocturne SECRETIS',
                    ['timestamp' => now()->toIso8601String()]
                );
            });

        // ── Rétention RGPD quotidienne ────────────────────────────────────────
        // Marque les données arrivant à expiration pour traitement RGPD
        $schedule->command('secretis:gdpr:check-retention')
            ->dailyAt('03:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-gdpr.log'));

        // ── Rappels essai gratuit ─────────────────────────────────────────────
        // Emails aux organisations dont l'essai expire dans 7j / 3j / 1j
        $schedule->command('secretis:trial-reminders')
            ->dailyAt('03:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-trials.log'));

        $schedule->command('secretis:remind-expiration')
            ->dailyAt('03:05')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-trials.log'));

        $schedule->command('secretis:process-license-grace')
            ->dailyAt('03:10')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-trials.log'));

        // Désactiver les comptes avec essai expiré
        $schedule->command('secretis:process-expired-licenses')
            ->dailyAt('03:30')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-trials.log'));

        // ── Taux de change (Open Exchange Rates) ──────────────────────────────
        // Rafraîchit les taux de change quotidiens pour la comptabilité multi-devises
        $schedule->command('secretis:currency:fetch-rates')
            ->dailyAt('06:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-currency.log'));

        // ── Rapport de monitoring quotidien ───────────────────────────────────
        // Envoie un résumé des métriques système à l'équipe IBIG SOFT (08h00)
        $schedule->command('secretis:monitoring:daily-report')
            ->dailyAt('08:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-monitoring.log'));

        // ── Relances factures impayées ────────────────────────────────────────
        // Marque les factures en retard et envoie les relances à J+7/14/30
        $schedule->command('secretis:accounting:overdue-reminders')
            ->dailyAt('09:00')
            ->withoutOverlapping(30)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-accounting.log'));

        // ── Optimisation PostgreSQL ───────────────────────────────────────────
        // VACUUM ANALYZE sur toutes les tables (dimanche 05h00)
        $schedule->command('secretis:db:optimize')
            ->weeklyOn(Schedule::SUNDAY, '05:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-maintenance.log'));
    }

    // =========================================================================
    // HEBDOMADAIRE
    // =========================================================================

    private function scheduleWeekly(Schedule $schedule): void
    {
        // ── Rapport hebdomadaire des ressources humaines ──────────────────────
        // Résumé absences semaine précédente + planning semaine à venir (lundi 08h00)
        $schedule->command('secretis:reports:weekly-resources')
            ->weeklyOn(Schedule::MONDAY, '08:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-reports.log'));
    }

    // =========================================================================
    // MENSUEL
    // =========================================================================

    private function scheduleMonthly(Schedule $schedule): void
    {
        // ── Rapport mensuel des absences / congés ─────────────────────────────
        // Bilan mensuel par département, export PDF vers responsables RH (1er du mois 06h00)
        $schedule->command('secretis:reports:monthly-absences')
            ->monthlyOn(1, '06:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-reports.log'));

        // ── Rétention RGPD mensuelle ──────────────────────────────────────────
        // Suppression définitive des données dont la rétention est expirée (1er du mois 03h00)
        $schedule->command('secretis:gdpr:apply-retention')
            ->monthlyOn(1, '03:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/scheduler-gdpr.log'));
    }

    // =========================================================================
    // ENREGISTREMENT DES COMMANDES ARTISAN
    // =========================================================================

    protected function commands(): void
    {
        $this->load(__DIR__ . '/Commands');

        require base_path('routes/console.php');
    }
}
