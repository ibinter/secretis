import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const ZOOM_LEVELS = [
  { key: 'day',   label: 'Jour',    dayWidth: 40,  days: 14 },
  { key: 'week',  label: 'Semaine', dayWidth: 18,  days: 42 },
  { key: 'month', label: 'Mois',    dayWidth:  6,  days: 180 },
];

export default function useGantt({ projectId, initialData }) {
  const [tasks, setTasks]           = useState(initialData?.tasks || []);
  const [milestones, setMilestones] = useState(initialData?.milestones || []);
  const [criticalPath, setCriticalPath] = useState(initialData?.criticalPath || []);
  const [zoomIndex, setZoomIndex]   = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [dragging, setDragging]     = useState(null); // { taskId, type: 'move'|'resize', startX }
  const containerRef = useRef(null);

  const zoom = ZOOM_LEVELS[zoomIndex];

  // ── Zoom ─────────────────────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    setZoomIndex((i) => Math.max(0, i - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1));
  }, []);

  const scrollToToday = useCallback(() => {
    if (!containerRef.current) return;
    const today = new Date();
    const projectStart = new Date(initialData?.projectStart || today);
    const daysFromStart = Math.floor((today - projectStart) / 86400000);
    const scrollLeft = daysFromStart * zoom.dayWidth - 200;
    containerRef.current.scrollLeft = Math.max(0, scrollLeft);
  }, [zoom.dayWidth, initialData?.projectStart]);

  // ── Update task dates (optimistic) ───────────────────────────────────────

  const updateTaskDates = useCallback(async (taskId, startDate, endDate) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, start: startDate, end: endDate }
          : t
      )
    );

    try {
      await axios.patch(`/tasks/${taskId}/dates`, {
        start_date: startDate,
        due_date:   endDate,
      });
    } catch (err) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, start: initialData.tasks.find((x) => x.id === taskId)?.start, end: initialData.tasks.find((x) => x.id === taskId)?.end }
            : t
        )
      );
      console.error('Erreur mise à jour dates:', err);
    }
  }, [initialData?.tasks]);

  const updateTaskProgress = useCallback(async (taskId, progress) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, progress } : t))
    );
    try {
      await axios.patch(`/tasks/${taskId}/dates`, { progress });
    } catch (err) {
      console.error('Erreur mise à jour progression:', err);
    }
  }, []);

  // ── Dépendances ───────────────────────────────────────────────────────────

  const addDependency = useCallback(async (taskId, dependsOnId, type = 'finish_to_start') => {
    try {
      await axios.post(`/tasks/${taskId}/dependencies`, {
        depends_on_task_id: dependsOnId,
        dependency_type:    type,
      });
      // Mise à jour locale
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, dependencies: [...(t.dependencies || []), dependsOnId] }
            : t
        )
      );
    } catch (err) {
      if (err.response?.data?.error) {
        alert(err.response.data.error);
      }
    }
  }, []);

  const removeDependency = useCallback(async (taskId, dependencyId) => {
    try {
      await axios.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, dependencies: (t.dependencies || []).filter((d) => d !== dependencyId) }
            : t
        )
      );
    } catch (err) {
      console.error('Erreur suppression dépendance:', err);
    }
  }, []);

  // ── Drag helpers ──────────────────────────────────────────────────────────

  const startDrag = useCallback((taskId, type, clientX) => {
    setDragging({ taskId, type, startX: clientX });
  }, []);

  const endDrag = useCallback(() => {
    setDragging(null);
  }, []);

  // ── Utilitaires date ──────────────────────────────────────────────────────

  const dateToX = useCallback((dateStr, projectStart) => {
    if (!dateStr || !projectStart) return 0;
    const d = new Date(dateStr);
    const s = new Date(projectStart);
    const days = Math.floor((d - s) / 86400000);
    return days * zoom.dayWidth;
  }, [zoom.dayWidth]);

  const xToDate = useCallback((x, projectStart) => {
    const days = Math.round(x / zoom.dayWidth);
    const d = new Date(projectStart);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }, [zoom.dayWidth]);

  return {
    // State
    tasks,
    milestones,
    criticalPath,
    zoom,
    zoomIndex,
    selectedTaskId,
    dragging,
    containerRef,

    // Setters
    setTasks,
    setMilestones,
    setSelectedTaskId,

    // Actions
    zoomIn,
    zoomOut,
    scrollToToday,
    updateTaskDates,
    updateTaskProgress,
    addDependency,
    removeDependency,
    startDrag,
    endDrag,

    // Utils
    dateToX,
    xToDate,
  };
}
export { useGantt };
