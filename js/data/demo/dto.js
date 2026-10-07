/**
 * Simulador do back-end: respostas no MESMO formato dos DTOs do FastAPI
 * (`app/schemas/dtos.py`).
 *
 * Todo o modo demonstração passa por aqui. Como as respostas seguem o contrato,
 * as páginas renderizam igual com a API ligada ou desligada — só muda a origem
 * indicada na faixa de status.
 */

import { calculateQuality, evaluateReadings, idealRangeShare } from '../../core/data-quality.js';
import { MARKETS, VARIETIES, findVariety } from '../catalog.js';
import {
  buildForecastSeries,
  buildHumiditySeries,
  buildPriceSeries,
  buildQualityTrend,
  buildTemperatureSeries,
  buildWeeklyBars,
} from './series.js';

export const SENSOR_CODE = 'THS-ESP32-04';
const HOURS_24 = { points: 96, stepMinutes: 15 };

/** Série climática pareada (temperatura + umidade) das últimas 24 h. */
function climatePairs(varietyName) {
  const variety = findVariety(varietyName);
  const temperatures = buildTemperatureSeries(variety, HOURS_24);
  const humidities = buildHumiditySeries(variety, HOURS_24);
  return temperatures.map((point, index) => ({
    timestamp: point.timestamp,
    temperature: point.value,
    humidity: humidities[index]?.value ?? null,
  }));
}

/**
 * `GET /readings/current` — inclui de propósito três registros problemáticos
 * (um valor fora de faixa e duas leituras incompletas) para que os indicadores
 * de qualidade do RF05 sejam calculados de verdade, e não inventados.
 */
export function readingsDto(varietyName = 'Uva Itália') {
  const rows = climatePairs(varietyName);
  const invalid = [
    { timestamp: rows[Math.floor(rows.length * 0.35)].timestamp, temperature: 61.4, humidity: 58 },
    { timestamp: rows[Math.floor(rows.length * 0.62)].timestamp, temperature: 27.8, humidity: null },
    { timestamp: rows[Math.floor(rows.length * 0.86)].timestamp, temperature: null, humidity: 66 },
  ];
  // Substitui as linhas originais pelas problemáticas nos mesmos horários.
  const patched = rows.map((row) => invalid.find((item) => item.timestamp === row.timestamp) ?? row);
  return patched.map((row) => ({ timestamp: row.timestamp, temperature: row.temperature, humidity: row.humidity, sensor_code: SENSOR_CODE }));
}

/** `DashboardOverviewResponse` */
export function overviewDto(varietyName = 'Uva Itália') {
  const variety = findVariety(varietyName);
  const readings = readingsDto(varietyName).map((row) => ({ timestamp: row.timestamp, temperature: row.temperature, humidity: row.humidity }));
  const valid = readings.filter((row) => typeof row.temperature === 'number' && typeof row.humidity === 'number');
  const last = valid[valid.length - 1] ?? { temperature: variety.temperature, humidity: variety.humidity };
  const risk = assessRisk(varietyName);
  const idealShare = idealRangeShare(valid);
  const alerts = evaluateReadings(valid);

  const metrics = [
    { label: 'Temperatura atual', value: String(last.temperature.toFixed(1)), unit: '°C', trend: 'estável' },
    { label: 'Umidade atual', value: String(Math.round(last.humidity)), unit: '%', trend: 'estável' },
    { label: 'Faixa ideal (24 h)', value: String(Math.round(idealShare * 100)), unit: '%', trend: '+2,1' },
    { label: 'Leituras processadas', value: String(readings.length), unit: 'registros', trend: '+15 min' },
  ];

  return {
    variety: variety.name,
    period: { start: readings[0]?.timestamp ?? null, end: last ? new Date().toISOString() : null },
    metrics,
    temperature_series: buildTemperatureSeries(variety, HOURS_24),
    humidity_series: buildHumiditySeries(variety, HOURS_24),
    recommendations: buildRecommendations(variety, { risk, idealShare, alerts }),
    risk_level: risk,
  };
}

/** Classificação de risco conforme os limites agronômicos da variedade. */
export function assessRisk(varietyName) {
  const variety = findVariety(varietyName);
  const temperature = variety.temperature;
  const humidity = variety.humidity;
  const temperatureOk = temperature >= variety.idealTemperature.min && temperature <= variety.idealTemperature.max;
  const humidityOk = humidity >= variety.idealHumidity.min && humidity <= variety.idealHumidity.max;
  if (temperatureOk && humidityOk) return 'LOW';
  if (temperatureOk || humidityOk) return 'MEDIUM';
  return 'HIGH';
}

