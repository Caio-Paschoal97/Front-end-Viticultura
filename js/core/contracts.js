/**
 * Contratos com o back-end Python (FastAPI).
 *
 * Este módulo é a fronteira entre "o que a API devolve" (nomes em snake_case,
 * enums em maiúsculas) e "o que a interface consome" (camelCase + rótulos em
 * português). Nenhuma página lê JSON cru: tudo passa por aqui — o que torna a
 * troca de back-end um problema de um único arquivo.
 *
 * Referência: `app/schemas` do back-end (DashboardOverviewResponse,
 * ReadingResponse, DataQualityResponse, AlertResponse, ModelMetricResponse,
 * MarketResponse, ForecastResponse, VarietySummaryDto, MonitoringResponse).
 */

export class ContractError extends Error {
  constructor(message, { payload = null, endpoint = '' } = {}) {
    super(message);
    this.name = 'ContractError';
    this.kind = 'contract';
    this.payload = payload;
    this.endpoint = endpoint;
  }
}

/* ------------------------------------------------------------------ Enums */

export const ReadingStatus = Object.freeze({ NORMAL: 'NORMAL', WARNING: 'WARNING', CRITICAL: 'CRITICAL', INVALID: 'INVALID', UNKNOWN: 'UNKNOWN' });
export const RiskLevel = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', UNKNOWN: 'UNKNOWN' });
export const DemandLevel = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', UNKNOWN: 'UNKNOWN' });
export const AlertCategory = Object.freeze({ CLIMATE: 'CLIMATE', HARVEST: 'HARVEST', MARKET: 'MARKET', SYSTEM: 'SYSTEM' });
export const AlertLevel = Object.freeze({ INFO: 'INFO', WARNING: 'WARNING', CRITICAL: 'CRITICAL' });
export const ModelStatus = Object.freeze({ ACTIVE: 'ACTIVE', AVAILABLE: 'AVAILABLE', TRAINING: 'TRAINING', FAILED: 'FAILED' });

export const RISK_LEVEL_MAP = Object.freeze({
  [RiskLevel.LOW]: { label: 'Risco baixo', tone: 'success' },
  [RiskLevel.MEDIUM]: { label: 'Risco moderado', tone: 'warning' },
  [RiskLevel.HIGH]: { label: 'Risco alto', tone: 'danger' },
  [RiskLevel.UNKNOWN]: { label: 'Sem avaliação', tone: 'neutral' },
});

export const DEMAND_LEVEL_MAP = Object.freeze({
  [DemandLevel.LOW]: { label: 'Demanda baixa', tone: 'neutral' },
  [DemandLevel.MEDIUM]: { label: 'Demanda estável', tone: 'info' },
  [DemandLevel.HIGH]: { label: 'Demanda alta', tone: 'success' },
  [DemandLevel.UNKNOWN]: { label: 'Demanda não informada', tone: 'neutral' },
});

export const ALERT_CATEGORY_MAP = Object.freeze({
  [AlertCategory.CLIMATE]: { label: 'Clima', icon: 'thermo', tone: 'info' },
  [AlertCategory.HARVEST]: { label: 'Colheita', icon: 'leaf', tone: 'success' },
  [AlertCategory.MARKET]: { label: 'Mercado', icon: 'market', tone: 'warning' },
  [AlertCategory.SYSTEM]: { label: 'Sistema', icon: 'settings', tone: 'neutral' },
});

export const ALERT_LEVEL_MAP = Object.freeze({
  [AlertLevel.INFO]: { label: 'Informativo', tone: 'info', severity: 'info' },
  [AlertLevel.WARNING]: { label: 'Atenção', tone: 'warning', severity: 'warning' },
  [AlertLevel.CRITICAL]: { label: 'Crítico', tone: 'danger', severity: 'critical' },
});

export const MODEL_STATUS_MAP = Object.freeze({
  [ModelStatus.ACTIVE]: { label: 'Em produção', tone: 'success' },
  [ModelStatus.AVAILABLE]: { label: 'Disponível', tone: 'info' },
  [ModelStatus.TRAINING]: { label: 'Em treinamento', tone: 'warning' },
  [ModelStatus.FAILED]: { label: 'Falhou', tone: 'danger' },
});

export const READING_STATUS_MAP = Object.freeze({
  [ReadingStatus.NORMAL]: { label: 'Normal', tone: 'success' },
  [ReadingStatus.WARNING]: { label: 'Atenção', tone: 'warning' },
  [ReadingStatus.CRITICAL]: { label: 'Crítico', tone: 'danger' },
  [ReadingStatus.INVALID]: { label: 'Inválido', tone: 'neutral' },
  [ReadingStatus.UNKNOWN]: { label: 'Não avaliado', tone: 'neutral' },
});

