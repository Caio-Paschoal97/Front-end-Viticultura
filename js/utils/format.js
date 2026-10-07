/**
 * Formatação de números, datas e textos em pt-BR.
 *
 * Centraliza a apresentação para que as páginas não repitam regras — e para que
 * "sem dado" seja sempre exibido como travessão, nunca como `NaN` ou `null`.
 */

const LOCALE = 'pt-BR';

export const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export const safeNumber = (value, fallback = null) => {
  if (isNumber(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function formatTemperature(value, { unit = '°C', digits = 1 } = {}) {
  const number = safeNumber(value);
  if (number === null) return '—';
  return `${number.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`;
}

export function formatPercent(value, { digits = 1, fromRatio = false } = {}) {
  const number = safeNumber(value);
  if (number === null) return '—';
  const percent = fromRatio ? number * 100 : number;
  return `${percent.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/** Razão 0–1 → percentual (aceita 0,987 e 98,7 sem duplicar a conversão). */
export const ratioToPercent = (value) => {
  const number = safeNumber(value);
  if (number === null) return null;
  return number <= 1 ? number * 100 : number;
};

export function formatCurrency(value, { unit = '/kg' } = {}) {
  const number = safeNumber(value);
  if (number === null) return '—';
  return `R$ ${number.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit}`;
}

export function formatNumber(value, { digits = 0 } = {}) {
  const number = safeNumber(value);
  if (number === null) return '—';
  return number.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatShortDate(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' });
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

export function formatHour(value) {
  const date = toDate(value);
  if (!date) return '—';
  return `${String(date.getHours()).padStart(2, '0')}h`;
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  return `${formatDate(date)} ${formatTime(date)}`;
}

/** "há 4 min", "há 3 h", "há 2 dias" — usado em listas e faixas de status. */
export function relativeTime(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return '—';
  const diffSeconds = Math.round((now - date.getTime()) / 1000);
  if (Math.abs(diffSeconds) < 45) return 'agora há pouco';
  const minutes = Math.round(diffSeconds / 60);
  if (Math.abs(minutes) < 60) return `há ${Math.abs(minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `há ${Math.abs(hours)} h`;
  const days = Math.round(hours / 24);
  return `há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`;
}

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Janela de tempo do `period` do back-end (start/end). */
export function formatWindow(startValue, endValue) {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end) return '—';
  return `${formatShortDate(start)} ${formatTime(start)} → ${formatShortDate(end)} ${formatTime(end)}`;
}

export const formatRange = (start, end) => `${formatShortDate(start)} → ${formatShortDate(end)}`;

/**
 * Tom visual de uma variação: alta = `positive`, baixa = `negative`, estável =
 * `neutral`. Aceita número ou texto no formato da interface ("+4,2%").
 */
export function trendTone(value) {
  const raw = typeof value === 'number' ? value : String(value ?? '').replace('%', '').replace('+', '').replace(',', '.');
  const number = safeNumber(raw);
  if (number === null || number === 0) return 'neutral';
  return number > 0 ? 'positive' : 'negative';
}

export function formatDelta(value, { unit = '%', digits = 1 } = {}) {
  const number = safeNumber(value);
  if (number === null) return '—';
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`;
}

/** Texto sem acentos e em minúsculas — usado nas buscas por nome/e-mail. */
export const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const initialsOf = (name) =>
  String(name ?? '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const pluralize = (count, singular, plural) => `${formatNumber(count)} ${count === 1 ? singular : plural}`;

export function average(values) {
  const numbers = (values ?? []).map((value) => safeNumber(value)).filter((value) => value !== null);
  if (numbers.length === 0) return null;
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

export const minOf = (values) => {
  const numbers = (values ?? []).map((value) => safeNumber(value)).filter((value) => value !== null);
  return numbers.length ? Math.min(...numbers) : null;
};

export const maxOf = (values) => {
  const numbers = (values ?? []).map((value) => safeNumber(value)).filter((value) => value !== null);
  return numbers.length ? Math.max(...numbers) : null;
};

export const displayValue = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};
