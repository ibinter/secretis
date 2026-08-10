import { Head } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QrVerify({ valid, type, data }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (valid && canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, window.location.href, {
                width: 160,
                margin: 2,
                color: { dark: '#1e1b4b', light: '#ffffff' },
            });
        }
    }, [valid]);

    return (
        <>
            <Head title={valid ? 'Document authentique — SECRETIS' : 'Document inconnu — SECRETIS'} />
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                fontFamily: 'Inter, system-ui, sans-serif',
                padding: '24px',
            }}>
                <div style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: '40px 36px',
                    width: '100%',
                    maxWidth: 480,
                    boxShadow: '0 8px 40px rgba(124,58,237,.12)',
                }}>
                    {/* Header logo */}
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{
                            width: 52, height: 52,
                            background: 'linear-gradient(135deg, #9333ea, #7e22ce)',
                            borderRadius: 14,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 22,
                            marginBottom: 12,
                        }}>S</div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>SECRETIS ERP — Authentification de document</div>
                    </div>

                    {valid ? (
                        <>
                            {/* Badge authentique */}
                            <div style={{
                                background: '#f0fdf4',
                                border: '2px solid #16a34a',
                                borderRadius: 14,
                                padding: '16px 20px',
                                marginBottom: 24,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}>
                                <span style={{ fontSize: 36 }}>✅</span>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#15803d', fontSize: 17 }}>Document authentique</div>
                                    <div style={{ color: '#16a34a', fontSize: 13 }}>
                                        Ce {type === 'document' ? 'document' : 'courrier'} est enregistré et vérifié dans SECRETIS ERP
                                    </div>
                                </div>
                            </div>

                            {/* Infos document */}
                            <div style={{ marginBottom: 24 }}>
                                <Field label="Titre / Sujet" value={data.title} />
                                <Field label="Référence" value={data.reference} mono />
                                {data.type_label && <Field label="Type" value={data.type_label} />}
                                <Field label="Émetteur / Auteur" value={data.author} />
                                <Field label="Organisation" value={data.organization} />
                                <Field label="Date d'enregistrement" value={data.created_at} />
                                <Field label="Statut" value={
                                    <span style={{
                                        background: '#dcfce7',
                                        color: '#15803d',
                                        borderRadius: 999,
                                        padding: '2px 10px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}>
                                        {data.status === 'active' || data.status === 'actif' ? 'Actif' : data.status}
                                    </span>
                                } />
                            </div>

                            {/* QR de cette page */}
                            <div style={{ textAlign: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
                                <canvas ref={canvasRef} style={{ borderRadius: 8 }} />
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                                    QR de vérification — ne pas reproduire
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Badge invalide */}
                            <div style={{
                                background: '#fef2f2',
                                border: '2px solid #dc2626',
                                borderRadius: 14,
                                padding: '20px',
                                textAlign: 'center',
                                marginBottom: 24,
                            }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 18, marginBottom: 8 }}>
                                    Document non reconnu
                                </div>
                                <div style={{ color: '#b91c1c', fontSize: 14, lineHeight: 1.5 }}>
                                    Ce QR code ne correspond à aucun document enregistré dans SECRETIS ERP.
                                    Ce document pourrait être falsifié ou avoir été supprimé.
                                </div>
                            </div>

                            <div style={{
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: 10,
                                padding: '14px 16px',
                                fontSize: 13,
                                color: '#9a3412',
                                lineHeight: 1.6,
                            }}>
                                <strong>Que faire ?</strong><br />
                                Contactez l'émetteur du document pour obtenir un document certifié,
                                ou signalez un éventuel document falsifié à votre administrateur SECRETIS.
                            </div>
                        </>
                    )}

                    <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#9ca3af' }}>
                        Propulsé par <strong style={{ color: '#7e22ce' }}>SECRETIS ERP</strong> · IBIG Soft
                    </div>
                </div>
            </div>
        </>
    );
}

function Field({ label, value, mono }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f9fafb' }}>
            <span style={{ fontSize: 13, color: '#6b7280', minWidth: 140 }}>{label}</span>
            <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#111827',
                fontFamily: mono ? 'monospace' : 'inherit',
                textAlign: 'right',
            }}>
                {value ?? '—'}
            </span>
        </div>
    );
}
