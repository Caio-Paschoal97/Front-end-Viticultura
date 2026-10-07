/**
 * Geradores de séries temporais demonstrativas.
 *
 * Os valores são pseudoaleatórios com semente fixa (`mulberry32`): a mesma
 * variedade sempre produz a mesma curva, o que mantém as telas estáveis entre
 * recarregamentos e permite testar os gráficos automaticamente.
 */

/** Gerador pseudoaleatório determinístico (mesma semente → mesma sequência). */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export const seedFromText = (text) => {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/**
 * Série temporal com ciclo diário (senoide) + ruído determinístico.
 * Retorna no formato do back-end: `[{ timestamp, value }]`.
 */
export function buildTimeSeries({
  points = 96,
  stepMinutes = 15,
  base = 28,
  amplitude = 3.4,
  trend = 0,
  noise = 0.5,
  seed = 42,
  end = new Date(),
  digits = 1,
  phase = 0,
} = {}) {
  const random = mulberry32(seed);
  const totalMinutes = (points - 1) * stepMinutes;
  const start = new Date(end.getTime() - totalMinutes * 60000);
  return Array.from({ length: points }, (_, index) => {
    const progress = points === 1 ? 0 : index / (points - 1);
    const hour = (start.getHours() + (index * stepMinutes) / 60) % 24;
    const daily = amplitude * Math.sin(((hour - 8) / 24) * Math.PI * 2 + phase);
    const drift = trend * progress;
    const jitter = (random() - 0.5) * 2 * noise;
    const value = Number((base + daily + drift + jitter).toFixed(digits));
    return { timestamp: new Date(start.getTime() + index * stepMinutes * 60000).toISOString(), value };
  });
}

export const buildTemperatureSeries = (variety, options = {}) =>
  buildTimeSeries({
    base: variety.temperature,
    amplitude: 3.6,
    noise: 0.42,
    seed: seedFromText(`${variety.name}-temp`),
    ...options,
  });

export const buildHumiditySeries = (variety, options = {}) =>
  buildTimeSeries({
    base: variety.humidity,
    amplitude: 6.5,
    noise: 1.1,
    phase: Math.PI,
    digits: 0,
    seed: seedFromText(`${variety.name}-hum`),
    ...options,
  });

/** Histórico de preços (R$/kg) dos últimos 30 dias — RF03/RF07. */
export const buildPriceSeries = (variety, { days = 30, end = new Date() } = {}) =>
  buildTimeSeries({
    points: days,
    stepMinutes: 60 * 24,
    base: variety.basePrice - 0.62,
    amplitude: 0.18,
    trend: 0.72,
    noise: 0.09,
    digits: 2,
    seed: seedFromText(`${variety.name}-price`),
    end,
  });

/** Projeção do modelo preditivo para as próximas 72 h (RF06). */
export const buildForecastSeries = (variety, { hours = 72, stepMinutes = 180, end = new Date() } = {}) => {
  const points = Math.round((hours * 60) / stepMinutes) + 1;
  const horizonEnd = new Date(end.getTime() + points * stepMinutes * 60000);
  return buildTimeSeries({
    points,
    stepMinutes,
    base: variety.temperature + 0.4,
    amplitude: 2.4,
    trend: 0.5,
    noise: 0.35,
    seed: seedFromText(`${variety.name}-forecast`),
    end: horizonEnd,
  });
};

export const buildQualityTrend = ({ points = 12, seed = 7, base = 97.4, end = new Date() } = {}) =>
  buildTimeSeries({ points, stepMinutes: 60 * 12, base, amplitude: 1.1, noise: 0.5, digits: 1, seed, end });

export const buildWeeklyBars = ({ seed = 11, base = 68, spread = 28, labels = 7 } = {}) => {
  const random = mulberry32(seed);
  return Array.from({ length: labels }, (_, index) => Math.round(base + (random() - 0.4) * spread + index * 1.6));
};

/** Série de acessos autenticados por dia (painel administrativo). */
export const buildAccessSeries = ({ days = 7, seed = 23, base = 96 } = {}) => buildWeeklyBars({ seed, base, spread: 60, labels: days });
