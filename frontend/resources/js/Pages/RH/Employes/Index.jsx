/**
 * RH/Employes/Index.jsx — Liste des employés SECRETIS ERP
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
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';
import AuthLayout from '@/Layouts/AuthLayout';
import OrgChart from '@/Components/RH/OrgChart';
import {
  Search, Filter, PlusCircle, Upload, Users,
  LayoutGrid, List, Building2, Briefcase,
  ChevronLeft, ChevronRight, UserCheck, UserX,
  Coffee, X, Eye, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import debounce from 'lodash/debounce';

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

const CONTRACT_COLORS = {
  cdi:        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  cdd:        'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  internship: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  freelance:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  other:      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const STATUS_CONFIG = {
  active:   { label: 'Actif',      icon: UserCheck, dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  inactive: { label: 'Inactif',    icon: UserX,     dot: 'bg-gray-400',  text: 'text-gray-500 dark:text-gray-400'  },
  on_leave: { label: 'En congé',   icon: Coffee,    dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
};

// ---------------------------------------------------------------------------
// Avatar initiales
// ---------------------------------------------------------------------------

function Avatar({ name, avatar, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  const initials  = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  const colors = ['bg-purple-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500'];
  const color  = colors[name?.charCodeAt(0) % colors.length] || 'bg-gray-500';

  if (avatar) {
    return <img src={avatar} alt={name} className={`${sizeClass} rounded-full object-cover`} />;
  }

  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

Avatar.propTypes = {
  name:   PropTypes.string,
  avatar: PropTypes.string,
  size:   PropTypes.oneOf(['sm', 'md', 'lg']),
};

// ---------------------------------------------------------------------------
// Carte employé
// ---------------------------------------------------------------------------

function EmployeeCard({ employee }) {
  const status  = STATUS_CONFIG[employee.status] || STATUS_CONFIG.active;
  const contract = CONTRACT_LABELS[employee.contract_type] || 'N/A';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600 transition-all group">
      <div className="flex items-start gap-4">
        <Avatar name={`${employee.first_name} ${employee.last_name}`} avatar={employee.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {employee.first_name} {employee.last_name}
            </h3>
            <span className={`flex-shrink-0 w-2 h-2 rounded-full ${status.dot}`} title={status.label} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{employee.position}</p>
          {employee.department && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {employee.department.name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTRACT_COLORS[employee.contract_type]}`}>
              {contract}
            </span>
            <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={route('rh.employes.show', employee.id)}
          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Voir fiche
        </Link>
        <Link
          href={route('rh.employes.show', employee.id) + '?edit=1'}
          className="flex items-center justify-center gap-1 text-xs py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

EmployeeCard.propTypes = {
  employee: PropTypes.shape({
    id: PropTypes.string.isRequired,
    first_name: PropTypes.string.isRequired,
    last_name: PropTypes.string.isRequired,
    position: PropTypes.string,
    avatar: PropTypes.string,
    status: PropTypes.string,
    contract_type: PropTypes.string,
    department: PropTypes.shape({ name: PropTypes.string }),
  }).isRequired,
};

// ---------------------------------------------------------------------------
// Ligne tableau
// ---------------------------------------------------------------------------

function EmployeeRow({ employee }) {
  const status   = STATUS_CONFIG[employee.status] || STATUS_CONFIG.active;
  const contract = CONTRACT_LABELS[employee.contract_type] || 'N/A';
  const hireDate = employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy', { locale: fr }) : '—';

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={`${employee.first_name} ${employee.last_name}`} avatar={employee.avatar} size="sm" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{employee.employee_number}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{employee.position}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{employee.department?.name || '—'}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${CONTRACT_COLORS[employee.contract_type]}`}>
          {contract}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{hireDate}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href={route('rh.employes.show', employee.id)} className="text-purple-600 dark:text-purple-400 hover:underline text-xs">
            Voir
          </Link>
          <Link href={route('rh.employes.show', employee.id) + '?edit=1'} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs">
            Modifier
          </Link>
        </div>
      </td>
    </tr>
  );
}

EmployeeRow.propTypes = {
  employee: PropTypes.object.isRequired,
};

// ---------------------------------------------------------------------------
// Modal Import CSV
// ---------------------------------------------------------------------------

function ImportModal({ onClose }) {
  const [file, setFile]     = useState(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import employés CSV/Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Zone upload */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {file ? file.name : 'Cliquer pour sélectionner un fichier CSV ou Excel'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Colonnes : Prénom, Nom, Email, Matricule, Poste, Contrat, Date embauche, Département</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Prévisualisation */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {preview && ! loading && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {preview.count} employé(s) détecté(s)
              </p>
              <div className="overflow-x-auto max-h-64 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      {['Prénom', 'Nom', 'Email', 'Poste', 'Contrat', 'Département'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-gray-600 dark:text-gray-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {preview.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{row.first_name}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{row.last_name}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{row.email}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.position}</td>
                        <td className="px-3 py-2">{CONTRACT_LABELS[row.contract_type] || row.contract_type}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{row.department}</td>
                      </tr>
                    ))}
                    {preview.count > 10 && (
                      <tr><td colSpan={6} className="px-3 py-2 text-center text-gray-400 italic">… et {preview.count - 10} autres</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
            Annuler
          </button>
          {preview && (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Import en cours…' : `Importer ${preview.count} employés`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

ImportModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({ data }) {
  if (data.last_page <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {data.from}–{data.to} sur {data.total} employés
      </p>
      <div className="flex items-center gap-1">
        {data.links.map((link, i) => (
          <Link
            key={i}
            href={link.url || '#'}
            preserveScroll
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              link.active
                ? 'bg-purple-600 text-white'
                : link.url
                  ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            dangerouslySetInnerHTML={{ __html: link.label }}
          />
        ))}
      </div>
    </div>
  );
}

Pagination.propTypes = {
  data: PropTypes.object.isRequired,
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function EmployeesIndex({ employees, departments, filters }) {
  const [view, setView]           = useState(filters.view || 'cards');
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

  const handleSearch = (e) => applyFilter('search', e.target.value);
  const handleDept   = (e) => applyFilter('department', e.target.value);
  const handleContract = (e) => applyFilter('contract', e.target.value);
  const handleStatus = (e) => applyFilter('status', e.target.value);

  const switchView = (v) => {
    setView(v);
    router.get(route('rh.employes.index'), { ...filters, view: v }, { preserveState: true, replace: true });
  };

  const openOrgChart = async () => {
    if (orgTree) { setShowOrgChart(true); return; }
    setLoadingOrg(true);
    try {
      const { data } = await axios.get(route('rh.employes.org-chart'));
      setOrgTree(data.tree);
      setShowOrgChart(true);
    } catch {
      toast.error('Impossible de charger l\'organigramme.');
    } finally {
      setLoadingOrg(false);
    }
  };

  return (
    <AuthLayout>
      <Head title="Employés — RH" />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employés</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {employees.total} employé{employees.total !== 1 ? 's' : ''} dans l'organisation
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openOrgChart}
              disabled={loadingOrg}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              {loadingOrg ? 'Chargement…' : 'Organigramme'}
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importer CSV
            </button>
            <Link
              href={route('rh.employes.store')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Nouvel employé
            </Link>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Recherche */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un employé…"
                defaultValue={filters.search || ''}
                onChange={handleSearch}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
            </div>

            {/* Département */}
            <select
              defaultValue={filters.department || ''}
              onChange={handleDept}
              className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">Tous les départements</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            {/* Contrat */}
            <select
              defaultValue={filters.contract || ''}
              onChange={handleContract}
              className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">Tous les contrats</option>
              {Object.entries(CONTRACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            {/* Statut */}
            <select
              defaultValue={filters.status || ''}
              onChange={handleStatus}
              className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>

            {/* Bascule vue */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 ml-auto">
              <button
                onClick={() => switchView('cards')}
                className={`p-1.5 rounded-md transition-colors ${view === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => switchView('list')}
                className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenu */}
        {employees.data.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun employé trouvé</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Modifiez vos filtres ou créez un premier employé.</p>
          </div>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {employees.data.map(emp => <EmployeeCard key={emp.id} employee={emp} />)}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {['Employé', 'Poste', 'Département', 'Contrat', 'Statut', 'Embauche', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {employees.data.map(emp => <EmployeeRow key={emp.id} employee={emp} />)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination data={employees} />
      </div>

      {/* Modals */}
      {showOrgChart && orgTree && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organigramme</h2>
              <button onClick={() => setShowOrgChart(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <OrgChart tree={orgTree} />
            </div>
          </div>
        </div>
      )}

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
