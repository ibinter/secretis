<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

/**
 * SecurityComplianceService — IBIG SECRETIS ERP
 *
 * Service de vérification de conformité ISO/IEC 27001:2022 automatisée.
 * Vérifie les contrôles de sécurité implémentables par inspection technique
 * et génère des rapports de conformité exploitables.
 *
 * Usage :
 *   $service = app(SecurityComplianceService::class);
 *   $results = $service->runComplianceCheck();
 *   $report  = $service->generateComplianceReport($organization);
 *
 * Commande artisan : php artisan secretis:compliance-check
 *
 * @see docs/iso27001/07-indicateurs-mesures.md (KPI-03, KPI-09, KPI-10, KPI-15)
 */
class SecurityComplianceService
{
    /**
     * Seuil en jours avant expiration d'un certificat TLS pour déclencher une alerte.
     */
    private const CERT_EXPIRY_ALERT_DAYS = 30;

    /**
     * Durée de vie maximale des secrets et clés API (en jours).
     */
    private const MAX_SECRET_AGE_DAYS = 90;

    /**
     * Durée d'inactivité d'un compte déclenchant une alerte (en jours).
     */
    private const MAX_ACCOUNT_INACTIVITY_DAYS = 90;

    /**
     * Âge maximum acceptable d'une sauvegarde (en heures).
     */
    private const MAX_BACKUP_AGE_HOURS = 24;

    /**
     * Niveaux de sévérité des non-conformités.
     */
    private const SEVERITY_CRITICAL = 'critical';
    private const SEVERITY_HIGH     = 'high';
    private const SEVERITY_MEDIUM   = 'medium';
    private const SEVERITY_LOW      = 'low';
    private const SEVERITY_INFO     = 'info';

    /**
     * Exécute l'ensemble des vérifications de conformité ISO 27001
     * sur le système actuel et retourne un rapport structuré.
     *
     * Contrôles ISO 27001 vérifiés :
     * - A.8.5  : Authentification multifacteur (MFA)
     * - A.8.15 : Immuabilité des journaux d'audit
     * - A.8.24 : Rotation des clés cryptographiques
     * - A.8.24 : Validité des certificats TLS
     * - A.8.13 : Fraîcheur des sauvegardes
     * - A.5.16 : Comptes inactifs
     *
     * @return array{
     *     timestamp: string,
     *     overall_status: string,
     *     compliance_score: float,
     *     passed: int,
     *     failed: int,
     *     warnings: int,
     *     checks: array<string, array{
     *         check_id: string,
     *         name: string,
     *         iso_control: string,
     *         status: string,
     *         severity: string,
     *         details: array,
     *         remediation: string|null
     *     }>
     * }
     */
    public function runComplianceCheck(): array
    {
        $startTime = microtime(true);

        Log::info('[SecurityComplianceService] Démarrage vérification conformité ISO 27001');

        $checks = [
            'mfa_coverage'         => $this->checkMfaCoverage(),
            'audit_log_integrity'  => $this->checkAuditLogIntegrity(),
            'secret_rotation'      => $this->checkSecretRotation(),
            'tls_certificates'     => $this->checkTlsCertificates(),
            'backup_freshness'     => $this->checkBackupFreshness(),
            'inactive_accounts'    => $this->checkInactiveAccounts(),
        ];

        $passed   = count(array_filter($checks, fn($c) => $c['status'] === 'pass'));
        $failed   = count(array_filter($checks, fn($c) => $c['status'] === 'fail'));
        $warnings = count(array_filter($checks, fn($c) => $c['status'] === 'warn'));
        $total    = count($checks);

        $complianceScore = $total > 0
            ? round((($passed + ($warnings * 0.5)) / $total) * 100, 2)
            : 0;

        $overallStatus = match(true) {
            $failed > 0 && $this->hasCriticalFailure($checks) => 'critical',
            $failed > 0 => 'non_compliant',
            $warnings > 0 => 'partial',
            default => 'compliant',
        };

        $report = [
            'timestamp'        => Carbon::now()->toIso8601String(),
            'duration_ms'      => round((microtime(true) - $startTime) * 1000, 2),
            'overall_status'   => $overallStatus,
            'compliance_score' => $complianceScore,
            'passed'           => $passed,
            'failed'           => $failed,
            'warnings'         => $warnings,
            'total_checks'     => $total,
            'checks'           => $checks,
        ];

        // Mettre en cache le dernier rapport (1 heure)
        Cache::put('iso27001.last_compliance_report', $report, now()->addHour());

        // Journaliser le résultat global
        Log::info('[SecurityComplianceService] Vérification terminée', [
            'status'           => $overallStatus,
            'compliance_score' => $complianceScore,
            'passed'           => $passed,
            'failed'           => $failed,
            'warnings'         => $warnings,
        ]);

        // Alerter si non-conformité critique détectée
        if ($overallStatus === 'critical') {
            Log::critical('[SecurityComplianceService] NON-CONFORMITÉ CRITIQUE DÉTECTÉE', [
                'failed_checks' => array_keys(array_filter($checks, fn($c) => $c['status'] === 'fail')),
            ]);
        }

        return $report;
    }

