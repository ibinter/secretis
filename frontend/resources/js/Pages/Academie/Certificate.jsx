/**
 * Academie/Certificate.jsx — Affichage d'un certificat (GET /academie/certificat/{uuid})
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, même route PDF
 * (`route('api.academy.certificate.pdf')`), même partage LinkedIn,
 * même `navigator.clipboard.writeText`.
 *
 * Props réelles (AcademyController@certificate → Inertia::render('Academie/Certificate')) :
 *   certificate : { uuid, user_name, course_title, score, issued_at, verify_url }
 *
 * Note : le VISUEL du certificat reste volontairement sur fond clair et en
 * serif — c'est un document destiné à l'impression / au PDF, pas un écran de
 * l'ERP. Le reste de la page suit le design system (dark mode inclus).
 */

import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    DocumentArrowDownIcon,
    ShareIcon,
    LinkIcon,
    CheckBadgeIcon,
    TrophyIcon,
} from '@heroicons/react/24/outline';
import {
    PageHeader, Button, EmptyState,
    cx, SURFACE_SUNK, BORDER, TEXT_MUTED, NUM,
} from '@/Components/UI';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day:     'numeric',
        month:   'long',
        year:    'numeric',
    });
}

// ─── Visuel du certificat ─────────────────────────────────────────────────────

