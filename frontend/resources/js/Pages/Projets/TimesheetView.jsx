/**
 * Projets/TimesheetView.jsx — Feuille de temps d'un projet
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Les appels réseau sont conservés à l'identique :
 *   - GET  /api/v1/projects/{id}/timesheets?start_date&end_date
 *   - POST /api/v1/projects/{id}/timesheets
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';
import {
  Timer, ChevronLeft, ChevronRight, Download, Users, Banknote, CalendarDays,
} from 'lucide-react';
import { formatAmount } from '@/hooks/useCurrency';
import {
  PageHeader, Button, StatCard, EmptyState, Skeleton,
  cx, SURFACE, SURFACE_SUNK, BORDER, DIVIDE,
  TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, TH, NUM, FOCUS_RING,
} from '@/Components/UI';

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

function TimeCell({ value, onSave, highlight, weekend, label }) {
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
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className={cx(
          'h-9 w-full rounded-lg border-2 border-purple-500 bg-white px-1 text-center text-sm outline-none',
          'dark:bg-[#0F1923]', TEXT_TITLE, NUM,
        )}
        style={{ minWidth: 44 }}
      />
    );
  }

  const num = parseFloat(value);
  const hasValue = !isNaN(num) && num > 0;

  return (
    <button
      type="button"
      onDoubleClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter') activate(); }}
      aria-label={label}
      title="Double-cliquez pour saisir des heures"
      className={cx(
        'flex h-9 w-full select-none items-center justify-center rounded-lg text-sm transition-colors',
        NUM,
        weekend && SURFACE_SUNK,
        highlight && 'ring-1 ring-inset ring-purple-400 dark:ring-purple-500/60',
        hasValue
          ? 'bg-purple-50 font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300'
          : TEXT_FAINT,
        'hover:bg-purple-50 dark:hover:bg-purple-500/10',
        FOCUS_RING,
      )}
      style={{ minWidth: 44 }}
    >
      {hasValue ? num : ''}
    </button>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function TimesheetView() {
  const { project } = usePage().props;

  const [view, setView]                     = useState('week'); // 'week' | 'month'
  const [currentDate, setCurrentDate]       = useState(new Date());
  const [data, setData]                     = useState([]);
  const [totalHours, setTotalHours]         = useState(0);
  const [billableAmount, setBillableAmount] = useState(0);
  const [loading, setLoading]               = useState(false);

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
      const res = await axios.get(`/api/v1/projects/${project.id}/timesheets`, {
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
      await axios.post(`/api/v1/projects/${project.id}/timesheets`, {
        user_id: userId, // sans cela, la saisie était toujours imputée à l'utilisateur connecté
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

  const periodLabel = view === 'week'
    ? `Semaine du ${days[0].toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${days[6].toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`
    : currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <AppLayout>
      <Head title={`Feuille de temps — ${project.name}`} />

      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={Timer}
          title={project.name}
          breadcrumbs={[
            { label: 'Projets', href: '/projets' },
            { label: project.name, href: `/projets/${project.id}` },
            { label: 'Feuille de temps' },
          ]}
          subtitle={periodLabel}
          actions={
            <>
              {/* Bascule semaine / mois */}
              <div className={cx('flex overflow-hidden rounded-lg border', BORDER)}>
                {[['week', 'Semaine'], ['month', 'Mois']].map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className={cx(
                      'h-10 px-3 text-sm font-medium transition-colors',
                      view === v
                        ? 'bg-purple-600 text-white'
                        : cx(SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                      FOCUS_RING,
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Button variant="secondary" size="md" iconOnly icon={ChevronLeft}
                      title="Période précédente" onClick={() => navigate(-1)} />
              <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>
                Aujourd'hui
              </Button>
              <Button variant="secondary" size="md" iconOnly icon={ChevronRight}
                      title="Période suivante" onClick={() => navigate(1)} />

              <Button variant="secondary" icon={Download}
                      onClick={() => exportCSV(data, days, project.name)}>
                Export CSV
              </Button>
            </>
          }
        />

        {/* Indicateurs */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Heures saisies" value={totalHours} unit="h" icon={Timer} tone="accent" loading={loading} />
          <StatCard
            label="Montant facturable"
            value={formatAmount(Number(billableAmount ?? 0), 'XOF', 'fr')}
            icon={Banknote}
            tone="success"
            loading={loading}
          />
          <StatCard label="Collaborateurs" value={data.length} icon={Users} tone="neutral" loading={loading} />
        </div>

        {/* Grille de saisie */}
        <div className={cx('overflow-hidden rounded-xl border shadow-sm', SURFACE, BORDER)}>
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Aucune saisie sur cette période"
              description="Les heures saisies par l'équipe apparaîtront ici, jour par jour."
              hints={[
                'Double-cliquez sur une cellule pour saisir des heures.',
                'Entrée valide la saisie, Échap l’annule.',
              ]}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: days.length * 52 + 200 }}>
                <caption className="sr-only">
                  Heures saisies par collaborateur et par jour — {periodLabel}
                </caption>
                <thead className={cx(SURFACE_SUNK, 'border-b', BORDER)}>
                  <tr>
                    <th scope="col" className={cx('sticky left-0 z-10 w-48 border-r px-4 py-3 text-left',
                      TH, BORDER, SURFACE_SUNK)}>
                      Collaborateur
                    </th>
                    {days.map((day) => (
                      <th
                        key={toISO(day)}
                        scope="col"
                        className={cx(
                          'min-w-[52px] px-1 py-3 text-center', TH, NUM,
                          isToday(day)
                            ? 'text-purple-600 dark:text-purple-400'
                            : isWeekend(day) ? TEXT_FAINT : TEXT_MUTED,
                        )}
                      >
                        {formatDay(day, view)}
                      </th>
                    ))}
                    <th scope="col" className={cx('border-l px-3 py-3 text-center', TH, BORDER)}>
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className={cx('divide-y', DIVIDE)}>
                  {data.map((row) => (
                    <tr key={row.user_name} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      {/* Nom */}
                      <th scope="row" className={cx('sticky left-0 z-10 border-r px-4 py-2 text-left text-sm font-medium',
                        SURFACE, BORDER, TEXT_TITLE)}>
                        {row.user_name}
                      </th>

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
                              label={`${row.user_name} — ${iso}`}
                              onSave={(hours) => handleSave(entry?.user_id || row.user_id, row.user_name, iso, hours)}
                            />
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className={cx('border-l px-3 py-2 text-center text-sm font-semibold',
                        BORDER, TEXT_TITLE, NUM)}>
                        {row.total_hours} h
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Pied : totaux par jour */}
                <tfoot className={cx(SURFACE_SUNK, 'border-t', BORDER)}>
                  <tr>
                    <th scope="row" className={cx('sticky left-0 z-10 border-r px-4 py-2.5 text-left',
                      TH, BORDER, SURFACE_SUNK)}>
                      Total / jour
                    </th>
                    {dayTotals.map((total, i) => (
                      <td key={i} className={cx('py-2.5 text-center text-xs font-semibold', NUM,
                        total > 0 ? 'text-purple-600 dark:text-purple-400' : TEXT_FAINT)}>
                        {total > 0 ? `${total} h` : ''}
                      </td>
                    ))}
                    <td className={cx('border-l py-2.5 text-center text-sm font-semibold',
                      BORDER, 'text-purple-700 dark:text-purple-300', NUM)}>
                      {totalHours} h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {data.length > 0 && (
          <p className={cx('mt-3 text-center text-xs', TEXT_FAINT)}>
            Double-cliquez sur une cellule pour saisir ou modifier les heures.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
export { TimesheetView };
