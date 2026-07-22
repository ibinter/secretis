<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redis;

/**
 * SendMonitoringAlert — Job d'alerte de monitoring SECRETIS ERP
 *
 * Types supportés :
 *   - ErrorRateHigh       : taux d'erreur HTTP élevé
 *   - DiskSpaceLow        : espace disque insuffisant
 *   - QueueBacklog        : accumulation de jobs
 *   - SlowDatabase        : latence DB élevée
 *   - LicenseExpiringSoon : licence client arrivant à expiration
 *
 * Canaux : email admin technique + Slack configurable
 * Anti-spam : 1 alerte du même type max par heure (Redis lock)
 */
class SendMonitoringAlert implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 30;

    /**
     * Types valides.
     */
    public const TYPES = [
        'ErrorRateHigh',
        'DiskSpaceLow',
        'QueueBacklog',
        'SlowDatabase',
        'LicenseExpiringSoon',
    ];

    public function __construct(
        private readonly string $type,
        private readonly array  $context = [],
        private readonly string $severity = 'warning' // warning | critical
    ) {}

    public function handle(): void
    {
        if (! in_array($this->type, self::TYPES, true)) {
            Log::warning("SendMonitoringAlert : type inconnu '{$this->type}'");

            return;
        }

        // ── Anti-spam : 1 alerte du même type par heure ───────────────────────
        $lockKey = "monitoring:alert:lock:{$this->type}";

        if (Redis::exists($lockKey)) {
            Log::info("SendMonitoringAlert : alerte '{$this->type}' ignorée (anti-spam actif)");

            return;
        }

        // Pose le verrou 1 heure
        Redis::setex($lockKey, 3600, 1);

        $subject = $this->buildSubject();
        $body    = $this->buildBody();

        // ── Email ─────────────────────────────────────────────────────────────
        $adminEmail = config('monitoring.admin_email', config('mail.from.address'));

        try {
            Mail::raw($body, fn ($msg) => $msg->to($adminEmail)->subject($subject));
        } catch (\Throwable $e) {
            Log::error('SendMonitoringAlert : échec email', ['error' => $e->getMessage()]);
        }

        // ── Slack ─────────────────────────────────────────────────────────────
        $slackLevel = $this->severity === 'critical' ? 'critical' : 'error';
        Log::channel('slack')->{$slackLevel}($subject, $this->context);

        // ── Log local ─────────────────────────────────────────────────────────
        Log::channel('daily')->{$slackLevel}("MonitoringAlert: {$this->type}", $this->context);
    }

    // ─── Builders ────────────────────────────────────────────────────────────

    private function buildSubject(): string
    {
        $emoji = $this->severity === 'critical' ? '🔴' : '🟠';
        $labels = [
            'ErrorRateHigh'       => "Taux d'erreur HTTP élevé",
            'DiskSpaceLow'        => 'Espace disque critique',
            'QueueBacklog'        => 'Accumulation de jobs en queue',
            'SlowDatabase'        => 'Latence base de données élevée',
            'LicenseExpiringSoon' => 'Licence client bientôt expirée',
        ];

        $label = $labels[$this->type] ?? $this->type;

        return "[SECRETIS ALERTE] {$emoji} {$label}";
    }

    private function buildBody(): string
    {
        $lines = [
            '══════════════════════════════════════════',
            '  SECRETIS ERP — Alerte de Monitoring',
            '══════════════════════════════════════════',
            '',
            '  Type     : ' . $this->type,
            '  Sévérité : ' . strtoupper($this->severity),
            '  Heure    : ' . now()->toDateTimeString(),
            '  Env      : ' . config('app.env'),
            '',
            '  Détails :',
        ];

        foreach ($this->context as $key => $value) {
            $lines[] = '  • ' . $key . ' : ' . (is_array($value) ? json_encode($value) : $value);
        }

        $lines[] = '';
        $lines[] = $this->getActionAdvice();
        $lines[] = '';
        $lines[] = '══════════════════════════════════════════';

        return implode("\n", $lines);
    }

    private function getActionAdvice(): string
    {
        return match ($this->type) {
            'ErrorRateHigh'       => "  ➡ Vérifiez les logs : storage/logs/secretis.log\n  ➡ Consultez le dashboard SuperAdmin → Monitoring",
            'DiskSpaceLow'        => "  ➡ Nettoyez les anciens logs et backups\n  ➡ Commande : php artisan secretis:cleanup-logs",
            'QueueBacklog'        => "  ➡ Redémarrez le worker : php artisan queue:restart\n  ➡ Vérifiez les failed jobs : php artisan queue:failed",
            'SlowDatabase'        => "  ➡ Vérifiez les requêtes lentes dans slow_query_log\n  ➡ Lancez ANALYZE sur les tables concernées",
            'LicenseExpiringSoon' => "  ➡ Contactez le client pour le renouvellement\n  ➡ Dashboard SuperAdmin → Organisations",
            default               => "  ➡ Vérifiez les logs de l'application.",
        };
    }

    // ─── Factory methods ─────────────────────────────────────────────────────

    public static function errorRateHigh(float $rate, int $windowMinutes = 5): self
    {
        return new self('ErrorRateHigh', [
            'error_rate_pct'  => $rate,
            'window_minutes'  => $windowMinutes,
        ], 'critical');
    }

    public static function diskSpaceLow(float $freePct, float $freeGb): self
    {
        return new self('DiskSpaceLow', [
            'free_pct' => $freePct,
            'free_gb'  => $freeGb,
        ], $freePct < 5 ? 'critical' : 'warning');
    }

    public static function queueBacklog(int $pending, int $failed): self
    {
        return new self('QueueBacklog', [
            'pending_jobs' => $pending,
            'failed_jobs'  => $failed,
        ], $failed > 100 ? 'critical' : 'warning');
    }

    public static function slowDatabase(float $avgMs, string $route = 'N/A'): self
    {
        return new self('SlowDatabase', [
            'avg_query_ms' => $avgMs,
            'route'        => $route,
        ], 'warning');
    }

    public static function licenseExpiringSoon(int $orgId, string $orgName, string $expiresAt): self
    {
        return new self('LicenseExpiringSoon', [
            'org_id'     => $orgId,
            'org_name'   => $orgName,
            'expires_at' => $expiresAt,
        ], 'warning');
    }
}