    /**
     * Vérifie que le MFA est activé pour tous les administrateurs.
     *
     * ISO 27001 : A.8.5 — Authentification sécurisée
     * KPI-03 : Couverture MFA
     *
     * @return array
     */
    private function checkMfaCoverage(): array
    {
        $checkId = 'MFA-001';
        $name    = 'Authentification Multifacteur (MFA) — Comptes Administrateurs';

        $adminUsers = User::where('is_admin', true)
            ->where('is_active', true)
            ->get(['id', 'email', 'mfa_enabled', 'mfa_type']);

        $totalAdmins  = $adminUsers->count();
        $mfaEnabled   = $adminUsers->where('mfa_enabled', true)->count();
        $mfaDisabled  = $adminUsers->where('mfa_enabled', false)->pluck('email')->toArray();
        $coverage     = $totalAdmins > 0 ? round(($mfaEnabled / $totalAdmins) * 100, 2) : 100;

        // Vérification pour les utilisateurs internes non-admins
        $internalUsers     = User::where('is_active', true)->where('is_client', false)->get();
        $totalInternal     = $internalUsers->count();
        $mfaEnabledInt     = $internalUsers->where('mfa_enabled', true)->count();
        $coverageInternal  = $totalInternal > 0 ? round(($mfaEnabledInt / $totalInternal) * 100, 2) : 100;

        $adminCompliant    = empty($mfaDisabled);
        $internalCompliant = $coverageInternal >= 95.0;

        if (!$adminCompliant) {
            $status   = 'fail';
            $severity = self::SEVERITY_CRITICAL;
        } elseif (!$internalCompliant) {
            $status   = 'warn';
            $severity = self::SEVERITY_HIGH;
        } else {
            $status   = 'pass';
            $severity = self::SEVERITY_INFO;
        }

        return [
            'check_id'    => $checkId,
            'name'        => $name,
            'iso_control' => 'A.8.5 — Authentification sécurisée',
            'status'      => $status,
            'severity'    => $severity,
            'details'     => [
                'admins_total'                => $totalAdmins,
                'admins_mfa_enabled'          => $mfaEnabled,
                'admins_mfa_disabled'         => $mfaDisabled,
                'admin_coverage_pct'          => $coverage,
                'admin_target_pct'            => 100,
                'internal_total'              => $totalInternal,
                'internal_mfa_enabled'        => $mfaEnabledInt,
                'internal_coverage_pct'       => $coverageInternal,
                'internal_target_pct'         => 95,
            ],
            'remediation' => $adminCompliant
                ? ($internalCompliant ? null : "Activer le MFA pour {$totalInternal} - {$mfaEnabledInt} utilisateurs internes. Délai : 5 jours avant suspension des comptes non-conformes.")
                : 'CRITIQUE : Activer immédiatement le MFA pour les comptes administrateurs suivants : ' . implode(', ', $mfaDisabled),
        ];
    }

