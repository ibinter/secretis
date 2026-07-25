import { useState, useMemo } from 'react';

const SEPARATORS = ['-', '/', '.', '_'];
const YEAR_FORMAT = ['YYYY', 'YY'];

function buildPreview(prefix, separator, yearFmt) {
  const year = yearFmt === 'YYYY' ? new Date().getFullYear() : String(new Date().getFullYear()).slice(2);
  return `${prefix}${separator}${year}${separator}0001`;
}

export default function SetPrefix({ step, onComplete, onSkip, saving }) {
  const [prefix, setPrefix]     = useState(step?.data?.prefix    ?? 'CORR');
  const [type, setType]         = useState(step?.data?.type       ?? 'ENT');
  const [separator, setSep]     = useState(step?.data?.separator  ?? '-');
  const [yearFmt, setYearFmt]   = useState(step?.data?.yearFormat ?? 'YYYY');
  const [error, setError]       = useState('');

  const preview = useMemo(() => {
    const parts = [prefix, type].filter(Boolean);
    return buildPreview(parts.join(separator), separator, yearFmt);
  }, [prefix, type, separator, yearFmt]);

  const validate = () => {
    if (!prefix.trim()) { setError('Le préfixe est requis.'); return false; }
    if (!/^[A-Z0-9]{1,8}$/i.test(prefix)) { setError('Lettres et chiffres uniquement (max 8 caractères).'); return false; }
    setError('');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onComplete({ prefix, type, separator, yearFormat: yearFmt, preview });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Préfixe de courrier</h2>
        <p className="text-slate-400 text-sm">
          Ce préfixe sera utilisé pour numéroter automatiquement vos courriers et documents.
        </p>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-6 text-center">
        <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-2">Aperçu du numéro</p>
        <p className="text-3xl font-black text-white font-mono tracking-wider">{preview}</p>
        <p className="text-slate-400 text-xs mt-2">Le numéro s'incrémente automatiquement</p>
      </div>

      {/* Champs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Préfixe principal <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            maxLength={8}
            value={prefix}
            onChange={e => setPrefix(e.target.value.toUpperCase())}
            placeholder="CORR"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono text-lg tracking-wider"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Type (optionnel)</label>
          <input
            type="text"
            maxLength={6}
            value={type}
            onChange={e => setType(e.target.value.toUpperCase())}
            placeholder="ENT"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono text-lg tracking-wider"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Séparateur */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-3">Séparateur</label>
        <div className="flex gap-2">
          {SEPARATORS.map(s => (
            <button
              key={s} type="button"
              onClick={() => setSep(s)}
              className={`w-12 h-12 rounded-lg border font-mono text-lg font-bold transition-all
                ${separator === s ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/20 text-slate-400 hover:border-white/40'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Format année */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-3">Format de l'année</label>
        <div className="flex gap-2">
          {YEAR_FORMAT.map(f => (
            <button
              key={f} type="button"
              onClick={() => setYearFmt(f)}
              className={`px-4 py-2 rounded-lg border font-mono text-sm font-bold transition-all
                ${yearFmt === f ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/20 text-slate-400 hover:border-white/40'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
        >
          {saving ? '⏳ Enregistrement...' : 'Confirmer le préfixe →'}
        </button>
        {onSkip && (
          <button type="button" onClick={onSkip} disabled={saving} className="px-5 text-slate-400 text-sm border border-white/10 rounded-xl">
            Passer
          </button>
        )}
      </div>
    </form>
  );
}
export { SetPrefix };
