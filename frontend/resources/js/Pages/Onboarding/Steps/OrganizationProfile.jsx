import { useState, useRef, useCallback } from 'react';

const SECTORS = [
  'Administration publique', 'Agriculture', 'Banque & Finance', 'Commerce',
  'Construction & BTP', 'Éducation', 'Énergie', 'Industrie manufacturière',
  'Juridique', 'Médias & Communication', 'ONG / Associations', 'Santé',
  'Services informatiques', 'Télécommunications', 'Transport & Logistique', 'Autre',
];

const COUNTRIES = [
  'Bénin', 'Burkina Faso', "Côte d'Ivoire", 'Cameroun', 'Congo', 'Gabon',
  'Guinée', 'Madagascar', 'Mali', 'Mauritanie', 'Niger', 'Sénégal',
  'Tchad', 'Togo', 'RDC', 'Autre',
];

const CURRENCIES = ['XOF (F CFA)', 'XAF (F CFA)', 'USD', 'EUR', 'GNF', 'MGA'];

function LogoDropZone({ value, onChange }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative w-full h-36 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition-all duration-200
        ${dragging ? 'border-purple-400 bg-purple-500/10' : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'}`}
    >
      {value ? (
        <img src={value} alt="Logo" className="h-24 object-contain rounded-lg" />
      ) : (
        <>
          <span className="text-3xl">📸</span>
          <p className="text-slate-400 text-sm">Glisser-déposer ou cliquer pour uploader</p>
          <p className="text-slate-600 text-xs">PNG, JPG ou SVG — max 2 MB</p>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}

export default function OrganizationProfile({ step, onComplete, saving }) {
  const [form, setForm] = useState({
    name    : step?.data?.name     ?? '',
    logo    : step?.data?.logo     ?? null,
    sector  : step?.data?.sector   ?? '',
    country : step?.data?.country  ?? '',
    currency: step?.data?.currency ?? 'XOF (F CFA)',
  });
  const [errors, setErrors] = useState({});

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name    = 'Le nom est requis.';
    if (!form.sector)       e.sector  = 'Le secteur est requis.';
    if (!form.country)      e.country = 'Le pays est requis.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onComplete(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Profil de votre organisation</h2>
        <p className="text-slate-400 text-sm">Ces informations apparaîtront sur vos courriers et documents.</p>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Logo</label>
        <LogoDropZone value={form.logo} onChange={v => set('logo', v)} />
      </div>

      {/* Nom */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Nom de l'organisation <span className="text-red-400">*</span></label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Ex : Ministère de la Santé Publique"
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-colors"
        />
        {errors.name && <p className="mt-1 text-red-400 text-xs">{errors.name}</p>}
      </div>

      {/* Secteur + Pays côte à côte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Secteur d'activité <span className="text-red-400">*</span></label>
          <select
            value={form.sector}
            onChange={e => set('sector', e.target.value)}
            className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 transition-colors"
          >
            <option value="">-- Choisir --</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.sector && <p className="mt-1 text-red-400 text-xs">{errors.sector}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Pays <span className="text-red-400">*</span></label>
          <select
            value={form.country}
            onChange={e => set('country', e.target.value)}
            className="w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 transition-colors"
          >
            <option value="">-- Choisir --</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.country && <p className="mt-1 text-red-400 text-xs">{errors.country}</p>}
        </div>
      </div>

      {/* Devise */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Devise</label>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map(c => (
            <button
              key={c} type="button"
              onClick={() => set('currency', c)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
                ${form.currency === c
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-white/20 text-slate-400 hover:border-white/40 hover:text-white'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {saving ? <><span className="animate-spin">⏳</span> Enregistrement...</> : 'Continuer →'}
      </button>
    </form>
  );
}
export { OrganizationProfile };
