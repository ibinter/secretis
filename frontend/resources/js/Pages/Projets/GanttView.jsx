import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import useGantt from '@/hooks/useGantt';

// ─── Constantes ─────────────────────────────────────────────────────────────

const ROW_HEIGHT    = 40;
const HEADER_HEIGHT = 60;
const LEFT_PANEL_W  = 260;
const MILESTONE_DIAMOND = 10;

// ─── Helpers date ────────────────────────────────────────────────────────────

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function getDaysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e - s) / 86400000));
}

// ─── Composant TaskBar ───────────────────────────────────────────────────────

function TaskBar({ task, x, width, y, isCritical, isSelected, onMouseDown, onResizeMouseDown, onClick }) {
  const color = isCritical ? '#EF4444' : (task.assignees?.[0]?.color || '#3B82F6');
  const progressWidth = Math.max(0, Math.min(width, (width * (task.progress || 0)) / 100));

  return (
    <g
      style={{ cursor: 'grab' }}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, task.id, 'move'); }}
      onClick={() => onClick(task.id)}
    >
      {/* Ombre */}
      <rect x={x + 2} y={y + ROW_HEIGHT / 2 - 8 + 2} width={width} height={16} rx={4} fill="rgba(0,0,0,0.15)" />
      {/* Fond */}
      <rect
        x={x} y={y + ROW_HEIGHT / 2 - 8} width={width} height={16} rx={4}
        fill={color} opacity={0.9}
        stroke={isSelected ? '#1D4ED8' : 'transparent'} strokeWidth={isSelected ? 2 : 0}
      />
      {/* Progression */}
      {progressWidth > 0 && (
        <rect x={x} y={y + ROW_HEIGHT / 2 - 8} width={progressWidth} height={16} rx={4}
          fill="rgba(255,255,255,0.35)" />
      )}
      {/* Texte */}
      {width > 40 && (
        <text x={x + 6} y={y + ROW_HEIGHT / 2 + 4} fontSize={11} fill="#fff" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {task.name.length > Math.floor(width / 7) ? task.name.slice(0, Math.floor(width / 7) - 1) + '…' : task.name}
        </text>
      )}
      {/* Poignée resize */}
      <rect
        x={x + width - 6} y={y + ROW_HEIGHT / 2 - 8} width={6} height={16} rx={[0, 4, 4, 0]}
        fill="rgba(0,0,0,0.2)" style={{ cursor: 'ew-resize' }}
        onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, task.id); }}
      />
    </g>
  );
}

// ─── Flèche de dépendance ────────────────────────────────────────────────────

function DependencyArrow({ fromX, fromY, toX, toY }) {
  const midX = (fromX + toX) / 2;
  const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  return (
    <g>
      <path d={d} fill="none" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 2"
        markerEnd="url(#arrowhead)" />
    </g>
  );
}

// ─── Losange milestone ────────────────────────────────────────────────────────