    /**
     * Vérifie que les journaux d'audit ne peuvent pas être modifiés ou supprimés.
     *
     * ISO 27001 : A.8.15 — Journalisation
     * Vérifie : immuabilité (WORM/append-only), rétention minimale, absence de lacunes.
     *
     * @return array
     */
    private function checkAuditLogIntegrity(): array
    {
        $checkId = 'LOG-001';
        $name    = 'Intégrité et Immuabilité des Journaux d\'Audit';

        $issues   = [];
        $warnings = [];

        // 1. Vérifier que les logs récents existent (pas de lacune dans les dernières 24h)
        $latestLog = AuditLog::orderBy('created_at', 'desc')->first();
        $logGapHours = $latestLog
            ? Carbon::now()->diffInHours($latestLog->created_at)
            : PHP_INT_MAX;

        if ($logGapHours > 2) {
            $issues[] = "Lacune dans les journaux d'audit : dernier log il y a {$logGapHours}h (seuil : 2h)";
        }

        // 2. Vérifier la rétention (logs de plus de 12 mois doivent exister pour les orgs actives depuis > 12 mois)
        $oldestLog   = AuditLog::orderBy('created_at', 'asc')->first();
        $retentionOk = $oldestLog && Carbon::now()->diffInMonths($oldestLog->created_at) >= 12;

        if (!$retentionOk) {
            $warnings[] = 'Rétention des logs inférieure à 12 mois (exigence ISO 27001 A.8.15)';
        }

        // 3. Vérifier que les logs ne peuvent pas être modifiés (via la configuration de la DB)
        // Vérification de la présence d'un trigger d'immutabilité sur la table audit_logs
        $hasImmutableConfig = $this->verifyAuditLogImmutability();
        if (!$hasImmutableConfig) {
            $issues[] = 'Les journaux d\'audit ne sont pas configurés en mode immuable (WORM/append-only)';
        }

        // 4. Vérifier l'intégrité par hash (si le système de hash est actif)
        $integrityViolations = $this->checkLogHashIntegrity();
        if ($integrityViolations > 0) {
            $issues[] = "{$integrityViolations} violation(s) d'intégrité détectée(s) dans les journaux d'audit";
        }

        if (!empty($issues)) {
            $status   = 'fail';
            $severity = self::SEVERITY_CRITICAL;
        } elseif (!empty($warnings)) {
            $status   = 'warn';
            $severity = self::SEVERITY_HIGH;
        } else {
            $status   = 'pass';
            $severity = self::SEVERITY_INFO;
        }

        return [
            'check_id'    => $checkId,
            'name'        => $name,
            'iso_control' => 'A.8.15 — Journalisation',
            'status'      => $status,
            'severity'    => $severity,
            'details'     => [
                'latest_log_age_hours'     => $logGapHours,
                'retention_12months_ok'    => $retentionOk,
                'immutable_config_ok'      => $hasImmutableConfig,
                'integrity_violations'     => $integrityViolations,
                'issues'                   => $issues,
                'warnings'                 => $warnings,
            ],
            'remediation' => !empty($issues)
                ? 'Corriger immédiatement : ' . implode(' | ', $issues)
                : (!empty($warnings) ? implode(' | ', $warnings) : null),
        ];
    }

    /**
     * Vérifie que les clés API et secrets ont été renouvelés dans les 90 derniers jours.
     *
     * ISO 27001 : A.8.24 — Utilisation de la cryptographie
     * KPI-09 : Rotation des clés cryptographiques
     *
     * @return array
     */
    private function checkSecretRotation(): array
    {
        $checkId  = 'CRYPTO-001';
        $name     = 'Rotation des Clés API et Secrets';
        $maxAge   = self::MAX_SECRET_AGE_DAYS;
        $alertAt  = $maxAge - 10; // Alerte 10 jours avant l'échéance

        // Récupérer les secrets depuis HashiCorp Vault ou la table dédiée
        $secrets = $this->getSecretsInventory();

        $expired  = [];
        $expiring = [];
        $compliant = 0;

        foreach ($secrets as $secret) {
            $ageDays = Carbon::parse($secret['last_rotated_at'])->diffInDays(Carbon::now());

            if ($ageDays >= $maxAge) {
                $expired[] = [
                    'name'              => $secret['name'],
                    'age_days'          => $ageDays,
                    'last_rotated_at'   => $secret['last_rotated_at'],
                    'owner'             => $secret['owner'] ?? 'N/A',
                ];
            } elseif ($ageDays >= $alertAt) {
                $expiring[] = [
                    'name'              => $secret['name'],
                    'age_days'          => $ageDays,
                    'days_until_expiry' => $maxAge - $ageDays,
                    'owner'             => $secret['owner'] ?? 'N/A',
                ];
            } else {
                $compliant++;
            }
        }

        $total          = count($secrets);
        $compliancePct  = $total > 0 ? round(($compliant / $total) * 100, 2) : 100;

        if (!empty($expired)) {
            $status   = 'fail';
            $severity = self::SEVERITY_CRITICAL;
        } elseif (!empty($expiring)) {
            $status   = 'warn';
            $severity = self::SEVERITY_HIGH;
        } else {
            $status   = 'pass';
            $severity = self::SEVERITY_INFO;
        }

        return [
            'check_id'    => $checkId,
            'name'        => $name,
            'iso_control' => 'A.8.24 — Utilisation de la cryptographie',
            'status'      => $status,
            'severity'    => $severity,
            'details'     => [
                'total_secrets'            => $total,
                'compliant_secrets'        => $compliant,
                'compliance_pct'           => $compliancePct,
                'expired_secrets_count'    => count($expired),
                'expired_secrets'          => $expired,
                'expiring_soon_count'      => count($expiring),
                'expiring_soon'            => $expiring,
                'max_age_days'             => $maxAge,
                'alert_at_days'            => $alertAt,
            ],
            'remediation' => !empty($expired)
                ? 'URGENT : Faire pivoter immédiatement ' . count($expired) . ' secret(s) expirés. Utiliser `php artisan secretis:rotate-secrets --force`'
                : (!empty($expiring) ? count($expiring) . ' secret(s) expirant dans moins de 10 jours — planifier la rotation.' : null),
        ];
    }

