/**
 * Contratos com o back-end (RF02/RF07).
 *
 * Os payloads abaixo reproduzem os DTOs do FastAPI
 * (`app/schemas/*.py`) — inclusive campos em snake_case — e provam que a
 * interface sobrevive a campos ausentes sem quebrar a tela.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ContractError,
  DemandLevel,
  ModelStatus,
  RiskLevel,
  normalizeAlerts,
  normalizeMarket,
  normalizeModels,
  normalizeOverview,
  normalizeQuality,
  normalizeReadings,
  normalizeThingSpeakStatus,
  normalizeVarietySummaries,
} from '../js/core/contracts.js';

test('DashboardOverviewResponse vira o formato das telas', () => {
  const overview = normalizeOverview({
    variety: 'Uva Itália',
    period: { start: '2026-03-01T00:00:00Z', end: '2026-03-10T00:00:00Z' },
    metrics: [{ label: 'Temperatura média', value: 28.4, unit: '°C', trend: '+0,6 °C' }],
    temperature_series: [{ timestamp: '2026-03-10T12:00:00Z', value: 28.1 }],
    humidity_series: [{ timestamp: '2026-03-10T12:00:00Z', value: 64 }],
    recommendations: [{ title: 'Antecipar colheita', recommendation_type: 'HARVEST', description: 'Janela curta.', confidence: 0.87, created_at: '2026-03-10T09:00:00Z' }],
    risk_level: 'MEDIUM',
  });
  assert.equal(overview.variety, 'Uva Itália');
  assert.equal(overview.metrics[0].value, '28.4');
  assert.equal(overview.metrics[0].trend, '+0,6 °C');
  assert.equal(overview.temperatureSeries.length, 1);
  assert.equal(overview.riskLevel, RiskLevel.MEDIUM);
  assert.equal(overview.recommendations[0].confidence, 0.87);
  assert.ok(overview.riskLabel.length > 0);
});

test('payload inválido lança ContractError identificando o endpoint', () => {
  assert.throws(() => normalizeOverview(null), (error) => error instanceof ContractError && error.endpoint === 'dashboard/overview');
  assert.throws(() => normalizeOverview([]), ContractError);
  assert.throws(() => normalizeReadings({ temperature: 20 }), ContractError);

  // Listas ausentes não quebram a tela: viram listas vazias.
  const empty = normalizeOverview({ variety: 'Uva Itália', risk_level: 'UNKNOWN' });
  assert.deepEqual(empty.metrics, []);
  assert.deepEqual(empty.temperatureSeries, []);
  assert.equal(empty.riskLabel, 'Sem avaliação'); // risk_level UNKNOWN do back-end
});

test('ReadingsResponse aplica a classificação local (RF05)', () => {
  const readings = normalizeReadings(
    [
      { reading_id: 'rd-1', timestamp: '2026-03-10T12:00:00Z', temperature: 28.4, humidity: 64, sensor_code: 'THS-ESP32-04', variety: 'Uva Itália', status: 'NORMAL' },
      { reading_id: 'rd-2', timestamp: '2026-03-10T11:00:00Z', temperature: 36.2, humidity: 30, sensor_code: 'THS-ESP32-04', variety: 'Uva Itália' },
    ],
    { classify: (row) => (row.temperature >= 35 ? 'CRITICAL' : 'NORMAL'), variety: 'Uva Itália' },
  );
  assert.equal(readings.length, 2);
  assert.equal(readings[0].sensorCode, 'THS-ESP32-04');
  assert.equal(readings[1].status, 'CRITICAL');
  assert.ok(readings[0].statusLabel.length > 0);
});

test('DataQualityResponse preserva as razões 0–1 da API', () => {
  const quality = normalizeQuality({ completeness: 0.987, consistency: 0.94, valid_count: 1200, invalid_count: 8, missing_count: 4, outlier_count: 3 });
  assert.equal(quality.completeness, 0.987);
  assert.equal(quality.validCount, 1200);
  assert.equal(quality.outlierCount, 3);
});

test('Alertas usam o enum AlertLevel e a categoria do back-end', () => {
  const alerts = normalizeAlerts([
    { id: 'a-1', category: 'CLIMATE', level: 'CRITICAL', title: 'Calor extremo', message: 'Temperatura acima de 35 °C.', created_at: '2026-03-10T12:00:00Z' },
    { id: 'a-2', category: 'MARKET', level: 'INFO', title: 'Preço em alta', message: '' },
    { id: 'a-3', category: 'CLIMATE', level: 'WARNING' }, // sem título é descartado
  ]);
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].severity, 'critical');
  assert.equal(alerts[0].tone, 'danger');
  assert.equal(alerts[0].categoryLabel, 'Clima');
  assert.equal(alerts[1].severity, 'info');
});

test('Modelos, ThingSpeak, mercado, variedades e previsões', () => {
  const models = normalizeModels([{ name: 'AC-Predict', version: '3.2', accuracy: 0.914, mae: 1.28, rmse: 1.74, status: 'ACTIVE' }]);
  assert.equal(models[0].status, ModelStatus.ACTIVE);
  assert.ok(models[0].statusLabel.length > 0);

  const thingspeak = normalizeThingSpeakStatus({ provider: 'ThingSpeak', configured: true, channel_id: '1234567' });
  assert.equal(thingspeak.channelId, '1234567');
  assert.equal(thingspeak.minIntervalSeconds, 15); // RNF11
  assert.equal(normalizeThingSpeakStatus({ configured: false }).statusLabel, 'Canal não configurado');

  const market = normalizeMarket({ variety: 'Uva Itália', price: 4.72, price_history: [{ timestamp: '2026-03-10T00:00:00Z', value: 4.6 }], demand_level: 'HIGH' });
  assert.equal(market.price, 4.72);
  assert.equal(market.demandLevel, DemandLevel.HIGH);
  assert.equal(market.priceHistory.length, 1);

  const varieties = normalizeVarietySummaries([
    { name: 'Uva Itália', score: 91.4, temperature: 28.2, humidity: 64, market_price: 4.72, risk: 'LOW' },
  ]);
  assert.equal(varieties[0].name, 'Uva Itália');
  assert.equal(varieties[0].risk, RiskLevel.LOW);
  assert.ok(varieties[0].riskLabel.length > 0);
});