function buildRecommendations(variety, { risk, idealShare }) {
  const today = new Date();
  const harvestStart = new Date(today);
  harvestStart.setDate(today.getDate() + 2);
  const harvestEnd = new Date(today);
  harvestEnd.setDate(today.getDate() + 4);
  const shipStart = new Date(today);
  shipStart.setDate(today.getDate() + 3);

  const recommendations = [];
  if (risk !== 'HIGH') {
    recommendations.push({
      title: 'Janela favorável identificada',
      recommendation_type: 'HARVEST',
      description: `Condições climáticas atuais, histórico da variedade e tendência prevista indicam o melhor ponto para colher ${variety.name} entre ${harvestStart.toLocaleDateString('pt-BR')} e ${harvestEnd.toLocaleDateString('pt-BR')}.`,
      confidence: Number((0.72 + idealShare * 0.2).toFixed(2)),
      created_at: today.toISOString(),
    });
    recommendations.push({
      title: 'Exportação recomendada',
      recommendation_type: 'LOGISTICS',
      description: `Demanda internacional ${MARKETS[0].demand === 'HIGH' ? 'alta' : 'moderada'} e baixo risco climático no trajeto até o porto. Preço projetado ${(2 + idealShare * 6).toFixed(1)}% acima da média do mês.`,
      confidence: Number((0.68 + idealShare * 0.18).toFixed(2)),
      created_at: today.toISOString(),
    });
  } else {
    recommendations.push({
      title: 'Janela de colheita em observação',
      recommendation_type: 'HARVEST',
      description: `As condições atuais ficaram fora da faixa ideal para ${variety.name}. O modelo recomenda aguardar a próxima janela antes de programar a colheita.`,
      confidence: 0.54,
      created_at: today.toISOString(),
    });
  }
  return recommendations;
}

/** `DataQualityResponse` — calculado pelas mesmas regras do back-end (RF05). */
export function qualityDto(varietyName = 'Uva Itália') {
  const rows = readingsDto(varietyName).map((row) => ({ temperature: row.temperature, humidity: row.humidity }));
  const quality = calculateQuality(rows);
  return {
    completeness: quality.completeness,
    consistency: quality.consistency,
    valid_count: quality.validCount,
    invalid_count: quality.invalidCount,
    missing_count: quality.missingCount,
    outlier_count: quality.outlierCount,
  };
}

/** Lista de `AlertResponse` (RF09). */
export function alertsDto(varietyName = 'Uva Itália') {
  const now = Date.now();
  const minutesAgo = (minutes) => new Date(now - minutes * 60000).toISOString();
  const variety = findVariety(varietyName);
  return [
    {
      id: 1,
      category: 'HARVEST',
      level: 'INFO',
      title: `Condições favoráveis para colheita da ${variety.name}`,
      message: `Temperatura média de ${variety.temperature.toFixed(1)} °C e umidade em ${Math.round(variety.humidity)}% dentro da faixa ideal. Janela sugerida nas próximas 72 h.`,
      source: 'Motor preditivo AC-Predict v3.2',
      created_at: minutesAgo(38),
      resolved: false,
    },
    {
      id: 2,
      category: 'CLIMATE',
      level: 'WARNING',
      title: 'Umidade acima da faixa em Thompson Seedless',
      message: 'Umidade relativa atingiu 74%, acima do limite de 68% da variedade. Risco de doenças fúngicas em elevação.',
      source: 'ThingSpeak · sensor THS-ESP32-04',
      created_at: minutesAgo(96),
      resolved: false,
    },
    {
      id: 3,
      category: 'MARKET',
      level: 'INFO',
      title: 'Janela de exportação favorável para Crimson Seedless',
      message: 'Demanda europeia em alta e preço projetado 8,4% acima da média das últimas quatro semanas.',
      source: 'Serviço de mercado AgroClima',
      created_at: minutesAgo(180),
      resolved: false,
    },
    {
      id: 4,
      category: 'SYSTEM',
      level: 'WARNING',
      title: 'Falha temporária de sincronização resolvida',
      message: 'A ingestão ficou 4 min sem resposta do canal do ThingSpeak e foi retomada automaticamente, sem perda de dados.',
      source: 'Ingestão ThingSpeak',
      created_at: minutesAgo(320),
      resolved: true,
    },
    {
      id: 5,
      category: 'CLIMATE',
      level: 'CRITICAL',
      title: 'Temperatura fora de faixa detectada',
      message: 'Leitura de 61,4 °C descartada pela validação (limite 60 °C). Sensor verificado; registro marcado como outlier.',
      source: 'Validação de dados',
      created_at: minutesAgo(510),
      resolved: true,
    },
  ];
}