    /**
     * Vérifie la validité des certificats TLS (expiration > 30 jours).
     *
     * ISO 27001 : A.8.24 — Utilisation de la cryptographie
     * KPI-10 : Validité des certificats TLS
     *
     * @return array
     */
    private function checkTlsCertificates(): array
    {
        $checkId    = 'TLS-001';
        $name       = 'Validité des Certificats TLS';
        $alertDays  = self::CERT_EXPIRY_ALERT_DAYS;
        $urgentDays = 7;

        $domains = $this->getMonitoredDomains();

        $expired  = [];
        $critical = []; // < 7 jours
        $warning  = []; // 7-30 jours
        $valid    = [];

        foreach ($domains as $domain) {
            $certInfo = $this->checkCertificateExpiry($domain);

            if ($certInfo['error']) {
                $expired[] = array_merge($certInfo, ['domain' => $domain]);
                continue;
            }

            $daysRemaining = $certInfo['days_remaining'];

            if ($daysRemaining <= 0) {
                $expired[] = array_merge($certInfo, ['domain' => $domain]);
            } elseif ($daysRemaining <= $urgentDays) {
                $critical[] = array_merge($certInfo, ['domain' => $domain]);
            } elseif ($daysRemaining <= $alertDays) {
                $warning[] = array_merge($certInfo, ['domain' => $domain]);
            } else {
                $valid[] = array_merge($certInfo, ['domain' => $domain]);
            }
        }

        if (!empty($expired) || !empty($critical)) {
            $status   = 'fail';
            $severity = self::SEVERITY_CRITICAL;
        } elseif (!empty($warning)) {
            $status   = 'warn';
            $severity = self::SEVERITY_HIGH;
        } else {
            $status   = 'pass';
            $severity = self::SEVERITY_INFO;
        }

        $allIssues = array_merge($expired, $critical);

        return [
            'check_id'    => $checkId,
            'name'        => $name,
            'iso_control' => 'A.8.24 — Utilisation de la cryptographie',
            'status'      => $status,
            'severity'    => $severity,
            'details'     => [
                'total_domains_checked'  => count($domains),
                'expired_or_invalid'     => $expired,
                'critical_lt_7days'      => $critical,
                'warning_lt_30days'      => $warning,
                'valid_certificates'     => count($valid),
            ],
            'remediation' => !empty($allIssues)
                ? 'CRITIQUE : Renouveler immédiatement les certificats pour : ' . implode(', ', array_column($allIssues, 'domain'))
                : (!empty($warning) ? 'Planifier le renouvellement pour : ' . implode(', ', array_column($warning, 'domain')) : null),
        ];
    }

