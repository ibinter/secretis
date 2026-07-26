import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(startDate) {
  const days = [];
  const d = new Date(startDate);
  d.setDate(d.getDate() - d.getDay() + 1); // Lundi
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getMonthDays(year, month) {
  const days = [];
  const last = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= last; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function formatDay(date, view) {
  if (view === 'week') {
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
  }
  return date.getDate().toString();
}

function isToday(date) {
  const today = new Date();
  return toISO(date) === toISO(today);
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV(data, days, projectName) {
  const headers = ['Collaborateur', ...days.map((d) => toISO(d)), 'Total'];
  const rows = data.map((row) => [
    row.user_name,
    ...days.map((d) => {
      const e = row.entries?.find((e) => e.date === toISO(d));
      return e ? e.hours : '';
    }),
    row.total_hours,
  ]);

  const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `feuille-de-temps-${projectName}-${toISO(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Cellule éditable ─────────────────────────────────────────────────────────

function TimeCell({ value, onSave, highlight, weekend }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value || '');
  const inputRef = useRef(null);

  const activate = () => { setEditing(true); setDraft(value || ''); };
  const commit   = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0 && n <= 24) onSave(n || null);
    else if (draft === '' || draft === '0') onSave(null);
    setEditing(false);
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        type="number" step="0.25" min="0" max="24"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-full h-full text-center text-sm border-2 border-purple-500 rounded outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        style={{ minWidth: 44 }}
      />
    );
  }

  const num = parseFloat(value);
  const hasValue = !isNaN(num) && num > 0;

  return (
    <div
      onDoubleClick={activate}
      className={`w-full h-full flex items-center justify-center text-sm cursor-default select-none rounded transition-colors
        ${weekend ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
        ${highlight ? 'ring-2 ring-purple-400 ring-inset' : ''}
        ${hasValue ? 'text-purple-700 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-900/20' : 'text-gray-400'}
        hover:bg-purple-50 dark:hover:bg-purple-900/20`}
      style={{ minHeight: 36, minWidth: 44 }}
    >
      {hasValue ? num : ''}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function TimesheetView() {
  const { project } = usePage().props;

  const [view, setView]           = useState('week'); // 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData]           = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [billableAmount, setBillableAmount] = useState(0);
  const [loading, setLoading]     = useState(false);

  // ── Calcul des jours à afficher ───────────────────────────────────────────

  const days = view === 'week'
    ? getWeekDays(currentDate)
    : getMonthDays(currentDate.getFullYear(), currentDate.getMonth());

  const startDate = toISO(days[0]);
  const endDate   = toISO(days[days.length - 1]);

  // ── Chargement des données ────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/projets/${project.id}/feuille-de-temps`, {
        params: { start_date: startDate, end_date: endDate },
      });
      setData(res.data.timesheets || []);
      setTotalHours(res.data.total_hours || 0);
      setBillableAmount(res.data.billable_amount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [project.id, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  // ── Sauvegarde d'une cellule ──────────────────────────────────────────────

  const handleSave = useCallback(async (userId, userName, date, hours) => {
    try {
      await axios.post(`/projets/${project.id}/feuille-de-temps`, {
        date,
        hours: hours || 0,
        description: '',
        is_billable: true,
      });
      // Mise à jour locale optimiste
      setData((prev) => {
        const idx = prev.findIndex((r) => r.user_name === userName);
        if (idx < 0) return prev;
        const updated = [...prev];
        const row  = { ...updated[idx] };
        const entries = [...(row.entries || [])];
        const eIdx = entries.findIndex((e) => e.date === date);
        if (hours) {
          if (eIdx >= 0) entries[eIdx] = { ...entries[eIdx], hours };
          else entries.push({ date, hours, user_id: userId });
        } else {
          entries.splice(eIdx, 1);
        }
        row.entries     = entries;
        row.total_hours = entries.reduce((s, e) => s + (e.hours || 0), 0);
        updated[idx]    = row;
        return updated;
      });
    } catch (err) {
      alert('Erreur lors de l\'enregistrement');
    }
  }, [project.id]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  // ── Totaux par jour ───────────────────────────────────────────────────────

  const dayTotals = days.map((day) => {
    const iso = toISO(day);
    return data.reduce((sum, row) => {
      const e = row.entries?.find((e) => e.date === iso);
      return sum + (e?.hours || 0);
    }, 0);
  });

  const today = toISO(new Date());
  const periodLabel = view === 'week'
    ? `Semaine du ${days[0].toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${days[6].toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`
    : currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <AppLayout>
      <Head title={`Feuille de temps — ${project.name}`} />

      <div className="max-w-full mx-auto px-4 py-6">
        {/* ── Barre d'outils ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{periodLabel}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle vue */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
              {['week', 'month'].map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 transition-colors ${view === v
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  {v === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              ‹
            </button>
            <button onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              ›
            </button>

            {/* Export */}
            <button onClick={() => exportCSV(data, days, project.name)}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
              ↓ Export CSV
            </button>
          </div>
        </div>

        {/* ── KPIs rapides ── */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-purple-600">{totalHours}h</p>
            <p className="text-xs text-gray-500 mt-1">Heures total</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(billableAmount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Montant facturable</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-purple-600">{data.length}</p>
            <p className="text-xs text-gray-500 mt-1">Collaborateurs</p>
          </div>
        </div>

        {/* ── Grille ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              Chargement…
            </div>
          )}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: days.length * 52 + 200 }}>
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 w-48 sticky left-0 bg-gray-50 dark:bg-gray-900/50 z-10 border-r border-gray-100 dark:border-gray-700">
                      Collaborateur
                    </th>
                    {days.map((day) => (
                      <th key={toISO(day)}
                        className={`text-center text-xs font-semibold px-1 py-3 min-w-[52px]
                          ${isToday(day) ? 'text-purple-600 dark:text-purple-400' : isWeekend(day) ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatDay(day, view)}
                      </th>
                    ))}
                    <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-3 border-l border-gray-100 dark:border-gray-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 2} className="text-center text-gray-400 py-12 text-sm">
                        Aucune saisie sur cette période.<br />
                        <span className="text-xs">Double-cliquez sur une cellule pour saisir des heures.</span>
                      </td>
                    </tr>
                  )}
                  {data.map((row) => (
                    <tr key={row.user_name} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                      {/* Nom */}
                      <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 z-10">
                        {row.user_name}
                      </td>
                      {/* Cellules heures */}
                      {days.map((day) => {
                        const iso = toISO(day);
                        const entry = row.entries?.find((e) => e.date === iso);
                        return (
                          <td key={iso} className="p-0.5">
                            <TimeCell
                              value={entry?.hours}
                              weekend={isWeekend(day)}
                              highlight={isToday(day)}
                              onSave={(hours) => handleSave(entry?.user_id || row.user_id, row.user_name, iso, hours)}
                            />
                          </td>
                        );
                      })}
                      {/* Total */}
                      <td className="px-3 py-2 text-center text-sm font-bold text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700">
                        {row.total_hours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Pied : totaux par jour */}
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-200 dark:border-gray-600">
                    <td className="px-4 py-2 text-xs font-semibold text-gray-500 sticky left-0 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-700">
                      Total / jour
                    </td>
                    {dayTotals.map((total, i) => (
                      <td key={i} className={`text-center text-xs font-semibold py-2 ${total > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                        {total > 0 ? `${total}h` : ''}
                      </td>
                    ))}
                    <td className="text-center text-sm font-bold text-purple-700 dark:text-purple-400 border-l border-gray-100 dark:border-gray-700 py-2">
                      {totalHours}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          Double-cliquez sur une cellule pour saisir ou modifier les heures
        </p>
      </div>
    </AppLayout>
  );
}
export { TimesheetView };