function CertificateVisual({ certificate }) {
    const { user_name, course_title, score, issued_at, uuid } = certificate;
    const verifyUrl = certificate.verify_url;
    const date      = formatDate(issued_at);
    const certNum   = `IBIG-${String(uuid ?? '').substring(0, 8).toUpperCase()}`;

    // QR de vérification — service externe (voir rapport : à internaliser).
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl ?? '')}`;

    return (
        <div
            id="certificate-visual"
            className="relative overflow-hidden rounded-xl border-2 border-amber-300 bg-white shadow-sm"
            style={{ fontFamily: '"Georgia", serif', minHeight: 520 }}
        >
            {/* Filet haut */}
            <div className="h-1.5 bg-amber-400" />

            <div className="flex flex-col items-center px-10 py-8 text-center">
                {/* En-têtes */}
                <div className="mb-6 flex w-full items-start justify-between gap-4">
                    <div className="flex flex-col items-start">
                        <span className="text-xl font-semibold tracking-tight text-purple-800">IBIG SECRETIS</span>
                        <span className="text-[11px] uppercase tracking-widest text-gray-400">ERP Platform</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-base font-semibold text-gray-700">IBIG Soft</span>
                        <span className="text-[11px] italic text-amber-600">L'excellence est notre passion</span>
                    </div>
                </div>

                {/* Sceau */}
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-50">
                    <CheckBadgeIcon className="h-8 w-8 text-amber-600" aria-hidden="true" />
                </div>

                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
                    Certificat d'accomplissement
                </p>
                <p className="mb-4 text-sm text-gray-500">Décerné à</p>

                <h2 className="mb-1 text-3xl font-semibold tracking-tight text-gray-900">
                    {user_name}
                </h2>

                {/* Filet séparateur */}
                <div className="my-4 h-px w-full max-w-sm bg-amber-200" />

                <p className="mb-2 text-sm text-gray-500">Pour avoir complété avec succès</p>
                <h3 className="mb-3 max-w-md text-xl font-semibold leading-snug text-purple-800">
                    {course_title}
                </h3>

                {/* Score et date */}
                <div className="mb-6 mt-1 flex items-start gap-8">
                    {score != null && (
                        <div className="flex flex-col items-center">
                            <span className={cx('text-2xl font-semibold tracking-tight text-emerald-600', NUM)}>{score}%</span>
                            <span className="text-[11px] uppercase tracking-wide text-gray-400">Score obtenu</span>
                        </div>
                    )}
                    <div className="flex flex-col items-center">
                        <span className={cx('text-sm font-semibold text-gray-800', NUM)}>{date}</span>
                        <span className="text-[11px] uppercase tracking-wide text-gray-400">Date d'obtention</span>
                    </div>
                </div>

                {/* Pied : QR, signature, sceau */}
                <div className="mt-2 flex w-full items-end justify-between gap-4">
                    <div className="flex flex-col items-start gap-1">
                        <img
                            src={qrSrc}
                            alt="QR de vérification du certificat"
                            className="h-16 w-16 rounded-lg border border-gray-200"
                        />
                        <span className="max-w-[100px] text-[10px] leading-tight text-gray-400">
                            Scanner pour vérifier
                        </span>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="mb-1 w-32 border-b border-gray-300" />
                        <span className="text-xs font-semibold text-gray-700">Directeur IBIG Soft</span>
                        <span className={cx('text-[10px] text-gray-400', NUM)}>{certNum}</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-purple-300 bg-purple-50">
                            <span className="text-xs font-semibold text-purple-700">IS</span>
                        </div>
                        <span className="text-[10px] text-gray-400">Sceau IBIG Soft</span>
                    </div>
                </div>
            </div>

            {/* Filet bas */}
            <div className="h-1.5 bg-amber-400" />

            {/* Filigrane */}
            <div
                className="pointer-events-none absolute inset-0 flex select-none items-center justify-center opacity-[0.03]"
                aria-hidden="true"
            >
                <span className="rotate-45 text-8xl font-semibold tracking-widest text-gray-900">IBIG SECRETIS</span>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieCertificate({ certificate }) {
    function shareOnLinkedIn() {
        const text = encodeURIComponent(
            `Je viens d'obtenir le certificat "${certificate.course_title}" sur l'Académie IBIG SECRETIS !`
        );
        const url = encodeURIComponent(certificate.verify_url);
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
            '_blank'
        );
    }

    function copyVerifyLink() {
        navigator.clipboard.writeText(certificate.verify_url)
            .then(() => alert('Lien copié dans le presse-papiers !'))
            .catch(() => {});
    }

    function downloadPdf() {
        window.location.href = route('api.academy.certificate.pdf', { uuid: certificate.uuid });
    }

    if (!certificate) {
        return (
            <AppLayout>
                <Head title="Certificat — Académie" />
                <EmptyState
                    bordered
                    variant="error"
                    title="Certificat introuvable"
                    description="Ce certificat n'existe pas ou ne vous appartient pas."
                    action={
                        <Button as={Link} href={route('academie.mon-espace')} variant="primary">
                            Retour à mon espace
                        </Button>
                    }
                />
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title={`Certificat — ${certificate.course_title}`} />

            <div className="mx-auto max-w-3xl">
                <PageHeader
                    title="Votre certificat d'accomplissement"
                    subtitle={certificate.course_title}
                    icon={TrophyIcon}
                    breadcrumbs={[
                        { label: 'Académie', href: route('academie.index') },
                        { label: 'Mon espace', href: route('academie.mon-espace', { '#': 'certificats' }) },
                        { label: 'Certificat' },
                    ]}
                />

                <CertificateVisual certificate={certificate} />

                {/* Actions */}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button variant="primary" icon={DocumentArrowDownIcon} onClick={downloadPdf}>
                        Télécharger en PDF
                    </Button>
                    <Button variant="secondary" icon={ShareIcon} onClick={shareOnLinkedIn}>
                        Partager sur LinkedIn
                    </Button>
                    <Button variant="secondary" icon={LinkIcon} onClick={copyVerifyLink}>
                        Copier le lien de vérification
                    </Button>
                </div>

                {/* Vérification publique */}
                <div className={cx('mt-6 rounded-xl border p-4 text-center', BORDER, SURFACE_SUNK)}>
                    <p className={cx('text-xs leading-5', TEXT_MUTED)}>
                        Ce certificat est vérifiable publiquement à l'adresse :{' '}
                        <a
                            href={certificate.verify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all font-medium text-purple-700 underline dark:text-purple-300"
                        >
                            {certificate.verify_url}
                        </a>
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
export { AcademieCertificate };
