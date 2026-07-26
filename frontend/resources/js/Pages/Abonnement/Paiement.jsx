import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

/**
 * Page Paiement — Sélection de plan et initiation du paiement
 *
 * Étapes :
 *   1. Sélectionner un plan (3 cartes)
 *   2. Sélectionner une méthode de paiement (10 familles avec icônes)
 *   3. Suivre les instructions dynamiques selon la méthode
 *   4. Uploader la preuve (pour paiements manuels)
 *   5. Suivre le statut en temps réel (polling toutes les 5s)
 *
 * SÉCURITÉ :
 * - L'upload de preuve va vers une route authentifiée (storage privé)
 * - Le statut est pollé côté serveur — jamais mis à jour localement
 * - Aucune logique de validation de paiement côté client
 */

// =============================================================================
// Données statiques
// =============================================================================

const PLANS = [
    {
        slug:          'starter',
        name:          'Starter',
        price_xof:     25000,
        price_eur:     38,
        description:   'Idéal pour les petites structures',
        max_users:     5,
        highlighted:   false,
        features: [
            'Agenda & réunions',
            'Courrier simple',
            'Gestion documents',
            '5 utilisateurs max',
            'Support email',
        ],
        modules: ['agenda', 'courrier', 'documents'],
    },
    {
        slug:          'pro',
        name:          'Professionnel',
        price_xof:     60000,
        price_eur:     91,
        description:   'Pour les organisations en croissance',
        max_users:     25,
        highlighted:   true,
        badge:         'Populaire',
        features: [
            'Tout Starter +',
            'Gestion de projets',
            'RH & congés',
            'Rapports avancés',
            '25 utilisateurs max',
            'Support prioritaire',
        ],
        modules: ['agenda', 'courrier', 'documents', 'projets', 'rh'],
    },
    {
        slug:          'enterprise',
        name:          'Entreprise',
        price_xof:     120000,
        price_eur:     183,
        description:   'Pour les grandes institutions',
        max_users:     100,
        highlighted:   false,
        features: [
            'Tout Pro +',
            'Multi-département',
            'API & intégrations',
            'Audit avancé',
            '100 utilisateurs max',
            'Support dédié 24/7',
        ],
        modules: ['agenda', 'courrier', 'documents', 'projets', 'rh', 'audit', 'api'],
    },
];

const PAYMENT_METHODS = [
    { id: 'cinetpay',      label: 'CinetPay',       icon: '💳', type: 'card',         countries: ['CI', 'SN', 'CM', 'BF'] },
    { id: 'paystack',      label: 'Paystack',        icon: '💳', type: 'card',         countries: ['*'] },
    { id: 'flutterwave',   label: 'Flutterwave',     icon: '💳', type: 'card',         countries: ['*'] },
    { id: 'orange_money',  label: 'Orange Money',    icon: '🟠', type: 'mobile_money', countries: ['CI', 'SN', 'ML', 'BF', 'CM'] },
    { id: 'mtn_momo',      label: 'MTN MoMo',        icon: '🟡', type: 'mobile_money', countries: ['CI', 'CM', 'GH', 'RW', 'UG'] },
    { id: 'moov_money',    label: 'Moov Money',      icon: '🔵', type: 'mobile_money', countries: ['CI', 'BF', 'BJ', 'ML', 'TG'] },
    { id: 'wave',          label: 'Wave',            icon: '🌊', type: 'mobile_money', countries: ['CI', 'SN'] },
    { id: 'bank_transfer', label: 'Virement bancaire', icon: '🏦', type: 'bank_transfer', countries: ['*'] },
    { id: 'cash',          label: 'Espèces (agence)', icon: '💵', type: 'cash',         countries: ['CI'] },
    { id: 'voucher',       label: 'Code Voucher',    icon: '🎫', type: 'voucher',       countries: ['*'] },
];

const DURATION_OPTIONS = [
    { months: 1,  label: '1 mois',    discount: 0 },
    { months: 3,  label: '3 mois',    discount: 5 },
    { months: 6,  label: '6 mois',    discount: 10 },
    { months: 12, label: '1 an',      discount: 20 },
];

// =============================================================================
// Composant principal
// =============================================================================

