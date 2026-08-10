import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  ArrowLeft, FileText, Download, Share2, Tag, Folder,
  User, Calendar, Clock, Shield, Copy, Eye, History, File
} from 'lucide-react';

const MIME_ICONS = {
  'application/pdf':                         { label: 'PDF',   color: 'text-red-500' },
  'application/msword':                      { label: 'Word',  color: 'text-blue-600' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'Word', color: 'text-blue-600' },
  'application/vnd.ms-excel':               { label: 'Excel', color: 'text-green-600' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'Excel', color: 'text-green-600' },
  'image/jpeg':                              { label: 'JPEG',  color: 'text-purple-500' },
  'image/png':                               { label: 'PNG',   color: 'text-purple-500' },
};

function fileIcon(mime) {
  return MIME_ICONS[mime]?.label ?? mime?.split('/')[1]?.toUpperCase() ?? 'Fichier';
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} Ko`;
  return `${(kb / 1024).toFixed(1)} Mo`;
}

function SidebarRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <Icon size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <div className="text-sm text-gray-700 dark:text-gray-300">{children}</div>
      </div>
    </div>
  );
}

function VersionRow({ version, isCurrent }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0 ${isCurrent ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-gray-500">v{version.version_number ?? version.version}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {version.uploadedBy?.name ?? '—'}
          {isCurrent && <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Version actuelle</span>}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {version.created_at ? new Date(version.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
        </p>
        {version.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{version.notes}</p>}
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(version.file_size)}</span>
    </div>
  );
}

export default function GedShow({ document: doc = {} }) {
  const versions = doc.versions ?? [];
  const tags     = Array.isArray(doc.tags) ? doc.tags : [];

  const [sharing, setSharing]   = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  function downloadDocument() {
    window.open(route('ged.documents.download', doc.id), '_blank');
  }

  // POST ged.documents.share renvoie du JSON ({ share_url, token, expires_at })
  // → on utilise axios, pas router.post (qui exige une réponse Inertia).
  async function shareDocument() {
    setSharing(true);
    try {
      const { data } = await axios.post(route('ged.documents.share', doc.id), { expires_in_hours: 24 });
      setShareUrl(data.share_url ?? '');
      if (data.share_url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.share_url);
      }
    } catch {
      alert('Impossible de générer le lien de partage.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <AuthLayout>
      <Head title={doc.title ?? 'Document'} />

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6 flex-wrap">
          <Link href={route('ged.index')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> GED
          </Link>
          {doc.folder && (
            <>
              <span>/</span>
              <span className="text-gray-500">{doc.folder.name}</span>
            </>
          )}
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-xs">{doc.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Main */}
          <div className="lg:col-span-2 space-y-5">

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText size={28} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{doc.title}</h1>
                  {doc.file_name && (
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{doc.file_name}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {doc.category && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs">
                        {doc.category}
                      </span>
                    )}
                    {doc.is_template && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs">
                        Modèle
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{fileIcon(doc.mime_type)} · {formatSize(doc.file_size)}</span>
                  </div>
                </div>
              </div>

              {doc.description && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">
                  {doc.description}
                </p>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={downloadDocument}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
                >
                  <Download size={14} /> Télécharger
                </button>
                <Link
                  href={route('ged.documents.versions', doc.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <History size={14} /> Versions ({versions.length})
                </Link>
                <button
                  onClick={shareDocument}
                  disabled={sharing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  <Share2 size={14} /> {sharing ? 'Génération…' : 'Partager'}
                </button>
              </div>

              {shareUrl && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-3 py-2">
                  <Copy size={13} className="text-indigo-500 flex-shrink-0" />
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={e => e.target.select()}
                    className="flex-1 bg-transparent text-xs text-indigo-700 dark:text-indigo-300 font-mono outline-none"
                  />
                  <span className="text-[11px] text-indigo-500 flex-shrink-0">Lien copié · 24 h</span>
                </div>
              )}
            </div>

            {/* Versions */}
            {versions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <History size={14} className="text-gray-400" /> Historique des versions
                  </h2>
                </div>
                <div>
                  {versions.map(v => (
                    <VersionRow
                      key={v.id}
                      version={v}
                      isCurrent={v.version_number === doc.current_version || v.version === doc.current_version}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Informations</h2>

              <SidebarRow icon={User} label="Auteur">
                {doc.author?.name ?? '—'}
              </SidebarRow>

              {doc.folder && (
                <SidebarRow icon={Folder} label="Dossier">
                  {doc.folder.name}
                </SidebarRow>
              )}

              <SidebarRow icon={Shield} label="Accès">
                <span className="capitalize">{doc.access_level ?? 'Organisation'}</span>
              </SidebarRow>

              <SidebarRow icon={File} label="Version courante">
                v{doc.current_version ?? 1}
              </SidebarRow>

              <SidebarRow icon={Calendar} label="Créé le">
                {doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
              </SidebarRow>

              <SidebarRow icon={Clock} label="Modifié le">
                {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
              </SidebarRow>

              {doc.expires_at && (
                <SidebarRow icon={Calendar} label="Expire le">
                  <span className="text-amber-600 dark:text-amber-400">
                    {new Date(doc.expires_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </SidebarRow>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
