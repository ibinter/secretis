import React from 'react';
import { Head } from '@inertiajs/react';

/**
 * OfferAccepted — Page publique affichée après acceptation d'une offre commerciale
 * Route : GET /offer-accepted (ou redirigée depuis /offers/accept/{token})
 *
 * Aucun layout SuperAdmin — page standalone accessible sans authentification.
 */
export default function OfferAccepted({ offer = null }) {
    return (
        <>
            <Head title="Offre acceptée — IBIG SECRETIS" />
            <div style={styles.page}>
                <div style={styles.card}>
                    {/* Logo */}
                    <div style={styles.logoWrap}>
                        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="56" height="56" rx="16" fill="#9333EA"/>
                            <path d="M14 28L22 36L42 16" stroke="#4CAF93" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>

                    <h1 style={styles.title}>Offre acceptée !</h1>
                    <p style={styles.subtitle}>
                        Merci d'avoir accepté l'offre commerciale IBIG SECRETIS.
                    </p>

                    {offer && (
                        <div style={styles.offerBox}>
                            <div style={styles.offerRow}>
                                <span style={styles.offerLabel}>Référence</span>
                                <span style={styles.offerValue}>{offer.number}</span>
                            </div>
                            {offer.amount_ttc && (
                                <div style={styles.offerRow}>
                                    <span style={styles.offerLabel}>Montant TTC</span>
                                    <span style={styles.offerValue}>
                                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(offer.amount_ttc)}
                                    </span>
                                </div>
                            )}
                            {offer.accepted_at && (
                                <div style={styles.offerRow}>
                                    <span style={styles.offerLabel}>Acceptée le</span>
                                    <span style={styles.offerValue}>
                                        {new Date(offer.accepted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <p style={styles.next}>
                        Notre équipe commerciale vous contactera dans les plus brefs délais pour
                        finaliser votre abonnement et mettre en place votre environnement SECRETIS.
                    </p>

                    <div style={styles.contactBox}>
                        <p style={styles.contactTitle}>Besoin d'aide ?</p>
                        <a href="mailto:commercial@ibig-soft.com" style={styles.contactLink}>
                            commercial@ibig-soft.com
                        </a>
                    </div>

                    <p style={styles.footer}>IBIG Soft — Solution SECRETIS ERP</p>
                </div>
            </div>
        </>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f2035 0%, #9333EA 60%, #1e4a7a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    card: {
        background: '#fff',
        borderRadius: '20px',
        padding: '3rem',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
    },
    logoWrap: {
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'center',
    },
    title: {
        fontSize: '1.875rem',
        fontWeight: '700',
        color: '#9333EA',
        margin: '0 0 0.75rem',
    },
    subtitle: {
        fontSize: '1rem',
        color: '#4b5563',
        margin: '0 0 1.5rem',
        lineHeight: '1.6',
    },
    offerBox: {
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        textAlign: 'left',
    },
    offerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.375rem 0',
        borderBottom: '1px solid #e0f2fe',
    },
    offerLabel: {
        fontSize: '0.875rem',
        color: '#6b7280',
    },
    offerValue: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#1e3a5f',
    },
    next: {
        fontSize: '0.9375rem',
        color: '#374151',
        lineHeight: '1.7',
        margin: '0 0 1.5rem',
    },
    contactBox: {
        background: '#f8fafc',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '1.5rem',
    },
    contactTitle: {
        fontSize: '0.875rem',
        color: '#6b7280',
        margin: '0 0 0.25rem',
    },
    contactLink: {
        color: '#9333EA',
        fontWeight: '600',
        textDecoration: 'none',
        fontSize: '0.9375rem',
    },
    footer: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        margin: '0',
    },
};
export { OfferAccepted };
