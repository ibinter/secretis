<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| SECRETIS ERP — Commandes Console & Planification CRON
| Toutes les 12 vagues — Version définitive
|--------------------------------------------------------------------------
|
| Ce fichier définit :
|   1. Les closures Artisan (routes console légères)
|   2. La planification complète (schedule) via $schedule
|
| Pour les commandes complexes, voir : app/Console/Commands/
|
*/

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// =============================================================================
// COMMANDES ARTISAN INLINE (rapides, sans classe dédiée)
// =============================================================================

Artisan::command('secretis:inspire', function (): void {
    $this->comment(Inspiring::quote());
})->purpose('Afficher une citation inspirante SECRETIS');

Artisan::command('secretis:version', function (): void {
    $this->info('SECRETIS ERP — Version ' . config('app.version', '1.0.0'));
    $this->line('IBIG Soft — ' . now()->format('Y'));
})->purpose('Afficher la version de SECRETIS ERP');

// =============================================================================
// PLANIFICATION CRON COMPLÈTE — Toutes les 12 vagues
// =============================================================================

// -------------------------------------------------------------------------
// SANTÉ & MONITORING (transversal)
// -------------------------------------------------------------------------

// Vérification globale de santé système (DB, Redis, Storage, Queue)
Schedule::command('secretis:verify')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('secretis-verify')
    ->description('Vérification santé système SECRETIS');

// Vérification conformité licences actives
Schedule::command('secretis:compliance-check')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('secretis-compliance-check')
    ->description('Vérification conformité et licences');

