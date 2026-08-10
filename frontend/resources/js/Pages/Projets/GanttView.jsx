/**
 * Projets/GanttView.jsx — Diagramme de Gantt d'un projet
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * La logique (hook `useGantt`, drag/resize, dépendances, zoom) est inchangée.
 * Les couleurs du SVG passent par des utilitaires Tailwind `fill-*` / `stroke-*`
 * afin que le diagramme respecte le mode sombre.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import useGantt from '@/hooks/useGantt';
import { ZoomIn, ZoomOut, Target, GanttChartSquare } from 'lucide-react';
import {
  Button, EmptyState,
  cx, SURFACE, SURFACE_SUNK, BORDER,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ─── Constantes ─────────────────────────────────────────────────────────────

const ROW_HEIGHT    = 40;
const HEADER_HEIGHT = 60;
const LEFT_PANEL_W  = 260;
const MILESTONE_DIAMOND = 10;

/** Palette d'assignation (encodage de donnée) — sobre, sans dégradé. */
const CRITICAL_COLOR = '#DC2626';
const DEFAULT_COLOR  = '#0284C7';

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

// ─── Barre de tâche ──────────────────────────────────────────────────────────

function TaskBar({ task, x, width, y, isCritical, isSelected, onMouseDown, onResizeMouseDown, onClick }) {
  const color = isCritical ? CRITICAL_COLOR : (task.assignees?.[0]?.color || DEFAULT_COLOR);
  const progressWidth = Math.max(0, Math.min(width, (width * (task.progress || 0)) / 100));
  const barY = y + ROW_HEIGHT / 2 - 8;

  return (
    <g
      style={{ cursor: 'grab' }}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, task.id, 'move'); }}
      onClick={() => onClick(task.id)}
    >
      {/* Piste de la tâche */}
      <rect x={x} y={barY} width={width} height={16} rx={4} fill={color} opacity={0.35} />

      {/* Progression */}
      {progressWidth > 0 && (
        <rect x={x} y={barY} width={progressWidth} height={16} rx={4} fill={color} />
      )}

      {/* Contour de sélection */}
      <rect
        x={x} y={barY} width={width} height={16} rx={4}
        fill="none"
        className={isSelected ? 'stroke-purple-600 dark:stroke-purple-400' : 'stroke-transparent'}
        strokeWidth={isSelected ? 2 : 0}
      />

      {/* Libellé */}
      {width > 40 && (
        <text
          x={x + 6} y={y + ROW_HEIGHT / 2 + 4} fontSize={11}
          className="fill-gray-900 dark:fill-white"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {task.name.length > Math.floor(width / 7) ? task.name.slice(0, Math.floor(width / 7) - 1) + '…' : task.name}
        </text>
      )}

      {/* Poignée de redimensionnement */}
      <rect
        x={x + width - 6} y={barY} width={6} height={16} rx={2}
        fill={color} opacity={0.9}
        style={{ cursor: 'ew-resize' }}
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
    <path
      d={d} fill="none" strokeWidth={1.5} strokeDasharray="4 2"
      markerEnd="url(#arrowhead)"
      className="stroke-gray-400 dark:stroke-gray-500"
    />
  );
}

// ─── Losange de jalon ─────────────────────────────────────────────────────────

function MilestoneDiamond({ x, y, color, label, status }) {
  const s = MILESTONE_DIAMOND;
  const points = `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`;
  const isDone   = status === 'completed';
  const isMissed = status === 'missed';
  const fill = isDone ? '#059669' : isMissed ? CRITICAL_COLOR : color || '#9333EA';

  return (
    <g>
      <polygon
        points={points} fill={fill} strokeWidth={1.5}
        className="stroke-white dark:stroke-[#0F1923]"
      />
      <text
        x={x} y={y + s + 12} textAnchor="middle" fontSize={10}
        className="fill-gray-500 dark:fill-gray-400"
        style={{ userSelect: 'none' }}
      >
        {label.length > 12 ? label.slice(0, 11) + '…' : label}
      </text>
    </g>
  );
}

