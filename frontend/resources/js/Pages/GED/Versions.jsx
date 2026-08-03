/**
 * GED/Versions.jsx — Historique des versions d'un document SECRETIS ERP
 *
 * Props Inertia :
 *   - document : { id, title, mime_type, file_size, current_version, created_at }
 *   - versions : [{ id, version_number, file_path, file_size, file_name, mime_type, uploaded_by, change_summary, created_at }]
 */

import { Head, Link } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft, History, Download, FileText,
  User, Clock, Tag
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function VersionRow({ version, isCurrent }) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition ${
      isCurrent
        ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
        isCurrent
          ? 'bg-purple-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      }`}>
        v{version.version_number}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Version {version.version_number}
          </span>
          {isCurrent && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
              Actuelle
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
          {version.change_summary && (
            <span className="flex items-center gap-1">
              <Tag size={10} /> {version.change_summary}
            </span>
          )}
          {version.uploaded_by && (
            <span className="flex items-center gap-1">
              <User size={10} /> {version.uploaded_by.name}
            </span>
          )}
          {version.created_at && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {format(new Date(version.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
            </span>
          )}
          <span>{formatBytes(version.file_size)}</span>
        </div>
      </div>

      <a
        href={route('ged.documents.download', version.document_id ?? '')}
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-400 hover:text-purple-600 transition"
      >
        <Download size={12} />
        Télécharger
      </a>
    </div>
  );
}

export default function GEDVersions({ document, versions = [] }) {
  return (
    <AuthLayout>
      <Head title={`Versions — ${document.title}`} />

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* Navigation */}
        <Link
          href={route('ged.documents.show', document.id)}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
        >
          <ArrowLeft size={14} />
          Retour au document
        </Link>

        {/* En-tête */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <FileText size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{document.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
              <History size={12} />
              {versions.length} version{versions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Liste des versions */}
        <div className="space-y-3">
          {versions.length > 0 ? (
            versions.map(v => (
              <VersionRow
                key={v.id}
                version={v}
                isCurrent={v.version_number === document.current_version}
              />
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <History size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Aucun historique de versions disponible.</p>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