// Calcul métriques SaaS (MRR, ARR, Churn) — Vague 10
Schedule::command('compute:saas-metrics')
    ->dailyAt('01:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->name('compute-saas-metrics')
    ->description('Calcul métriques SaaS quotidiennes');

// -------------------------------------------------------------------------
// MODULE AGENDA — Vague 1
// -------------------------------------------------------------------------

// Rappels événements imminents (15 min, 1h avant)
Schedule::command('agenda:send-reminders')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('agenda-send-reminders')
    ->description('Envoyer les rappels d\'événements');

// Nettoyage des événements récurrents expirés
Schedule::command('agenda:clean-expired-recurrences')
    ->weekly()
    ->sundays()
    ->at('03:00')
    ->name('agenda-clean-recurrences')
    ->description('Nettoyer les occurrences récurrentes expirées');

// Synchronisation Google Calendar (pour les orgs connectées)
Schedule::command('agenda:sync-google-calendar')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('agenda-sync-google')
    ->description('Synchroniser Google Calendar');

// Synchronisation Microsoft 365 / Outlook
Schedule::command('agenda:sync-outlook')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('agenda-sync-outlook')
    ->description('Synchroniser Outlook / Microsoft 365');

// -------------------------------------------------------------------------
// MODULE COURRIER & GED — Vague 2
// -------------------------------------------------------------------------

// Relances courriers non traités depuis X jours
Schedule::command('courrier:send-follow-up-reminders')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->name('courrier-follow-up')
    ->description('Relances courriers en souffrance');

// Archivage automatique des courriers traités depuis > 90 jours
Schedule::command('courrier:auto-archive')
    ->weekly()
    ->mondays()
    ->at('02:00')
    ->name('courrier-auto-archive')
    ->description('Archivage automatique courriers anciens');

// Nettoyage des fichiers temporaires OCR
Schedule::command('ged:clean-temp-files')
    ->daily()
    ->at('04:00')
    ->name('ged-clean-temp')
    ->description('Nettoyage fichiers temporaires GED/OCR');

// Réindexation recherche full-text (Laravel Scout)
Schedule::command('scout:flush "App\Models\Document" && php artisan scout:import "App\Models\Document"')
    ->weekly()
    ->wednesdays()
    ->at('03:00')
    ->name('ged-reindex')
    ->description('Réindexation recherche full-text documents');

// -------------------------------------------------------------------------
// MODULE RÉUNIONS — Vague 3
// -------------------------------------------------------------------------

// Envoi des convocations J-1 (rappel 24h avant)
Schedule::command('reunions:send-reminders')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('reunions-reminders')
    ->description('Rappels de réunions imminentes');

// Génération automatique PV (IA) pour réunions terminées sans PV
Schedule::command('reunions:generate-pending-minutes')
    ->dailyAt('23:00')
    ->withoutOverlapping()
    ->name('reunions-generate-minutes')
    ->description('Génération IA des PV manquants');

// -------------------------------------------------------------------------
// MODULE TÂCHES & PROJETS — Vague 4
// -------------------------------------------------------------------------

// Alertes tâches en retard (deadline dépassée)
Schedule::command('tasks:send-overdue-alerts')
    ->dailyAt('07:30')
    ->withoutOverlapping()
    ->name('tasks-overdue-alerts')
    ->description('Alertes tâches en retard');

// Calcul avancement automatique des projets
Schedule::command('projects:compute-progress')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('projects-compute-progress')
    ->description('Calcul avancement projets');

// Relances jalons projet imminents (J-3)
Schedule::command('projects:milestone-reminders')
    ->dailyAt('08:30')
    ->name('projects-milestone-reminders')
    ->description('Rappels jalons projets');

// -------------------------------------------------------------------------
// MODULE COMMUNICATION — Vague 5
// -------------------------------------------------------------------------

// Nettoyage messages supprimés (purge physique après 30 jours)
Schedule::command('messages:purge-deleted')
    ->weekly()
    ->sundays()
    ->at('02:30')
    ->name('messages-purge')
    ->description('Purge physique des messages supprimés');

// Envoi digest hebdomadaire des circulaires non lues
Schedule::command('circulaires:weekly-digest')
    ->weekly()
    ->mondays()
    ->at('08:00')
    ->name('circulaires-weekly-digest')
    ->description('Digest hebdomadaire circulaires non lues');

// -------------------------------------------------------------------------
// MODULE VISITEURS / RÉCEPTION — Vague 6
// -------------------------------------------------------------------------

// Alertes visiteurs présents depuis > X heures (oubli de check-out)
Schedule::command('visitor:alerts')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('visitor-alerts')
    ->description('Alertes visiteurs toujours présents');

// Envoi invitations visiteurs programmées J-1
Schedule::command('visitor:send-invitations')
    ->everyHour()
    ->withoutOverlapping()
    ->name('visitor-send-invitations')
    ->description('Envoi des invitations visiteurs J-1');

// Nettoyage logs visiteurs anciens (> 2 ans, RGPD)
Schedule::command('visitor:clean-old-logs')
    ->monthly()
    ->name('visitor-clean-logs')
    ->description('Nettoyage RGPD des logs visiteurs anciens');

// Rapport journalier accueil
Schedule::command('visitor:daily-report')
    ->dailyAt('18:00')
    ->name('visitor-daily-report')
    ->description('Rapport quotidien accueil visiteurs');

// -------------------------------------------------------------------------
// MODULE RESSOURCES & FLOTTE — Vague 3/5/9
// -------------------------------------------------------------------------

// Alertes maintenance véhicules préventive
Schedule::command('fleet:maintenance-alerts')
    ->dailyAt('07:00')
    ->withoutOverlapping()
    ->name('fleet-maintenance-alerts')
    ->description('Alertes maintenance préventive flotte');

// Calcul consommation carburant & coût/km
Schedule::command('fleet:compute-fuel-stats')
    ->dailyAt('01:30')
    ->name('fleet-fuel-stats')
    ->description('Calcul statistiques carburant flotte');

// Alertes géofencing (vérification périodique)
Schedule::command('fleet:check-geofences')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('fleet-geofences')
    ->description('Vérification alertes géofencing');

// Alertes réservations ressources imminentes
Schedule::command('resources:reservation-reminders')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->name('resources-reminders')
    ->description('Rappels réservations ressources');

// -------------------------------------------------------------------------
// MODULE RH — Vague 4/8
// -------------------------------------------------------------------------

// Alertes contrats expirant dans 30 jours
Schedule::command('rh:contract-expiry-alerts')
    ->dailyAt('08:00')
    ->name('rh-contract-expiry')
    ->description('Alertes contrats RH expirant');

// Calcul soldes de congés (report annuel)
Schedule::command('rh:compute-leave-balances')
    ->monthly()
    ->at('01:00')
    ->name('rh-leave-balances')
    ->description('Calcul mensuel des soldes de congés');

// Rappels demandes de congé en attente (> 3 jours sans réponse)
Schedule::command('rh:pending-leave-reminders')
    ->dailyAt('09:00')
    ->name('rh-pending-leave-reminders')
    ->description('Relances approbations congés en attente');

// Rappels notes de frais non soumises (fin de mois)
Schedule::command('rh:expense-submission-reminders')
    ->lastDayOfMonth('17:00')
    ->name('rh-expense-reminders')
    ->description('Rappels notes de frais fin de mois');

// Envoi bulletins de présence hebdomadaires
Schedule::command('rh:weekly-attendance-summary')
    ->weekly()
    ->mondays()
    ->at('07:00')
    ->name('rh-attendance-summary')
    ->description('Résumé hebdomadaire présences RH');

// -------------------------------------------------------------------------
// MODULE COMPTABILITÉ SYSCOHADA — Vague 6/11
// -------------------------------------------------------------------------

// Génération automatique des états financiers mensuels
Schedule::command('accounting:generate-monthly-statements')
    ->monthlyOn(1, '06:00')
    ->withoutOverlapping()
    ->name('accounting-monthly-statements')
    ->description('Génération états financiers mensuels SYSCOHADA');

// Rappels déclarations fiscales (TVA mensuelle, IS annuel)
Schedule::command('accounting:tax-declaration-reminders')
    ->monthly()
    ->at('08:00')
    ->name('accounting-tax-reminders')
    ->description('Rappels déclarations fiscales');

// Calcul amortissements automatiques
Schedule::command('accounting:compute-depreciation')
    ->monthly()
    ->at('02:00')
    ->name('accounting-depreciation')
    ->description('Calcul amortissements comptables');

// Rapprochement bancaire automatique
Schedule::command('accounting:bank-reconciliation')
    ->dailyAt('06:00')
    ->withoutOverlapping()
    ->name('accounting-bank-reconciliation')
    ->description('Rapprochement bancaire automatique');

// -------------------------------------------------------------------------
// MODULE BUDGET — Vague 11
// -------------------------------------------------------------------------

// Alertes dépassement budgétaire (seuils configurés)
Schedule::command('budget:alerts')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->name('budget-alerts')
    ->description('Alertes dépassement budgétaire');

// Calcul prévisions budgétaires (forecast IA)
Schedule::command('budget:compute-forecast')
    ->weekly()
    ->mondays()
    ->at('05:00')
    ->withoutOverlapping()
    ->name('budget-forecast')
    ->description('Calcul prévisions budgétaires IA');

// Rapport budgétaire mensuel
Schedule::command('budget:monthly-report')
    ->monthlyOn(2, '07:00')
    ->name('budget-monthly-report')
    ->description('Rapport budgétaire mensuel');

// -------------------------------------------------------------------------
// MODULE ACHATS & PROCUREMENT — Vague 12
// -------------------------------------------------------------------------

// Relances appels d'offres sans réponse (J+3)
Schedule::command('procurement:rfq-reminders')
    ->dailyAt('08:30')
    ->name('procurement-rfq-reminders')
    ->description('Relances appels d\'offres fournisseurs');

// Alertes commandes non réceptionnées à J+livraison
Schedule::command('procurement:delivery-alerts')
    ->dailyAt('09:00')
    ->name('procurement-delivery-alerts')
    ->description('Alertes commandes non livrées');

// Évaluation automatique performance fournisseurs (mensuelle)
Schedule::command('procurement:supplier-evaluation')
    ->monthly()
    ->at('02:00')
    ->name('procurement-supplier-evaluation')
    ->description('Évaluation mensuelle performance fournisseurs');

// -------------------------------------------------------------------------
// MODULE QUALITÉ — Vague 12
// -------------------------------------------------------------------------

// Alertes non-conformités non traitées (> SLA)
Schedule::command('quality:nc-sla-alerts')
    ->dailyAt('09:30')
    ->name('quality-nc-alerts')
    ->description('Alertes non-conformités hors SLA');

// Rappels audits planifiés (J-7)
Schedule::command('quality:audit-reminders')
    ->dailyAt('08:00')
    ->name('quality-audit-reminders')
    ->description('Rappels audits qualité à venir');

// Calcul indicateurs qualité KPI
Schedule::command('quality:compute-indicators')
    ->dailyAt('01:00')
    ->name('quality-indicators')
    ->description('Calcul indicateurs qualité quotidiens');

// -------------------------------------------------------------------------
// MODULE FORMATION — Vague 7/12
// -------------------------------------------------------------------------

// Rappels formations planifiées (J-3)
Schedule::command('training:session-reminders')
    ->dailyAt('08:00')
    ->name('training-session-reminders')
    ->description('Rappels sessions de formation');

// Génération certificats automatiques (après validation quiz)
Schedule::command('training:generate-certificates')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('training-certificates')
    ->description('Génération automatique certificats formation');

// Relances parcours de formation incomplets
Schedule::command('training:learning-path-reminders')
    ->weekly()
    ->thursdays()
    ->at('09:00')
    ->name('training-path-reminders')
    ->description('Relances parcours formation non terminés');

// -------------------------------------------------------------------------
// MODULE SIGNATURES ÉLECTRONIQUES — Vague 7
// -------------------------------------------------------------------------

// Relances signatures en attente (> 48h)
Schedule::command('signatures:send-pending-reminders')
    ->dailyAt('10:00')
    ->name('signatures-pending-reminders')
    ->description('Relances signatures électroniques en attente');

// Expiration automatique des demandes > 30 jours
Schedule::command('signatures:expire-old-requests')
    ->daily()
    ->at('02:00')
    ->name('signatures-expire')
    ->description('Expiration demandes de signature anciennes');

// -------------------------------------------------------------------------
// MODULE AUTOMATISATIONS — Vague 9
// -------------------------------------------------------------------------

// Exécution des automatisations planifiées (trigger schedule)
Schedule::command('automations:run-scheduled')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('automations-scheduled')
    ->description('Exécution automatisations planifiées');

// Nettoyage logs d'automatisation anciens (> 90 jours)
Schedule::command('automations:clean-logs')
    ->weekly()
    ->at('03:00')
    ->name('automations-clean-logs')
    ->description('Nettoyage logs automatisations');

// -------------------------------------------------------------------------
// CRM SUPERADMIN — Vague 10
// -------------------------------------------------------------------------

// Tâches CRM quotidiennes (relances, follow-ups pipelines)
Schedule::command('crm:daily-tasks')
    ->dailyAt('07:00')
    ->withoutOverlapping()
    ->name('crm-daily-tasks')
    ->description('Tâches CRM SuperAdmin quotidiennes');

// Calcul métriques SaaS avancées (cohortes, LTV, NPS)
Schedule::command('crm:compute-metrics')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->name('crm-compute-metrics')
    ->description('Calcul métriques CRM & cohortes');

// -------------------------------------------------------------------------
// INTÉGRATIONS — Vague 9
// -------------------------------------------------------------------------

// Synchronisation générale toutes intégrations actives
Schedule::command('sync:integrations')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('sync-integrations')
    ->description('Synchronisation toutes intégrations actives');

// Retry des webhooks échoués
Schedule::command('webhooks:retry-failed')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('webhooks-retry')
    ->description('Réessai webhooks sortants échoués');

// -------------------------------------------------------------------------
// RGPD & CONFORMITÉ — Vague 8/10
// -------------------------------------------------------------------------

// Traitement demandes RGPD (export + suppression)
Schedule::command('gdpr:process')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('gdpr-process')
    ->description('Traitement demandes RGPD en file d\'attente');

// Anonymisation des données personnelles expirées (> durée légale)
Schedule::command('gdpr:anonymize-expired-data')
    ->daily()
    ->at('03:30')
    ->withoutOverlapping()
    ->name('gdpr-anonymize')
    ->description('Anonymisation RGPD données expirées');

// -------------------------------------------------------------------------
// MAINTENANCE SYSTÈME (transversal)
// -------------------------------------------------------------------------

// Nettoyage sessions expirées (Sanctum tokens)
Schedule::command('sanctum:prune-expired --hours=24')
    ->daily()
    ->at('04:00')
    ->name('sanctum-prune')
    ->description('Purge tokens Sanctum expirés');

// Nettoyage jobs échoués (queue:flush older than 7 days)
Schedule::command('queue:prune-failed --hours=168')
    ->daily()
    ->at('04:30')
    ->name('queue-prune-failed')
    ->description('Purge jobs de file échoués (> 7 jours)');

// Nettoyage fichiers temporaires storage
Schedule::command('storage:clean-temp')
    ->daily()
    ->at('05:00')
    ->name('storage-clean-temp')
    ->description('Nettoyage fichiers temporaires storage');

// Sauvegarde base de données
Schedule::command('backup:run --only-db')
    ->dailyAt('00:30')
    ->withoutOverlapping()
    ->name('backup-db')
    ->description('Sauvegarde quotidienne base de données');

// Sauvegarde complète (DB + fichiers)
Schedule::command('backup:run')
    ->weekly()
    ->sundays()
    ->at('00:00')
    ->withoutOverlapping()
    ->name('backup-full')
    ->description('Sauvegarde hebdomadaire complète');

// Nettoyage anciennes sauvegardes (> 30 jours)
Schedule::command('backup:clean')
    ->daily()
    ->at('05:30')
    ->name('backup-clean')
    ->description('Nettoyage sauvegardes expirées');

// Vider le cache applicatif (optimisation)
Schedule::command('cache:clean-expired')
    ->everyTwoHours()
    ->withoutOverlapping()
    ->runInBackground()
    ->name('cache-clean')
    ->description('Nettoyage entrées cache expirées');

// Actualisation des taux de change (FCFA, EUR, USD)
Schedule::command('currencies:update-rates')
    ->dailyAt('06:00')
    ->name('currencies-rates')
    ->description('Mise à jour taux de change');

// -------------------------------------------------------------------------
// NOTIFICATIONS & DIGESTS (transversal)
// -------------------------------------------------------------------------

// Digest quotidien par utilisateur (résumé activités)
Schedule::command('notifications:send-daily-digest')
    ->dailyAt('07:45')
    ->name('notifications-daily-digest')
    ->description('Digest quotidien personnalisé par utilisateur');

// Digest hebdomadaire (résumé semaine)
Schedule::command('notifications:send-weekly-digest')
    ->weekly()
    ->mondays()
    ->at('08:00')
    ->name('notifications-weekly-digest')
    ->description('Digest hebdomadaire par utilisateur');

// Nettoyage notifications lues > 60 jours
Schedule::command('notifications:clean-old')
    ->weekly()
    ->at('03:00')
    ->name('notifications-clean')
    ->description('Nettoyage notifications lues anciennes');