    /**
     * Vérifie que des sauvegardes récentes existent (moins de 24 heures).
     *
     * ISO 27001 : A.8.13 — Sauvegarde des informations
     * KPI-07 : Couverture et fraîcheur des sauvegardes
     *
     * @return array
     */
    private function checkBackupFreshness(): array
    {
        $checkId = 'BCK-001';
        $name    = 'Fraîcheur des Sauvegardes';
        $maxAge  = self::MAX_BACKUP_AGE_HOURS;

        $backupSystems = $this->getBackupStatus();

        $stale   = [];
        $missing = [];
        $healthy = [];

        foreach ($backupSystems as $system) {
            if (empty($system['last_backup_at'])) {
                $missing[] = $system;
                continue;
            }

            $ageHours = Carbon::parse($system['last_backup_at'])->diffInHours(Carbon::now());

            if ($ageHours > $maxAge) {
                $stale[] = array_merge($system, ['age_hours' => $ageHours]);
            } else {
                $healthy[] = array_merge($system, ['age_hours' => $ageHours]);
            }
        }

        if (!empty($missing) || !empty($stale)) {
            $status   = 'fail';
            $severity = !empty($missing) ? self::SEVERITY_CRITICAL : self::SEVERITY_HIGH;
        } else {
            $status   = 'pass';
            $severity = self::SEVERITY_INFO;
        }

        return [
            'check_id'    => $checkId,
            'name'        => $name,
            'iso_control' => 'A.8.13 — Sauvegarde des informations',
            'status'      => $status,
            'severity'    => $severity,
            'details'     => [
                'total_systems'         => count($backupSystems),
                'healthy_backups'       => count($healthy),
                'stale_backups'         => $stale,
                'missing_backups'       => $missing,
                'max_age_hours'         => $maxAge,
            ],
            'remediation' => !empty($missing)
                ? 'CRITIQUE : Aucune sauvegarde trouvée pour : ' . implode(', ', array_column($missing, 'name')) . '. Vérifier les jobs de sauvegarde immédiatement.'
                : (!empty($stale) ? 'Sauvegardes périmées pour : ' . implode(', ', array_column($stale, 'name')) . '. Déclencher une sauvegarde manuelle.' : null),
        ];
    }

