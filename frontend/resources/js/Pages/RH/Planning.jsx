/**
 * RH/Planning.jsx — Vue calendaire mensuelle des congés
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique inchangée : mêmes props Inertia (`leaves`, `from`, `to`),
 * mêmes noms de routes (`rh.index`, `rh.conges.index`).
 */

import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import AuthLayout from '@/Layouts/AuthLayout';
import { ChevronLeft, ChevronRight, CalendarDays, Users } from 'lucide-react';
import {
  PageHeader, Button, EmptyState, Card,
  cx, SURFACE, SURFACE_SUNK, BORDER, DIVIDE, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS_FR   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Palette d'identification par collaborateur — sobre, sans dégradé. */
const LEAVE_COLORS = [
  'bg-sky-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Lun = 0
}

function isoToDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function leavesCoveringDay(leaves, year, month, day) {
  const target = new Date(year, month, day);
  return leaves.filter(l => {
    const start = isoToDate(l.start_date);
    const end   = isoToDate(l.end_date);
    return start && end && target >= start && target <= end;
  });
}

function getUniqueEmployees(leaves) {
  const seen = new Set();
  return leaves.filter(l => {
    if (seen.has(l.employee)) return false;
    seen.add(l.employee);
    return true;
  });
}

export default function RhPlanning({ leaves = [], from = null, to = null }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const daysInMonth    = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);

  // Couleur stable par collaborateur
  const employees = getUniqueEmployees(leaves);
  const colorMap  = {};
  employees.forEach((e, i) => { colorMap[e.employee] = LEAVE_COLORS[i % LEAVE_COLORS.length]; });

  // Construction des semaines
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const monthLeaves = leaves.filter(l => {
    const start = isoToDate(l.start_date);
    const end   = isoToDate(l.end_date);
    if (!start || !end) return false;
    return start <= new Date(year, month + 1, 0) && end >= new Date(year, month, 1);
  });

  return (
    <AuthLayout>
      <Head title="Planning RH" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={CalendarDays}
          title="Planning RH"
          breadcrumbs={[
            { label: 'Ressources Humaines', href: route('rh.index') },
            { label: 'Planning' },
          ]}
          subtitle="Vue calendaire des congés et absences de l'équipe"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                      title="Mois précédent" onClick={prevMonth} />
              <span className={cx('min-w-[150px] text-center text-sm font-semibold', TEXT_TITLE, NUM)}>
                {MONTHS_FR[month]} {year}
              </span>
              <Button variant="secondary" size="sm" iconOnly icon={ChevronRight}
                      title="Mois suivant" onClick={nextMonth} />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

          {/* Calendrier */}
          <div className={cx('lg:col-span-3 overflow-hidden rounded-xl border shadow-sm', SURFACE, BORDER)}>
            {/* Jours de la semaine */}
            <div className={cx('grid grid-cols-7 border-b', BORDER, SURFACE_SUNK)}>
              {DAYS_FR.map(d => (
                <div key={d} className={cx('py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
                  {d}
                </div>
              ))}
            </div>

            {/* Semaines */}
            {weeks.map((week, wi) => (
              <div key={wi} className={cx('grid grid-cols-7 border-b last:border-0', BORDER)}>
                {week.map((day, di) => {
                  const isToday   = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                  const isWeekend = di >= 5;
                  const dayLeaves = day ? leavesCoveringDay(leaves, year, month, day) : [];

                  return (
                    <div
                      key={di}
                      className={cx(
                        'min-h-[76px] border-r p-1.5 last:border-r-0', BORDER,
                        !day ? SURFACE_SUNK : isWeekend ? 'bg-gray-50/70 dark:bg-white/[0.02]' : '',
                      )}
                    >
                      {day && (
                        <>
                          <div className={cx(
                            'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                            NUM,
                            isToday ? 'bg-purple-600 text-white' : TEXT_BODY,
                          )}>
                            {day}
                          </div>
                          <div className="space-y-1">
                            {dayLeaves.slice(0, 2).map((l, i) => (
                              <div
                                key={i}
                                title={`${l.employee} — ${l.type}`}
                                className={cx('h-1.5 rounded-full', colorMap[l.employee] ?? 'bg-gray-400')}
                              />
                            ))}
                            {dayLeaves.length > 2 && (
                              <span className={cx('text-[11px]', TEXT_FAINT, NUM)}>
                                +{dayLeaves.length - 2}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Panneau latéral */}
          <div className="space-y-4">
            <Card padded={false}>
              <div className={cx('flex items-center gap-2 border-b px-4 py-3', BORDER)}>
                <Users className={cx('h-3.5 w-3.5', TEXT_MUTED)} aria-hidden="true" />
                <h2 className={cx('text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
                  Ce mois
                </h2>
                <span className={cx('ml-auto text-xs', TEXT_FAINT, NUM)}>{monthLeaves.length}</span>
              </div>

              {monthLeaves.length === 0 ? (
                <EmptyState
                  compact
                  icon={CalendarDays}
                  title="Aucun congé ce mois"
                  description="Les absences validées apparaîtront ici."
                />
              ) : (
                <ul className={cx('divide-y', DIVIDE)}>
                  {monthLeaves.map((l, i) => (
                    <li key={i} className="flex items-start gap-2.5 px-4 py-3">
                      <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', colorMap[l.employee] ?? 'bg-gray-400')} />
                      <div className="min-w-0">
                        <p className={cx('truncate text-xs font-medium', TEXT_TITLE)}>{l.employee}</p>
                        <p className={cx('truncate text-xs', TEXT_MUTED)}>{l.type}</p>
                        <p className={cx('text-xs', TEXT_FAINT, NUM)}>
                          {l.start_date && new Date(l.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          {' → '}
                          {l.end_date && new Date(l.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Button as={Link} href={route('rh.conges.index')} variant="secondary" block>
              Gérer les congés
            </Button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