export default function Paiement() {
    const [step, setStep]                 = useState(1); // 1=Plan, 2=Méthode, 3=Paiement, 4=Confirmation
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [selectedDuration, setSelectedDuration] = useState(1);
    const [currency, setCurrency]         = useState('XOF');
    const [payment, setPayment]           = useState(null);
    const [instructions, setInstructions] = useState(null);
    const [proofFile, setProofFile]       = useState(null);
    const [proofUploaded, setProofUploaded] = useState(false);
    const [dragging, setDragging]         = useState(false);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState(null);
    const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHODS);
    const [pollingStatus, setPollingStatus] = useState(null);
    const [voucherCode, setVoucherCode]   = useState('');

    // -------------------------------------------------------------------------
    // Chargement des méthodes disponibles (selon pays de l'org)
    // -------------------------------------------------------------------------

    useEffect(() => {
        axios.get('/api/subscription/payment-methods').then(({ data }) => {
            if (data.methods?.length > 0) {
                setPaymentMethods(data.methods);
            }
            if (data.currency) setCurrency(data.currency);
        }).catch(() => {}); // Fallback sur les méthodes statiques
    }, []);

    // -------------------------------------------------------------------------
    // Polling du statut de paiement (toutes les 5 secondes)
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!payment?.id || pollingStatus === 'validated' || pollingStatus === 'rejected') {
            return;
        }

        const interval = setInterval(async () => {
            try {
                const { data } = await axios.get(`/api/payments/${payment.id}/status`);
                setPollingStatus(data.status);

                if (data.status === 'validated') {
                    clearInterval(interval);
                    setStep(4); // Confirmation
                } else if (data.status === 'rejected') {
                    clearInterval(interval);
                }
            } catch (err) {
                // Polling silencieux — ne pas alerter l'utilisateur
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [payment?.id, pollingStatus]);

    // -------------------------------------------------------------------------
    // Calcul du prix avec remise durée
    // -------------------------------------------------------------------------

    const getPrice = useCallback(() => {
        if (!selectedPlan) return 0;
        const base     = currency === 'XOF' ? selectedPlan.price_xof : selectedPlan.price_eur;
        const option   = DURATION_OPTIONS.find(d => d.months === selectedDuration);
        const discount = option?.discount ?? 0;
        const total    = base * selectedDuration;
        return Math.round(total * (1 - discount / 100));
    }, [selectedPlan, selectedDuration, currency]);

    // -------------------------------------------------------------------------
    // Étape 3 : Initier le paiement
    // -------------------------------------------------------------------------

    const initiatePayment = async () => {
        if (!selectedPlan || !selectedMethod) return;

        setLoading(true);
        setError(null);

        try {
            const method = selectedMethod.type === 'card'         ? 'card'
                         : selectedMethod.type === 'mobile_money' ? 'mobile_money'
                         : selectedMethod.type === 'bank_transfer'? 'bank_transfer'
                         : selectedMethod.type === 'cash'         ? 'cash'
                         :                                          'mobile_money';

            const { data } = await axios.post('/api/payments/initiate', {
                plan_slug:       selectedPlan.slug,
                method:          method,
                currency:        currency,
                duration_months: selectedDuration,
            });

            setPayment(data);
            setInstructions(data.instructions);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Erreur lors de l\'initiation du paiement.');
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // Upload de preuve (drag & drop + clic)
    // -------------------------------------------------------------------------

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) validateAndSetProof(file);
    };

    const validateAndSetProof = (file) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowed.includes(file.type)) {
            setError('Format non accepté. Utilisez PDF, JPEG ou PNG.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Fichier trop volumineux (max 5 MB).');
            return;
        }
        setError(null);
        setProofFile(file);
    };

    const uploadProof = async () => {
        if (!proofFile || !payment?.payment_id) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('proof', proofFile);

        try {
            await axios.post(`/api/payments/${payment.payment_id}/proof`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setProofUploaded(true);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Erreur lors de l\'upload.');
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // Sous-composants
    // -------------------------------------------------------------------------

    /** Cartes de plans */
    const PlanCard = ({ plan }) => {
        const price    = currency === 'XOF' ? plan.price_xof : plan.price_eur;
        const selected = selectedPlan?.slug === plan.slug;

        return (
            <button
                onClick={() => setSelectedPlan(plan)}
                className={`relative flex flex-col rounded-2xl border-2 p-5 text-left transition-all ${
                    selected
                        ? 'border-purple-600 bg-purple-50 shadow-lg shadow-blue-100'
                        : plan.highlighted
                        ? 'border-purple-200 bg-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
            >
                {plan.badge && (
                    <span className="absolute -top-3 right-4 rounded-full bg-purple-600 px-3 py-0.5 text-xs font-bold text-white">
                        {plan.badge}
                    </span>
                )}
                {selected && (
                    <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs text-white">
                        ✓
                    </span>
                )}
                <h3 className="mb-1 text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="mb-3 text-xs text-gray-500">{plan.description}</p>
                <p className="mb-4 text-2xl font-extrabold text-purple-600">
                    {new Intl.NumberFormat('fr-FR').format(price)}
                    <span className="ml-1 text-sm font-normal text-gray-500">{currency}/mois</span>
                </p>
                <ul className="space-y-1.5">
                    {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="text-green-500">✓</span> {f}
                        </li>
                    ))}
                </ul>
            </button>
        );
    };

    /** Carte de méthode de paiement */
    const MethodCard = ({ method }) => {
        const selected = selectedMethod?.id === method.id;
        return (
            <button
                onClick={() => setSelectedMethod(method)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                    selected
                        ? 'border-purple-600 bg-purple-50 shadow'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
            >
                <span className="text-2xl">{method.icon}</span>
                <span className="text-center text-xs font-medium text-gray-700 leading-tight">{method.label}</span>
            </button>
        );
    };

    /** Instructions dynamiques selon la méthode */
    const PaymentInstructions = () => {
        if (!instructions) return null;

        return (
            <div className="rounded-xl border border-purple-100 bg-purple-50 p-5 space-y-3">
                <h3 className="font-semibold text-purple-900">{instructions.title}</h3>

                <ol className="list-decimal list-inside space-y-2">
                    {instructions.steps?.map((step, i) => (
                        <li key={i} className="text-sm text-purple-800">{step}</li>
                    ))}
                </ol>

                {/* Mobile Money : numéro marchand + code USSD */}
                {instructions.type === 'mobile_money' && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        {instructions.merchant_number && (
                            <div className="rounded-lg border border-purple-200 bg-white p-3">
                                <p className="text-xs text-gray-500">Numéro marchand</p>
                                <p className="text-lg font-bold tracking-widest text-purple-700">
                                    {instructions.merchant_number}
                                </p>
                            </div>
                        )}
                        {instructions.ussd_code && (
                            <div className="rounded-lg border border-purple-200 bg-white p-3">
                                <p className="text-xs text-gray-500">Code USSD</p>
                                <p className="text-lg font-bold tracking-widest text-purple-700">
                                    {instructions.ussd_code}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Virement : RIB */}
                {instructions.type === 'bank_transfer' && (
                    <div className="mt-3 space-y-2">
                        <div className="rounded-lg border border-purple-200 bg-white p-3 text-sm">
                            <p className="font-medium text-gray-700">{instructions.bank_name}</p>
                            {instructions.iban && (
                                <p className="font-mono text-gray-900 mt-1">{instructions.iban}</p>
                            )}
                            {instructions.swift && (
                                <p className="text-xs text-gray-500 mt-0.5">SWIFT: {instructions.swift}</p>
                            )}
                        </div>
                        <p className="text-xs font-semibold text-red-600">
                            ⚠️ Mentionnez impérativement votre référence : {payment?.idempotency_key?.slice(0, 8).toUpperCase()}
                        </p>
                    </div>
                )}

                {/* Voucher : champ de saisie */}
                {instructions.type === 'voucher' && (
                    <div className="mt-3">
                        <input
                            type="text"
                            placeholder="Entrez votre code voucher"
                            value={voucherCode}
                            onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-center tracking-widest text-lg uppercase"
                            maxLength={20}
                        />
                    </div>
                )}

                {/* Référence de paiement (toujours affichée) */}
                <div className="rounded-lg border border-purple-200 bg-white p-3 mt-2">
                    <p className="text-xs text-gray-500 mb-0.5">Votre référence de paiement</p>
                    <p className="font-mono text-sm font-bold text-gray-800">
                        {payment?.idempotency_key}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Conservez cette référence pour tout litige</p>
                </div>
            </div>
        );
    };

    /** Zone d'upload drag & drop */
    const ProofUpload = () => (
        <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Preuve de paiement</h3>
            <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer ${
                    dragging
                        ? 'border-purple-500 bg-purple-50'
                        : proofFile
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                }`}
                onClick={() => document.getElementById('proof-input').click()}
            >
                <input
                    id="proof-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => e.target.files[0] && validateAndSetProof(e.target.files[0])}
                />
                {proofFile ? (
                    <>
                        <span className="text-3xl mb-2">✅</span>
                        <p className="font-medium text-green-700">{proofFile.name}</p>
                        <p className="text-xs text-green-500 mt-0.5">
                            {(proofFile.size / 1024).toFixed(0)} KB
                        </p>
                    </>
                ) : (
                    <>
                        <span className="text-3xl mb-2">📎</span>
                        <p className="font-medium text-gray-600">
                            Glissez votre reçu ici ou cliquez pour sélectionner
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPEG ou PNG — max 5 MB</p>
                    </>
                )}
            </div>

            {proofFile && !proofUploaded && (
                <button
                    onClick={uploadProof}
                    disabled={loading}
                    className="w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition"
                >
                    {loading ? 'Upload en cours...' : '📤 Envoyer la preuve de paiement'}
                </button>
            )}

            {proofUploaded && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                    <p className="text-green-700 font-semibold">✅ Preuve envoyée avec succès</p>
                    <p className="text-xs text-green-600 mt-1">
                        Notre équipe va valider votre paiement dans les 24h ouvrées.
                    </p>
                </div>
            )}
        </div>
    );

    /** Indicateur de statut en temps réel */
    const StatusIndicator = () => {
        const statuses = {
            pending:   { icon: '⏳', label: 'En attente de validation', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
            validated: { icon: '✅', label: 'Paiement validé !',         color: 'text-green-700 bg-green-50 border-green-200' },
            rejected:  { icon: '❌', label: 'Paiement refusé',           color: 'text-red-700 bg-red-50 border-red-200' },
        };
        const s = statuses[pollingStatus ?? 'pending'];
        return (
            <div className={`flex items-center gap-3 rounded-xl border p-4 ${s.color}`}>
                <span className="text-2xl">{s.icon}</span>
                <div>
                    <p className="font-semibold">{s.label}</p>
                    {pollingStatus === 'pending' && (
                        <p className="text-xs mt-0.5 opacity-75">
                            Vérification automatique toutes les 5 secondes...
                        </p>
                    )}
                </div>
                {pollingStatus === 'pending' && (
                    <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
            </div>
        );
    };

    // -------------------------------------------------------------------------
    // Rendu principal
    // -------------------------------------------------------------------------

    // Étape 4 : Confirmation finale
    if (step === 4) {
        return (
            <div className="mx-auto max-w-lg py-16 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement confirmé !</h1>
                <p className="text-gray-600 mb-6">
                    Votre licence SECRETIS ERP est maintenant active.
                    Un email de confirmation vous a été envoyé.
                </p>
                <button
                    onClick={() => router.visit('/abonnement')}
                    className="rounded-xl bg-purple-600 px-8 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition"
                >
                    Voir mon abonnement
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl p-6 space-y-6">

            {/* En-tête + étapes */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Souscrire à un plan</h1>
                <div className="mt-4 flex items-center gap-2">
                    {['Choisir un plan', 'Mode de paiement', 'Finaliser'].map((label, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                step > i + 1 ? 'bg-green-500 text-white'
                                : step === i + 1 ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-500'
                            }`}>
                                {step > i + 1 ? '✓' : i + 1}
                            </div>
                            <span className={`text-sm ${step === i + 1 ? 'font-semibold text-purple-600' : 'text-gray-400'}`}>
                                {label}
                            </span>
                            {i < 2 && <div className="mx-2 h-px w-8 bg-gray-200" />}
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    ⚠️ {error}
                </div>
            )}

            {/* ================================================================
                ÉTAPE 1 : Sélection du plan
            ================================================================ */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Durée + devise */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex gap-2">
                            {DURATION_OPTIONS.map(opt => (
                                <button
                                    key={opt.months}
                                    onClick={() => setSelectedDuration(opt.months)}
                                    className={`rounded-lg px-3 py-1.5 text-sm transition ${
                                        selectedDuration === opt.months
                                            ? 'bg-purple-600 text-white'
                                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                    {opt.discount > 0 && (
                                        <span className="ml-1 text-xs font-bold text-green-400">-{opt.discount}%</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto flex gap-1 rounded-lg border p-1">
                            {['XOF', 'EUR'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setCurrency(c)}
                                    className={`rounded px-3 py-1 text-xs font-medium transition ${
                                        currency === c ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cartes plan */}
                    <div className="grid grid-cols-3 gap-4">
                        {PLANS.map(plan => <PlanCard key={plan.slug} plan={plan} />)}
                    </div>

                    {selectedPlan && (
                        <div className="flex items-center justify-between rounded-xl bg-purple-50 border border-purple-100 px-5 py-4">
                            <div>
                                <p className="font-semibold text-purple-900">
                                    {selectedPlan.name} — {selectedDuration} mois
                                </p>
                                <p className="text-xs text-purple-600 mt-0.5">
                                    {DURATION_OPTIONS.find(d => d.months === selectedDuration)?.discount > 0 &&
                                        `Économie de ${DURATION_OPTIONS.find(d => d.months === selectedDuration).discount}% appliquée`
                                    }
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-extrabold text-purple-700">
                                    {new Intl.NumberFormat('fr-FR').format(getPrice())} {currency}
                                </p>
                                <p className="text-xs text-purple-500">
                                    ≈ {new Intl.NumberFormat('fr-FR').format(Math.round(getPrice() / selectedDuration))} {currency}/mois
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setStep(2)}
                        disabled={!selectedPlan}
                        className="w-full rounded-xl bg-purple-600 py-3.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40 transition"
                    >
                        Continuer → Choisir le mode de paiement
                    </button>
                </div>
            )}

            {/* ================================================================
                ÉTAPE 2 : Sélection du mode de paiement
            ================================================================ */}
            {step === 2 && (
                <div className="space-y-5">
                    <div className="grid grid-cols-5 gap-3">
                        {paymentMethods.map(method => (
                            <MethodCard key={method.id} method={method} />
                        ))}
                    </div>

                    {selectedMethod && (
                        <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-800">
                            Méthode sélectionnée : <strong>{selectedMethod.label}</strong>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            ← Retour
                        </button>
                        <button
                            onClick={initiatePayment}
                            disabled={!selectedMethod || loading}
                            className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40 transition"
                        >
                            {loading ? 'Création du paiement...' : 'Initier le paiement →'}
                        </button>
                    </div>
                </div>
            )}

            {/* ================================================================
                ÉTAPE 3 : Instructions + upload preuve
            ================================================================ */}
            {step === 3 && (
                <div className="space-y-5">

                    {/* Récapitulatif */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Plan</span>
                            <span className="font-semibold">{selectedPlan?.name}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-500">Durée</span>
                            <span className="font-semibold">{selectedDuration} mois</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-500">Montant</span>
                            <span className="font-bold text-purple-700">
                                {new Intl.NumberFormat('fr-FR').format(payment?.amount ?? getPrice())} {currency}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-500">Méthode</span>
                            <span className="font-semibold">{selectedMethod?.label}</span>
                        </div>
                    </div>

                    {/* Instructions selon la méthode */}
                    <PaymentInstructions />

                    {/* Upload preuve (pour Mobile Money, Virement, Cash) */}
                    {['mobile_money', 'bank_transfer', 'cash'].includes(selectedMethod?.type) && (
                        <ProofUpload />
                    )}

                    {/* Statut en temps réel */}
                    <StatusIndicator />

                    <button
                        onClick={() => setStep(2)}
                        className="text-sm text-gray-500 hover:text-gray-700 transition"
                    >
                        ← Changer de méthode
                    </button>
                </div>
            )}
        </div>
    );
}
export { Paiement };
