/**
 * Limpeza e qualidade dos dados (RF05).
 * Os limites testados aqui são os mesmos do back-end (DataQualityService).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALERT_THRESHOLDS,
  IDEAL,
  LIMITS,
  calculateQuality,
  classifyReading,
  cleanSeries,
  evaluateReadings,
  idealRangeShare,
  movingAverage,
  validateReading,
} from '../js/core/data-quality.js';
import { ReadingStatus } from '../js/core/contracts.js';

const reading = (temperature, humidity, extra = {}) => ({ timestamp: '2026-03-10T12:00:00Z', temperature, humidity, ...extra });

test('faixas plausíveis do back-end: -10..60 °C e 0..100 %', () => {
  assert.deepEqual(LIMITS.temperature, { min: -10, max: 60, unit: '°C' });
  assert.deepEqual(LIMITS.humidity, { min: 0, max: 100, unit: '%' });
  assert.equal(ALERT_THRESHOLDS.temperatureHigh, 35);
  assert.equal(ALERT_THRESHOLDS.humidityLow, 35);
});

test('validateReading devolve os mesmos códigos de erro do servidor', () => {
  assert.equal(validateReading(reading(28, 65)).valid, true);
  assert.deepEqual(validateReading(reading(28, 65)).errors, []);
  assert.deepEqual(validateReading(reading(75, 65)).errors, ['temperature_out_of_range']);
  assert.deepEqual(validateReading(reading(28, 120)).errors, ['humidity_out_of_range']);
  assert.deepEqual(validateReading(reading(null, 65)).errors, ['temperature_missing']);
  assert.deepEqual(validateReading(reading(28, undefined)).errors, ['humidity_missing']);
  assert.equal(validateReading({}).valid, false);
});

test('classificação nos quatro estados do enum ReadingStatus', () => {
  assert.equal(classifyReading(reading(28, 65)), ReadingStatus.NORMAL);
  assert.equal(classifyReading(reading(36, 65)), ReadingStatus.CRITICAL);
  assert.equal(classifyReading(reading(28, 30)), ReadingStatus.WARNING);
  assert.equal(classifyReading(reading(120, 65)), ReadingStatus.INVALID);
});

test('calculateQuality conta válidos, inválidos, ausentes e outliers', () => {
  const list = [
    reading(28, 65),
    reading(29, 66),
    reading(75, 64), // fora de faixa
    reading(null, 60), // ausente
    reading(27, 63),
  ];
  const quality = calculateQuality(list);
  assert.equal(quality.totalCount, 5);
  assert.equal(quality.validCount, 3);
  assert.equal(quality.invalidCount, 2);
  assert.equal(quality.missingCount, 1);
  assert.equal(quality.completeness, 9 / 10);
  assert.equal(quality.consistency, 3 / 5);

  const empty = calculateQuality([]);
  assert.equal(empty.totalCount, 0);
  assert.equal(empty.completeness, null);
  assert.equal(empty.consistency, null);
});

test('cleanSeries remove leituras sem valor e ordena por tempo', () => {
  const series = [
    { timestamp: '2026-03-10T12:00:00Z', value: 28 },
    { timestamp: '2026-03-10T11:00:00Z', value: 27 },
    { timestamp: '2026-03-10T13:00:00Z', value: null },
  ];
  const cleaned = cleanSeries(series);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].value, 27);
  assert.equal(cleaned[1].value, 28);
  assert.equal(typeof cleaned[1].gapHours, 'number');
});

test('movingAverage suaviza preservando o tamanho da série', () => {
  const smoothed = movingAverage([10, 20, 30, 40], 2);
  assert.equal(smoothed.length, 4);
  assert.equal(smoothed[0], 10);
  assert.equal(smoothed[1], 15);
  assert.equal(smoothed[2], 25);
  assert.equal(smoothed[3], 35);
  assert.deepEqual(movingAverage([1, 2], 1), [1, 2]);
});

test('idealRangeShare usa a faixa agronômica de conforto (RF06)', () => {
  const list = [reading(28, 65), reading(28, 90), reading(40, 65), reading(26, 70)];
  assert.equal(idealRangeShare(list), 2 / 4);
  assert.equal(idealRangeShare([]), null);
  assert.deepEqual(IDEAL.temperature, { min: 24, max: 30 });
});

test('evaluateReadings roda o pipeline completo (RF05/RF11)', () => {
  const list = [reading(28, 65), reading(36, 65), reading(28, 30), reading(null, 61)];
  const evaluated = evaluateReadings(list);
  assert.equal(evaluated.counts.NORMAL, 1);
  assert.equal(evaluated.counts.CRITICAL, 1);
  assert.equal(evaluated.counts.WARNING, 1);
  assert.equal(evaluated.counts.INVALID, 1);
  assert.equal(evaluated.quality.totalCount, 4);
  assert.equal(evaluated.temperatureSeries.length, 3);
});
