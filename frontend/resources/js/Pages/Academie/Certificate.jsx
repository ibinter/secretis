import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    DocumentArrowDownIcon,
    ShareIcon,
    LinkIcon,
    CheckBadgeIcon,
} from '@heroicons/react/24/outline';

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

// ─── Certificat SVG / HTML ────────────────────────────────────────────────────

function CertificateVisual({ certificate }) {
    const { user_name, course_title, score, issued_at, uuid } = certificate;
    const verifyUrl = certificate.verify_url;
    const date      = formatDate(issued_at);
    const certNum   = `IBIG-${uuid.substring(0, 8).toUpperCase()}`;

    // QR Code : on utilise une URL publique de génération de QR (hébergement local simulé)
    // En production, utiliser qrcode.react ou une lib inlinée
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}`;

    return (
        <div
            id="certificate-visual"
            className="relative bg-white rounded-3xl overflow-hidden border-4 border-amber-300 shadow-2xl"
            style={{ fontFamily: '"Georgia", serif', minHeight: 520 }}
        >
            {/* Bandeau doré haut */}
            <div className="h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

            {/* Corps */}
            <div className="px-10 py-8 flex flex-col items-center text-center">

                {/* Logos */}
                <div className="w-full flex items-center justify-between mb-6">
                    <div className="flex flex-col items-start">
                        <span className="text-2xl font-extrabold text-blue-800 tracking-tight">IBIG SECRETIS</span>
                        <span className="text-xs text-gray-400 tracking-widest uppercase">ERP Platform</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-gray-700">IBIG Soft</span>
                        <span className="text-xs text-amber-600 italic">L'excellence est notre passion</span>
                    </div>
                </div>

                {/* Médaille décorative */}
                <div className="relative w-20 h-20 mb-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 rounded-full flex items-center justify-center shadow-lg border-4 border-amber-100">
                        <CheckBadgeIcon className="w-10 h-10 text-amber-700" />
                    </div>
                </div>

                {/* Titre principal */}
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400 mb-2">
                    Certificat d'Accomplissement
                </p>
                <p className="text-sm text-gray-500 mb-4">Décerné à</p>

                {/* Nom */}
                <h2 className="text-3xl font-extrabold text-gray-900 mb-1" style={{ fontFamily: '"Georgia", serif' }}>
                    {user_name}
                </h2>

                {/* Séparateur décoratif */}
                <div className="flex items-center gap-3 my-3 w-full max-w-sm">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                    <span className="text-amber-400 text-lg">✦</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                </div>

                <p className="text-sm text-gray-500 mb-2">Pour avoir complété avec succès</p>
                <h3 className="text-xl font-bold text-blue-800 mb-3 text-balance leading-snug max-w-md">
                    {course_title}
                </h3>

                {/* Score et date */}
                <div className="flex items-center gap-6 mt-1 mb-6">
                    {score != null && (
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">{score}%</span>
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Score obtenu</span>
                        </div>
                    )}
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-gray-800">{date}</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Date d'obtention</span>
                    </div>
                </div>

                {/* Signature */}
                <div className="w-full flex items-end justify-between mt-2">
                    <div className="flex flex-col items-start gap-1">
                        {/* QR Code de vérification */}
                        <img
                            src={qrSrc}
                            alt="QR de vérification"
                            className="w-16 h-16 rounded-lg border border-gray-200"
                        />
                        <span className="text-[10px] text-gray-400 max-w-[100px] leading-tight">Scanner pour vérifier</span>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="w-32 border-b-2 border-gray-300 mb-1" />
                        <span className="text-xs font-bold text-gray-700">Directeur IBIG Soft</span>
                        <span className="text-[10px] text-gray-400">{certNum}</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
                            <span className="text-blue-700 text-xs font-extrabold">IS</span>
                        </div>
                        <span className="text-[10px] text-gray-400">Sceau IBIG Soft</span>
                    </div>
                </div>
            </div>

            {/* Bandeau doré bas */}
            <div className="h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

            {/* Watermark léger */}
            <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none"
                aria-hidden="true"
            >
                <span className="text-9xl font-extrabold text-gray-900 rotate-45 tracking-widest">IBIG SECRETIS</span>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcademieCertificate({ certificate }) {
    function shareOnLinkedIn() {
        const text = encodeURIComponent(
            `Je viens d'obtenir le certificat "${certificate.course_title}" sur l'Académie IBIG SECRETIS ! 🎓`
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

    return (
        <AppLayout>
            <Head title={`Certificat — ${certificate.course_title}`} />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Fil d'Ariane */}
                <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <Link href={route('academie.index')} className="hover:text-blue-600">Académie</Link>
                    <span className="mx-2">/</span>
                    <Link href={route('academie.mon-espace', { '#': 'certificats' })} className="hover:text-blue-600">Mon espace</Link>
                    <span className="mx-2">/</span>
                    <span>Certificat</span>
                </nav>

                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">
                    Votre certificat d'accomplissement
                </h1>

                {/* Visuel du certificat */}
                <CertificateVisual certificate={certificate} />

                {/* Boutons d'action */}
                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    <button
                        onClick={downloadPdf}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors shadow-md"
                    >
                        <DocumentArrowDownIcon className="w-5 h-5" />
                        Télécharger en PDF
                    </button>

                    <button
                        onClick={shareOnLinkedIn}
                        className="flex items-center gap-2 bg-[#0077B5] hover:bg-[#005885] text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
                    >
                        <ShareIcon className="w-5 h-5" />
                        Partager sur LinkedIn
                    </button>

                    <button
                        onClick={copyVerifyLink}
                        className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
                    >
                        <LinkIcon className="w-5 h-5" />
                        Copier le lien de vérification
                    </button>
                </div>

                {/* Info vérification */}
                <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ce certificat est vérifiable publiquement à l'adresse :{' '}
                        <a
                            href={certificate.verify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 underline break-all"
                        >
                            {certificate.verify_url}
                        </a>
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
