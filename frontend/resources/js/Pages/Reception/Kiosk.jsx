import React, { useState, useEffect, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

// ─── Kiosk Mode — Tablette de reception plein ecran ──────────────────────────
export default function Kiosk({ organization, hosts }) {
    const [step, setStep]           = useState('welcome');   // welcome | scan | register | confirm | success | idle
    const [flow, setFlow]           = useState(null);         // 'invitation' | 'walkin'
    const [codeInput, setCodeInput] = useState('');
    const [invitation, setInvitation] = useState(null);
    const [formData, setFormData]   = useState({ full_name:'', company:'', id_type:'CNI', id_number:'', phone:'', email:'', host_user_id:'', purpose:'réunion', purpose_detail:'' });
    const [photoSrc, setPhotoSrc]   = useState(null);
    const [error, setError]         = useState('');
    const [loading, setLoading]     = useState(false);
    const [time, setTime]           = useState(new Date());
    const [idleTimer, setIdleTimer] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Horloge temps reel
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Gestion de la mise en veille apres 2 minutes d inactivite
    const resetIdle = useCallback(() => {
        if (step === 'idle') setStep('welcome');
        if (idleTimer) clearTimeout(idleTimer);
        const t = setTimeout(() => setStep('idle'), 120_000);
        setIdleTimer(t);
    }, [step, idleTimer]);

    useEffect(() => {
        resetIdle();
        window.addEventListener('click', resetIdle);
        window.addEventListener('touchstart', resetIdle);
        window.addEventListener('keydown', resetIdle);
        return () => {
            window.removeEventListener('click', resetIdle);
            window.removeEventListener('touchstart', resetIdle);
            window.removeEventListener('keydown', resetIdle);
        };
    }, []);

    // Webcam
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch {
            setError('Impossible d\'accéder à la caméra.');
        }
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };

    const capturePhoto = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        setPhotoSrc(canvas.toDataURL('image/jpeg', 0.85));
        stopCamera();
    };

    useEffect(() => {
        if (step === 'register') startCamera();
        else stopCamera();
    }, [step]);

    // Valider code invitation
    const handleCodeSubmit = async () => {
        if (!codeInput.trim()) return;
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get(`/visitor-invitation/${codeInput.trim()}`);
            if (data.valid) {
                setInvitation(data.invitation);
                setStep('confirm');
            } else {
                setError(data.message || 'Code invalide ou expiré.');
            }
        } catch {
            setError('Code invalide, expiré ou déjà utilisé.');
        } finally {
            setLoading(false);
        }
    };

    // Check-in via invitation
    const handleInvitationCheckIn = async () => {
        setLoading(true);
        setError('');
        try {
            await axios.post('/reception/check-in', {
                ...formData,
                full_name:        invitation.visitor_name,
                invitation_code:  invitation.access_code,
                host_user_id:     invitation.invited_by,
                purpose:          invitation.purpose || 'réunion',
            });
            setStep('success');
        } catch (e) {
            if (e.response?.status === 403 && e.response?.data?.blacklisted) {
                setError('Accès refusé. Veuillez contacter la réception.');
            } else {
                setError('Une erreur est survenue. Veuillez recommencer.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Check-in walk-in
    const handleWalkInCheckIn = async () => {
        if (!formData.full_name || !formData.id_number || !formData.host_user_id) {
            setError('Veuillez remplir tous les champs obligatoires.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await axios.post('/reception/check-in', {
                ...formData,
                organization_id: organization.id,
                photo_base64: photoSrc,
            });
            setStep('success');
        } catch (e) {
            if (e.response?.status === 403 && e.response?.data?.blacklisted) {
                setError('Accès refusé. Veuillez contacter la réception.');
            } else {
                setError('Une erreur est survenue. Veuillez recommencer.');
            }
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep('welcome');
        setFlow(null);
        setCodeInput('');
        setInvitation(null);
        setFormData({ full_name:'', company:'', id_type:'CNI', id_number:'', phone:'', email:'', host_user_id:'', purpose:'réunion', purpose_detail:'' });
        setPhotoSrc(null);
        setError('');
    };

    const fmt = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fmtDate = (d) => d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    // ── ECRAN DE VEILLE ────────────────────────────────────────────────────────
    if (step === 'idle') return (
        <div
            className="fixed inset-0 bg-[#9333EA] flex flex-col items-center justify-center cursor-pointer select-none"
            onClick={reset}
        >
            <div className="text-white text-center">
                <div className="text-8xl font-black mb-4 tracking-widest">{fmt(time)}</div>
                <div className="text-2xl opacity-70 mb-12 capitalize">{fmtDate(time)}</div>
                <div className="text-6xl mb-6">🏢</div>
                <div className="text-3xl font-bold text-[#F39C12]">{organization.name}</div>
                <div className="text-lg opacity-50 mt-6 animate-pulse">Touchez l'écran pour commencer</div>
            </div>
        </div>
    );

    // ── ECRAN SUCCES ───────────────────────────────────────────────────────────
    if (step === 'success') return (
        <div className="fixed inset-0 bg-green-600 flex flex-col items-center justify-center text-white p-8">
            <div className="text-9xl mb-6">✅</div>
            <div className="text-4xl font-black mb-4">Bienvenue !</div>
            <div className="text-xl opacity-80 text-center max-w-lg mb-6">
                Votre hôte a été prévenu de votre arrivée.<br/>
                Veuillez patienter en réception.
            </div>
            <div className="text-6xl mb-10">📧</div>
            <button
                onClick={reset}
                className="bg-white text-green-700 font-black text-2xl px-12 py-5 rounded-2xl shadow-xl"
            >
                Terminer
            </button>
        </div>
    );

    // ── ACCUEIL ────────────────────────────────────────────────────────────────
    if (step === 'welcome') return (
        <div className="fixed inset-0 bg-[#9333EA] flex flex-col overflow-hidden">
            {/* Barre du haut */}
            <div className="flex items-center justify-between px-10 pt-8 pb-4">
                <div className="text-white">
                    <div className="text-5xl font-black tracking-wider">{fmt(time)}</div>
                    <div className="text-lg opacity-60 capitalize">{fmtDate(time)}</div>
                </div>
                <div className="text-center text-white">
                    <div className="text-4xl font-black text-[#F39C12]">{organization.name}</div>
                    <div className="text-lg opacity-60">Bienvenue — Accueil visiteurs</div>
                </div>
                <div className="text-5xl">🏢</div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-10 px-10">
                <div className="text-white text-center">
                    <div className="text-5xl font-black mb-3">Comment pouvons-nous vous aider ?</div>
                    <div className="text-2xl opacity-60">Choisissez votre parcours d'enregistrement</div>
                </div>

                <div className="flex gap-8 w-full max-w-4xl">
                    <button
                        onClick={() => { setFlow('invitation'); setStep('scan'); }}
                        className="flex-1 bg-[#F39C12] hover:bg-amber-500 text-white rounded-3xl p-10 flex flex-col items-center gap-5 shadow-2xl transition-all active:scale-95"
                    >
                        <span className="text-8xl">📱</span>
                        <span className="text-3xl font-black text-center">J'ai une invitation</span>
                        <span className="text-lg opacity-80 text-center">Scannez ou saisissez votre code QR</span>
                    </button>

                    <button
                        onClick={() => { setFlow('walkin'); setStep('register'); }}
                        className="flex-1 bg-white hover:bg-gray-50 text-[#9333EA] rounded-3xl p-10 flex flex-col items-center gap-5 shadow-2xl transition-all active:scale-95"
                    >
                        <span className="text-8xl">📝</span>
                        <span className="text-3xl font-black text-center">Je n'ai pas d'invitation</span>
                        <span className="text-lg opacity-60 text-center">Enregistrement immédiat</span>
                    </button>
                </div>
            </div>

            <div className="text-center text-white opacity-30 pb-6 text-sm">
                IBIG SECRETIS — Système d'accueil visiteurs
            </div>
        </div>
    );

    // ── SCAN CODE INVITATION ───────────────────────────────────────────────────
    if (step === 'scan') return (
        <div className="fixed inset-0 bg-[#9333EA] flex flex-col items-center justify-center p-12">
            <button onClick={reset} className="absolute top-8 left-8 text-white text-4xl opacity-60 hover:opacity-100">←</button>
            <div className="text-white text-center mb-10">
                <div className="text-6xl mb-4">📱</div>
                <div className="text-4xl font-black">Votre code d'invitation</div>
                <div className="text-xl opacity-60 mt-2">Saisissez le code reçu par email</div>
            </div>

            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-xl mb-5 text-center">{error}</div>}
                <input
                    type="text"
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                    placeholder="Ex: A1B2C3D4"
                    className="w-full border-2 border-gray-200 rounded-2xl px-6 py-5 text-3xl font-mono text-center tracking-widest focus:outline-none focus:border-[#9333EA] mb-6"
                    autoFocus
                />
                <button
                    onClick={handleCodeSubmit}
                    disabled={loading || !codeInput.trim()}
                    className="w-full bg-[#F39C12] text-white font-black text-2xl py-5 rounded-2xl disabled:opacity-50"
                >
                    {loading ? 'Vérification…' : 'Valider le code'}
                </button>
            </div>
        </div>
    );

    // ── CONFIRMATION INVITATION ────────────────────────────────────────────────
    if (step === 'confirm' && invitation) return (
        <div className="fixed inset-0 bg-[#9333EA] flex flex-col items-center justify-center p-12">
            <button onClick={() => setStep('scan')} className="absolute top-8 left-8 text-white text-4xl opacity-60 hover:opacity-100">←</button>

            <div className="bg-white rounded-3xl p-10 w-full max-w-2xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-3">🎟️</div>
                    <div className="text-3xl font-black text-[#9333EA]">Invitation trouvée</div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-xl mb-5 text-center">{error}</div>}

                <div className="bg-gray-50 rounded-2xl p-6 mb-8 space-y-3">
                    <InfoRow label="Visiteur"  value={invitation.visitor_name} />
                    <InfoRow label="Hôte"      value={invitation.invited_by?.name ?? '—'} />
                    <InfoRow label="Date"      value={new Date(invitation.visit_date).toLocaleDateString('fr-FR')} />
                    <InfoRow label="Horaires"  value={`${invitation.visit_time_start} — ${invitation.visit_time_end}`} />
                    {invitation.purpose  && <InfoRow label="Objet"  value={invitation.purpose} />}
                    {invitation.location && <InfoRow label="Lieu"   value={invitation.location} />}
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setStep('scan')} className="flex-1 border-2 border-gray-200 text-gray-500 font-bold text-xl py-4 rounded-2xl">
                        Ce n'est pas moi
                    </button>
                    <button
                        onClick={handleInvitationCheckIn}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white font-black text-xl py-4 rounded-2xl disabled:opacity-50"
                    >
                        {loading ? 'Enregistrement…' : '✅ Confirmer mon arrivée'}
                    </button>
                </div>
            </div>
        </div>
    );

    // ── FORMULAIRE WALK-IN ────────────────────────────────────────────────────
    if (step === 'register') return (
        <div className="fixed inset-0 bg-[#9333EA] overflow-y-auto flex flex-col items-center py-8 px-6">
            <button onClick={reset} className="self-start text-white text-4xl opacity-60 hover:opacity-100 mb-4">←</button>

            <div className="text-white text-center mb-6">
                <div className="text-5xl font-black">Enregistrement visiteur</div>
                <div className="text-xl opacity-60 mt-1">Remplissez les informations ci-dessous</div>
            </div>

            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-lg mb-4 text-center">{error}</div>}

                {/* Photo webcam */}
                <div className="flex flex-col items-center mb-6">
                    {photoSrc ? (
                        <div className="relative">
                            <img src={photoSrc} alt="Photo" className="w-32 h-32 rounded-full object-cover border-4 border-[#9333EA]" />
                            <button onClick={() => { setPhotoSrc(null); startCamera(); }} className="absolute -bottom-2 -right-2 bg-gray-100 rounded-full p-1 text-sm">🔄</button>
                        </div>
                    ) : (
                        <div className="relative">
                            <video ref={videoRef} autoPlay muted playsInline className="w-32 h-32 rounded-full object-cover border-4 border-[#F39C12]" />
                            <button onClick={capturePhoto} className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#F39C12] text-white font-bold px-4 py-1 rounded-full text-sm">
                                Prendre photo
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Nom complet *" span={2}>
                        <input value={formData.full_name} onChange={e => setFormData(p => ({...p, full_name: e.target.value}))}
                            className="kiosk-input" placeholder="Jean Dupont" />
                    </Field>
                    <Field label="Société">
                        <input value={formData.company} onChange={e => setFormData(p => ({...p, company: e.target.value}))}
                            className="kiosk-input" placeholder="Nom de l'entreprise" />
                    </Field>
                    <Field label="Téléphone">
                        <input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                            className="kiosk-input" placeholder="+225 07 00 00 00 00" />
                    </Field>
                    <Field label="Type de pièce *">
                        <select value={formData.id_type} onChange={e => setFormData(p => ({...p, id_type: e.target.value}))}
                            className="kiosk-input">
                            {['CNI','Passeport','Permis','Autre'].map(t => <option key={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="N° de pièce *">
                        <input value={formData.id_number} onChange={e => setFormData(p => ({...p, id_number: e.target.value.toUpperCase()}))}
                            className="kiosk-input" placeholder="Ex: CI-123456789" />
                    </Field>
                    <Field label="Personne visitée *" span={2}>
                        <select value={formData.host_user_id} onChange={e => setFormData(p => ({...p, host_user_id: e.target.value}))}
                            className="kiosk-input">
                            <option value="">— Sélectionner un hôte —</option>
                            {hosts.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Motif *" span={2}>
                        <select value={formData.purpose} onChange={e => setFormData(p => ({...p, purpose: e.target.value}))}
                            className="kiosk-input">
                            {['réunion','livraison','maintenance','autre'].map(m => <option key={m}>{m}</option>)}
                        </select>
                    </Field>
                </div>

                <button
                    onClick={handleWalkInCheckIn}
                    disabled={loading}
                    className="w-full bg-[#9333EA] text-white font-black text-2xl py-5 rounded-2xl mt-6 disabled:opacity-50"
                >
                    {loading ? 'Enregistrement en cours…' : 'Enregistrer mon arrivée →'}
                </button>
            </div>

            <style>{`
                .kiosk-input { width:100%; border:2px solid #e5e7eb; border-radius:0.75rem; padding:0.875rem 1rem; font-size:1.125rem; }
                .kiosk-input:focus { outline:none; border-color:#9333EA; }
            `}</style>
        </div>
    );

    return null;
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-start gap-3">
            <span className="text-gray-400 font-semibold min-w-[100px] text-sm">{label} :</span>
            <span className="text-gray-900 font-bold text-base">{value}</span>
        </div>
    );
}

function Field({ label, children, span = 1 }) {
    return (
        <div className={span === 2 ? 'col-span-2' : ''}>
            <label className="block text-sm font-bold text-gray-600 mb-1">{label}</label>
            {children}
        </div>
    );
}
export { Kiosk };
