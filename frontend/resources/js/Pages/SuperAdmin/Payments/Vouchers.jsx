import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ico = {
  Plus:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  X:       () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Download:() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  Eye:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Gift:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1010.875 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1113.125 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
};

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, accent }) {
  const colors = {
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
    red:     'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${colors[accent] ?? colors.indigo}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ─── Badge statut voucher ─────────────────────────────────────────────────────
function VoucherStatusBadge({ status }) {
  const map = {
    available: { label: 'Disponible', cls: 'bg-emerald-100 text-emerald-700' },
    used:      { label: 'Utilisé',    cls: 'bg-gray-100 text-gray-600' },
    expired:   { label: 'Expiré',     cls: 'bg-red-100 text-red-600' },
    disabled:  { label: 'Désactivé',  cls: 'bg-orange-100 text-orange-600' },
  };
  const s = map[status] ?? map.available;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Modal : générer un lot ───────────────────────────────────────────────────
function GenerateModal({ onClose, onGenerated }) {
  const [form, setForm] = useState({ name: '', value: '', quantity: 10, expires_at: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (!form.name.trim()) { setError('Nom du lot obligatoire.'); return; }
    if (!form.value || +form.value <= 0) { setError('Valeur invalide.'); return; }
    if (!form.quantity || +form.quantity < 1 || +form.quantity > 1000) {
      setError('Quantité entre 1 et 1 000.'); return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/v1/superadmin/vouchers', {
        name:       form.name.trim(),
        value:      +form.value,
        quantity:   +form.quantity,
        expires_at: form.expires_at || null,
      });
      setDownloadUrl(res.data.download_url ?? '');
      onGenerated?.();
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erreur lors de la génération.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">Générer un lot de vouchers</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <Ico.X />
          </button>
        </div>

        {!downloadUrl ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du lot <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ex : Promo Rentrée 2024"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valeur (FCFA) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={form.value}
                  onChange={e => set('value', e.target.value)}
                  placeholder="45 000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité (max 1 000)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={form.quantity}
                  onChange={e => set('quantity', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'expiration <span className="text-gray-400">(optionnelle)</span>
              </label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => set('expires_at', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Génération…' : 'Générer le lot'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900">Lot généré avec succès</p>
            <p className="text-sm text-gray-600">{form.quantity} codes créés.</p>
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Ico.Download /> Télécharger le CSV
            </a>
            <div>
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal : voir les codes d'un lot ─────────────────────────────────────────
function CodesModal({ batch, onClose }) {
  const [codes, setCodes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);

  useEffect(() => {
    axios.get(`/api/v1/superadmin/vouchers/batches/${batch.id}/codes`)
      .then(r => setCodes(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batch.id]);

  const filtered = codes.filter(c =>
    !search || c.code.toLowerCase().includes(search.toLowerCase()) || (c.organization_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{batch.name}</h3>
            <p className="text-xs text-gray-500">{batch.quantity} codes · Valeur : {fmt(batch.value)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Ico.X /></button>
        </div>

        {/* Recherche */}
        <div className="px-6 py-3 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un code ou une organisation…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>

        {/* Tableau */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="text-left px-6 py-2.5 font-medium">Code</th>
                  <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                  <th className="text-left px-4 py-2.5 font-medium">Organisation</th>
                  <th className="text-left px-4 py-2.5 font-medium">Utilisé le</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 50, page * 50).map(c => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-2.5 font-mono text-sm tracking-widest text-gray-900">{c.code}</td>
                    <td className="px-4 py-2.5"><VoucherStatusBadge status={c.status} /></td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{c.organization_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{fmtDate(c.used_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">Aucun résultat</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 50 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              ← Préc.
            </button>
            <span className="text-gray-500">Page {page} / {Math.ceil(filtered.length / 50)}</span>
            <button disabled={page * 50 >= filtered.length} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              Suiv. →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Vouchers() {
  const [batches, setBatches]       = useState([]);
  const [kpis, setKpis]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const load = async () => {
    try {
      const [b, k] = await Promise.all([
        axios.get('/api/v1/superadmin/vouchers/batches'),
        axios.get('/api/v1/superadmin/vouchers/kpis'),
      ]);
      setBatches(b.data.data ?? []);
      setKpis(k.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDisableBatch = async (id) => {
    if (!confirm('Désactiver ce lot ? Les codes non utilisés ne pourront plus être utilisés.')) return;
    try {
      await axios.put(`/api/v1/superadmin/vouchers/batches/${id}/disable`);
      setBatches(prev => prev.map(b => b.id === id ? { ...b, disabled: true } : b));
    } catch (e) {
      alert(e.response?.data?.message ?? 'Erreur.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head title="Vouchers — SuperAdmin SECRETIS" />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* En-tête */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Vouchers</h1>
              <p className="text-sm text-gray-500">Gestion des codes prépayés SECRETIS</p>
            </div>
            <button
              onClick={() => setShowGenerate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <Ico.Plus /> Générer un lot
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile label="Codes générés" value={(kpis?.total ?? 0).toLocaleString('fr-FR')} accent="indigo" />
            <KpiTile label="Utilisés" value={(kpis?.used ?? 0).toLocaleString('fr-FR')} accent="emerald" />
            <KpiTile label="Disponibles" value={(kpis?.available ?? 0).toLocaleString('fr-FR')} accent="amber" />
            <KpiTile label="Expirés" value={(kpis?.expired ?? 0).toLocaleString('fr-FR')} accent="red" />
          </div>

          {/* Tableau des lots */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Lots de vouchers</h2>
            </div>
            {batches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2.5 px-4 font-medium">Nom du lot</th>
                      <th className="py-2.5 px-4 font-medium">Valeur</th>
                      <th className="py-2.5 px-4 font-medium">Qté</th>
                      <th className="py-2.5 px-4 font-medium">Utilisés</th>
                      <th className="py-2.5 px-4 font-medium">Créé le</th>
                      <th className="py-2.5 px-4 font-medium">Expiration</th>
                      <th className="py-2.5 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map(b => (
                      <tr key={b.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${b.disabled ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{b.name}</p>
                          {b.disabled && (
                            <span className="text-xs text-orange-600 font-medium">Désactivé</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium tabular-nums text-gray-900">{fmt(b.value)}</td>
                        <td className="py-3 px-4 tabular-nums text-gray-700">{b.quantity}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-gray-700">{b.used_count} / {b.quantity}</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.round((b.used_count / b.quantity) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">{fmtDate(b.created_at)}</td>
                        <td className="py-3 px-4 text-xs text-gray-500">{fmtDate(b.expires_at)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedBatch(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs text-gray-700 transition-colors"
                            >
                              <Ico.Eye /> Codes
                            </button>
                            <a
                              href={`/api/v1/superadmin/vouchers/batches/${b.id}/export`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs text-gray-700 transition-colors"
                            >
                              <Ico.Download /> CSV
                            </a>
                            {!b.disabled && (
                              <button
                                onClick={() => handleDisableBatch(b.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-orange-200 hover:bg-orange-50 rounded-lg text-xs text-orange-600 transition-colors"
                              >
                                Désactiver
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-14 text-center">
                <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
                  <Ico.Gift />
                </div>
                <p className="text-sm text-gray-500">Aucun lot généré. Créez votre premier lot de vouchers.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals */}
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onGenerated={() => { load(); }}
        />
      )}

      {selectedBatch && (
        <CodesModal
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </>
  );
}
export { Vouchers };
