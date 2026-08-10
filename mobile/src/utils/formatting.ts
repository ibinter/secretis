import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import calendar from 'dayjs/plugin/calendar';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isYesterday from 'dayjs/plugin/isYesterday';
import duration from 'dayjs/plugin/duration';

// Configuration dayjs
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(calendar);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(duration);
dayjs.locale('fr');

// ============================================================
// Formatage de dates
// ============================================================

export function formatDate(
  date: string | Date | null | undefined,
  format = 'DD/MM/YYYY',
): string {
  if (!date) return '—';
  return dayjs(date).format(format);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return dayjs(date).format('DD/MM/YYYY à HH:mm');
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return dayjs(date).format('HH:mm');
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = dayjs(date);
  if (d.isToday()) return `Aujourd'hui à ${d.format('HH:mm')}`;
  if (d.isYesterday()) return `Hier à ${d.format('HH:mm')}`;
  if (d.isTomorrow()) return `Demain à ${d.format('HH:mm')}`;
  return d.fromNow();
}

export function formatCalendarDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return dayjs(date).calendar(null, {
    sameDay: '[Aujourd\'hui à] HH:mm',
    nextDay: '[Demain à] HH:mm',
    nextWeek: 'dddd [à] HH:mm',
    lastDay: '[Hier à] HH:mm',
    lastWeek: 'dddd [dernier à] HH:mm',
    sameElse: 'DD/MM/YYYY [à] HH:mm',
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function formatDateRange(
  start: string | Date,
  end: string | Date,
): string {
  const s = dayjs(start);
  const e = dayjs(end);
  if (s.isSame(e, 'day')) {
    return `${s.format('DD/MM/YYYY')} · ${s.format('HH:mm')} - ${e.format('HH:mm')}`;
  }
  return `${s.format('DD/MM/YYYY HH:mm')} → ${e.format('DD/MM/YYYY HH:mm')}`;
}

export function isOverdue(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) return false;
  return dayjs(dueDate).isBefore(dayjs());
}

export function daysUntil(date: string | Date | null | undefined): number {
  if (!date) return 0;
  return dayjs(date).diff(dayjs(), 'day');
}

// ============================================================
// Formatage monétaire (XOF — Franc CFA)
// ============================================================

const XOF_FORMATTER = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatAmount(
  amount: number | null | undefined,
  currency = 'XOF',
): string {
  if (amount == null) return '—';
  if (currency === 'XOF') return XOF_FORMATTER.format(amount);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(value);
}

// ============================================================
// Formatage texte
// ============================================================

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function truncate(text: string, maxLength = 60): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}
