/**
 * RH/Organigramme.jsx — Organigramme interactif SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique inchangée : mêmes props Inertia, même filtrage local par département.
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
import {
  Badge, EmptyState,
  cx, SURFACE, SURFACE_SUNK, BORDER, CONTROL, TEXT_TITLE, TEXT_FAINT, NUM,
} from '@/Components/UI';

export default function RHOrganigramme({ tree = [], departments = [] }) {
  const [selectedDept, setSelectedDept] = useState('all');

  const filteredTree = selectedDept === 'all'
    ? tree
    : tree.map(n => filterTree(n, selectedDept)).filter(Boolean);

  const total = countNodes(tree);

  return (
    <AuthLayout>
      <Head title="Organigramme" />

      <div className="flex h-[calc(100vh-64px)] flex-col">

        {/* Barre d'outils — en-tête compact, la page occupe toute la hauteur */}
        <div className={cx(
          'flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6',
          SURFACE, BORDER,
        )}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
              <Network className="h-[18px] w-[18px] text-purple-600 dark:text-purple-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className={cx('truncate text-xl font-semibold tracking-tight', TEXT_TITLE)}>
                Organigramme
              </h1>
            </div>
            <Badge variant="neutral" size="md" className={NUM}>
              {total} collaborateur{total !== 1 ? 's' : ''}
            </Badge>
          </div>

          {departments.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className={cx('h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
              <label className="sr-only" htmlFor="orgchart-dept">Filtrer par département</label>
              <select
                id="orgchart-dept"
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className={cx(CONTROL, 'h-10 w-auto min-w-[200px]')}
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
        <div className={cx('flex-1 overflow-hidden', SURFACE_SUNK)}>
          {filteredTree.length > 0 ? (
            <OrgChart tree={filteredTree} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={Users}
                title={selectedDept === 'all' ? 'Aucun employé à afficher' : 'Aucun employé dans ce département'}
                description={
                  selectedDept === 'all'
                    ? "L'organigramme se construit à partir des fiches du personnel et de leur responsable hiérarchique."
                    : 'Changez de département ou revenez à la vue complète.'
                }
                action={
                  selectedDept !== 'all'
                    ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDept('all')}
                        className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        Voir tous les départements
                      </button>
                    )
                    : undefined
                }
              />
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
