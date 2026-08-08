/**
 * GED/Versions.jsx — Historique des versions d'un document SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia, mêmes routes Ziggy
 * (`ged.documents.show`, `ged.documents.versions.download`).
 *
 * Props Inertia (DocumentController@versions) :
 *   - document : { id, title, mime_type, file_size, current_version, created_at }
 *   - versions : [{ id, version_number, file_path, file_size, file_name, mime_type,
 *                   uploaded_by, change_summary, created_at, document_id }]
 */

import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, History, Download, FileText, User, Clock, Tag } from 'lucide-react';
import {
    PageHeader, Button, Badge, Card, EmptyState,
    cx, SURFACE, BORDER, DIVIDE, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, TONES,
} from '@/Components/UI';

function formatBytes(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024)        return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ─── Ligne de version ─────────────────────────────────────────────────────── */

function VersionRow({ version, isCurrent }) {
    return (
        <div className={cx(
            'flex flex-wrap items-start gap-4 px-4 py-4 transition-colors sm:px-6',
            isCurrent
                ? 'bg-purple-50/60 dark:bg-purple-500/[0.07]'
                : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
        )}>
            <span className={cx(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                NUM,
                isCurrent
                    ? 'bg-purple-600 text-white'
                    : cx(TONES.neutral.soft, TONES.neutral.text),
            )}>
                v{version.version_number}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={cx('text-sm font-medium', TEXT_TITLE, NUM)}>
                        Version {version.version_number}
                    </span>
                    {isCurrent && <Badge variant="accent">Actuelle</Badge>}
                </div>

                <div className={cx('mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs', TEXT_MUTED)}>
                    {version.change_summary && (
                        <span className="inline-flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {version.change_summary}
                        </span>
                    )}
                    {version.uploaded_by && (
                        <span className="inline-flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {version.uploaded_by.name}
                        </span>
                    )}
                    {version.created_at && (
                        <span className={cx('inline-flex items-center gap-1.5', NUM)}>
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {format(new Date(version.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                        </span>
                    )}
                    <span className={NUM}>{formatBytes(version.file_size)}</span>
                </div>
            </div>

            <Button
                variant="secondary"
                size="sm"
                icon={Download}
                href={route('ged.documents.versions.download', [version.document_id ?? '', version.id])}
                className="shrink-0"
            >
                Télécharger
            </Button>
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function GEDVersions({ document, versions = [] }) {
    const count = versions.length;

    return (
        <AppLayout>
            <Head title={`Versions — ${document.title}`} />

            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">

                <PageHeader
                    icon={History}
                    title="Historique des versions"
                    breadcrumbs={[
                        { label: 'Accueil', href: '/' },
                        { label: 'GED', href: '/ged' },
                        { label: 'Versions' },
                    ]}
                    subtitle={`${count} version${count !== 1 ? 's' : ''} conservée${count !== 1 ? 's' : ''} pour ce document`}
                    actions={
                        <Button as={Link} variant="secondary" icon={ArrowLeft} href={route('ged.documents.show', document.id)}>
                            Retour au document
                        </Button>
                    }
                />

                {/* Rappel du document concerné */}
                <div className={cx('mb-6 flex items-center gap-4 rounded-xl border p-4 shadow-sm',
                    BORDER, SURFACE)}>
                    <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', TONES.accent.soft)}>
                        <FileText className={cx('h-5 w-5', TONES.accent.icon)} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <Link
                            href={route('ged.documents.show', document.id)}
                            className={cx('block truncate text-base font-semibold tracking-tight transition-colors',
                                TEXT_TITLE, 'hover:text-purple-600 dark:hover:text-purple-400')}
                        >
                            {document.title}
                        </Link>
                        <p className={cx('mt-0.5 text-sm', TEXT_MUTED, NUM)}>
                            Version courante : v{document.current_version ?? 1}
                            {document.file_size ? ` · ${formatBytes(document.file_size)}` : ''}
                        </p>
                    </div>
                </div>

                {/* Liste des versions */}
                <Card title="Versions" subtitle="De la plus récente à la plus ancienne." flush>
                    {count > 0 ? (
                        <div className={cx('divide-y', DIVIDE)}>
                            {versions.map(v => (
                                <VersionRow
                                    key={v.id}
                                    version={v}
                                    isCurrent={v.version_number === document.current_version}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={History}
                            title="Aucun historique de versions"
                            description="Ce document n'a encore qu'un seul dépôt. Chaque nouvel envoi de fichier créera une version datée et attribuée à son auteur."
                            hints={[
                                'Les versions précédentes restent téléchargeables.',
                                'Un résumé de modification peut être saisi à chaque dépôt.',
                            ]}
                            action={
                                <Button as={Link} variant="primary" icon={FileText} href={route('ged.documents.show', document.id)}>
                                    Ouvrir le document
                                </Button>
                            }
                        />
                    )}
                </Card>

                <p className={cx('mt-4 text-xs', TEXT_FAINT)}>
                    Le lien de téléchargement pointe vers le fichier du document ; il ne restaure pas
                    la version sélectionnée.
                </p>
            </div>
        </AppLayout>
    );
}
