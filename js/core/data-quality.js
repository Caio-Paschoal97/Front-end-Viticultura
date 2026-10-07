/**
 * Qualidade dos dados (RF05).
 *
 * As regras são as mesmas do back-end (`DataQualityService`): faixas plausíveis
 * de temperatura/umidade, contagem de inválidos, ausentes e outliers. O módulo
 * roda no navegador para permitir auditar, na própria tela, o número que a API
 * devolve (ver Analista › Qualidade dos Dados).
 */

import { ReadingStatus } from './contracts.js';

export const LIMITS = Object.freeze({
  temperature: { min: -10, max: 60, unit: '°C' },
  humidity: { min: 0, max: 100, unit: '%' },
});

/** Faixas agronômicas de conforto da videira (usadas para recomendações). */
export const IDEAL = Object.freeze({
  temperature: { min: 24, max: 30 },
  humidity: { min: 60, max: 72 },
});

/** Limites que disparam alertas automáticos (iguais a `AlertService.evaluate_reading`). */
export const ALERT_THRESHOLDS = Object.freeze({
  temperatureHigh: 35,
  humidityLow: 35,
});

const isNum = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Valida uma leitura. Retorna `{ valid, errors, severity }` com os mesmos
 * códigos do back-end: temperature_missing, temperature_out_of_range,
 * humidity_missing, humidity_out_of_range.
 */
export function validateReading(reading) {
  const errors = [];
  const { temperature, humidity } = reading ?? {};

  if (!isNum(temperature)) errors.push('temperature_missing');
  else if (temperature < LIMITS.temperature.min || temperature > LIMITS.temperature.max) errors.push('temperature_out_of_range');

  if (!isNum(humidity)) errors.push('humidity_missing');
  else if (humidity < LIMITS.humidity.min || humidity > LIMITS.humidity.max) errors.push('humidity_out_of_range');

  return { valid: errors.length === 0, errors, severity: errors.length === 0 ? 'ok' : 'invalid' };
}

/** Classifica a leitura nos quatro estados do enum `ReadingStatus`. */
export function classifyReading(reading) {
  const { valid } = validateReading(reading);
  if (!valid) return ReadingStatus.INVALID;
  if (reading.temperature >= ALERT_THRESHOLDS.temperatureHigh) return ReadingStatus.CRITICAL;
  if (reading.humidity < ALERT_THRESHOLDS.humidityLow) return ReadingStatus.WARNING;
  return ReadingStatus.NORMAL;
}

const isOutlier = (value, values) => {
  if (values.length < 6 || !isNum(value)) return false;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  if (iqr === 0) return false;
  return value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr;
};

/**
 * Indicadores equivalentes ao `DataQualityResponse` do back-end.
 * `completeness` e `consistency` são razões (0–1).
 */
export function calculateQuality(readings = []) {
  const list = Array.isArray(readings) ? readings : [];
  if (list.length === 0) {
    return { totalCount: 0, validCount: 0, invalidCount: 0, missingCount: 0, outlierCount: 0, completeness: null, consistency: null };
  }

  const temperatures = list.map((item) => item?.temperature).filter(isNum);
  const humidities = list.map((item) => item?.humidity).filter(isNum);

  let validCount = 0;
  let invalidCount = 0;
  let missingCount = 0;
  let outlierCount = 0;

  list.forEach((item) => {
    const { valid, errors } = validateReading(item);
    if (valid) validCount += 1;
    else invalidCount += 1;
    if (errors.some((error) => error.endsWith('_missing'))) missingCount += 1;
    if (!valid) return;
    if (isOutlier(item.temperature, temperatures) || isOutlier(item.humidity, humidities)) outlierCount += 1;
  });

  const expectedFields = list.length * 2;
  const presentFields = list.reduce((total, item) => total + (isNum(item?.temperature) ? 1 : 0) + (isNum(item?.humidity) ? 1 : 0), 0);

  return {
    totalCount: list.length,
    validCount,
    invalidCount,
    missingCount,
    outlierCount,
    completeness: presentFields / expectedFields,
    consistency: validCount / list.length,
  };
}

/** Remove leituras inválidas, ordena por tempo e interpola lacunas simples. */
export function cleanSeries(series = [], { key = 'value' } = {}) {
  const cleaned = series
    .filter((point) => point && isNum(point[key]))
    .map((point) => ({ ...point }))
    .sort((a, b) => new Date(a.timestamp ?? 0) - new Date(b.timestamp ?? 0));

  for (let index = 1; index < cleaned.length; index += 1) {
    const previous = cleaned[index - 1];
    const current = cleaned[index];
    if (previous.timestamp && current.timestamp) {
      const gapHours = (new Date(current.timestamp) - new Date(previous.timestamp)) / 3600000;
      current.gapHours = Number(gapHours.toFixed(2));
      current.interpolated = gapHours > 6;
    }
  }

  return cleaned;
}

/** Média móvel usada para suavizar séries de temperatura/umidade. */
export function movingAverage(values = [], windowSize = 3) {
  if (windowSize <= 1) return [...values];
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = values.slice(start, index + 1).filter(isNum);
    if (window.length === 0) return null;
    return window.reduce((total, value) => total + value, 0) / window.length;
  });
}

/** Proporção de leituras dentro da faixa ideal da variedade (0–1). */
export function idealRangeShare(readings = [], range = IDEAL) {
  const list = readings.filter((item) => isNum(item?.temperature) && isNum(item?.humidity));
  if (list.length === 0) return null;
  const inRange = list.filter(
    (item) =>
      item.temperature >= (range.temperature?.min ?? IDEAL.temperature.min) &&
      item.temperature <= (range.temperature?.max ?? IDEAL.temperature.max) &&
      item.humidity >= (range.humidity?.min ?? IDEAL.humidity.min) &&
      item.humidity <= (range.humidity?.max ?? IDEAL.humidity.max),
  ).length;
  return inRange / list.length;
}

/** Executa o pipeline completo (limpeza + indicadores) para uma lista de leituras. */
export function evaluateReadings(readings = []) {
  const list = Array.isArray(readings) ? readings : [];
  return {
    quality: calculateQuality(list),
    temperatureSeries: cleanSeries(list.map((item) => ({ timestamp: item.timestamp, value: item.temperature }))),
    humiditySeries: cleanSeries(list.map((item) => ({ timestamp: item.timestamp, value: item.humidity }))),
    idealShare: idealRangeShare(list),
    counts: list.reduce(
      (accumulator, item) => {
        const status = classifyReading(item);
        accumulator[status] = (accumulator[status] ?? 0) + 1;
        return accumulator;
      },
      { [ReadingStatus.NORMAL]: 0, [ReadingStatus.WARNING]: 0, [ReadingStatus.CRITICAL]: 0, [ReadingStatus.INVALID]: 0 },
    ),
  };
}
