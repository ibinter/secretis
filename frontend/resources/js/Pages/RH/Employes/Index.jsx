/**
 * RH/Employes/Index.jsx — Liste des employés SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * La logique métier est strictement inchangée : mêmes props Inertia, mêmes
 * noms de routes (`rh.employes.*`, `rh.organigramme`), mêmes appels axios,
 * même filtrage serveur `debounce`.
 *
 * Fonctionnalités :
 *   - Vue cartes (défaut) et vue liste (tableau)
 *   - Filtres : département, type contrat, statut, recherche texte
 *   - Bouton "Organigramme" → modal avec arbre interactif
 *   - Import CSV avec modal de prévisualisation avant confirmation
 *
 * Props Inertia :
 *   - employees   : LengthAwarePaginator
 *   - departments : [{ id, name }]
 *   - filters     : { department, contract, status, search, view }
 */

import { useState, useCallback, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';
import AuthLayout from '@/Layouts/AuthLayout';
import OrgChart from '@/Components/RH/OrgChart';
import {
  Search, PlusCircle, Upload, Users, Network,
  LayoutGrid, List, Building2, UserCheck, UserX, Coffee, X, Eye, Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import {
  PageHeader, Button, Badge, Card, DataTable, EmptyState,
  cx, SURFACE, SURFACE_SUNK, BORDER, DIVIDE, CONTROL,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM, FOCUS_RING,
} from '@/Components/UI';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const CONTRACT_LABELS = {
  cdi:        'CDI',
  cdd:        'CDD',
  internship: 'Stage',
  freelance:  'Freelance',
  other:      'Autre',
};

/** Type de contrat = donnée métier → ton sémantique, jamais l'accent violet. */
const CONTRACT_TONE = {
  cdi:        'info',
  cdd:        'warning',
  internship: 'accent',
  freelance:  'success',
  other:      'neutral',
};

const STATUS_CONFIG = {
  active:   { label: 'Actif',    tone: 'success', icon: UserCheck },
  inactive: { label: 'Inactif',  tone: 'neutral', icon: UserX },
  on_leave: { label: 'En congé', tone: 'warning', icon: Coffee },
};

const statusOf = (s) => STATUS_CONFIG[s] ?? STATUS_CONFIG.active;

const fullName = (e) => `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim();

// ---------------------------------------------------------------------------
// Avatar initiales
// ---------------------------------------------------------------------------

function EmployeeAvatar({ name, avatar, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';
  const initials  = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  if (avatar) {
    return <img src={avatar} alt="" className={cx(sizeClass, 'shrink-0 rounded-full object-cover')} />;
  }

  return (
    <span className={cx(
      sizeClass,
      'flex shrink-0 items-center justify-center rounded-full font-semibold',
      'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
    )}>
      {initials}
    </span>
  );
}

EmployeeAvatar.propTypes = {
  name:   PropTypes.string,
  avatar: PropTypes.string,
  size:   PropTypes.oneOf(['sm', 'md', 'lg']),
};

// ---------------------------------------------------------------------------
// Carte employé
// ---------------------------------------------------------------------------

function EmployeeCard({ employee }) {
  const status = statusOf(employee.status);

  return (
    <article className={cx(
      'flex flex-col rounded-xl border p-5 shadow-sm transition-colors',
      SURFACE, BORDER, 'hover:border-purple-200 dark:hover:border-purple-500/40',
    )}>
      <div className="flex items-start gap-4">
        <EmployeeAvatar name={fullName(employee)} avatar={employee.avatar} size="lg" />

        <div className="min-w-0 flex-1">
          <h3 className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>
            {employee.first_name} {employee.last_name}
          </h3>
          <p className={cx('mt-0.5 truncate text-xs', TEXT_MUTED)}>
            {employee.position || <span className={TEXT_FAINT}>Poste non renseigné</span>}
          </p>
          {employee.department && (
            <p className={cx('mt-1 flex items-center gap-1 truncate text-xs', TEXT_MUTED)}>
              <Building2 className={cx('h-3 w-3 shrink-0', TEXT_FAINT)} aria-hidden="true" />
              {employee.department.name}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge variant={CONTRACT_TONE[employee.contract_type] ?? 'neutral'}>
              {CONTRACT_LABELS[employee.contract_type] || 'N/A'}
            </Badge>
            <Badge variant={status.tone} dot>{status.label}</Badge>
          </div>
        </div>
      </div>

      <div className={cx('mt-4 flex gap-2 border-t pt-3', BORDER)}>
        <Button as={Link} href={route('rh.employes.show', employee.id)}
                variant="secondary" size="sm" icon={Eye} className="flex-1">
          Voir la fiche
        </Button>
        <Button as={Link} href={route('rh.employes.show', employee.id) + '?edit=1'}
                variant="ghost" size="sm" iconOnly icon={Edit} title="Modifier" />
      </div>
    </article>
  );
}

EmployeeCard.propTypes = {
  employee: PropTypes.object.isRequired,
};

// ---------------------------------------------------------------------------
// Modal Import CSV
// ---------------------------------------------------------------------------

function ImportModal({ onClose }) {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (! f) return;
    setFile(f);
    setLoading(true);

    const form = new FormData();
    form.append('file', f);
    form.append('preview', '1');

    try {
      const { data } = await axios.post(route('rh.employes.import-csv'), form);
      setPreview(data);
    } catch (err) {
      toast.error('Erreur lors de la lecture du fichier.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (! file) return;
    setLoading(true);

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await axios.post(route('rh.employes.import-csv'), form);
      toast.success(data.message);
      onClose();
      router.reload();
    } catch (err) {
      toast.error("Erreur lors de l'import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <div className="w-full max-w-2xl">
        <Card
          className="shadow-xl"
          title="Import d'employés (CSV / Excel)"
          subtitle="Le fichier est d'abord analysé : rien n'est enregistré avant votre confirmation."
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              {preview && (
                <Button variant="primary" loading={loading} onClick={handleConfirm}>
                  Importer {preview.count} employé{preview.count > 1 ? 's' : ''}
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            {/* Zone d'upload */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cx(
                'w-full rounded-xl border border-dashed p-8 text-center transition-colors',
                BORDER, SURFACE_SUNK,
                'hover:border-purple-400 dark:hover:border-purple-500/60',
                FOCUS_RING,
              )}
            >
              <Upload className={cx('mx-auto mb-2 h-6 w-6', TEXT_FAINT)} aria-hidden="true" />
              <p className={cx('text-sm', TEXT_BODY)}>
                {file ? file.name : 'Cliquez pour sélectionner un fichier CSV ou Excel'}
              </p>
              <p className={cx('mt-1 text-xs', TEXT_FAINT)}>
                Colonnes attendues : Prénom, Nom, Email, Matricule, Poste, Contrat, Date d'embauche, Département
              </p>
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />

            {loading && !preview && (
              <p className={cx('py-4 text-center text-sm', TEXT_MUTED)}>Analyse du fichier…</p>
            )}

            {/* Prévisualisation */}
            {preview && ! loading && (
              <div>
                <p className={cx('mb-2 text-sm font-medium', TEXT_TITLE, NUM)}>
                  {preview.count} employé{preview.count > 1 ? 's' : ''} détecté{preview.count > 1 ? 's' : ''}
                </p>
                <div className={cx('max-h-64 overflow-auto rounded-xl border', BORDER)}>
                  <table className="w-full border-collapse text-xs">
                    <thead className={cx(SURFACE_SUNK, 'sticky top-0 border-b', BORDER)}>
                      <tr>
                        {['Prénom', 'Nom', 'Email', 'Poste', 'Contrat', 'Département'].map(h => (
                          <th key={h} scope="col" className={cx('px-3 py-2.5 text-left', TH)}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={cx('divide-y', DIVIDE)}>
                      {preview.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                          <td className={cx('px-3 py-2', TEXT_TITLE)}>{row.first_name}</td>
                          <td className={cx('px-3 py-2', TEXT_TITLE)}>{row.last_name}</td>
                          <td className={cx('px-3 py-2', TEXT_MUTED)}>{row.email}</td>
                          <td className={cx('px-3 py-2', TEXT_BODY)}>{row.position}</td>
                          <td className="px-3 py-2">
                            <Badge variant={CONTRACT_TONE[row.contract_type] ?? 'neutral'}>
                              {CONTRACT_LABELS[row.contract_type] || row.contract_type}
                            </Badge>
                          </td>
                          <td className={cx('px-3 py-2', TEXT_MUTED)}>{row.department}</td>
                        </tr>
                      ))}
                      {preview.count > 10 && (
                        <tr>
                          <td colSpan={6} className={cx('px-3 py-2 text-center', TEXT_FAINT, NUM)}>
                            … et {preview.count - 10} autre{preview.count - 10 > 1 ? 's' : ''}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

ImportModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Pagination serveur (liens Laravel)
// ---------------------------------------------------------------------------

function PaginationLinks({ data }) {
  if (data.last_page <= 1) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className={cx('text-sm', TEXT_MUTED, NUM)}>
        {data.from}–{data.to} sur {data.total} employés
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {data.links.map((link, i) => (
          <Link
            key={i}
            href={link.url || '#'}
            preserveScroll
            dangerouslySetInnerHTML={{ __html: link.label }}
            className={cx(
              'min-w-[32px] rounded-lg border px-2.5 py-1.5 text-center text-xs font-medium transition-colors',
              link.active
                ? 'border-transparent bg-purple-600 text-white'
                : cx(BORDER, SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
              !link.url && 'pointer-events-none opacity-40',
              FOCUS_RING,
            )}
          />
        ))}
      </div>
    </div>
  );
}

PaginationLinks.propTypes = {
  data: PropTypes.object.isRequired,
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function EmployeesIndex({ employees, departments, filters }) {
  const [view, setView]                 = useState(filters.view || 'cards');
  const [showOrgChart, setShowOrgChart] = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [orgTree, setOrgTree]           = useState(null);
  const [loadingOrg, setLoadingOrg]     = useState(false);

  const applyFilter = useCallback(
    debounce((key, value) => {
      router.get(route('rh.employes.index'), { ...filters, [key]: value || undefined, view }, {
        preserveState: true,
        replace:       true,
      });
    }, 300),
    [filters, view]
  );

  const handleSearch   = (e) => applyFilter('search', e.target.value);
  const handleDept     = (e) => applyFilter('department', e.target.value);
  const handleContract = (e) => applyFilter('contract', e.target.value);
  const handleStatus   = (e) => applyFilter('status', e.target.value);

  const switchView = (v) => {
    setView(v);
    router.get(route('rh.employes.index'), { ...filters, view: v }, { preserveState: true, replace: true });
  };

  const openOrgChart = async () => {
    if (orgTree) { setShowOrgChart(true); return; }
    setLoadingOrg(true);
    try {
      // HrController@orgChart renvoie { data: tree } lorsqu'il est appelé en JSON.
      const { data } = await axios.get(route('rh.organigramme'), { headers: { Accept: 'application/json' } });
      setOrgTree(data.data ?? data.tree ?? []);
      setShowOrgChart(true);
    } catch {
      toast.error('Impossible de charger l\'organigramme.');
    } finally {
      setLoadingOrg(false);
    }
  };

  const rows       = employees.data ?? [];
  const isFiltered = Boolean(filters.search || filters.department || filters.contract || filters.status);

  const resetFilters = () => {
    router.get(route('rh.employes.index'), { view }, { preserveState: true, replace: true });
  };

  /* ─── Colonnes de la vue liste ───────────────────────────────────────────── */

  const columns = [
    {
      key: 'last_name',
      label: 'Employé',
      render: (_v, e) => (
        <div className="flex min-w-0 items-center gap-3">
          <EmployeeAvatar name={fullName(e)} avatar={e.avatar} size="sm" />
          <div className="min-w-0">
            <Link
              href={route('rh.employes.show', e.id)}
              className={cx('block truncate rounded font-medium transition-colors',
                TEXT_TITLE, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING)}
            >
              {e.first_name} {e.last_name}
            </Link>
            <p className={cx('truncate text-xs', TEXT_MUTED, NUM)}>{e.employee_number}</p>
          </div>
        </div>
      ),
    },
    { key: 'position', label: 'Poste', render: (v) => v || <span className={TEXT_FAINT}>—</span> },
    {
      key: 'department',
      label: 'Département',
      render: (_v, e) => e.department?.name || <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'contract_type',
      label: 'Contrat',
      nowrap: true,
      render: (v) => (
        <Badge variant={CONTRACT_TONE[v] ?? 'neutral'}>{CONTRACT_LABELS[v] || 'N/A'}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const s = statusOf(v);
        return <Badge variant={s.tone} dot>{s.label}</Badge>;
      },
    },
    {
      key: 'hire_date',
      label: 'Embauche',
      nowrap: true,
      className: NUM,
      render: (v) => (v ? format(new Date(v), 'dd/MM/yyyy', { locale: fr }) : <span className={TEXT_FAINT}>—</span>),
    },
  ];

  const emptyState = isFiltered ? (
    <EmptyState
      variant="no-results"
      title="Aucun employé ne correspond"
      description="Aucun collaborateur ne satisfait ces critères. Élargissez la recherche ou réinitialisez les filtres."
      action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
    />
  ) : (
    <EmptyState
      icon={Users}
      title="Aucun employé enregistré"
      description="Créez les fiches de vos collaborateurs : elles alimentent les congés, les notes de frais et l'organigramme."
      hints={[
        "L'import CSV permet de créer plusieurs fiches d'un coup.",
        'Le responsable hiérarchique renseigné construit l’organigramme.',
      ]}
      action={
        <Button as={Link} href={route('rh.employes.create')} variant="primary" icon={PlusCircle}>
          Nouvel employé
        </Button>
      }
      secondary={
        <Button variant="secondary" icon={Upload} onClick={() => setShowImport(true)}>
          Importer un CSV
        </Button>
      }
    />
  );

  return (
    <AuthLayout>
      <Head title="Employés — RH" />

      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={Users}
          title="Employés"
          breadcrumbs={[
            { label: 'Ressources Humaines', href: route('rh.index') },
            { label: 'Personnel' },
          ]}
          subtitle={`${employees.total} employé${employees.total !== 1 ? 's' : ''} dans l'organisation`}
          actions={
            <>
              <Button variant="secondary" icon={Network} loading={loadingOrg} onClick={openOrgChart}>
                Organigramme
              </Button>
              <Button variant="secondary" icon={Upload} onClick={() => setShowImport(true)}>
                Importer CSV
              </Button>
              <Button as={Link} href={route('rh.employes.create')} variant="primary" icon={PlusCircle}>
                Nouvel employé
              </Button>
            </>
          }
        />

        {/* Filtres */}
        <Card className="mb-6" bodyClassName="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
              <input
                type="search"
                placeholder="Rechercher un employé…"
                defaultValue={filters.search || ''}
                onChange={handleSearch}
                className={cx(CONTROL, 'h-10 pl-9')}
              />
            </div>

            <label className="sr-only" htmlFor="f-dept">Département</label>
            <select id="f-dept" defaultValue={filters.department || ''} onChange={handleDept}
                    className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}>
              <option value="">Tous les départements</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <label className="sr-only" htmlFor="f-contract">Type de contrat</label>
            <select id="f-contract" defaultValue={filters.contract || ''} onChange={handleContract}
                    className={cx(CONTROL, 'h-10 w-auto min-w-[160px]')}>
              <option value="">Tous les contrats</option>
              {Object.entries(CONTRACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <label className="sr-only" htmlFor="f-status">Statut</label>
            <select id="f-status" defaultValue={filters.status || ''} onChange={handleStatus}
                    className={cx(CONTROL, 'h-10 w-auto min-w-[150px]')}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>

            {/* Bascule de vue */}
            <div className={cx('ml-auto flex overflow-hidden rounded-lg border', BORDER)}>
              {[
                { key: 'cards', icon: LayoutGrid, label: 'Vue cartes' },
                { key: 'list',  icon: List,       label: 'Vue liste' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchView(key)}
                  title={label}
                  aria-label={label}
                  aria-pressed={view === key}
                  className={cx(
                    'inline-flex h-10 w-10 items-center justify-center transition-colors',
                    view === key
                      ? 'bg-purple-600 text-white'
                      : cx(SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                    FOCUS_RING,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Contenu */}
        {view === 'cards' ? (
          rows.length === 0 ? (
            <div className={cx('rounded-xl border border-dashed', BORDER)}>{emptyState}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map(emp => <EmployeeCard key={emp.id} employee={emp} />)}
            </div>
          )
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            rowKey="id"
            pageSize={rows.length || 15}
            totalItems={rows.length}
            empty={emptyState}
            actions={(e) => (
              <>
                <Button as={Link} href={route('rh.employes.show', e.id)}
                        variant="ghost" size="sm" iconOnly icon={Eye} title="Voir la fiche" />
                <Button as={Link} href={route('rh.employes.show', e.id) + '?edit=1'}
                        variant="ghost" size="sm" iconOnly icon={Edit} title="Modifier" />
              </>
            )}
          />
        )}

        <PaginationLinks data={employees} />
      </div>

      {/* Modal organigramme */}
      {showOrgChart && orgTree && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
          <div className={cx('flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-xl',
            SURFACE, BORDER)}>
            <div className={cx('flex shrink-0 items-center justify-between gap-3 border-b px-4 py-4 sm:px-6', BORDER)}>
              <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>Organigramme</h2>
              <Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer"
                      onClick={() => setShowOrgChart(false)} />
            </div>
            <div className="flex-1 overflow-hidden">
              <OrgChart tree={orgTree} />
            </div>
          </div>
        </div>
      )}

      {/* Modal import CSV */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </AuthLayout>
  );
}

EmployeesIndex.propTypes = {
  employees:   PropTypes.object.isRequired,
  departments: PropTypes.array.isRequired,
  filters:     PropTypes.object.isRequired,
};
export { EmployeesIndex };
