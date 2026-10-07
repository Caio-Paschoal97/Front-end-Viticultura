/**
 * Produtor/Exportador › Monitoramento (RF01/RF02/RF10).
 *
 * Acompanhamento em tempo quase real das leituras que o ESP32 publica no canal
 * ThingSpeak e que o back-end consome via API REST. A tela nunca fala com o
 * dispositivo: a única origem é `GET /readings/current`.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chartCard, emptyState, sectionHead } from '../../components/ui.js';
import { lineChart, barsHorizontal } from '../../components/charts.js';
import { readingsTable } from '../../components/tables.js';
import { icon } from '../../components/icons.js';
import { thingSpeakStrip } from '../../components/page-header.js';
import { average, formatNumber, formatPercent, formatTemperature, maxOf, minOf, relativeTime } from '../../utils/format.js';
import { dataOf, header, keyValues, metricValue, metricsRow, page, pct, sliceByPeriod, strip } from '../support.js';

export function producerMonitoring(context) {
  const readings = dataOf(context, 'readings') ?? [];
  const overview = dataOf(context, 'overview');
  const status = dataOf(context, 'thingspeak');
  const windowed = sliceByPeriod(readings, context.period);
  const list = windowed.series.length ? windowed.series : readings;

  const temperatures = list.map((reading) => reading.temperature).filter((value) => typeof value === 'number');
  const humidities = list.map((reading) => reading.humidity).filter((value) => typeof value === 'number');
  const invalid = list.filter((reading) => reading.status === 'INVALID').length;
  const critical = list.filter((reading) => reading.status === 'CRITICAL').length;

  const sensorUsage = Object.entries(
    list.reduce((accumulator, reading) => {
      accumulator[reading.sensorCode] = (accumulator[reading.sensorCode] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).map(([label, value]) => ({ label, value, display: formatNumber(value) }));

  return page(
    header(context, {
      title: 'Monitoramento dos Sensores',
      subtitle: `Leituras dos parreiras em ${context.variety} — janela de ${list.length} registros`,
      varietyMode: 'live',
      actions: [
        button('Sincronizar ThingSpeak', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' }),
        button('Exportar leituras', { iconName: 'download', action: 'export-report', dataset: { report: 'readings' } }),
      ],
    }),
    strip(context, { extra: 'intervalo mínimo de 15 s por canal (RNF11)', loadingLabel: 'Consultando /readings/current…' }),
    status
      ? thingSpeakStrip({ status, lastSync: context.lastSync, readingCount: list.length, source: context.state.sources.readings })
      : '',
    metricsRow(
      [
        { icon: 'thermo', label: 'Temperatura média', value: formatTemperature(average(temperatures)), meta: `Mín. ${formatTemperature(minOf(temperatures))} · Máx. ${formatTemperature(maxOf(temperatures))}`, tone: 'orange' },
        { icon: 'drop', label: 'Umidade média', value: formatPercent(average(humidities)), meta: `Mín. ${formatPercent(minOf(humidities))} · Máx. ${formatPercent(maxOf(humidities))}`, tone: 'blue' },
        { icon: 'quality', label: 'Leituras válidas', value: pct(list.length ? (list.length - invalid) / list.length : null), meta: `${formatNumber(invalid)} descartada(s) pela validação`, tone: 'green' },
        { icon: 'warning', label: 'Leituras críticas', value: formatNumber(critical), meta: 'Acima de 35 °C ou umidade < 35%', tone: 'red' },
      ],
      'four',
    ),
    html`<div class="grid-2">
      ${chartCard({
        title: 'Temperatura do parreiral',
        subtitle: `Sensor ${list[0]?.sensorCode ?? 'THS-ESP32-04'} · ${context.variety}`,
        legend: html`<div class="chart-legend"><span><i class="series-dot chart-1"></i>Temperatura (°C)</span><span><i class="series-dot chart-2"></i>Umidade (%)</span></div>`,
        content: lineChart({
          series: [
            { data: list.map((reading) => ({ timestamp: reading.timestamp, value: reading.temperature })), tone: 'chart-1' },
            { data: list.map((reading) => ({ timestamp: reading.timestamp, value: reading.humidity })), tone: 'chart-2' },
          ],
          unit: '°C / %',
        }),
      })}
      ${card(
        html`${sectionHead({ title: 'Saúde do canal IoT', subtitle: 'Origem, intervalo e volume por sensor' })}
          ${keyValues(
            [
              { label: 'Provider', value: status?.provider ?? 'ThingSpeak' },
              { label: 'Channel ID', value: status?.channelId ?? 'não configurado' },
              { label: 'Status do canal', value: status?.statusLabel ?? '—' },
              { label: 'Leituras no ciclo', value: formatNumber(list.length) },
              { label: 'Última sincronização', value: context.lastSync ? relativeTime(context.lastSync) : '—' },
              { label: 'Intervalo mínimo', value: `${status?.minIntervalSeconds ?? 15} s (RNF11)` },
            ],
            { rows: true },
          )}
          <div class="settings-divider"></div>
          ${sensorUsage.length === 0
            ? emptyState({ iconName: 'cpu', title: 'Nenhum sensor reportou leituras' })
            : barsHorizontal({ items: sensorUsage, unit: 'leituras' })}`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Como o dado chega até aqui', subtitle: 'Fluxo IoT documentado no projeto (RF01/RF02)' })}
        <div class="architecture-flow">
          <div class="arch-group"><div class="arch-step">${icon('wifi')}<strong>ESP32</strong><span>Coleta no campo</span><span class="helper">Publica a cada 15 s</span></div><span class="flow-arrow">→</span></div>
          <div class="arch-group"><div class="arch-step featured">${icon('cloud')}<strong>ThingSpeak</strong><span>Canal IoT</span><span class="helper">Recepção HTTP/MQTT</span>${badge('RF01', 'info')}</div><span class="flow-arrow">→</span></div>
          <div class="arch-group"><div class="arch-step">${icon('link')}<strong>API REST</strong><span>Channel Feeds</span><span class="helper">Consumo pelo back-end</span></div><span class="flow-arrow">→</span></div>
          <div class="arch-group"><div class="arch-step">${icon('database')}<strong>Banco em nuvem</strong><span>sensor_readings</span><span class="helper">Validação e persistência</span></div></div>
        </div>
        <div class="architecture-note">${icon('lock', 18)}<span>O dashboard não recebe dados direto do dispositivo: a leitura sempre passa pela API. As chaves do canal ficam apenas no servidor (RNF02).</span></div>`,
      'architecture',
    ),
    readingsTable(list, {
      title: 'Leituras do período',
      subtitle: `${formatNumber(list.length)} registro(s) · ordenados do mais recente para o mais antigo`,
      limit: 12,
      action: button('Exportar CSV', { variant: 'ghost', iconName: 'download', action: 'export-report', dataset: { report: 'readings' } }),
    }),
    card(
      html`${sectionHead({ title: 'Resumo das métricas do back-end', subtitle: 'Valores de /dashboard/overview para conferência' })}
      ${overview
        ? html`<div class="metrics-inline">${overview.metrics.map(
            (metric) => html`<div><span>${metric.label}</span><strong>${metricValue(metric)}</strong><small>${metric.trend ?? '—'}</small></div>`,
          )}</div>`
        : emptyState({ iconName: 'info', title: 'Sem métricas consolidadas', message: 'A rota /dashboard/overview não devolveu métricas para a variedade selecionada.' })}`,
      'table-card',
    ),
  );
}
