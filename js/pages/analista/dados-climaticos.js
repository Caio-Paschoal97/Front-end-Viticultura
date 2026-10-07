/**
 * Analista de Dados › Dados Climáticos (RF05/RF10).
 *
 * Mostra o pipeline de limpeza em cinco etapas sobre as leituras que vieram da
 * API, com os indicadores recalculados no navegador (`js/core/data-quality.js`)
 * para conferência independente do back-end.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chartCard, emptyState, sectionHead } from '../../components/ui.js';
import { barsHorizontal, lineChart } from '../../components/charts.js';
import { dataTable } from '../../components/tables.js';
import { icon } from '../../components/icons.js';
import { average, formatNumber, formatPercent, formatTemperature, maxOf, minOf, relativeTime } from '../../utils/format.js';
import { cleanSeries, evaluateReadings, movingAverage } from '../../core/data-quality.js';
import { dataOf, header, keyValues, metricsRow, page, pct, sliceByPeriod, strip } from '../support.js';

const STEPS = [
  { icon: 'download', title: '1. Coleta', description: 'Leituras recebidas do canal ThingSpeak via API REST.', detail: (ctx) => `${formatNumber(ctx.readings.length)} registro(s) brutos` },
  { icon: 'lock', title: '2. Validação de faixa', description: 'Temperatura entre -10 e 60 °C e umidade entre 0 e 100%.', detail: (ctx) => `${formatNumber(ctx.quality.invalidCount)} descartado(s)` },
  { icon: 'filter', title: '3. Tratamento de ausentes', description: 'Registros sem um dos campos são marcados para não enviesar médias.', detail: (ctx) => `${formatNumber(ctx.quality.missingCount)} incompleto(s)` },
  { icon: 'activity', title: '4. Outliers', description: 'Valores fora de 1,5× o intervalo interquartil são sinalizados.', detail: (ctx) => `${formatNumber(ctx.quality.outlierCount)} outlier(s)` },
  { icon: 'check-circle', title: '5. Dado pronto', description: 'Série limpa e ordenada, pronta para treinar e avaliar modelos.', detail: (ctx) => `${formatNumber(ctx.quality.validCount)} leitura(s) válidas` },
];

export function analystClimateData(context) {
  const readings = dataOf(context, 'readings') ?? [];
  const quality = dataOf(context, 'quality');
  const windowed = sliceByPeriod(readings, context.period);
  const list = windowed.series.length ? windowed.series : readings;
  const evaluated = evaluateReadings(list);
  const temperatures = list.map((reading) => reading.temperature).filter((value) => typeof value === 'number');
  const humidities = list.map((reading) => reading.humidity).filter((value) => typeof value === 'number');
  const smoothed = movingAverage(temperatures, 5);
  const cleanTemperature = cleanSeries(list.map((reading) => ({ timestamp: reading.timestamp, value: reading.temperature })));
  const stepContext = { readings: list, quality: evaluated.quality };

  const rows = list.slice(0, 14).map((reading) => ({
    ...reading,
    temperatureLabel: formatTemperature(reading.temperature),
    humidityLabel: formatPercent(reading.humidity),
    deleted: reading.status === 'INVALID',
  }));

  return page(
    header(context, {
      title: 'Dados Climáticos Tratados',
      subtitle: `Séries de temperatura e umidade de ${context.variety} após a limpeza do RF05`,
      varietyMode: 'live',
      actions: [
        button('Exportar histórico', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'history' } }),
        button('Recarregar da API', { iconName: 'refresh', action: 'refresh-data' }),
      ],
    }),
    strip(context, { extra: `${formatNumber(list.length)} leitura(s) na janela selecionada`, loadingLabel: 'Aplicando limpeza nas leituras…' }),
    windowed.truncated
      ? card(
          html`<div class="banner info">${icon('info', 22)}<div><strong>Janela limitada pela API</strong><p>A rota /readings/current devolve as últimas 24 h. Para períodos maiores, o histórico completo depende da rota de consulta por intervalo (prevista no back-end).</p></div></div>`,
          'table-card',
        )
      : '',
    metricsRow(
      [
        { icon: 'thermo', label: 'Temperatura média', value: formatTemperature(average(temperatures)), meta: `Mín. ${formatTemperature(minOf(temperatures))} · Máx. ${formatTemperature(maxOf(temperatures))}`, tone: 'orange' },
        { icon: 'drop', label: 'Umidade média', value: formatPercent(average(humidities)), meta: `Mín. ${formatPercent(minOf(humidities))} · Máx. ${formatPercent(maxOf(humidities))}`, tone: 'blue' },
        { icon: 'quality', label: 'Completude recalculada', value: pct(evaluated.quality.completeness), meta: `${formatNumber(evaluated.quality.totalCount)} registro(s) analisados`, tone: 'green' },
        { icon: 'target', label: 'Tempo na faixa ideal', value: pct(evaluated.idealShare), meta: '24–30 °C e 60–72% de umidade', tone: 'purple' },
      ],
      'four',
    ),
    card(
      html`${sectionHead({ title: 'Pipeline de limpeza', subtitle: 'Etapas implementadas em js/core/data-quality.js e replicadas no back-end (RF05)' })}
        <div class="pipeline-list">${STEPS.map(
          (step, index) => html`<div>
            <span class="pipe-icon ${index === 1 && evaluated.quality.invalidCount > 0 ? 'warning' : ''}">${icon(step.icon, 18)}</span>
            <div><strong>${step.title}</strong><span>${step.description}</span></div>
            <span class="list-meta">${step.detail(stepContext)}</span>
          </div>`,
        )}</div>`,
      'table-card',
    ),
    html`<div class="grid-2">
      ${chartCard({
        title: 'Temperatura bruta × suavizada',
        subtitle: `Média móvel de 5 pontos sobre ${formatNumber(cleanTemperature.length)} leituras válidas`,
        legend: html`<div class="chart-legend"><span><i class="series-dot chart-1"></i>Bruta</span><span><i class="series-dot chart-4"></i>Suavizada</span></div>`,
        content: lineChart({
          series: [
            { data: cleanTemperature, tone: 'chart-1' },
            { data: cleanTemperature.map((point, index) => ({ timestamp: point.timestamp, value: smoothed[index] })).filter((point) => typeof point.value === 'number'), tone: 'chart-4' },
          ],
          unit: '°C',
        }),
      })}
      ${card(
        html`${sectionHead({ title: 'Indicadores do recálculo local', subtitle: 'Comparação entre o que a API informou e o que o navegador calcula' })}
          ${keyValues(
            [
              { label: 'Completude (API)', value: pct(quality?.completeness) },
              { label: 'Completude (local)', value: pct(evaluated.quality.completeness) },
              { label: 'Consistência (API)', value: pct(quality?.consistency) },
              { label: 'Consistência (local)', value: pct(evaluated.quality.consistency) },
              { label: 'Inválidos (API)', value: formatNumber(quality?.invalidCount ?? 0) },
              { label: 'Inválidos (local)', value: formatNumber(evaluated.quality.invalidCount) },
              { label: 'Outliers (local)', value: formatNumber(evaluated.quality.outlierCount) },
            ],
            { rows: true },
          )}
          <p class="helper">Divergências indicam que a janela consultada difere da janela consolidada pelo back-end — comportamento esperado quando o período do dashboard é menor que o ciclo de ingestão.</p>`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Classificação das leituras', subtitle: 'Status aplicado por validateReading/classifyReading' })}
        ${barsHorizontal({
          items: [
            { label: 'Normais', value: evaluated.counts.NORMAL ?? 0, tone: 'green' },
            { label: 'Atenção', value: evaluated.counts.WARNING ?? 0, tone: 'gold' },
            { label: 'Críticas', value: evaluated.counts.CRITICAL ?? 0, tone: 'red' },
            { label: 'Inválidas', value: evaluated.counts.INVALID ?? 0, tone: 'neutral' },
          ],
          unit: 'leituras',
        })}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Amostra da série tratada', subtitle: 'As linhas marcadas como inválidas ficam fora das médias e dos modelos' })}
        ${rows.length === 0
          ? emptyState({ iconName: 'cloud', title: 'Sem leituras para exibir' })
          : dataTable({
              columns: [
                { label: 'Data / hora', render: (row) => html`${new Date(row.timestamp).toLocaleString('pt-BR')}<br /><small class="text-muted">${relativeTime(row.timestamp)}</small>` },
                { label: 'Temperatura', key: 'temperatureLabel' },
                { label: 'Umidade', key: 'humidityLabel' },
                { label: 'Sensor', render: (row) => html`<span class="mono">${row.sensorCode}</span>` },
                { label: 'Status', render: (row) => badge(row.statusLabel, row.statusTone) },
                { label: 'Uso no modelo', render: (row) => badge(row.deleted ? 'Excluída' : 'Considerada', row.deleted ? 'neutral' : 'success') },
              ],
              rows,
            })}`,
      'table-card',
    ),
  );
}