/** Tipos de recomendação publicados pelo motor preditivo. */
export const RECOMMENDATION_TYPE_MAP = Object.freeze({
  HARVEST: { label: 'Colheita', icon: 'leaf', tone: 'success' },
  IRRIGATION: { label: 'Irrigação', icon: 'drop', tone: 'info' },
  EXPORT: { label: 'Exportação', icon: 'truck', tone: 'warning' },
  LOGISTICS: { label: 'Logística', icon: 'truck', tone: 'warning' },
  PEST: { label: 'Fitossanidade', icon: 'shield', tone: 'danger' },
  SYSTEM: { label: 'Sistema', icon: 'info', tone: 'neutral' },
});

/* ------------------------------------------------------------- Utilidades */

export const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value) => (Array.isArray(value) ? value : []);

const numOrNull = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const strOrNull = (value) => (value === null || value === undefined ? null : String(value));

const isoOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const enumOf = (map, value, fallback) => (value && map[value] ? value : fallback);
const labelOf = (map, value) => map[value]?.label ?? map.UNKNOWN?.label ?? '—';
const toneOf = (map, value) => map[value]?.tone ?? 'neutral';

/** Exige um objeto no payload (usado pelos DTOs de resposta única). */
function requireRecord(payload, endpoint) {
  if (!isRecord(payload)) {
    throw new ContractError(`Resposta inesperada de ${endpoint}: era esperado um objeto JSON.`, { payload, endpoint });
  }
  return payload;
}

/** Exige uma lista no payload. */
function requireArray(payload, endpoint) {
  if (!Array.isArray(payload)) {
    throw new ContractError(`Resposta inesperada de ${endpoint}: era esperada uma lista JSON.`, { payload, endpoint });
  }
  return payload;
}

/* ------------------------------------------------------------- Conversores */

export function normalizeMetric(raw) {
  if (!isRecord(raw)) return null;
  const label = strOrNull(raw.label);
  if (!label) return null;
  return {
    label,
    value: raw.value === null || raw.value === undefined ? '—' : String(raw.value),
    unit: strOrNull(raw.unit),
    trend: strOrNull(raw.trend),
  };
}

export function normalizeTimeSeries(raw) {
  return asArray(raw)
    .map((point) => {
      if (!isRecord(point)) return null;
      const timestamp = isoOrNull(point.timestamp ?? point.measured_at ?? point.target_at);
      const value = numOrNull(point.value ?? point.temperature_c ?? point.humidity_pct ?? point.price);
      if (timestamp === null || value === null) return null;
      return { timestamp, value };
    })
    .filter(Boolean);
}

export function normalizeRecommendation(raw) {
  if (!isRecord(raw)) return null;
  if (typeof raw.title !== 'string' || typeof raw.description !== 'string') return null;
  const type = enumOf(RECOMMENDATION_TYPE_MAP, raw.recommendation_type, 'SYSTEM');
  const confidence = numOrNull(raw.confidence);
  return {
    title: raw.title,
    type,
    typeLabel: RECOMMENDATION_TYPE_MAP[type].label,
    icon: RECOMMENDATION_TYPE_MAP[type].icon,
    tone: RECOMMENDATION_TYPE_MAP[type].tone,
    description: raw.description,
    confidence: confidence === null ? 0 : Math.max(0, Math.min(1, confidence > 1 ? confidence / 100 : confidence)),
    createdAt: isoOrNull(raw.created_at),
  };
}

/* --------------------------------------------------------------- DTO → UI */

/** `DashboardOverviewResponse` */
export function normalizeOverview(payload, { endpoint = 'dashboard/overview' } = {}) {
  const dto = requireRecord(payload, endpoint);
  const riskLevel = enumOf(RISK_LEVEL_MAP, dto.risk_level, 'UNKNOWN');
  return {
    variety: strOrNull(dto.variety) ?? '',
    period: dto.period ?? { start: null, end: null },
    metrics: asArray(dto.metrics).map(normalizeMetric).filter(Boolean),
    temperatureSeries: normalizeTimeSeries(dto.temperature_series),
    humiditySeries: normalizeTimeSeries(dto.humidity_series),
    recommendations: asArray(dto.recommendations).map(normalizeRecommendation).filter(Boolean),
    riskLevel,
    riskLabel: labelOf(RISK_LEVEL_MAP, riskLevel),
    riskTone: toneOf(RISK_LEVEL_MAP, riskLevel),
    message: strOrNull(dto.message),
  };
}

