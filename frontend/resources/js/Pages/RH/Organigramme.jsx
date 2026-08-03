/**
 * RH/Organigramme.jsx — Organigramme interactif SECRETIS ERP
 *
 * Props Inertia :
 *   - tree        : [{ id, name, position, department, avatar, children[] }]
 *   - departments : [{ id, name }]
 */

import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import OrgChart from '@/Components/RH/OrgChart';
import { Network, Users, Building2 } from 'lucide-react';

export default function RHOrganigramme({ tree = [], departments = [] }) {
  const [selectedDept, setSelectedDept] = useState('all');

  const filteredTree = selectedDept === 'all'
    ? tree
    : tree.map(n => filterTree(n, selectedDept)).filter(Boolean);

  return (
    <AuthLayout>
      <Head title="Organigramme" />

      <div className="flex flex-col h-[calc(100vh-64px)]">

        {/* Barre d'outils */}
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Network size={18} className="text-purple-600 dark:text-purple-400" />
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">Organigramme</h1>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              ({countNodes(tree)} collaborateurs)
            </span>
          </div>

          {departments.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-gray-400" />
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:border-purple-500"
              >
                <option value="all">Tous les départements</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Corps — Organigramme */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
          {filteredTree.length > 0 ? (
            <OrgChart tree={filteredTree} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
              <Users size={48} className="text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun employé à afficher</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Ajoutez des employés depuis la liste du personnel.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

function countNodes(nodes) {
  return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children ?? []), 0);
}

function filterTree(node, deptName) {
  if (node.department === deptName) return node;
  const children = (node.children ?? []).map(c => filterTree(c, deptName)).filter(Boolean);
  if (children.length > 0) return { ...node, children };
  return null;
}