    /**
     * Vérifie les comptes utilisateurs inactifs depuis plus de 90 jours.
     *
     * ISO 27001 : A.5.16, A.5.18 — Gestion des identités et droits d'accès
     * KPI-08 : Comptes inactifs
     *
     * @return array
     */
    private function checkInactiveAccounts(): array
    {
        $checkId    = 'IAM-001';
        $name       = 'Détection des Comptes Inactifs';
        $thresholdDays = self::MAX_ACCOUNT_INACTIVITY_DAYS;
        $warningDays   = 60; // Alerte préventive à 60 jours

        $cutoffDate        = Carbon::now()->subDays($thresholdDays);
        $warningCutoffDate = Carbon::now()->subDays($warningDays);

        // Comptes actifs sans connexion depuis plus de 90 jours
        $inactiveAccounts = User::where('is_active', true)
            ->where(function ($query) use ($cutoffDate) {
                $query->whereNull('last_login_at')
                    ->orWhere('last_login_at', '<', $cutoffDate);
            })
            ->select(['id', 'email', 'name', 'last_login_at', 'is_admin', 'created_at'])
            ->orderBy('last_login_at', 'asc')
            ->get();

        // Comptes actifs sans connexion depuis plus de 60 jours (alerte préventive)
        $warningAccounts = User::where('is_active', true)
            ->whereBetween('last_login_at', [$warningCutoffDate, $cutoffDate])
            ->select(['id', 'email', 'name', 'last_login_at', 'is_admin'])
            ->get();

        $inactiveAdmins = $inactiveAccounts->where('is_admin', true);
        $inactiveUsers  = $inactiveAccounts->where('is_admin', false);

        if ($inactiveAccounts->count() > 0) {
            $status   = $inactiveAdmins->count() > 0 ? 'fail' : 'warn';
            $severity = $inactiveAdmins->count() > 0 ? self::SEVERITY_CRITICAL : self::SEVERITY_HIGH;
        } else {
            $status   = 'pass';
            $severity = self::SEVERITY_INFO;
        }

        return [
            'check_id'    => $checkId,
            'name'        => $name,
            'iso_control' => 'A.5.16 — Gestion des identités / A.5.18 — Droits d\'accès',
            'status'      => $status,
            'severity'    => $severity,
            'details'     => [
                'threshold_days'          => $thresholdDays,
                'inactive_total'          => $inactiveAccounts->count(),
                'inactive_admins_count'   => $inactiveAdmins->count(),
                'inactive_admins'         => $inactiveAdmins->map(fn($u) => [
                    'email'         => $u->email,
                    'name'          => $u->name,
                    'last_login_at' => $u->last_login_at?->toIso8601String(),
                    'days_inactive' => $u->last_login_at ? Carbon::now()->diffInDays($u->last_login_at) : 'Jamais connecté',
                ])->values()->toArray(),
                'inactive_users_count'    => $inactiveUsers->count(),
                'warning_accounts_count'  => $warningAccounts->count(),
                'warning_accounts'        => $warningAccounts->map(fn($u) => [
                    'email'         => $u->email,
                    'days_inactive' => Carbon::now()->diffInDays($u->last_login_at),
                ])->values()->toArray(),
            ],
            'remediation' => $inactiveAccounts->count() > 0
                ? ($inactiveAdmins->count() > 0
                    ? 'CRITIQUE : Désactiver immédiatement ' . $inactiveAdmins->count() . ' compte(s) admin inactif(s). Contacter le RSSI.'
                    : 'Désactiver ' . $inactiveUsers->count() . ' compte(s) utilisateur inactif(s). Exécuter : php artisan secretis:disable-inactive-accounts')
                : null,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RAPPORT DE CONFORMITÉ PAR ORGANISATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Génère un rapport de conformité ISO 27001 pour une organisation donnée.
     * Combine les résultats de la vérification globale avec des métriques
     * spécifiques à l'organisation.
     *
     * @param Organization $org
     * @return array{
     *     organization: array,
     *     generated_at: string,
     *     iso_compliance: array,
     *     security_metrics: array,
     *     recommendations: array,
     *     certifiability_score: float
     * }
     */
    public function generateComplianceReport(Organization $org): array
    {
        Log::info("[SecurityComplianceService] Génération rapport conformité pour org #{$org->id}");

        // Rapport global de conformité technique
        $globalCompliance = $this->runComplianceCheck();

        // Métriques spécifiques à l'organisation
        $securityMetrics = $this->computeOrganizationSecurityMetrics($org);

        // Recommandations prioritaires
        $recommendations = $this->buildRecommendations($globalCompliance, $securityMetrics);

        // Score de certifiabilité (0-100)
        $certifiabilityScore = $this->computeCertifiabilityScore($globalCompliance, $securityMetrics);

        return [
            'organization' => [
                'id'       => $org->id,
                'name'     => $org->name,
                'plan'     => $org->plan ?? 'standard',
                'since'    => $org->created_at->toDateString(),
            ],
            'generated_at'        => Carbon::now()->toIso8601String(),
            'report_period'       => [
                'from' => Carbon::now()->subMonths(3)->toDateString(),
                'to'   => Carbon::now()->toDateString(),
            ],
            'iso_compliance'      => [
                'standard'          => 'ISO/IEC 27001:2022',
                'overall_status'    => $globalCompliance['overall_status'],
                'compliance_score'  => $globalCompliance['compliance_score'],
                'checks_summary'    => [
                    'passed'   => $globalCompliance['passed'],
                    'failed'   => $globalCompliance['failed'],
                    'warnings' => $globalCompliance['warnings'],
                    'total'    => $globalCompliance['total_checks'],
                ],
                'check_details'     => $globalCompliance['checks'],
            ],
            'security_metrics'        => $securityMetrics,
            'recommendations'         => $recommendations,
            'certifiability_score'    => $certifiabilityScore,
            'certifiability_status'   => $this->getCertifiabilityStatus($certifiabilityScore),
            'next_audit_recommended'  => Carbon::now()->addMonths(6)->toDateString(),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MÉTHODES PRIVÉES — LOGIQUE MÉTIER
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calcule les métriques de sécurité spécifiques à une organisation.
     */
    private function computeOrganizationSecurityMetrics(Organization $org): array
    {
        $orgUsers = User::where('organization_id', $org->id)->where('is_active', true)->get();
        $totalUsers = $orgUsers->count();

        $mfaUsers    = $orgUsers->where('mfa_enabled', true)->count();
        $mfaCoverage = $totalUsers > 0 ? round(($mfaUsers / $totalUsers) * 100, 2) : 100;

        // Incidents de sécurité des 90 derniers jours
        $incidentCount = DB::table('security_incidents')
            ->where('organization_id', $org->id)
            ->where('created_at', '>=', Carbon::now()->subDays(90))
            ->count();

        // Dernière connexion admin de l'organisation
        $lastAdminLogin = User::where('organization_id', $org->id)
            ->where('is_admin', true)
            ->orderBy('last_login_at', 'desc')
            ->value('last_login_at');

        // Logs d'audit des 24 dernières heures pour cette organisation
        $recentAuditLogs = AuditLog::where('organization_id', $org->id)
            ->where('created_at', '>=', Carbon::now()->subDay())
            ->count();

        return [
            'users_total'            => $totalUsers,
            'mfa_coverage_pct'       => $mfaCoverage,
            'mfa_target_pct'         => 70,
            'mfa_compliant'          => $mfaCoverage >= 70,
            'security_incidents_90d' => $incidentCount,
            'last_admin_login'       => $lastAdminLogin?->toIso8601String(),
            'audit_logs_last_24h'    => $recentAuditLogs,
            'audit_logs_active'      => $recentAuditLogs > 0,
        ];
    }

    /**
     * Construit une liste priorisée de recommandations à partir des résultats.
     */
    private function buildRecommendations(array $globalCompliance, array $securityMetrics): array
    {
        $recommendations = [];
        $priority = 1;

        foreach ($globalCompliance['checks'] as $checkId => $check) {
            if ($check['status'] !== 'pass' && $check['remediation']) {
                $recommendations[] = [
                    'priority'    => $priority++,
                    'check_id'    => $check['check_id'],
                    'iso_control' => $check['iso_control'],
                    'severity'    => $check['severity'],
                    'action'      => $check['remediation'],
                    'deadline'    => $this->getDeadlineForSeverity($check['severity']),
                ];
            }
        }

        if (!$securityMetrics['mfa_compliant']) {
            $recommendations[] = [
                'priority'    => $priority++,
                'check_id'    => 'MFA-ORG-001',
                'iso_control' => 'A.8.5',
                'severity'    => self::SEVERITY_HIGH,
                'action'      => "Augmenter le taux d'adoption du MFA de {$securityMetrics['mfa_coverage_pct']}% à 70% minimum.",
                'deadline'    => Carbon::now()->addDays(30)->toDateString(),
            ];
        }

        // Trier par sévérité puis priorité
        usort($recommendations, function ($a, $b) {
            $severityOrder = [self::SEVERITY_CRITICAL => 0, self::SEVERITY_HIGH => 1, self::SEVERITY_MEDIUM => 2, self::SEVERITY_LOW => 3];
            $diff = ($severityOrder[$a['severity']] ?? 4) - ($severityOrder[$b['severity']] ?? 4);
            return $diff !== 0 ? $diff : $a['priority'] - $b['priority'];
        });

        return $recommendations;
    }

    /**
     * Calcule le score de certifiabilité ISO 27001 (0-100).
     */
    private function computeCertifiabilityScore(array $globalCompliance, array $securityMetrics): float
    {
        $baseScore = $globalCompliance['compliance_score'];

        // Bonus pour MFA élevé
        if ($securityMetrics['mfa_coverage_pct'] >= 95) {
            $baseScore = min(100, $baseScore + 5);
        }

        // Malus pour incidents récents
        if ($securityMetrics['security_incidents_90d'] > 5) {
            $baseScore = max(0, $baseScore - 10);
        }

        // Malus pour absence de logs
        if (!$securityMetrics['audit_logs_active']) {
            $baseScore = max(0, $baseScore - 15);
        }

        return round($baseScore, 2);
    }

    /**
     * Détermine le statut de certifiabilité en fonction du score.
     */
    private function getCertifiabilityStatus(float $score): string
    {
        return match(true) {
            $score >= 95 => 'Prêt pour certification',
            $score >= 80 => 'Corrections mineures requises',
            $score >= 60 => 'Corrections importantes requises',
            default      => 'Certification non recommandée — Plan d\'action requis',
        };
    }

    /**
     * Vérifie si un ou plusieurs contrôles critiques ont échoué.
     */
    private function hasCriticalFailure(array $checks): bool
    {
        foreach ($checks as $check) {
            if ($check['status'] === 'fail' && $check['severity'] === self::SEVERITY_CRITICAL) {
                return true;
            }
        }
        return false;
    }

    /**
     * Calcule la date limite d'action selon la sévérité.
     */
    private function getDeadlineForSeverity(string $severity): string
    {
        return match($severity) {
            self::SEVERITY_CRITICAL => Carbon::now()->addHours(24)->toDateString(),
            self::SEVERITY_HIGH     => Carbon::now()->addDays(7)->toDateString(),
            self::SEVERITY_MEDIUM   => Carbon::now()->addDays(30)->toDateString(),
            default                 => Carbon::now()->addDays(90)->toDateString(),
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MÉTHODES UTILITAIRES — DONNÉES ET VÉRIFICATIONS EXTERNES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Récupère l'inventaire des secrets depuis la table de configuration sécurisée.
     * En production, cette méthode se connecte à HashiCorp Vault via son API.
     *
     * @return array<array{name: string, last_rotated_at: string, owner: string}>
     */
    private function getSecretsInventory(): array
    {
        return DB::table('secret_inventory')
            ->where('is_active', true)
            ->select(['name', 'last_rotated_at', 'owner', 'type'])
            ->get()
            ->map(fn($row) => (array) $row)
            ->toArray();
    }

    /**
     * Retourne la liste des domaines dont les certificats TLS sont à surveiller.
     *
     * @return string[]
     */
    private function getMonitoredDomains(): array
    {
        return array_filter(
            explode(',', config('security.monitored_domains', 'app.secretis.app,api.secretis.app')),
            fn($d) => !empty(trim($d))
        );
    }

    /**
     * Vérifie la date d'expiration du certificat TLS d'un domaine.
     *
     * @param string $domain
     * @return array{days_remaining: int, expiry_date: string|null, error: bool, error_message: string|null}
     */
    private function checkCertificateExpiry(string $domain): array
    {
        try {
            $context = stream_context_create([
                'ssl' => [
                    'capture_peer_cert' => true,
                    'verify_peer'       => true,
                    'verify_peer_name'  => true,
                ],
            ]);

            $socket = @stream_socket_client(
                "ssl://{$domain}:443",
                $errno,
                $errstr,
                10,
                STREAM_CLIENT_CONNECT,
                $context
            );

            if (!$socket) {
                return [
                    'days_remaining' => 0,
                    'expiry_date'    => null,
                    'error'          => true,
                    'error_message'  => "Connexion impossible à {$domain}: {$errstr}",
                ];
            }

            $params = stream_context_get_params($socket);
            $cert   = openssl_x509_parse($params['options']['ssl']['peer_certificate']);
            fclose($socket);

            if (!$cert || !isset($cert['validTo_time_t'])) {
                return ['days_remaining' => 0, 'expiry_date' => null, 'error' => true, 'error_message' => 'Impossible de parser le certificat'];
            }

            $expiryDate    = Carbon::createFromTimestamp($cert['validTo_time_t']);
            $daysRemaining = (int) Carbon::now()->diffInDays($expiryDate, false);

            return [
                'days_remaining' => max(0, $daysRemaining),
                'expiry_date'    => $expiryDate->toDateString(),
                'subject'        => $cert['subject']['CN'] ?? $domain,
                'issuer'         => $cert['issuer']['O'] ?? 'Unknown',
                'error'          => false,
                'error_message'  => null,
            ];
        } catch (\Throwable $e) {
            Log::warning("[SecurityComplianceService] Erreur vérification certificat {$domain}: {$e->getMessage()}");

            return [
                'days_remaining' => 0,
                'expiry_date'    => null,
                'error'          => true,
                'error_message'  => $e->getMessage(),
            ];
        }
    }

    /**
     * Récupère le statut des sauvegardes pour tous les systèmes critiques.
     *
     * @return array<array{name: string, last_backup_at: string|null, size_mb: float|null, status: string}>
     */
    private function getBackupStatus(): array
    {
        return DB::table('backup_status')
            ->where('is_monitored', true)
            ->orderBy('system_name')
            ->get(['system_name as name', 'last_backup_at', 'last_backup_size_mb as size_mb', 'last_status as status'])
            ->map(fn($row) => (array) $row)
            ->toArray();
    }

    /**
     * Vérifie la configuration d'immuabilité des journaux d'audit.
     * En production, vérifie la présence d'un trigger de protection ou la config S3 Object Lock.
     */
    private function verifyAuditLogImmutability(): bool
    {
        // Vérifier la présence d'un trigger de protection sur la table audit_logs
        $triggers = DB::select("
            SELECT TRIGGER_NAME
            FROM information_schema.TRIGGERS
            WHERE EVENT_OBJECT_TABLE = 'audit_logs'
            AND EVENT_MANIPULATION IN ('UPDATE', 'DELETE')
            AND TRIGGER_SCHEMA = DATABASE()
        ");

        return !empty($triggers);
    }

    /**
     * Vérifie l'intégrité des journaux d'audit par comparaison des hachages SHA-256.
     * Retourne le nombre de violations détectées.
     */
    private function checkLogHashIntegrity(): int
    {
        // Vérifier les N derniers logs contre leurs hashes stockés
        $logs = DB::table('audit_logs')
            ->whereNotNull('hash')
            ->orderBy('id', 'desc')
            ->limit(1000)
            ->select(['id', 'hash', 'data_snapshot'])
            ->get();

        $violations = 0;

        foreach ($logs as $log) {
            if (!isset($log->data_snapshot, $log->hash)) {
                continue;
            }

            $expectedHash = hash('sha256', $log->data_snapshot);

            if ($expectedHash !== $log->hash) {
                $violations++;
                Log::warning("[SecurityComplianceService] Violation d'intégrité audit log #{$log->id}");
            }
        }

        return $violations;
    }
}
