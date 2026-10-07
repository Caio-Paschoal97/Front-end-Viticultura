/**
 * Formatação pt-BR (RF06 — leitura fácil para produtores).
 * Roda com `npm test` (node --test), sem dependências externas.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  average,
  clamp,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDelta,
  formatNumber,
  formatPercent,
  formatRange,
  formatShortDate,
  formatTemperature,
  formatWindow,
  initialsOf,
  maxOf,
  minOf,
  normalizeText,
  pluralize,
  ratioToPercent,
  relativeTime,
  safeNumber,
  toDate,
  trendTone,
} from '../js/utils/format.js';

test('números formatados em pt-BR', () => {
  assert.equal(formatNumber(1250), '1.250');
  assert.equal(formatNumber(3.14159, { digits: 2 }), '3,14');
  assert.equal(formatTemperature(28.456), '28,5 °C');
  assert.equal(formatPercent(98.7), '98,7%');
  assert.equal(formatCurrency(4.5), 'R$ 4,50/kg');
});

test('valores ausentes viram travessão em vez de NaN', () => {
  assert.equal(formatTemperature(null), '—');
  assert.equal(formatPercent(undefined), '—');
  assert.equal(formatCurrency('abc'), '—');
  assert.equal(formatNumber(NaN), '—');
});

test('razões 0–1 são convertidas sem duplicar a escala', () => {
  assert.equal(ratioToPercent(0.987), 98.7);
  assert.equal(ratioToPercent(98.7), 98.7);
  assert.equal(ratioToPercent(null), null);
});

test('datas e janelas do período', () => {
  const value = new Date('2026-03-10T14:35:00-03:00');
  assert.match(formatDateTime(value), /10\/03\/2026/);
  assert.match(formatShortDate(value), /10 de mar/);
  assert.match(formatWindow('2026-03-01T00:00:00Z', '2026-03-31T23:59:00Z'), /1 de mar.*31 de mar/);
  assert.match(formatRange('2026-03-01', '2026-03-31'), /→/);
  assert.ok(toDate('2026-03-10T14:35:00Z') instanceof Date);
  assert.equal(toDate('não é data'), null);
  assert.equal(formatWindow(null, null), '—');
});

test('tempo relativo em linguagem natural', () => {
  const now = new Date('2026-03-10T12:00:00Z').getTime();
  assert.match(relativeTime(new Date(now - 30_000), now), /agora|segundos/i);
  assert.match(relativeTime(new Date(now - 5 * 60_000), now), /5 min/);
  assert.match(relativeTime(new Date(now - 3 * 3600_000), now), /3 h/);
  assert.equal(relativeTime(null, now), '—');
});

test('utilidades de série, tom e texto', () => {
  assert.equal(safeNumber('12,5', 0), 12.5); // aceita o formato brasileiro
  assert.equal(safeNumber('abc', 0), 0);
  assert.equal(safeNumber(12.5), 12.5);
  assert.equal(clamp(120, 0, 100), 100);
  assert.equal(average([10, 20, 30]), 20);
  assert.equal(minOf([10, 20, 30]), 10);
  assert.equal(maxOf([10, 20, 30]), 30);
  assert.equal(trendTone('+4%'), 'positive');
  assert.equal(trendTone('-2%'), 'negative');
  assert.equal(trendTone(0), 'neutral');
  assert.equal(normalizeText('  Uva Itália  '), 'uva italia');
  assert.equal(initialsOf('Mariana Costa'), 'MC');
  assert.equal(pluralize(1, 'leitura', 'leituras'), '1 leitura');
  assert.equal(pluralize(3, 'leitura', 'leituras'), '3 leituras');
  assert.match(formatDelta(2.5), /^\+2,5\s*%$/);
});
