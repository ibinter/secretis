/**
 * Components/RH/OrgChart.jsx — Organigramme interactif SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * La logique (mise en page Reingold-Tilford simplifiée, pan/zoom, export SVG,
 * navigation `rh.employes.show`) est strictement inchangée.
 *
 * Usage :
 *   <OrgChart tree={treeArray} />
 *
 *   où treeArray = [{ id, name, position, department, avatar, children: [...] }]
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { router } from '@inertiajs/react';
import PropTypes from 'prop-types';
import { ZoomIn, ZoomOut, RotateCcw, Download, Users } from 'lucide-react';
import {
  Button, EmptyState,
  cx, SURFACE_SUNK, BORDER, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';

// ---------------------------------------------------------------------------
// Constantes de mise en page
// ---------------------------------------------------------------------------

const NODE_W   = 160;  // largeur d'un nœud
const NODE_H   = 80;   // hauteur d'un nœud
const H_GAP    = 40;   // espace horizontal entre nœuds
const V_GAP    = 80;   // espace vertical entre niveaux

/** Palette d'identification par département — sobre, sans dégradé. */
const DEPT_COLORS = ['#0284C7', '#9333EA', '#059669', '#D97706', '#E11D48', '#4F46E5', '#0D9488'];

const deptColorOf = (department) =>
  DEPT_COLORS[(department?.charCodeAt(0) || 0) % DEPT_COLORS.length];

// ---------------------------------------------------------------------------
// Calcul de la taille et position de chaque nœud
// ---------------------------------------------------------------------------

function measureTree(node) {
  if (! node.children || node.children.length === 0) {
    return { ...node, _width: NODE_W, _x: 0, _y: 0 };
  }

  const children = node.children.map(measureTree);
  const totalChildrenWidth = children.reduce((s, c) => s + c._width, 0) + H_GAP * (children.length - 1);
  const width = Math.max(NODE_W, totalChildrenWidth);

  // Positionner les enfants
  let childX = - totalChildrenWidth / 2;
  const positionedChildren = children.map(child => {
    const cx = childX + child._width / 2;
    childX  += child._width + H_GAP;
    return positionShift(child, cx, V_GAP + NODE_H);
  });

  return { ...node, children: positionedChildren, _width: width, _x: 0, _y: 0 };
}

function positionShift(node, dx, dy) {
  const shifted = {
    ...node,
    _x: (node._x || 0) + dx,
    _y: (node._y || 0) + dy,
  };
  if (shifted.children) {
    shifted.children = shifted.children.map(c => positionShift(c, dx, dy));
  }
  return shifted;
}

// Aplatir l'arbre pour le rendu SVG
function flattenTree(node, nodes = [], edges = []) {
  nodes.push(node);
  if (node.children) {
    node.children.forEach(child => {
      edges.push({ from: node, to: child });
      flattenTree(child, nodes, edges);
    });
  }
  return { nodes, edges };
}

// Calculer le bounding box
function getBoundingBox(nodes) {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 400 };
  const xs = nodes.map(n => n._x);
  const ys = nodes.map(n => n._y);
  return {
    minX: Math.min(...xs) - NODE_W / 2 - 40,
    minY: Math.min(...ys) - 40,
    maxX: Math.max(...xs) + NODE_W / 2 + 40,
    maxY: Math.max(...ys) + NODE_H + 40,
  };
}

// ---------------------------------------------------------------------------
// Composant nœud SVG
// ---------------------------------------------------------------------------

