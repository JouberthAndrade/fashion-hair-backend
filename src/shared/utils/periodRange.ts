import { parseDateUTC, formatDateUTC } from './timeSlots.js';

export type ReportPeriod = 'day' | 'week' | 'month';

export interface PeriodRange {
  start: string;
  end: string;
}

/** Resolves an inclusive UTC date range for day / week (Mon–Sun) / calendar month. */
export function getPeriodRange(period: ReportPeriod, anchorDate: string): PeriodRange {
  const date = parseDateUTC(anchorDate);

  if (period === 'day') {
    return { start: anchorDate, end: anchorDate };
  }

  if (period === 'week') {
    const day = date.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { start: formatDateUTC(monday), end: formatDateUTC(sunday) };
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  return { start: formatDateUTC(first), end: formatDateUTC(last) };
}

export function periodToEnum(period: ReportPeriod): 'DAY' | 'WEEK' | 'MONTH' {
  return period.toUpperCase() as 'DAY' | 'WEEK' | 'MONTH';
}

export function enumToPeriod(period: 'DAY' | 'WEEK' | 'MONTH'): ReportPeriod {
  return period.toLowerCase() as ReportPeriod;
}