// ─── Infobulle ───────────────────────────────────────────────────────────────

function GanttTooltip({ task, x, y, visible }) {
  if (!visible || !task) return null;
  return (
    <g transform={`translate(${x + 10}, ${y - 60})`} style={{ pointerEvents: 'none' }}>
      <rect width={210} height={92} rx={8} className="fill-gray-900 dark:fill-[#0F1923]" opacity={0.96} />
      <text x={12} y={22} fontSize={12} fontWeight="600" className="fill-white">{task.name}</text>
      <text x={12} y={40} fontSize={11} className="fill-gray-300">
        {formatDate(task.start)} → {formatDate(task.end)}
      </text>
      <text x={12} y={56} fontSize={11} className="fill-gray-300">
        Avancement : {task.progress || 0} %
      </text>
      <text x={12} y={72} fontSize={11} className="fill-gray-300">
        {task.assignees?.map((a) => a.name).join(', ') || 'Non assigné'}
      </text>
      {task.estimated_hours > 0 && (
        <text x={12} y={86} fontSize={11} className="fill-gray-300">
          {task.logged_hours} h / {task.estimated_hours} h
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
    dateToX,
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

  const handleMouseUp = useCallback(() => {
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

      <div className={cx('flex h-screen flex-col', SURFACE_SUNK)}>

        {/* ── Barre d'outils ── */}
        <div className={cx('flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-6',
          SURFACE, BORDER)}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
            <GanttChartSquare className="h-[18px] w-[18px] text-purple-600 dark:text-purple-400" aria-hidden="true" />
          </span>
          <h1 className={cx('mr-3 truncate text-xl font-semibold tracking-tight', TEXT_TITLE)}>
            {project.name}
          </h1>

          <Button variant="secondary" size="sm" iconOnly icon={ZoomIn}  title="Zoom avant"   onClick={zoomIn} />
          <Button variant="secondary" size="sm" iconOnly icon={ZoomOut} title="Zoom arrière" onClick={zoomOut} />
          <Button variant="primary"   size="sm" icon={Target} onClick={scrollToToday}>
            Aujourd'hui
          </Button>

          <span className={cx('ml-1 text-xs', TEXT_MUTED)}>Vue : {zoom.label}</span>

          <div className="ml-auto flex items-center gap-3">
            <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-600" /> Chemin critique
            </span>
            <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
              <span className="inline-block h-2.5 w-2.5 rotate-45 bg-purple-600" /> Jalon
            </span>
          </div>
        </div>

        {/* ── Corps Gantt ── */}
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={GanttChartSquare}
              title="Aucune tâche planifiée"
              description="Ajoutez des tâches au projet pour construire son planning et visualiser le chemin critique."
              hints={[
                'Une tâche doit porter une date de début et une date de fin.',
                'Les dépendances entre tâches dessinent les flèches du diagramme.',
              ]}
            />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">

            {/* Panneau gauche : liste des tâches */}
            <div
              className={cx('shrink-0 overflow-y-auto border-r', SURFACE, BORDER)}
              style={{ width: LEFT_PANEL_W }}
            >
              <div
                style={{ height: HEADER_HEIGHT }}
                className={cx('flex items-end border-b px-3 pb-2', BORDER, SURFACE_SUNK)}
              >
                <span className={cx('text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED, NUM)}>
                  Tâches ({tasks.length})
                </span>
              </div>

              {tasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                const isCritical = criticalPath.includes(task.id);
                return (
                  <button
                    key={task.id}
                    type="button"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                    className={cx(
                      'flex w-full items-center gap-2 border-b px-3 text-left text-sm transition-colors',
                      BORDER,
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-500/10'
                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                      FOCUS_RING,
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: isCritical ? CRITICAL_COLOR : (task.assignees?.[0]?.color || DEFAULT_COLOR) }}
                    />
                    <span className={cx('truncate', TEXT_BODY)} title={task.name}>{task.name}</span>
                    {task.progress > 0 && (
                      <span className={cx('ml-auto shrink-0 text-xs', TEXT_FAINT, NUM)}>{task.progress} %</span>
                    )}
                  </button>
                );
              })}
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
                    <polygon points="0 0, 8 3, 0 6" className="fill-gray-400 dark:fill-gray-500" />
                  </marker>
                </defs>

                {/* Fond général */}
                <rect x={0} y={0} width={svgWidth} height={svgHeight}
                      className="fill-gray-50 dark:fill-[#0F1923]" />

                {/* Alternance de colonnes */}
                {timelineHeaders.map((h, i) => {
                  const nextX = timelineHeaders[i + 1]?.x ?? svgWidth;
                  const colWidth = nextX - h.x;
                  if (i % 2 !== 0) return null;
                  return (
                    <rect key={h.dateStr} x={h.x} y={0} width={colWidth} height={svgHeight}
                          className="fill-white dark:fill-white/[0.02]" />
                  );
                })}

                {/* Grilles horizontales */}
                {tasks.map((_, i) => (
                  <line key={i}
                    x1={0} y1={HEADER_HEIGHT + i * ROW_HEIGHT}
                    x2={svgWidth} y2={HEADER_HEIGHT + i * ROW_HEIGHT}
                    strokeWidth={1}
                    className="stroke-gray-200 dark:stroke-[#1E3048]"
                  />
                ))}

                {/* En-tête timeline */}
                <rect x={0} y={0} width={svgWidth} height={HEADER_HEIGHT}
                      className="fill-gray-100 dark:fill-[#162032]" />
                {timelineHeaders.map((h) => (
                  <g key={h.dateStr}>
                    <line x1={h.x} y1={0} x2={h.x} y2={svgHeight} strokeWidth={1}
                          className="stroke-gray-200 dark:stroke-[#1E3048]" />
                    <text x={h.x + 6} y={HEADER_HEIGHT - 8} fontSize={11}
                          className="fill-gray-500 dark:fill-gray-400">
                      {h.label}
                    </text>
                  </g>
                ))}

                {/* Ligne "Aujourd'hui" */}
                {todayX >= 0 && todayX <= svgWidth && (
                  <g>
                    <line x1={todayX} y1={0} x2={todayX} y2={svgHeight}
                          strokeWidth={1.5} strokeDasharray="6 3"
                          className="stroke-purple-600 dark:stroke-purple-400" />
                    <rect x={todayX - 18} y={2} width={36} height={16} rx={4}
                          className="fill-purple-600" />
                    <text x={todayX} y={13.5} textAnchor="middle" fontSize={9} fontWeight="600"
                          className="fill-white">
                      Auj.
                    </text>
                  </g>
                )}

                {/* Flèches de dépendance */}
                {dependencyArrows.map((arrow) => (
                  <DependencyArrow key={arrow.key} {...arrow} />
                ))}

                {/* Barres de tâches */}
                {tasks.map((task, i) => {
                  const x = dateToX(task.start, projectStart);
                  const endX = dateToX(task.end, projectStart) + zoom.dayWidth;
                  const width = Math.max(zoom.dayWidth, endX - x);
                  const y = HEADER_HEIGHT + i * ROW_HEIGHT;
                  const isCritical = criticalPath.includes(task.id);

                  return (
                    <g key={task.id}
                      onMouseEnter={() => { setHoveredTaskId(task.id); setTooltipPos({ x, y }); }}
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

                {/* Jalons */}
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

                {/* Infobulle */}
                {hoveredTaskId && (
                  <GanttTooltip
                    task={tasks.find((t) => t.id === hoveredTaskId)}
                    x={tooltipPos.x}
                    y={tooltipPos.y}
                    visible={true}
                  />
                )}
              </svg>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
export { GanttView };