function OrgNode({ node, onNodeClick, hoveredId, setHoveredId }) {
  const x       = node._x - NODE_W / 2;
  const y       = node._y;
  const isHover = hoveredId === node.id;

  const initials = node.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const deptColor = deptColorOf(node.department);

  return (
    <g
      onClick={() => onNodeClick(node)}
      onMouseEnter={() => setHoveredId(node.id)}
      onMouseLeave={() => setHoveredId(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Fond du nœud — surface et bordure alignées sur les tokens */}
      <rect
        x={x} y={y}
        width={NODE_W} height={NODE_H}
        rx={12} ry={12}
        className={cx(
          'transition-colors',
          isHover
            ? 'fill-purple-50 dark:fill-purple-500/10 stroke-purple-400 dark:stroke-purple-500/60'
            : 'fill-white dark:fill-[#162032] stroke-gray-200 dark:stroke-[#1E3048]',
        )}
        strokeWidth={isHover ? 1.5 : 1}
      />

      {/* Liseré de département */}
      <rect
        x={x} y={y}
        width={NODE_W} height={4}
        rx={2} ry={2}
        fill={deptColor}
      />

      {/* Avatar / initiales */}
      {node.avatar ? (
        <image
          href={node.avatar}
          x={x + 10} y={y + 16}
          width={32} height={32}
          clipPath="circle(16px at 16px 16px)"
        />
      ) : (
        <>
          <circle cx={x + 26} cy={y + 32} r={16} fill={deptColor} opacity={0.15} />
          <text x={x + 26} y={y + 37} textAnchor="middle" fontSize={11} fontWeight="600" fill={deptColor}>
            {initials}
          </text>
        </>
      )}

      {/* Nom */}
      <text
        x={x + 50} y={y + 27} fontSize={11} fontWeight="600"
        className="fill-gray-900 dark:fill-white"
      >
        {node.name?.length > 18 ? node.name.slice(0, 16) + '…' : node.name}
      </text>

      {/* Poste */}
      <text
        x={x + 50} y={y + 42} fontSize={9.5}
        className="fill-gray-500 dark:fill-gray-400"
      >
        {(node.position || '').length > 20 ? (node.position || '').slice(0, 18) + '…' : (node.position || '')}
      </text>

      {/* Département */}
      {node.department && (
        <text x={x + 50} y={y + 57} fontSize={9} fill={deptColor}>
          {node.department.length > 22 ? node.department.slice(0, 20) + '…' : node.department}
        </text>
      )}

      {/* Indicateur de subordonnés */}
      {node.children?.length > 0 && (
        <circle cx={x + NODE_W / 2} cy={y + NODE_H - 4} r={3} fill={deptColor} />
      )}
    </g>
  );
}

OrgNode.propTypes = {
  node:         PropTypes.object.isRequired,
  onNodeClick:  PropTypes.func.isRequired,
  hoveredId:    PropTypes.string,
  setHoveredId: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Ligne de connexion entre nœuds (courbée)
// ---------------------------------------------------------------------------

function OrgEdge({ from, to }) {
  const x1 = from._x;
  const y1 = from._y + NODE_H;
  const x2 = to._x;
  const y2 = to._y;
  const cy = (y1 + y2) / 2;

  return (
    <path
      d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
      fill="none"
      strokeWidth={1.5}
      className="stroke-gray-300 dark:stroke-[#1E3048]"
    />
  );
}

OrgEdge.propTypes = {
  from: PropTypes.object.isRequired,
  to:   PropTypes.object.isRequired,
};

// ---------------------------------------------------------------------------
// Composant principal OrgChart
// ---------------------------------------------------------------------------

export default function OrgChart({ tree }) {
  const svgRef       = useRef();
  const containerRef = useRef();

  const [transform, setTransform]   = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId]   = useState(null);

  // ---------------------------------------------------------------------------
  // Calcul de la disposition
  // ---------------------------------------------------------------------------

  const computedTree = tree.length > 0
    ? tree.map(root => measureTree(root))
    : [];

  // Positionner les arbres racines côte à côte
  let xOffset = 0;
  const positionedRoots = computedTree.map(root => {
    const shifted = positionShift(root, xOffset + root._width / 2, 0);
    xOffset += root._width + H_GAP * 2;
    return shifted;
  });

  const { nodes, edges } = positionedRoots.reduce(
    (acc, root) => {
      const { nodes, edges } = flattenTree(root);
      return { nodes: [...acc.nodes, ...nodes], edges: [...acc.edges, ...edges] };
    },
    { nodes: [], edges: [] }
  );

  const bbox = getBoundingBox(nodes);
  const svgW = bbox.maxX - bbox.minX;
  const svgH = bbox.maxY - bbox.minY;

  // ---------------------------------------------------------------------------
  // Centre initial
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (! container || nodes.length === 0) return;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const scale = Math.min(1, Math.min(cw / (svgW + 40), ch / (svgH + 40)));
    setTransform({
      x: (cw - svgW * scale) / 2 - bbox.minX * scale,
      y: (ch - svgH * scale) / 2 - bbox.minY * scale,
      scale,
    });
  }, [tree]);

  // ---------------------------------------------------------------------------
  // Pan & zoom souris
  // ---------------------------------------------------------------------------

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta  = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.2, transform.scale * delta));
    const rect   = containerRef.current.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;
    setTransform(prev => ({
      scale: newScale,
      x: mx - (mx - prev.x) * (newScale / prev.scale),
      y: my - (my - prev.y) * (newScale / prev.scale),
    }));
  }, [transform]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (! isDragging) return;
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // ---------------------------------------------------------------------------
  // Contrôles
  // ---------------------------------------------------------------------------

  const zoomIn  = () => setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }));
  const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale / 1.2) }));
  const reset   = () => {
    const container = containerRef.current;
    if (! container) return;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const scale = Math.min(1, Math.min(cw / (svgW + 40), ch / (svgH + 40)));
    setTransform({
      x: (cw - svgW * scale) / 2 - bbox.minX * scale,
      y: (ch - svgH * scale) / 2 - bbox.minY * scale,
      scale,
    });
  };

  // ---------------------------------------------------------------------------
  // Export SVG
  // ---------------------------------------------------------------------------

  const exportPng = () => {
    const svgEl  = svgRef.current;
    if (! svgEl) return;

    const serializer = new XMLSerializer();
    let svgStr = serializer.serializeToString(svgEl);

    // Inline basic styles pour export propre
    svgStr = svgStr.replace(/<svg/, '<svg style="background:#ffffff"');

    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'organigramme.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // Clic sur un nœud
  // ---------------------------------------------------------------------------

  const handleNodeClick = useCallback((node) => {
    if (node.id) {
      router.visit(route('rh.employes.show', node.id));
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Rendu vide
  // ---------------------------------------------------------------------------

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Users}
          title="Organigramme vide"
          description="Aucun employé n'est rattaché à cette structure pour le moment."
          hints={[
            'Renseignez le responsable hiérarchique (N+1) sur chaque fiche employé.',
            "Les collaborateurs sans responsable apparaissent comme racines de l'arbre.",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">

      {/* Barre de contrôles */}
      <div className={cx('flex items-center gap-2 border-b px-4 py-2.5', BORDER, SURFACE_SUNK)}>
        <Button variant="ghost" size="sm" iconOnly icon={ZoomIn}  title="Zoom avant"          onClick={zoomIn} />
        <Button variant="ghost" size="sm" iconOnly icon={ZoomOut} title="Zoom arrière"        onClick={zoomOut} />
        <Button variant="ghost" size="sm" iconOnly icon={RotateCcw} title="Réinitialiser la vue" onClick={reset} />

        <span className={cx('h-4 w-px', 'bg-gray-200 dark:bg-[#1E3048]')} aria-hidden="true" />

        <span className={cx('text-xs', TEXT_MUTED, NUM)}>
          {Math.round(transform.scale * 100)} %
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className={cx('hidden text-xs sm:block', TEXT_FAINT, NUM)}>
            {nodes.length} employé{nodes.length > 1 ? 's' : ''}
          </span>
          <Button variant="secondary" size="sm" icon={Download} onClick={exportPng}>
            Exporter SVG
          </Button>
        </div>
      </div>

      {/* Zone SVG interactive */}
      <div
        ref={containerRef}
        className={cx('flex-1 overflow-hidden', SURFACE_SUNK)}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={svgW}
          height={svgH}
          viewBox={`${bbox.minX} ${bbox.minY} ${svgW} ${svgH}`}
          style={{
            transform:       `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            display:         'block',
            userSelect:      'none',
          }}
        >
          {/* Connexions */}
          <g>
            {edges.map((edge, i) => (
              <OrgEdge key={`edge-${i}`} from={edge.from} to={edge.to} />
            ))}
          </g>

          {/* Nœuds */}
          <g>
            {nodes.map(node => (
              <OrgNode
                key={node.id}
                node={node}
                onNodeClick={handleNodeClick}
                hoveredId={hoveredId}
                setHoveredId={setHoveredId}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Aide */}
      <div className={cx('border-t px-4 py-2', BORDER, SURFACE_SUNK)}>
        <p className={cx('text-center text-xs', TEXT_FAINT)}>
          Molette pour zoomer · Glisser pour naviguer · Clic sur un employé pour ouvrir sa fiche
        </p>
      </div>
    </div>
  );
}

OrgChart.propTypes = {
  tree: PropTypes.arrayOf(PropTypes.shape({
    id:         PropTypes.string,
    name:       PropTypes.string,
    position:   PropTypes.string,
    department: PropTypes.string,
    avatar:     PropTypes.string,
    children:   PropTypes.array,
  })).isRequired,
};
export { OrgChart };
