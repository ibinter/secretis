import { useState, useEffect } from 'react';

function StatCard({ label, value, sub, color = 'blue', icon }) {
  const colors = {
    blue  : 'from-purple-600/20 to-purple-700/20 border-purple-500/30 text-purple-300',
    green : 'from-green-600/20 to-green-700/20 border-green-500/30 text-green-300',
    amber : 'from-amber-600/20 to-amber-700/20 border-amber-500/30 text-amber-300',
    red   : 'from-red-600/20 to-red-700/20 border-red-500/30 text-red-300',
    purple: 'from-purple-600/20 to-purple-700/20 border-purple-500/30 text-purple-300',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-slate-400 font-medium">{label}</span>
      </div>
      <div className={`text-3xl font-black mb-1 ${colors[color].split(' ')[3]}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colors = { blue: 'bg-purple-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className="flex items-center gap-4">
      <span className="w-28 text-sm text-slate-400 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden">
        <div
          className={`${colors[color]} h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
          style={{ width: `${pct}%` }}
        >
          {pct > 15 && <span className="text-white text-xs font-bold">{value}</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-xs text-slate-400 w-8">{value}</span>}
      <span className="text-xs text-slate-500 w-10">{pct}%</span>
    </div>
  );
}

export default function TrialAnalytics() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/superadmin/trial-analytics?period=${period}`, { headers: { Accept: 'application/json' } });
        const d   = await res.json();
        setData(d);
      } catch {
        // Demo data for display
        setData({
          funnel: { registered: 248, active: 142, converted: 67, expired: 39 },
          conversionRate: 27.0,
          expiringSoon: [
            { organization: 'Ministère de la Santé', plan: 'pro', expiresAt: '2026-07-23', remainingDays: 2 },
            { organization: 'ONG HELP AFRICA',        plan: 'starter', expiresAt: '2026-07-24', remainingDays: 3 },
            { organization: 'BTP Côte d\'Ivoire SA',  plan: 'pro', expiresAt: '2026-07-25', remainingDays: 4 },
          ],
          featuresUsed: [
            { module: 'Gestion du courrier', usage_count: 1842 },
            { module: 'Gestion documentaire', usage_count: 1204 },
            { module: 'Événements', usage_count: 987 },
            { module: 'SARA (IA)', usage_count: 754 },
            { module: 'Rapports', usage_count: 612 },
          ],
          bySource: [
            { source: 'web',     total: 198, converted: 54 },
            { source: 'api',     total: 32,  converted: 10 },
            { source: 'partner', total: 18,  converted: 3  },
          ],
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [period]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg animate-pulse">Chargement des analytics...</div>
      </div>
    );
  }

  const f   = data?.funnel ?? {};
  const max = f.registered ?? 1;

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white">📊 Analytics Trials</h1>
            <p className="text-slate-400 mt-1">Suivi des essais gratuits et conversions</p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d', '1y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                  ${period === p ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="📝" label="Inscrits"     value={f.registered}     color="blue"   sub="Total trials démarrés" />
          <StatCard icon="⚡" label="Actifs"       value={f.active}         color="green"  sub="En cours de trial" />
          <StatCard icon="💰" label="Convertis"    value={f.converted}      color="purple" sub={`Taux : ${data?.conversionRate}%`} />
          <StatCard icon="⏰" label="Expirés"      value={f.expired}        color="red"    sub="Non convertis" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Funnel */}
          <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-6">🎯 Funnel de conversion</h2>
            <div className="space-y-4">
              <FunnelBar label="Inscrits"  value={f.registered} max={max} color="blue" />
              <FunnelBar label="Actifs"    value={f.active}     max={max} color="green" />
              <FunnelBar label="Convertis" value={f.converted}  max={max} color="amber" />
              <FunnelBar label="Expirés"   value={f.expired}    max={max} color="red" />
            </div>

            {/* Conversion rate big number */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Taux de conversion global</p>
                <p className="text-5xl font-black text-green-400">{data?.conversionRate}%</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Objectif</p>
                <p className="text-2xl font-bold text-slate-300">35%</p>
                <div className="w-24 bg-slate-700 rounded-full h-2 mt-1">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(100, (data?.conversionRate / 35) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-6">🌐 Sources d'acquisition</h2>
            <div className="space-y-4">
              {data?.bySource?.map(s => {
                const rate = s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0;
                return (
                  <div key={s.source} className="p-3 bg-white/5 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold text-sm capitalize">{s.source}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rate >= 25 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {rate}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{s.total} trials</span>
                      <span>{s.converted} convertis</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Features usage */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-6">⚡ Features les plus utilisées</h2>
            <div className="space-y-4">
              {data?.featuresUsed?.map((feat, i) => {
                const maxUsage = data.featuresUsed[0]?.usage_count ?? 1;
                const pct      = Math.round((feat.usage_count / maxUsage) * 100);
                return (
                  <div key={feat.module}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 flex items-center gap-2">
                        <span className="text-slate-500 w-4">#{i+1}</span>
                        {feat.module}
                      </span>
                      <span className="text-slate-400 font-semibold">{feat.usage_count.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expiring soon */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-6">⏰ Trials expirant bientôt</h2>
            <div className="space-y-3">
              {data?.expiringSoon?.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-8">Aucun trial n'expire dans les 3 prochains jours.</p>
              )}
              {data?.expiringSoon?.map((org, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/15 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs flex-shrink-0
                    ${org.remainingDays <= 1 ? 'bg-red-600' : org.remainingDays <= 2 ? 'bg-amber-600' : 'bg-slate-600'}`}>
                    J-{org.remainingDays}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{org.organization}</p>
                    <p className="text-slate-400 text-xs">Plan {org.plan} · Expire le {org.expiresAt}</p>
                  </div>
                  <button className="text-xs bg-purple-600/20 text-purple-400 px-3 py-1 rounded-lg hover:bg-purple-600/40 transition-colors flex-shrink-0">
                    Relancer
                  </button>
                </div>
              ))}
            </div>

            {data?.expiringSoon?.length > 0 && (
              <button className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white border border-white/10 rounded-xl transition-colors">
                Voir tous les trials →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export { TrialAnalytics };
