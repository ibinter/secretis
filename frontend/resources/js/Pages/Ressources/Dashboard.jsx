/**
 * Ressources/Dashboard.jsx — Tableau de bord MODULE 7 Ressources & Stocks
 *
 * Props Inertia :
 *   - kpis             : { rooms, equipment, supplies, vehicles }
 *   - todayReservations: RoomReservation[]
 *   - vehiclesOut      : VehicleLog[]
 *   - vehicleAlerts    : Alert[]
 *   - lowStockAlerts   : Supply[]
 */

import { Head, Link } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  DoorOpen, Wrench, Package, Car, AlertTriangle,
  CalendarCheck, Clock, TrendingDown, ChevronRight,
  ShieldAlert, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function KpiCard({ icon: Icon, label, value, sub, color, href }) {
  const content = (
    <div className={`
      bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700
      p-5 flex items-center gap-4 hover:shadow-md transition-shadow
    `}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function AlertBadge({ severity }) {
  const cfg = {
    expired:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    warning:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  const labels = { expired: 'Expiré', critical: 'Urgent', warning: 'Attention' };

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg[severity] ?? cfg.warning}`}>
      {labels[severity] ?? severity}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function ResourcesDashboard({
  kpis,
  todayReservations,
  vehiclesOut,
  vehicleAlerts,
  lowStockAlerts,
}) {
  const occupationRate = kpis.rooms.total > 0
    ? Math.round((kpis.rooms.occupied / kpis.rooms.total) * 100)
    : 0;

  const hasAlerts = vehicleAlerts.length > 0 || lowStockAlerts.length > 0 || kpis.equipment.in_maintenance > 0;

  return (
    <AuthLayout>
      <Head title="Ressources — Tableau de bord" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ressources & Stocks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Vue synthèse — {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={DoorOpen}
            label="Salles occupées"
            value={`${kpis.rooms.occupied} / ${kpis.rooms.total}`}
            sub={`Taux occupation : ${occupationRate}%`}
            color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
            href={route('resources.salles.index')}
          />
          <KpiCard
            icon={Wrench}
            label="Matériel en maintenance"
            value={kpis.equipment.in_maintenance}
            sub={kpis.equipment.warranty_alerts > 0 ? `${kpis.equipment.warranty_alerts} garantie(s) à renouveler` : 'Garanties OK'}
            color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            href={route('resources.materiel.index')}
          />
          <KpiCard
            icon={Package}
            label="Alertes stock bas"
            value={kpis.supplies.low_stock}
            sub="Fournitures sous le seuil minimum"
            color={kpis.supplies.low_stock > 0
              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'}
            href={route('resources.fournitures.index')}
          />
          <KpiCard
            icon={Car}
            label="Véhicules disponibles"
            value={kpis.vehicles.available}
            sub="Prêts à l'utilisation"
            color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
            href={route('resources.vehicules.index')}
          />
        </div>

        {/* Alertes actives */}
        {hasAlerts && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Alertes actives</h2>
            </div>
            <div className="space-y-2">
              {/* Alertes véhicules */}
              {vehicleAlerts.map((alert, i) => (
                <div
                  key={`va-${i}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Car className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {alert.vehicle_label} — {alert.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.days_remaining < 0
                          ? `Expiré depuis ${Math.abs(alert.days_remaining)} jour(s)`
                          : `Expire dans ${alert.days_remaining} jour(s) (${alert.date})`
                        }
                      </p>
                    </div>
                  </div>
                  <AlertBadge severity={alert.severity} />
                </div>
              ))}

              {/* Alertes stock bas */}
              {lowStockAlerts.map((supply) => (
                <div
                  key={`ls-${supply.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TrendingDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {supply.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Stock : {supply.quantity} (seuil min : {supply.min_quantity})
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    Stock bas
                  </span>
                </div>
              ))}

              {/* Matériel en maintenance */}
              {kpis.equipment.in_maintenance > 0 && (
                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {kpis.equipment.in_maintenance} équipement(s) en maintenance
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Vérifier les demandes en cours
                      </p>
                    </div>
                  </div>
                  <Link
                    href={route('resources.materiel.index')}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    Voir <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Planning du jour */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Salles réservées aujourd'hui */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Salles — Aujourd'hui</h2>
              </div>
              <Link
                href={route('resources.salles.index')}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {todayReservations.length > 0 ? (
              <div className="space-y-2">
                {todayReservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                  >
                    <DoorOpen className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {res.room?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(res.start_at), 'HH:mm')} – {format(new Date(res.end_at), 'HH:mm')}
                        {res.user && ` · ${res.user.name}`}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      res.status === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {res.status === 'approved' ? 'Confirmée' : 'En attente'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucune réservation aujourd'hui</p>
              </div>
            )}
          </div>

          {/* Véhicules sortis */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Véhicules sortis</h2>
              </div>
              <Link
                href={route('resources.vehicules.index')}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {vehiclesOut.length > 0 ? (
              <div className="space-y-2">
                {vehiclesOut.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                  >
                    <Car className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {log.vehicle?.brand} {log.vehicle?.model}
                        <span className="text-gray-400 font-normal ml-1">({log.vehicle?.plate_number})</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {log.user?.name} · Depuis {format(new Date(log.departed_at), 'HH:mm')}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      En déplacement
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Tous les véhicules sont disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation rapide */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: route('resources.salles.index'),      label: 'Gérer les salles',       icon: DoorOpen, color: 'text-purple-600 dark:text-purple-400' },
            { href: route('resources.materiel.index'),    label: 'Gérer le matériel',      icon: Wrench,   color: 'text-amber-600 dark:text-amber-400' },
            { href: route('resources.fournitures.index'), label: 'Gérer les fournitures',  icon: Package,  color: 'text-red-600 dark:text-red-400' },
            { href: route('resources.vehicules.index'),   label: 'Gérer les véhicules',    icon: Car,      color: 'text-indigo-600 dark:text-indigo-400' },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
                         hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            </Link>
          ))}
        </div>

      </div>
    </AuthLayout>
  );
}
export { ResourcesDashboard };