/** `GET /readings/current` — o back-end devolve a lista crua de leituras. */
export function normalizeReadings(payload, { endpoint = 'readings/current', classify, sensorCode = 'THS-ESP32-04', variety = null } = {}) {
  return asArray(requireArray(payload, endpoint))
    .map((row) => {
      if (!isRecord(row)) return null;
      const temperature = numOrNull(row.temperature ?? row.temperature_c);
      const humidity = numOrNull(row.humidity ?? row.humidity_pct);
      const timestamp = isoOrNull(row.timestamp ?? row.measured_at);
      if (timestamp === null) return null;
      const reading = { id: row.id ?? row.reading_id ?? `${timestamp}-${sensorCode}`, timestamp, temperature, humidity, sensorCode: row.sensor_code ?? sensorCode, variety: row.variety ?? variety };
      const status = enumOf(READING_STATUS_MAP, row.status, classify ? classify(reading) : 'UNKNOWN');
      return { ...reading, status, statusLabel: labelOf(READING_STATUS_MAP, status), statusTone: toneOf(READING_STATUS_MAP, status) };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/** `DataQualityResponse` */
export function normalizeQuality(payload, { endpoint = 'analytics/data-quality' } = {}) {
  const dto = requireRecord(payload, endpoint);
  const asRatio = (value) => {
    const number = numOrNull(value);
    if (number === null) return null;
    return number <= 1 ? number : number / 100;
  };
  return {
    completeness: asRatio(dto.completeness),
    consistency: asRatio(dto.consistency),
    validCount: numOrNull(dto.valid_count) ?? 0,
    invalidCount: numOrNull(dto.invalid_count) ?? 0,
    missingCount: numOrNull(dto.missing_count) ?? 0,
    outlierCount: numOrNull(dto.outlier_count) ?? 0,
    totalCount: (numOrNull(dto.valid_count) ?? 0) + (numOrNull(dto.invalid_count) ?? 0),
  };
}

/** Lista de `AlertResponse` */
export function normalizeAlerts(payload, { endpoint = 'alerts' } = {}) {
  return asArray(requireArray(payload, endpoint))
    .map((row) => {
      if (!isRecord(row)) return null;
      const category = enumOf(ALERT_CATEGORY_MAP, row.category, 'SYSTEM');
      const level = enumOf(ALERT_LEVEL_MAP, row.level, 'INFO');
      const title = strOrNull(row.title);
      if (!title) return null;
      return {
        id: row.id ?? `${category}-${title}`,
        category,
        categoryLabel: ALERT_CATEGORY_MAP[category].label,
        icon: ALERT_CATEGORY_MAP[category].icon,
        categoryTone: ALERT_CATEGORY_MAP[category].tone,
        level,
        levelLabel: ALERT_LEVEL_MAP[level].label,
        tone: ALERT_LEVEL_MAP[level].tone,
        severity: level === 'CRITICAL' ? 'critical' : level === 'WARNING' ? 'warning' : 'info',
        title,
        message: strOrNull(row.message) ?? '',
        source: strOrNull(row.source) ?? 'AgroClima',
        createdAt: isoOrNull(row.created_at),
        resolved: Boolean(row.resolved),
      };
    })
    .filter(Boolean);
}

/** Lista de `ModelMetricResponse` */
export function normalizeModels(payload, { endpoint = 'models' } = {}) {
  return asArray(requireArray(payload, endpoint))
    .map((row) => {
      if (!isRecord(row)) return null;
      if (!strOrNull(row.name)) return null;
      const status = enumOf(MODEL_STATUS_MAP, row.status, 'AVAILABLE');
      return {
        name: row.name,
        version: strOrNull(row.version) ?? '—',
        accuracy: numOrNull(row.accuracy),
        mae: numOrNull(row.mae),
        rmse: numOrNull(row.rmse),
        status,
        statusLabel: labelOf(MODEL_STATUS_MAP, status),
        tone: toneOf(MODEL_STATUS_MAP, status),
      };
    })
    .filter(Boolean);
}

/** `GET /integrations/thingspeak/status` */
export function normalizeThingSpeakStatus(payload, { endpoint = 'integrations/thingspeak/status' } = {}) {
  const dto = requireRecord(payload, endpoint);
  const configured = Boolean(dto.configured);
  return {
    provider: strOrNull(dto.provider) ?? 'ThingSpeak',
    configured,
    channelId: strOrNull(dto.channel_id),
    statusLabel: configured ? 'Canal configurado' : 'Canal não configurado',
    tone: configured ? 'success' : 'warning',
    /** RNF11 — o plano gratuito aceita 1 mensagem a cada 15 s por canal. */
    minIntervalSeconds: numOrNull(dto.min_interval_seconds) ?? 15,
  };
}

/** `MarketResponse` */
export function normalizeMarket(payload, { endpoint = 'market/summary' } = {}) {
  const dto = requireRecord(payload, endpoint);
  const demandLevel = enumOf(DEMAND_LEVEL_MAP, dto.demand_level, 'UNKNOWN');
  return {
    variety: strOrNull(dto.variety) ?? '',
    price: numOrNull(dto.price ?? dto.price_brl_kg),
    priceHistory: normalizeTimeSeries(dto.price_history),
    demandLevel,
    demandLabel: labelOf(DEMAND_LEVEL_MAP, demandLevel),
    demandTone: toneOf(DEMAND_LEVEL_MAP, demandLevel),
    varietyId: numOrNull(dto.variety_id),
  };
}

/** `ForecastResponse` */
export function normalizeForecast(payload, { endpoint = 'forecasts/latest' } = {}) {
  const dto = requireRecord(payload, endpoint);
  const riskLevel = enumOf(RISK_LEVEL_MAP, dto.risk_level, 'UNKNOWN');
  return {
    variety: strOrNull(dto.variety) ?? '',
    generatedAt: isoOrNull(dto.generated_at),
    modelVersion: strOrNull(dto.model_version) ?? '—',
    riskLevel,
    riskLabel: labelOf(RISK_LEVEL_MAP, riskLevel),
    riskTone: toneOf(RISK_LEVEL_MAP, riskLevel),
    predictions: normalizeTimeSeries(dto.predictions),
    recommendations: asArray(dto.recommendations).map(normalizeRecommendation).filter(Boolean),
  };
}

/** Lista de `VarietySummaryDto` */
export function normalizeVarietySummaries(payload, { endpoint = 'varieties/summary' } = {}) {
  return asArray(requireArray(payload, endpoint))
    .map((row) => {
      if (!isRecord(row) || !strOrNull(row.name)) return null;
      const risk = enumOf(RISK_LEVEL_MAP, row.risk, 'UNKNOWN');
      return {
        name: row.name,
        score: numOrNull(row.score) ?? 0,
        temperature: numOrNull(row.temperature),
        humidity: numOrNull(row.humidity),
        marketPrice: numOrNull(row.market_price),
        risk,
        riskLabel: labelOf(RISK_LEVEL_MAP, risk),
        riskTone: toneOf(RISK_LEVEL_MAP, risk),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

/** `MonitoringResponse` (DTO previsto no back-end para a tela de monitoramento). */
export function normalizeMonitoring(payload, { endpoint = 'monitoring/current', classify } = {}) {
  const dto = requireRecord(payload, endpoint);
  return {
    sensors: asArray(dto.sensors)
      .map((sensor) =>
        isRecord(sensor)
          ? { code: strOrNull(sensor.code) ?? '—', name: strOrNull(sensor.name) ?? 'Sensor', location: strOrNull(sensor.location), active: sensor.active !== false }
          : null,
      )
      .filter(Boolean),
    latestReadings: normalizeReadings(dto.latest_readings ?? [], { endpoint, classify }),
    temperatureSeries: normalizeTimeSeries(dto.temperature_series),
    humiditySeries: normalizeTimeSeries(dto.humidity_series),
    recentAlerts: normalizeAlerts(dto.recent_alerts ?? [], { endpoint }),
  };
}

/** Relatório de testes publicado em `reports/test-results.json` (RF11). */
export function normalizeTestReport(payload) {
  if (!isRecord(payload)) return null;
  return {
    executedAt: isoOrNull(payload.executedAt),
    total: numOrNull(payload.total) ?? 0,
    passed: numOrNull(payload.passed) ?? 0,
    failed: numOrNull(payload.failed) ?? 0,
    durationMs: numOrNull(payload.durationMs),
    suites: asArray(payload.suites)
      .map((suite) => (isRecord(suite) ? { name: strOrNull(suite.name) ?? '—', passed: numOrNull(suite.passed) ?? 0, failed: numOrNull(suite.failed) ?? 0 } : null))
      .filter(Boolean),
  };
}
