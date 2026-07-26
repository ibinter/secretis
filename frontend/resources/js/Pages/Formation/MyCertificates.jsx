import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    TrophyIcon,
    ArrowDownTrayIcon,
    ShareIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
    ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
}

// ─── QR Code miniature (data URL via API ou placeholder) ──────────────────────

function QrMini({ token }) {
    const verifyUrl = `${window.location.origin}/verify/certificate/${token}`;
    // Utilise un service QR external (peut être remplacé par une lib inline)
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}`;
    return (
        <img src={qrSrc} alt="QR Code" className="w-16 h-16 rounded border border-gray-200"
             onError={e => { e.target.style.display = 'none'; }}/>
    );
}

// ─── CertificateCard ──────────────────────────────────────────────────────────

function CertificateCard({ cert }) {
    const expired  = isExpired(cert.expires_at);
    const [copied, setCopied] = useState(false);

    const verifyUrl = `${window.location.origin}/verify/certificate/${cert.verification_token}`;

    function handleCopyLink() {
        navigator.clipboard.writeText(verifyUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
            expired ? 'border-red-200 opacity-75' : 'border-gray-200'
        }`}>
            {/* En-tête coloré */}
            <div className={`h-2 ${expired ? 'bg-red-400' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}/>

            <div className="p-5">
                {/* Titre et statut */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
                            {cert.category}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                            {cert.course_title}
                        </h3>
                    </div>
                    {expired ? (
                        <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5"/>
                            Expiré
                        </span>
                    ) : (
                        <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckBadgeIcon className="w-3.5 h-3.5"/>
                            Valide
                        </span>
                    )}
                </div>

                {/* QR Code + Numéro */}
                <div className="flex items-center gap-4 mb-4">
                    <QrMini token={cert.verification_token}/>
                    <div>
                        <div className="text-xs text-gray-500 mb-0.5">Numéro de certificat</div>
                        <div className="font-mono text-sm font-semibold text-gray-800">
                            {cert.certificate_number}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Délivré le {formatDate(cert.issued_at)}
                        </div>
                        {cert.expires_at && (
                            <div className={`text-xs mt-0.5 ${expired ? 'text-red-500' : 'text-gray-500'}`}>
                                {expired ? 'Expiré' : 'Expire'} le {formatDate(cert.expires_at)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <a
                        href={`/training/certificates/${cert.id}/pdf`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4"/>
                        Télécharger PDF
                    </a>

                    <button
                        onClick={handleCopyLink}
                        title="Copier le lien de vérification"
                        className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        {copied
                            ? <CheckBadgeIcon className="w-4 h-4 text-green-500"/>
                            : <ClipboardDocumentIcon className="w-4 h-4"/>
                        }
                    </button>

                    <a
                        href={verifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Vérifier l'authenticité"
                        className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ShareIcon className="w-4 h-4"/>
                    </a>
                </div>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MyCertificates({ certificates }) {
    const validCerts   = (certificates ?? []).filter(c => !isExpired(c.expires_at));
    const expiredCerts = (certificates ?? []).filter(c => isExpired(c.expires_at));

    return (
        <AppLayout>
            <Head title="Mes attestations"/>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* En-tête */}
                <div className="flex items-center gap-3 mb-2">
                    <TrophyIcon className="w-8 h-8 text-yellow-500"/>
                    <h1 className="text-2xl font-bold text-gray-900">Mes attestations</h1>
                </div>
                <p className="text-gray-500 mb-8">
                    {certificates?.length ?? 0} certificat{(certificates?.length ?? 0) !== 1 ? 's' : ''} obtenu{(certificates?.length ?? 0) !== 1 ? 's' : ''}
                </p>

                {(!certificates || certificates.length === 0) ? (
                    <div className="text-center py-20">
                        <TrophyIcon className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Aucune attestation</h3>
                        <p className="text-gray-500 mb-6">Complétez une formation pour obtenir votre premier certificat.</p>
                        <button onClick={() => router.visit('/training/courses')}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                            Parcourir les formations
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Certificats valides */}
                        {validCerts.length > 0 && (
                            <section className="mb-10">
                                <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <CheckBadgeIcon className="w-5 h-5 text-green-500"/>
                                    Certificats valides ({validCerts.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {validCerts.map(cert => (
                                        <CertificateCard key={cert.id} cert={cert}/>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Certificats expirés */}
                        {expiredCerts.length > 0 && (
                            <section>
                                <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400"/>
                                    Expirés ({expiredCerts.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {expiredCerts.map(cert => (
                                        <CertificateCard key={cert.id} cert={cert}/>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
export { MyCertificates };
