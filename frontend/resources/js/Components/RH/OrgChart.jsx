/**
 * Components/RH/OrgChart.jsx — Organigramme interactif SECRETIS ERP
 *
 * Fonctionnalités :
 *   - Rendu SVG/HTML avec zoom et pan à la souris/tactile
 *   - Nœuds cliquables → navigation vers la fiche employé
 *   - Export PNG via canvas
 *   - Arbre récursif à partir du JSON { id, name, position, department, avatar, children[] }
 *
 * Usage :
 *   <OrgChart tree={treeArray} />
 *
 *   où treeArray = [{ id, name, position, department, avatar, children: [...] }]
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { router } from '@inertiajs/react';
import PropTypes from 'prop-types';
import { ZoomIn, ZoomOut, RotateCcw, Download, User } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constantes de mise en page
// ---------------------------------------------------------------------------

const NODE_W   = 160;  // largeur d'un nœud
const NODE_H   = 80;   // hauteur d'un nœud
const H_GAP    = 40;   // espace horizontal entre nœuds
const V_GAP    = 80;   // espace vertical entre niveaux

// ---------------------------------------------------------------------------
// Calcul de la taille et position de chaque nœud (algorithme Reingold-Tilford simplifié)
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

  // Couleur selon le département (hash simple)
  const deptColors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#6366f1','#14b8a6'];
  const deptColor  = deptColors[(node.department?.charCodeAt(0) || 0) % deptColors.length] || '#3b82f6';

  return (
    <g
      onClick={() => onNodeClick(node)}
      onMouseEnter={() => setHoveredId(node.id)}
      onMouseLeave={() => setHoveredId(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Ombre */}
      <rect
        x={x + 2} y={y + 2}
        width={NODE_W} height={NODE_H}
        rx={10} ry={10}
        fill="rgba(0,0,0,0.06)"
      />
      {/* Fond nœud */}
      <rect
        x={x} y={y}
        width={NODE_W} height={NODE_H}
        rx={10} ry={10}
        fill={isHover ? '#eff6ff' : 'white'}
        stroke={isHover ? '#3b82f6' : '#e5e7eb'}
        strokeWidth={isHover ? 2 : 1}
      />
      {/* Barre de couleur haut */}
      <rect
        x={x} y={y}
        width={NODE_W} height={5}
        rx={10} ry={10}
        fill={deptColor}
        clipPath={`inset(0 0 -10px 0)`}
      />
      {/* Avatar / initiales */}
      {node.avatar ? (
        <image
          href={node.avatar}
          x={x + 10} y={y + 14}
          width={32} height={32}
          clipPath="circle(16px at 16px 16px)"
          style={{ borderRadius: '50%' }}
        />
      ) : (
        <>
          <circle cx={x + 26} cy={y + 30} r={16} fill={deptColor} opacity={0.2} />
          <text x={x + 26} y={y + 35} textAnchor="middle" fontSize={11} fontWeight="700" fill={deptColor}>
            {initials}
          </text>
        </>
      )}
      {/* Nom */}
      <text x={x + 50} y={y + 25} fontSize={11} fontWeight="600" fill="#111827">
        {node.name?.length > 18 ? node.name.slice(0, 16) + '…' : node.name}
      </text>
      {/* Poste */}
      <text x={x + 50} y={y + 40} fontSize={9.5} fill="#6b7280">
        {(node.position || '').length > 20 ? (node.position || '').slice(0, 18) + '…' : (node.position || '')}
      </text>
      {/* Département */}
      {node.department && (
        <text x={x + 50} y={y + 55} fontSize={9} fill={deptColor}>
          {node.department.length > 22 ? node.department.slice(0, 20) + '…' : node.department}
        </text>
      )}
      {/* Indicateur enfants */}
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
      stroke="#d1d5db"
      strokeWidth={1.5}
      strokeDasharray="none"
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
  const svgRef     = useRef();
  const containerRef = useRef();

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState(null);

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
  // Export PNG
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
      <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400 dark:text-gray-500">
        <User className="w-10 h-10 mb-3" />
        <p className="text-sm">Aucun employé dans l'organigramme</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Barre de contrôles */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={zoomIn}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Zoom avant"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Zoom arrière"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={reset}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Réinitialiser la vue"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {Math.round(transform.scale * 100)}%
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
            {nodes.length} employé{nodes.length > 1 ? 's' : ''} • Cliquer sur un nœud pour voir la fiche
          </span>
          <button
            onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Exporter SVG
          </button>
        </div>
      </div>

      {/* Zone SVG interactive */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-100/50 dark:bg-gray-900/50"
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

      {/* Aide tactile */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Molette pour zoomer • Glisser pour naviguer • Clic sur un employé pour voir sa fiche
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
