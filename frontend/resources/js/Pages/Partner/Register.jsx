import { Head, useForm, Link } from '@inertiajs/react';
import { Handshake, Building2, Send, CheckCircle2 } from 'lucide-react';

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

function Field({ label, error, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function PartnerRegister({ countries = [], partnerTypes = [] }) {
  const { data, setData, post, processing, errors, wasSuccessful } = useForm({
    company_name: '', contact_name: '', email: '', phone: '',
    country: '', partner_type: '', website: '', years_experience: '',
    known_softwares: '', clients_managed: '', motivation: '', gdpr_consent: false,
  });

  function submit(e) {
    e.preventDefault();
    post(route('partner.store'));
  }

  const selectedType = partnerTypes.find(t => t.value === data.partner_type);

  return (
    <>
      <Head title="Devenir partenaire — SECRETIS" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-10 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Handshake size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programme Partenaires IBIG</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
              Rejoignez notre réseau de partenaires et développez votre activité autour de SECRETIS ERP.
            </p>
          </div>

          {wasSuccessful ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-8 text-center">
              <CheckCircle2 size={44} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Candidature envoyée !</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Merci pour votre intérêt. Notre équipe examinera votre candidature et vous recontactera sous 48h.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">

              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-100 dark:border-gray-700">
                <Building2 size={16} className="text-indigo-500" /> Votre entreprise
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom de l'entreprise" error={errors.company_name} required>
                  <input value={data.company_name} onChange={e => setData('company_name', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Nom du contact" error={errors.contact_name} required>
                  <input value={data.contact_name} onChange={e => setData('contact_name', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Email" error={errors.email} required>
                  <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Téléphone" error={errors.phone}>
                  <input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="+225 …" className={inputCls} />
                </Field>
                <Field label="Pays" error={errors.country} required>
                  <select value={data.country} onChange={e => setData('country', e.target.value)} className={inputCls}>
                    <option value="">— Sélectionner —</option>
                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Site web" error={errors.website}>
                  <input value={data.website} onChange={e => setData('website', e.target.value)} placeholder="https://…" className={inputCls} />
                </Field>
              </div>

              <Field label="Type de partenariat" error={errors.partner_type} required>
                <select value={data.partner_type} onChange={e => setData('partner_type', e.target.value)} className={inputCls}>
                  <option value="">— Sélectionner —</option>
                  {partnerTypes.map(t => <option key={t.value} value={t.value}>{t.label} — {t.commission}% de commission</option>)}
                </select>
                {selectedType && (
                  <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                    Commission de {selectedType.commission}% sur les ventes apportées.
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Années d'expérience" error={errors.years_experience}>
                  <input type="number" min="0" max="50" value={data.years_experience} onChange={e => setData('years_experience', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Clients gérés" error={errors.clients_managed}>
                  <input type="number" min="0" value={data.clients_managed} onChange={e => setData('clients_managed', e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="Logiciels maîtrisés" error={errors.known_softwares}>
                <input value={data.known_softwares} onChange={e => setData('known_softwares', e.target.value)}
                  placeholder="Sage, Odoo, SAP…" className={inputCls} />
              </Field>

              <Field label="Motivation" error={errors.motivation} required>
                <textarea value={data.motivation} onChange={e => setData('motivation', e.target.value)}
                  rows={4} placeholder="Décrivez pourquoi vous souhaitez devenir partenaire (50 caractères min.)…"
                  className={`${inputCls} resize-none`} />
                <p className="mt-1 text-xs text-gray-400">{data.motivation.length} / 3000 caractères</p>
              </Field>

              <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input type="checkbox" checked={data.gdpr_consent} onChange={e => setData('gdpr_consent', e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span>J'accepte que mes données soient traitées dans le cadre de ma candidature au programme partenaires.</span>
              </label>
              {errors.gdpr_consent && <p className="text-xs text-red-500 -mt-2">{errors.gdpr_consent}</p>}

              <button type="submit" disabled={processing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                <Send size={15} /> {processing ? 'Envoi…' : 'Envoyer ma candidature'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Déjà partenaire ? <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </>
  );
}