function MilestoneDiamond({ x, y, color, label, status }) {
  const s = MILESTONE_DIAMOND;
  const points = `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`;
  const isDone = status === 'completed';
  const isMissed = status === 'missed';
  const fill = isDone ? '#22C55E' : isMissed ? '#EF4444' : color || '#8B5CF6';

  return (
    <g>
      <polygon points={points} fill={fill} stroke="#fff" strokeWidth={1.5} />
      {isDone && (
        <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold">✓</text>
      )}
      <text x={x} y={y + s + 12} textAnchor="middle" fontSize={10} fill="#6B7280" style={{ userSelect: 'none' }}>
        {label.length > 12 ? label.slice(0, 11) + '…' : label}
      </text>
    </g>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

function Tooltip({ task, x, y, visible }) {
  if (!visible || !task) return null;
  return (
    <g transform={`translate(${x + 10}, ${y - 60})`}>
      <rect width={200} height={90} rx={6} fill="#1E293B" opacity={0.95} />
      <text x={10} y={20} fontSize={12} fontWeight="bold" fill="#F1F5F9">{task.name}</text>
      <text x={10} y={38} fontSize={11} fill="#94A3B8">
        {formatDate(task.start)} → {formatDate(task.end)}
      </text>
      <text x={10} y={54} fontSize={11} fill="#94A3B8">
        Avancement : {task.progress || 0}%
      </text>
      <text x={10} y={70} fontSize={11} fill="#94A3B8">
        {task.assignees?.map((a) => a.name).join(', ') || 'Non assigné'}
      </text>
      {task.estimated_hours > 0 && (
        <text x={10} y={84} fontSize={11} fill="#94A3B8">
          {task.logged_hours}h / {task.estimated_hours}h
        </text>
      )}
    </g>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function GanttView() {
  const { project, ganttData } = usePage().props;

  const gantt = useGantt({ projectId: project.id, initialData: ganttData });
  const {
    tasks, milestones, criticalPath, zoom,
    zoomIn, zoomOut, scrollToToday,
    updateTaskDates, containerRef,
    dateToX, xToDate,
  } = gantt;

  const [hoveredTaskId, setHoveredTaskId]   = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [tooltipPos, setTooltipPos]         = useState({ x: 0, y: 0 });
  const [dragState, setDragState]           = useState(null);

  const projectStart = ganttData?.projectStart || new Date().toISOString().split('T')[0];
  const totalDays    = zoom.days;
  const svgWidth     = totalDays * zoom.dayWidth;
  const svgHeight    = Math.max(300, tasks.length * ROW_HEIGHT + HEADER_HEIGHT + 80);

  // ── En-tête timeline ──────────────────────────────────────────────────────

  const timelineHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < totalDays; i++) {
      const dateStr = addDays(projectStart, i);
      const d = new Date(dateStr);
      const x = i * zoom.dayWidth;

      if (zoom.key === 'day' || (zoom.key === 'week' && d.getDay() === 1) || (zoom.key === 'month' && d.getDate() === 1)) {
        let label = '';
        if (zoom.key === 'day')   label = `${d.getDate()} ${d.toLocaleString('fr-FR', { month: 'short' })}`;
        if (zoom.key === 'week')  label = `S${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('fr-FR', { month: 'short' })}`;
        if (zoom.key === 'month') label = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        headers.push({ x, label, dateStr, dayOfWeek: d.getDay() });
      }
    }
    return headers;
  }, [projectStart, totalDays, zoom]);

  // ── Ligne "Aujourd'hui" ───────────────────────────────────────────────────

  const todayX = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const days  = getDaysBetween(projectStart, today);
    return days * zoom.dayWidth;
  }, [projectStart, zoom.dayWidth]);

  // ── Drag move ────────────────────────────────────────────────────────────

  const handleMouseMove = useCallback((e) => {
    if (!dragState) return;
    const dx    = e.clientX - dragState.startX;
    const delta = Math.round(dx / zoom.dayWidth);
    if (delta === 0) return;

    setDragState((prev) => ({ ...prev, startX: e.clientX, delta: (prev.delta || 0) + delta }));
  }, [dragState, zoom.dayWidth]);

  const handleMouseUp = useCallback((e) => {
    if (!dragState) return;
    const task = tasks.find((t) => t.id === dragState.taskId);
    if (task && dragState.delta) {
      const newStart = addDays(task.start, dragState.delta);
      const newEnd   = addDays(task.end,   dragState.delta);
      updateTaskDates(task.id, newStart, newEnd);
    }
    setDragState(null);
  }, [dragState, tasks, updateTaskDates]);

  const handleBarMouseDown = useCallback((e, taskId, type) => {
    e.preventDefault();
    setDragState({ taskId, type, startX: e.clientX, delta: 0 });
  }, []);

  // ── Dépendances SVG ───────────────────────────────────────────────────────

  const dependencyArrows = useMemo(() => {
    const arrows = [];
    tasks.forEach((task, taskIdx) => {
      (task.dependencies || []).forEach((depId) => {
        const depTaskIdx = tasks.findIndex((t) => t.id === depId);
        if (depTaskIdx < 0) return;
        const depTask = tasks[depTaskIdx];

        const fromX = dateToX(depTask.end, projectStart) + zoom.dayWidth;
        const fromY = HEADER_HEIGHT + depTaskIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
        const toX   = dateToX(task.start, projectStart);
        const toY   = HEADER_HEIGHT + taskIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

        arrows.push({ key: `${depId}-${task.id}`, fromX, fromY, toX, toY });
      });
    });
    return arrows;
  }, [tasks, dateToX, projectStart, zoom.dayWidth]);

  return (
    <AppLayout>
      <Head title={`Gantt — ${project.name}`} />

      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        {/* ── Barre d'outils ── */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <h1 className="font-semibold text-gray-800 dark:text-gray-100 mr-4">{project.name}</h1>

          <button onClick={zoomIn}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-mono">
            + Zoom
          </button>
          <button onClick={zoomOut}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-mono">
            − Zoom
          </button>
          <button onClick={scrollToToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg">
            Aujourd'hui
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Vue : {zoom.label}</span>

          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-sm" /> Chemin critique
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-sm" /> Milestone
            </span>
          </div>
        </div>

        {/* ── Corps Gantt ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Panneau gauche : liste des tâches */}
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto"
            style={{ width: LEFT_PANEL_W }}>
            <div style={{ height: HEADER_HEIGHT }}
              className="flex items-end pb-2 px-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tâches ({tasks.length})
              </span>
            </div>
            {tasks.map((task) => (
              <div key={task.id}
                style={{ height: ROW_HEIGHT }}
                className={`flex items-center px-3 border-b border-gray-100 dark:border-gray-700 text-sm cursor-pointer transition-colors
                  ${selectedTaskId === task.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}>
                <span
                  className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: criticalPath.includes(task.id) ? '#EF4444' : (task.assignees?.[0]?.color || '#3B82F6') }}
                />
                <span className="truncate text-gray-700 dark:text-gray-200" title={task.name}>
                  {task.name}
                </span>
                {task.progress > 0 && (
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{task.progress}%</span>
                )}
              </div>
            ))}
          </div>

          {/* Zone SVG scrollable */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={(e) => { e.preventDefault(); e.deltaY < 0 ? zoomIn() : zoomOut(); }}
          >
            <svg
              width={svgWidth}
              height={svgHeight}
              style={{ minWidth: svgWidth, display: 'block', cursor: dragState ? 'grabbing' : 'default' }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
                </marker>
              </defs>

              {/* ── Fond alternance colonnes ── */}
              {timelineHeaders.map((h, i) => {
                const nextX = timelineHeaders[i + 1]?.x ?? svgWidth;
                const colWidth = nextX - h.x;
                return (
                  <rect key={h.dateStr} x={h.x} y={0} width={colWidth} height={svgHeight}
                    fill={i % 2 === 0 ? 'rgba(248,250,252,0.8)' : 'rgba(241,245,249,0.4)'}
                  />
                );
              })}

              {/* ── Grilles horizontales ── */}
              {tasks.map((_, i) => (
                <line key={i}
                  x1={0} y1={HEADER_HEIGHT + i * ROW_HEIGHT}
                  x2={svgWidth} y2={HEADER_HEIGHT + i * ROW_HEIGHT}
                  stroke="#E2E8F0" strokeWidth={0.5}
                />
              ))}

              {/* ── En-tête timeline ── */}
              <rect x={0} y={0} width={svgWidth} height={HEADER_HEIGHT} fill="#F8FAFC" />
              {timelineHeaders.map((h) => (
                <g key={h.dateStr}>
                  <line x1={h.x} y1={0} x2={h.x} y2={svgHeight} stroke="#E2E8F0" strokeWidth={0.5} />
                  <text x={h.x + 4} y={HEADER_HEIGHT - 8} fontSize={11} fill="#64748B">{h.label}</text>
                </g>
              ))}

              {/* ── Ligne "Aujourd'hui" ── */}
              {todayX >= 0 && todayX <= svgWidth && (
                <g>
                  <line x1={todayX} y1={0} x2={todayX} y2={svgHeight}
                    stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="6 3" />
                  <rect x={todayX - 18} y={2} width={36} height={16} rx={3} fill="#3B82F6" />
                  <text x={todayX} y={13} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold">
                    Auj.
                  </text>
                </g>
              )}

              {/* ── Flèches dépendances ── */}
              {dependencyArrows.map((arrow) => (
                <DependencyArrow key={arrow.key} {...arrow} />
              ))}

              {/* ── Barres de tâches ── */}
              {tasks.map((task, i) => {
                const x = dateToX(task.start, projectStart);
                const endX = dateToX(task.end, projectStart) + zoom.dayWidth;
                const width = Math.max(zoom.dayWidth, endX - x);
                const y = HEADER_HEIGHT + i * ROW_HEIGHT;
                const isCritical = criticalPath.includes(task.id);

                return (
                  <g key={task.id}
                    onMouseEnter={(e) => { setHoveredTaskId(task.id); setTooltipPos({ x, y }); }}
                    onMouseLeave={() => setHoveredTaskId(null)}>
                    <TaskBar
                      task={task} x={x} width={width} y={y}
                      isCritical={isCritical}
                      isSelected={selectedTaskId === task.id}
                      onMouseDown={handleBarMouseDown}
                      onResizeMouseDown={(e, tid) => handleBarMouseDown(e, tid, 'resize')}
                      onClick={setSelectedTaskId}
                    />
                  </g>
                );
              })}

              {/* ── Milestones ── */}
              {milestones.map((m) => {
                const mx = dateToX(m.date, projectStart) + zoom.dayWidth / 2;
                const my = HEADER_HEIGHT - 20;
                return (
                  <MilestoneDiamond
                    key={m.id} x={mx} y={my}
                    color={m.color} label={m.name} status={m.status}
                  />
                );
              })}

              {/* ── Tooltip ── */}
              {hoveredTaskId && (
                <Tooltip
                  task={tasks.find((t) => t.id === hoveredTaskId)}
                  x={tooltipPos.x}
                  y={tooltipPos.y}
                  visible={true}
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
