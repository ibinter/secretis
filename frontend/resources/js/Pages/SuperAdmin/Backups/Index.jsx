import React, { useEffect, useRef, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────────────────────

const fmt = {
  date: (d) => d ? new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—',
  bytes: (n) => {
    if (!n) return '—';
    const gb = n / 1e9;
    if (gb >= 1) return gb.toFixed(2) + ' GB';
    const mb = n / 1e6;
    if (mb >= 1) return mb.toFixed(1) + ' MB';
    return (n / 1e3).toFixed(0) + ' KB';
  },
  duration: (s) => {
    if (!s) return '—';
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  },
};

function Badge({ status }) {
  const map = {
    success : 'bg-green-100 text-green-800',
    failed  : 'bg-red-100   text-red-800',
    running : 'bg-purple-100  text-purple-800',
    pending : 'bg-gray-100  text-gray-700',
  };
  const labels = { success: 'Succès', failed: 'Échec', running: 'En cours', pending: 'En attente' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
      {icon && <span className="text-2xl">{icon}</span>}
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Statut de la dernière sauvegarde
// ─────────────────────────────────────────────────────────────────────────────

function LastBackupStatus({ backup, onTrigger, triggering }) {
  if (!backup) {
    return (
      <Card>
        <CardHeader title="Dernière sauvegarde" icon="💾" />
        <div className="px-6 py-8 text-center text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p className="font-medium">Aucune sauvegarde disponible</p>
          <p className="text-sm mt-1">Déclenchez votre première sauvegarde manuelle.</p>
        </div>
        <div className="px-6 pb-5">
          <TriggerButton onTrigger={onTrigger} loading={triggering} />
        </div>
      </Card>
    );
  }

  const isOk    = backup.status === 'success';
  const hoursAgo = backup.completed_at
    ? Math.round((Date.now() - new Date(backup.completed_at)) / 3_600_000)
    : null;

  return (
    <Card>
      <CardHeader
        title="Dernière sauvegarde"
        subtitle={backup.completed_at ? `Terminée le ${fmt.date(backup.completed_at)}` : undefined}
        icon="💾"
      />
      <div className="px-6 py-5 space-y-4">
        {/* Statut global */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isOk ? '✅' : '❌'}</span>
          <div>
            <p className="font-semibold text-gray-900">
              {isOk ? 'Sauvegarde réussie' : 'Dernière sauvegarde échouée'}
            </p>
            {hoursAgo !== null && (
              <p className="text-sm text-gray-500">
                Il y a {hoursAgo < 1 ? 'moins d\'1 heure' : `${hoursAgo} heure${hoursAgo > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <div className="ml-auto">
            <Badge status={backup.status} />
          </div>
        </div>

        {/* Détails en grille */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Type',          value: backup.type === 'auto' ? 'Automatique' : 'Manuelle' },
            { label: 'Base de données', value: fmt.bytes(backup.db_size) },
            { label: 'Fichiers',      value: fmt.bytes(backup.files_size) },
            { label: 'Durée',         value: fmt.duration(backup.duration_seconds) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500 mb-1">{label}</dt>
              <dd className="text-sm font-semibold text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Destinations */}
        {backup.destinations && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-gray-400">Destination :</span>
            {backup.destinations.includes('local') && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium">💽 Local</span>
            )}
            {backup.destinations.includes('s3') && (
              <span className="rounded-full bg-orange-100 text-orange-800 px-2.5 py-0.5 text-xs font-medium">☁️ Amazon S3</span>
            )}
          </div>
        )}
      </div>
      <div className="px-6 pb-5">
        <TriggerButton onTrigger={onTrigger} loading={triggering} />
      </div>
    </Card>
  );
}

function TriggerButton({ onTrigger, loading }) {
  return (
    <button
      type="button"
      onClick={onTrigger}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <>
          <SpinnerIcon className="w-4 h-4 animate-spin" />
          Déclenchement en cours…
        </>
      ) : (
        <>
          ▶ Déclencher une sauvegarde manuelle
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Planning
// ─────────────────────────────────────────────────────────────────────────────

function BackupSchedule({ schedule }) {
  return (
    <Card>
      <CardHeader title="Planning des sauvegardes" icon="📅" />
      <div className="px-6 py-5 space-y-3">
        {/* Sauvegarde quotidienne */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Sauvegarde quotidienne</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {schedule?.daily_time ?? '02:00'} WAT — tous les jours
            </p>
          </div>
          <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${schedule?.daily_enabled !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
            {schedule?.daily_enabled !== false ? '✅ Active' : '⏸ Inactive'}
          </span>
        </div>

        {/* Rétention */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Rétention</p>
            <p className="text-xs text-gray-500 mt-0.5">Les sauvegardes plus anciennes sont supprimées automatiquement</p>
          </div>
          <span className="text-sm font-bold text-purple-700">{schedule?.retention_days ?? 30} jours</span>
        </div>

        {/* Destinations */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Destination</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium">💽 Locale</span>
            {schedule?.s3_enabled && (
              <span className="rounded-full bg-orange-100 text-orange-800 px-2.5 py-0.5 text-xs font-medium">☁️ S3</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Liste des sauvegardes
// ─────────────────────────────────────────────────────────────────────────────

function BackupList({ backups, onDownload, onRestore, onDelete, restoringId, deletingId }) {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const total   = backups.length;
  const pages   = Math.ceil(total / perPage);
  const slice   = backups.slice((page - 1) * perPage, page * perPage);

  return (
    <Card>
      <CardHeader
        title={`Sauvegardes disponibles (${total})`}
        icon="🗂️"
        subtitle="Cliquez sur une ligne pour sélectionner, puis utilisez les actions"
      />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Date / Heure</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">BDD</th>
              <th className="px-4 py-3">Fichiers</th>
              <th className="px-4 py-3">Durée</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {slice.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  Aucune sauvegarde disponible
                </td>
              </tr>
            ) : slice.map((b) => (
              <tr key={b.filename} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{fmt.date(b.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.type === 'auto' ? 'bg-purple-50 text-purple-700' : 'bg-purple-50 text-purple-700'}`}>
                    {b.type === 'auto' ? 'Auto' : 'Manuel'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{fmt.bytes(b.db_size)}</td>
                <td className="px-4 py-3 text-gray-700">{fmt.bytes(b.files_size)}</td>
                <td className="px-4 py-3 text-gray-500">{fmt.duration(b.duration_seconds)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {b.destinations?.includes('local') && <span title="Local" className="text-base">💽</span>}
                    {b.destinations?.includes('s3')    && <span title="S3"    className="text-base">☁️</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><Badge status={b.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Télécharger */}
                    <button
                      type="button"
                      title="Télécharger (ZIP)"
                      onClick={() => onDownload(b.filename)}
                      className="rounded p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      ⬇️
                    </button>
                    {/* Restaurer */}
                    <button
                      type="button"
                      title="Restaurer cette sauvegarde"
                      onClick={() => onRestore(b)}
                      disabled={restoringId === b.filename}
                      className="rounded p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                    >
                      🔄
                    </button>
                    {/* Supprimer */}
                    <button
                      type="button"
                      title="Supprimer"
                      onClick={() => onDelete(b.filename)}
                      disabled={deletingId === b.filename}
                      className="rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
          <p className="text-xs text-gray-500">
            {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} sur {total} sauvegardes
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              ← Précédent
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Restauration
// ─────────────────────────────────────────────────────────────────────────────

function RestoreSection({ selectedBackup, onConfirmRestore, restoring }) {
  const [confirmation, setConfirmation] = useState('');
  const REQUIRED = 'RESTAURER';
  const isReady  = confirmation === REQUIRED && selectedBackup !== null;

  return (
    <Card className="border-red-200">
      <CardHeader title="Restauration" icon="⚠️"
        subtitle="Zone dangereuse — lire attentivement avant de continuer" />
      <div className="px-6 py-5 space-y-5">
        {/* Avertissements */}
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 space-y-1.5">
          <p className="text-sm font-semibold text-red-800">⚠️ Attention — opération irréversible</p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1 mt-2">
            <li>La restauration écrasera <strong>TOUTES les données actuelles</strong>.</li>
            <li>Cette opération est <strong>irréversible</strong>.</li>
            <li>SECRETIS ERP sera en <strong>mode maintenance</strong> pendant la restauration.</li>
            <li>Tous les utilisateurs seront déconnectés.</li>
          </ul>
        </div>

        {/* Sauvegarde sélectionnée */}
        {selectedBackup ? (
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Sauvegarde sélectionnée</p>
            <p className="text-sm font-semibold text-gray-900 font-mono">{selectedBackup.filename}</p>
            <p className="text-xs text-gray-500 mt-0.5">{fmt.date(selectedBackup.created_at)}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-center text-sm text-gray-400">
            Cliquez sur 🔄 dans la liste ci-dessus pour sélectionner une sauvegarde à restaurer.
          </div>
        )}

        {/* Champ de confirmation */}
        <div>
          <label htmlFor="restore-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
            Tapez <code className="bg-gray-100 rounded px-1 font-bold text-red-700">{REQUIRED}</code> pour confirmer
          </label>
          <input
            id="restore-confirm"
            type="text"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value.toUpperCase())}
            placeholder="RESTAURER"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition"
          />
        </div>

        {/* Bouton de lancement */}
        <button
          type="button"
          onClick={() => onConfirmRestore(selectedBackup)}
          disabled={!isReady || restoring}
          className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {restoring ? (
            <>
              <SpinnerIcon className="w-4 h-4 animate-spin" />
              Restauration en cours…
            </>
          ) : '🔄 Lancer la restauration'}
        </button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Logs de sauvegarde
// ─────────────────────────────────────────────────────────────────────────────

function BackupLogs({ logs }) {
  const copied = useRef(false);
  const [isCopied, setIsCopied] = useState(false);

  const colorLine = (line) => {
    if (/\[ERROR\]|FAILED|erreur|error/i.test(line))   return 'text-red-400';
    if (/\[OK\]|SUCCESS|succès|success/i.test(line))   return 'text-green-400';
    if (/\[WARN\]|warning/i.test(line))                return 'text-amber-400';
    return 'text-gray-400';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n')).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🖥️</span>
          <h2 className="text-base font-semibold text-gray-900">Logs de sauvegarde</h2>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-gray-500 hover:text-gray-800 rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          {isCopied ? '✅ Copié !' : '📋 Copier les logs'}
        </button>
      </div>
      <div className="rounded-b-2xl bg-gray-950 px-5 py-4 overflow-x-auto">
        <pre className="text-xs font-mono leading-relaxed space-y-0.5">
          {logs.length === 0 ? (
            <span className="text-gray-600">Aucun log disponible.</span>
          ) : logs.map((line, i) => (
            <div key={i} className={colorLine(line)}>{line}</div>
          ))}
        </pre>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icône spinner
// ─────────────────────────────────────────────────────────────────────────────

function SpinnerIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal — Page
// ─────────────────────────────────────────────────────────────────────────────

export default function BackupsIndex({ lastBackup, backups: initialBackups, schedule, logs: initialLogs }) {
  const [backups, setBackups]               = useState(initialBackups ?? []);
  const [logs, setLogs]                     = useState(initialLogs ?? []);
  const [triggering, setTriggering]         = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoringId, setRestoringId]       = useState(null);
  const [deletingId, setDeletingId]         = useState(null);
  const [restoring, setRestoring]           = useState(false);
  const [toast, setToast]                   = useState(null);

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Déclencher une sauvegarde manuelle ────────────────────────────────────

  const handleTrigger = async () => {
    if (!confirm('Déclencher une sauvegarde manuelle maintenant ?')) return;
    setTriggering(true);
    try {
      const { data } = await axios.post('/superadmin/backups/trigger');
      showToast(data.message ?? 'Sauvegarde démarrée avec succès.');
      // Recharger la liste après 5 secondes
      setTimeout(reloadBackups, 5000);
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Erreur lors du déclenchement.', 'error');
    } finally {
      setTriggering(false);
    }
  };

  // ── Téléchargement ────────────────────────────────────────────────────────

  const handleDownload = (filename) => {
    window.location.href = `/api/v1/superadmin/backups/${encodeURIComponent(filename)}/download`;
  };

  // ── Restauration ─────────────────────────────────────────────────────────

  const handleRestore = (backup) => {
    setSelectedBackup(backup);
    // Scroll vers la section restauration
    document.getElementById('restore-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleConfirmRestore = async (backup) => {
    if (!backup) return;
    setRestoring(true);
    setRestoringId(backup.filename);
    try {
      const { data } = await axios.post('/api/v1/superadmin/backups/restore', {
        filename     : backup.filename,
        confirmation : 'RESTAURER',
      });
      showToast(data.message ?? 'Restauration lancée. L\'application passe en mode maintenance.');
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Erreur lors de la restauration.', 'error');
    } finally {
      setRestoring(false);
      setRestoringId(null);
      setSelectedBackup(null);
    }
  };

  // ── Suppression ──────────────────────────────────────────────────────────

  const handleDelete = async (filename) => {
    if (!confirm(`Supprimer définitivement la sauvegarde "${filename}" ?`)) return;
    setDeletingId(filename);
    try {
      await axios.delete(`/api/v1/superadmin/backups/${encodeURIComponent(filename)}`);
      setBackups(prev => prev.filter(b => b.filename !== filename));
      showToast('Sauvegarde supprimée.');
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Erreur lors de la suppression.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Rechargement de la liste ──────────────────────────────────────────────

  const reloadBackups = async () => {
    try {
      const { data } = await axios.get('/api/v1/superadmin/backups');
      setBackups(data.backups ?? []);
      setLogs(data.logs ?? logs);
    } catch {
      // silencieux
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head title="Sauvegardes & Restauration — SuperAdmin" />

      {/* En-tête de page */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">💾 Sauvegardes & Restauration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les sauvegardes de la base de données et des fichiers SECRETIS ERP.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-5 right-5 z-50 rounded-xl px-5 py-3 text-sm font-medium shadow-lg flex items-center gap-2 transition-all
            ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
        >
          <span>{toast.type === 'error' ? '❌' : '✅'}</span>
          {toast.message}
        </div>
      )}

      <div className="space-y-6">
        {/* 1. Statut dernière sauvegarde */}
        <LastBackupStatus
          backup={lastBackup}
          onTrigger={handleTrigger}
          triggering={triggering}
        />

        {/* 2. Planning */}
        <BackupSchedule schedule={schedule} />

        {/* 3. Liste des sauvegardes */}
        <BackupList
          backups={backups}
          onDownload={handleDownload}
          onRestore={handleRestore}
          onDelete={handleDelete}
          restoringId={restoringId}
          deletingId={deletingId}
        />

        {/* 4. Restauration */}
        <div id="restore-section">
          <RestoreSection
            selectedBackup={selectedBackup}
            onConfirmRestore={handleConfirmRestore}
            restoring={restoring}
          />
        </div>

        {/* 5. Logs */}
        <BackupLogs logs={logs} />
      </div>
    </>
  );
}
export { BackupsIndex };
