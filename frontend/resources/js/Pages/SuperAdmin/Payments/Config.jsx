import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// ─── Familles de paiement ─────────────────────────────────────────────────────
const TYPE_LABELS = {
  mobile_money:           { label: 'Mobile Money',               icon: '📱', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  electronic:             { label: 'Paiement électronique',      icon: '💳', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  bank_transfer:          { label: 'Virement national',          icon: '🏦', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  international_transfer: { label: 'Virement international',     icon: '🌐', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  money_transfer:         { label: 'Transfert d\'argent',        icon: '💸', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  cash_agency:            { label: 'Espèces en agence',          icon: '🏢', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  check:                  { label: 'Chèque',                    icon: '📝', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  crypto:                 { label: 'Cryptomonnaie',              icon: '₿',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  voucher:                { label: 'Voucher / Code prépayé',     icon: '🎁', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  delivery:               { label: 'Paiement à la livraison',   icon: '📦', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  additional:             { label: 'Autre moyen de paiement',   icon: '➕', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

// ─── Champs de configuration par type ────────────────────────────────────────
const CONFIG_FIELDS = {
  mobile_money:           ['instructions', 'merchant_number', 'ussd_code'],
  electronic:             ['public_key', 'redirect_url'],
  bank_transfer:          ['bank_name', 'account_number', 'iban', 'swift', 'instructions'],
  international_transfer: ['bank_name', 'swift', 'iban', 'instructions'],
  money_transfer:         ['receiver_name', 'receiver_country', 'instructions'],
  cash_agency:            ['agency_name', 'agency_address', 'instructions'],
  check:                  ['check_payable_to', 'instructions'],
  crypto:                 ['wallet_address', 'network', 'instructions'],
  voucher:                ['instructions'],
  delivery:               ['instructions'],
  additional:             ['instructions'],
};

// ─── Toggle ON/OFF ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

// ─── Carte configuration d'un provider ───────────────────────────────────────
function ProviderCard({ method, onUpdate }) {
  const [expanded, setExpanded]   = useState(false);
  const [local, setLocal]         = useState({ ...method });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  const typeConf = TYPE_LABELS[method.type] ?? { label: method.type, icon: '?', color: 'bg-gray-50 text-gray-700 border-gray-200' };
  const fields   = CONFIG_FIELDS[method.type] ?? ['instructions'];

  const handleToggleActive = async (val) => {
    const updated = { ...local, is_active: val };
    setLocal(updated);
    try {
      await axios.put(`/api/admin/payments/config/${method.id}`, { is_active: val });
      onUpdate({ ...method, is_active: val });
    } catch (e) {
      setLocal(prev => ({ ...prev, is_active: !val })); // rollback
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/admin/payments/config/${method.id}`, {
        is_test_mode: local.is_test_mode,
        config:       local.config ?? {},
        countries:    local.countries,
        plans:        local.plans,
      });
      setSaved(true);
      onUpdate(local);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key, value) => {
    setLocal(prev => ({ ...prev, config: { ...(prev.config ?? {}), [key]: value } }));
  };

  const secretFields = ['key', 'secret', 'token', 'password', 'hash'];
  const isSecret = (key) => secretFields.some(s => key.toLowerCase().includes(s));

  return (
    <div className={`bg-white rounded-xl border transition-colors ${
      local.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
    }`}>
      {/* En-tête */}
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl">{typeConf.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${typeConf.color}`}>
              {typeConf.label}
            </span>
            <span className="text-sm font-medium text-gray-900">{method.display_name}</span>
            {local.is_test_mode && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                Mode test
              </span>
            )}
          </div>
          {method.description && (
            <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={local.is_active} onChange={handleToggleActive} />
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            {expanded ? 'Masquer' : 'Configurer'}
          </button>
        </div>
      </div>

      {/* Panneau de configuration */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">

          {/* Mode test / production */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Mode production</p>
              <p className="text-xs text-gray-500">Désactivez pour utiliser les clés de test</p>
            </div>
            <Toggle
              checked={!local.is_test_mode}
              onChange={(val) => setLocal(prev => ({ ...prev, is_test_mode: !val }))}
            />
          </div>

          {/* Champs de configuration */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Configuration</p>
            {fields.map(field => {
              const value  = local.config?.[field] ?? '';
              const secret = isSecret(field);
              const shown  = showSecrets[field];

              return (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                    {field.replace(/_/g, ' ')}
                    {secret && <span className="ml-1 text-amber-600 text-xs">(clé secrète — chiffrée en base)</span>}
                  </label>
                  <div className="flex gap-1">
                    {field === 'instructions' ? (
                      <textarea
                        value={value}
                        onChange={e => updateConfig(field, e.target.value)}
                        rows={3}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono text-xs"
                        placeholder={`Instructions pour ${method.display_name}`}
                      />
                    ) : (
                      <input
                        type={secret && !shown ? 'password' : 'text'}
                        value={value}
                        onChange={e => updateConfig(field, e.target.value)}
                        placeholder={secret ? '***' : `Valeur de ${field}`}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      />
                    )}
                    {secret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))}
                        className="px-3 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 text-xs"
                      >
                        {shown ? 'Masquer' : 'Voir'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Restrictions pays */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Pays disponibles (laisser vide = tous)
            </label>
            <input
              type="text"
              value={(local.countries ?? []).join(', ')}
              onChange={e => setLocal(prev => ({
                ...prev,
                countries: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
              }))}
              placeholder="CI, SN, ML, CM…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
            />
          </div>

          {/* Bouton sauvegarde */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {saved && <span className="text-xs text-emerald-600">Sauvegardé !</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page principale Config ───────────────────────────────────────────────────
export default function PaymentsConfig() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    axios.get('/api/admin/payments/config')
      .then(r => setMethods(r.data.methods ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateMethod = (updated) => {
    setMethods(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const types = ['all', ...new Set(methods.map(m => m.type))];

  const visible = filter === 'all'
    ? methods
    : methods.filter(m => m.type === filter);

  return (
    <>
      <Head title="Configuration paiements — SuperAdmin SECRETIS" />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Configuration des paiements</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Activez les moyens de paiement et renseignez les clés API.
              Les clés secrètes sont chiffrées avant stockage en base.
            </p>
          </div>

          {/* Alerte sécurité */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Sécurité :</strong> Les clés API ne sont jamais exposées au navigateur client.
            Les webhooks sont vérifiés par signature HMAC (hash_equals — timing-safe).
            Le mode production ne doit être activé qu'après tests complets.
          </div>

          {/* Filtre par type */}
          <div className="flex flex-wrap gap-2">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t === 'all' ? 'Tous' : (TYPE_LABELS[t]?.label ?? t)}
              </button>
            ))}
          </div>

          {/* Liste des providers */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-sm text-gray-500">
              Aucun moyen de paiement configuré.
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map(method => (
                <ProviderCard
                  key={method.id}
                  method={method}
                  onUpdate={updateMethod}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
export { PaymentsConfig };
