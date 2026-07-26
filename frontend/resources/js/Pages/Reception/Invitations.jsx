import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import QRCode from 'qrcode';

// ─── Gestion des invitations visiteurs ───────────────────────────────────────
export default function Invitations({ invitations }) {
    const [showForm, setShowForm]     = useState(false);
    const [loading, setLoading]       = useState(false);
    const [qrModal, setQrModal]       = useState(null); // { invitation, qrDataUrl }
    const [errors, setErrors]         = useState({});
    const [form, setForm]             = useState({
        visitor_name: '', visitor_email: '', visit_date: '', visit_time_start: '', visit_time_end: '',
        purpose: '', location: '',
    });

    const STATUS_STYLES = {
        used:    'bg-green-100 text-green-700',
        expired: 'bg-red-100 text-red-700',
        pending: 'bg-amber-100 text-amber-700',
    };

    const getStatus = (inv) => {
        if (inv.is_used) return 'used';
        if (new Date(inv.expires_at) < new Date()) return 'expired';
        return 'pending';
    };
    const getStatusLabel = (inv) => ({
        used: 'Utilisée', expired: 'Expirée', pending: 'En attente'
    }[getStatus(inv)]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const { data } = await axios.post('/visitor-invitations', form);
            await showQr(data.invitation);
            setShowForm(false);
            setForm({ visitor_name:'', visitor_email:'', visit_date:'', visit_time_start:'', visit_time_end:'', purpose:'', location:'' });
            router.reload({ only: ['invitations'] });
        } catch (e) {
            if (e.response?.status === 422) setErrors(e.response.data.errors);
        } finally {
            setLoading(false);
        }
    };

    const showQr = async (invitation) => {
        const url  = `${window.location.origin}/visitor-invitations/${invitation.access_code}`;
        const qrDataUrl = await QRCode.toDataURL(url, { width: 256, margin: 2 });
        setQrModal({ invitation, qrDataUrl, url });
    };

    const downloadQr = () => {
        const a = document.createElement('a');
        a.href     = qrModal.qrDataUrl;
        a.download = `invitation-${qrModal.invitation.visitor_name.replace(/\s+/g,'-')}.png`;
        a.click();
    };

    const field = (key) => ({
        value:    form[key],
        onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })),
        className:`w-full border ${errors[key] ? 'border-red-400' : 'border-gray-200'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#9333EA]`,
    });

    return (
        <AppLayout>
            <Head title="Mes invitations" />

            <div className="p-6 space-y-6">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Mes invitations visiteurs</h1>
                        <p className="text-gray-500 text-sm mt-1">Gérez les visites que vous avez planifiées</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-[#9333EA] text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-purple-900"
                    >
                        + Inviter un visiteur
                    </button>
                </div>

                {/* Liste des invitations */}
                <div className="grid gap-4">
                    {invitations.data.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                            <div className="text-5xl mb-3">📨</div>
                            <div className="text-lg font-medium">Aucune invitation créée</div>
                            <button onClick={() => setShowForm(true)} className="mt-4 text-[#9333EA] underline font-semibold text-sm">
                                Créer ma première invitation →
                            </button>
                        </div>
                    ) : invitations.data.map(inv => {
                        const status = getStatus(inv);
                        return (
                            <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-bold text-gray-900 text-lg">{inv.visitor_name}</span>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>
                                            {getStatusLabel(inv)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 space-y-1">
                                        <div>📧 {inv.visitor_email}</div>
                                        <div>📅 {new Date(inv.visit_date).toLocaleDateString('fr-FR')} · {inv.visit_time_start} — {inv.visit_time_end}</div>
                                        {inv.purpose  && <div>📋 {inv.purpose}</div>}
                                        {inv.location && <div>📍 {inv.location}</div>}
                                        {inv.visit_log && (
                                            <div className="text-green-600 font-medium">
                                                ✅ Arrivée enregistrée à {new Date(inv.visit_log.check_in_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {status === 'pending' && (
                                        <button
                                            onClick={() => showQr(inv)}
                                            className="bg-[#F39C12] text-white font-bold text-xs px-3 py-2 rounded-lg"
                                        >
                                            📱 Voir QR
                                        </button>
                                    )}
                                    {status === 'pending' && (
                                        <button
                                            onClick={async () => {
                                                if (confirm('Annuler cette invitation ?')) {
                                                    await axios.delete(`/visitor-invitations/${inv.id}`);
                                                    router.reload({ only: ['invitations'] });
                                                }
                                            }}
                                            className="border border-red-200 text-red-500 font-bold text-xs px-3 py-2 rounded-lg"
                                        >
                                            ✕ Annuler
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal formulaire invitation */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-black text-gray-900">Nouvelle invitation</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Fld label="Nom du visiteur *" error={errors.visitor_name}>
                                <input {...field('visitor_name')} placeholder="Jean Dupont" required />
                            </Fld>
                            <Fld label="Email du visiteur *" error={errors.visitor_email}>
                                <input {...field('visitor_email')} type="email" placeholder="jean@exemple.com" required />
                            </Fld>
                            <div className="grid grid-cols-2 gap-4">
                                <Fld label="Date de visite *" error={errors.visit_date}>
                                    <input {...field('visit_date')} type="date" required min={new Date().toISOString().split('T')[0]} />
                                </Fld>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Fld label="Heure de début *" error={errors.visit_time_start}>
                                    <input {...field('visit_time_start')} type="time" required />
                                </Fld>
                                <Fld label="Heure de fin *" error={errors.visit_time_end}>
                                    <input {...field('visit_time_end')} type="time" required />
                                </Fld>
                            </div>
                            <Fld label="Objet de la visite" error={errors.purpose}>
                                <input {...field('purpose')} placeholder="Ex: Réunion de projet" />
                            </Fld>
                            <Fld label="Lieu / Salle" error={errors.location}>
                                <input {...field('location')} placeholder="Ex: Salle Athena, 2ème étage" />
                            </Fld>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 border border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl text-sm">
                                    Annuler
                                </button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 bg-[#9333EA] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                                    {loading ? 'Envoi…' : 'Envoyer l\'invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal QR code */}
            {qrModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center">
                        <h3 className="text-xl font-black text-gray-900 mb-1">QR Code d'accès</h3>
                        <p className="text-gray-400 text-sm mb-5">{qrModal.invitation.visitor_name}</p>
                        <img src={qrModal.qrDataUrl} alt="QR Code" className="mx-auto mb-4 rounded-xl border-4 border-[#9333EA]" />
                        <div className="bg-gray-50 rounded-xl p-3 font-mono text-sm text-gray-600 mb-5 break-all">
                            {qrModal.invitation.access_code?.substring(0,8).toUpperCase()}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setQrModal(null)}
                                className="flex-1 border border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl text-sm">
                                Fermer
                            </button>
                            <button onClick={downloadQr}
                                className="flex-1 bg-[#F39C12] text-white font-bold py-2.5 rounded-xl text-sm">
                                ⬇️ Télécharger
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function Fld({ label, children, error }) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{Array.isArray(error) ? error[0] : error}</p>}
        </div>
    );
}
export { Invitations };