/** Lista de `ModelMetricResponse` (RF06). */
export function modelsDto() {
  return [
    { name: 'AC-Predict', version: 'v3.2', accuracy: 0.914, mae: 1.28, rmse: 1.74, status: 'ACTIVE' },
    { name: 'Random Forest', version: 'v2.8', accuracy: 0.889, mae: 1.51, rmse: 1.93, status: 'AVAILABLE' },
    { name: 'LSTM Climate', version: 'v1.7', accuracy: 0.876, mae: 1.62, rmse: 2.04, status: 'AVAILABLE' },
    { name: 'Gradient Boosting', version: 'v1.1', accuracy: 0.863, mae: 1.7, rmse: 2.16, status: 'TRAINING' },
  ];
}

/** `GET /integrations/thingspeak/status` */
export function thingSpeakStatusDto() {
  return { provider: 'ThingSpeak', configured: true, channel_id: '2481997' };
}

/** `MarketResponse` (RF03). */
export function marketDto(varietyName = 'Uva Itália') {
  const variety = findVariety(varietyName);
  const history = buildPriceSeries(variety);
  const demand = variety.basePrice > 9.5 ? 'HIGH' : variety.basePrice > 8.8 ? 'MEDIUM' : 'HIGH';
  return {
    variety: variety.name,
    price: history[history.length - 1].value,
    price_history: history,
    demand_level: demand,
  };
}

/** `ForecastResponse` (RF06). */
export function forecastDto(varietyName = 'Uva Itália') {
  const variety = findVariety(varietyName);
  const risk = assessRisk(varietyName);
  const generatedAt = new Date();
  return {
    variety: variety.name,
    generated_at: generatedAt.toISOString(),
    predictions: buildForecastSeries(variety),
    recommendations: buildRecommendations(variety, { risk, idealShare: idealRangeShare(climatePairs(varietyName)) }).map((item) => ({
      ...item,
      recommendation_type: item.recommendation_type === 'LOGISTICS' ? 'LOGISTICS' : 'HARVEST',
    })),
    risk_level: risk,
    model_version: 'AC-Predict v3.2',
  };
}

/** Lista de `VarietySummaryDto` — ranking do RF07. */
export function varietiesDto() {
  return VARIETIES.map((variety) => ({
    name: variety.name,
    score: scoreOf(variety),
    temperature: variety.temperature,
    humidity: variety.humidity,
    market_price: variety.basePrice,
    risk: assessRisk(variety.name),
  })).sort((a, b) => b.score - a.score);
}

/** Score multicritério (clima, preço, demanda e risco) usado no ranking. */
export function scoreOf(variety) {
  const temperatureFit = fitScore(variety.temperature, variety.idealTemperature);
  const humidityFit = fitScore(variety.humidity, variety.idealHumidity);
  const priceScore = Math.min(100, (variety.basePrice / 10.5) * 100);
  const marketBonus = variety.basePrice > 9.5 ? 8 : variety.basePrice > 8.8 ? 4 : 0;
  return Math.round(temperatureFit * 0.32 + humidityFit * 0.28 + priceScore * 0.24 + marketBonus + 18);
}

export const fitScore = (value, range) => {
  const span = (range.max - range.min) / 2;
  const center = (range.max + range.min) / 2;
  const distance = Math.abs(value - center);
  return Math.max(0, 100 - (distance / (span + 2)) * 100);
};

/** Série de qualidade usada em gráficos de tendência (12 pontos = 6 dias). */
export function qualityTrendDto() {
  const quality = qualityDto();
  const base = quality.consistency * 100;
  return buildQualityTrend({ base: Number(base.toFixed(1)) });
}

/** Barras do volume diário de leituras validadas (7 dias). */
export const weeklyReadingsDto = () => buildWeeklyBars({ seed: 11, base: 68, spread: 24 });

/** Distribuição de mercado (participação nos embarques). */
export const marketShareDto = () => MARKETS.map((market) => ({ market: market.name, share: market.share, demand: market.demand }));
