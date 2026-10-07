import { html } from '../../utils/html.js';
import { formatDateTime, formatNumber, formatTemperature, relativeTime } from '../../utils/format.js';
import { badge, button, card, emptyState, sectionHead, sourceBadge } from '../../components/ui.js';
import { chartLegend, lineChart } from '../../components/charts.js';
import { dataTable } from '../../components/tables.js';
import { dataOf, header, metricsRow, page, pct, sliceByPeriod, strip } from '../support.js';

/**
 * Validação das previsões (RF06).
 * O analista compara o horizonte previsto com as leituras observadas e checa a
 * confiança de cada recomendação antes de publicá-la ao produtor.
 */
export function analystForecasts(context) {
  const forecast = dataOf(context, 'forecasts');
  const overview = dataOf(context, 'overview');
  const models = dataOf(context, 'models') ?? [];
  const observed = sliceByPeriod(overview?.temperatureSeries ?? [], context.period);
  const predictions = forecast?.predictions ?? [];
  const activeModel = models.find((model) => model.status === 'ACTIVE') ?? models[0] ?? null;

  const average = predictions.length ? predictions.reduce((total, point) => total + point.value, 0) / predictions.length : null;
  const peak = predictions.length ? Math.max(...predictions.map((point) => point.value)) : null;
  const lowest = predictions.length ? Math.min(...predictions.map((point) => point.value)) : null;

  const rows = (forecast?.recommendations ?? []).map((recommendation, index) => ({
    ...recommendation,
    index: index + 1,
    confidenceLabel: pct(recommendation.confidence),
    published: recommendation.confidence >= 0.7 ? 'Publicada ao produtor' : 'Requer revisão',
  }));

  return page(
    header(context, {
      title: 'Previsões',
      subtitle: `Comparação entre o horizonte previsto e as leituras observadas — ${context.variety}`,
      actions: [
        button('Gerar nova previsão', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' }),
        button('Exportar', { variant: 'ghost', iconName: 'download', action: 'export-report', dataset: { report: 'forecast' } }),
      ],
    }),
    strip(context, {
      extra: forecast?.generatedAt ? `gerada ${relativeTime(forecast.generatedAt)} por ${forecast.modelVersion}` : 'sem previsão registrada',
      loadingLabel: 'Consultando /forecasts/latest…',
    }),
    metricsRow(
      [
        { icon: 'model', label: 'Modelo', value: forecast?.modelVersion ?? '—', meta: activeModel ? `Precisão ${activeModel.accuracy === null ? '—' : pct(activeModel.accuracy)}` : '—', tone: 'purple' },
        { icon: 'quality', label: 'Confiança média', value: rows.length ? pct(rows.reduce((total, row) => total + row.confidence, 0) / rows.length) : '—', meta: `${rows.length} recomendação(ões)` },
        { icon: 'thermo', label: 'Média prevista', value: average === null ? '—' : formatTemperature(average), meta: `Pico ${peak === null ? '—' : formatTemperature(peak)} · Mín. ${lowest === null ? '—' : formatTemperature(lowest)}`, tone: 'orange' },
        { icon: 'warning', label: 'Risco projetado', value: forecast?.riskLabel ?? '—', meta: `Horizonte: ${predictions.length} pontos`, tone: forecast?.riskTone === 'red' ? 'red' : 'green' },
      ],
      'four',
    ),
    card(
      html`<div class="card-title"><div><h3>Observado x previsto</h3><p>Linha cheia: leituras validadas · linha tracejada: previsão do modelo</p></div>${sourceBadge(context.state.sources.forecasts)}</div>
        ${chartLegend([{ tone: '1', label: 'Observado' }, { tone: '2', label: 'Previsto' }])}
        ${lineChart({ series: [{ data: observed.series, tone: 'chart-1' }, { data: predictions, tone: 'chart-2', dashed: true }], unit: '°C', emptyMessage: 'Sem previsão para o período' })}`,
      'chart-card',
    ),
    card(
      html`${sectionHead({ title: 'Recomendações e confiança', subtitle: 'Recomendações com confiança abaixo de 70% ficam retidas para revisão do analista' })}
      ${rows.length === 0
        ? emptyState({ iconName: 'model', title: 'Sem recomendações neste ciclo', message: 'Execute o modelo para gerar novas recomendações.' })
        : dataTable({
            columns: [
              { label: '#', key: 'index' },
              { label: 'Recomendação', render: (row) => html`<strong>${row.title}</strong><br /><small class="text-muted">${row.typeLabel}</small>` },
              { label: 'Descrição', render: (row) => row.description },
              { label: 'Confiança', key: 'confidenceLabel' },
              { label: 'Situação', render: (row) => badge(row.published, row.confidence >= 0.7 ? 'success' : 'warning') },
            ],
            rows,
          })}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Horizonte detalhado', subtitle: 'Valores previstos para cada ponto do horizonte do modelo' })}
      ${dataTable({
        columns: [
          { label: 'Alvo', render: (row) => formatDateTime(row.timestamp) },
          { label: 'Temperatura prevista', render: (row) => formatTemperature(row.value) },
          { label: 'Desvio vs. média', render: (row) => (average === null ? '—' : `${row.value >= average ? '+' : ''}${formatNumber(row.value - average, { digits: 2 })} °C`) },
        ],
        rows: predictions,
        emptyTitle: 'Sem pontos de previsão',
      })}`,
      'table-card',
    ),
  );
}
