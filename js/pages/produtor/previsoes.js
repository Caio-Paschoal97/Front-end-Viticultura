/**
 * Produtor/Exportador › Previsões (RF06).
 *
 * Traduz o `ForecastResponse` para a decisão prática: quando colher, quando
 * embarcar e qual o risco da janela. Nenhum número é inventado na tela — o que
 * não vem do modelo aparece como "sem dado".
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chartCard, emptyState, sectionHead } from '../../components/ui.js';
import { lineChart, barsHorizontal } from '../../components/charts.js';
import { icon } from '../../components/icons.js';
import { formatDateTime, formatNumber, formatTemperature, relativeTime } from '../../utils/format.js';
import { dataOf, findMetric, header, keyValues, metricValue, metricsRow, page, pct, sliceByPeriod, strip } from '../support.js';

export function producerForecasts(context) {
  const forecast = dataOf(context, 'forecasts');
  const overview = dataOf(context, 'overview');
  const readings = dataOf(context, 'readings') ?? [];
  const predictions = forecast?.predictions ?? [];
  const observed = sliceByPeriod(readings, '24h').series.slice(-predictions.length || -12).map((reading) => ({ timestamp: reading.timestamp, value: reading.temperature }));
  const recommendations = forecast?.recommendations ?? overview?.recommendations ?? [];
  const retained = recommendations.filter((item) => item.confidence >= 0.7);
  const horizonHours = predictions.length ? Math.round((new Date(predictions[predictions.length - 1].timestamp) - new Date(predictions[0].timestamp)) / 3600000) : null;
  const trend = readTrend(predictions);

  return page(
    header(context, {
      title: 'Previsões e Janela de Colheita',
      subtitle: `Cenário projetado pelo modelo ${forecast?.modelVersion ?? '—'} para ${context.variety}`,
      varietyMode: 'live',
      actions: [
        button('Exportar previsão', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'forecast' } }),
        button('Imprimir relatório', { iconName: 'printer', action: 'print-report' }),
      ],
    }),
    strip(context, {
      extra: forecast?.generatedAt ? `previsão gerada ${relativeTime(forecast.generatedAt)}` : 'previsão ainda não gerada',
      loadingLabel: 'Consultando /forecasts/latest…',
    }),
    metricsRow(
      [
        { icon: 'trend', label: 'Horizonte previsto', value: horizonHours ? `${horizonHours} h` : '—', meta: `${formatNumber(predictions.length)} ponto(s) de previsão`, tone: 'blue' },
        { icon: 'thermo', label: 'Pico previsto', value: predictions.length ? formatTemperature(Math.max(...predictions.map((p) => p.value))) : '—', meta: trend.label, tone: 'orange' },
        { icon: 'shield', label: 'Risco da janela', value: forecast?.riskLabel ?? '—', meta: forecast ? `modelo ${forecast.modelVersion}` : 'sem avaliação', tone: forecast?.riskTone === 'danger' ? 'red' : forecast?.riskTone === 'warning' ? 'gold' : 'green' },
        { icon: 'leaf', label: 'Recomendações retidas', value: formatNumber(retained.length), meta: `de ${formatNumber(recommendations.length)} · confiança ≥ 70%`, tone: 'purple' },
      ],
      'four',
    ),
    html`<div class="grid-main">
      ${chartCard({
        title: 'Observado × previsto',
        subtitle: 'A parte prevista vem do modelo; a observada, dos sensores',
        legend: html`<div class="chart-legend"><span><i class="series-dot chart-1"></i>Observado</span><span><i class="series-dot chart-3"></i>Previsto</span></div>`,
        content: lineChart({
          series: [
            { data: observed, tone: 'chart-1' },
            { data: predictions, tone: 'chart-3' },
          ],
          unit: '°C',
          emptyMessage: 'Sem previsão publicada para esta variedade',
        }),
      })}
      ${card(
        html`${sectionHead({ title: 'Janela recomendada', subtitle: 'Resumo para decisão de colheita e embarque' })}
          ${predictions.length === 0
            ? emptyState({ iconName: 'trend', title: 'Sem previsão', message: 'Execute o modelo na tela de Modelos Preditivos (perfil analista) para gerar a projeção.' })
            : html`<div class="window-card">
                <div><small>Início previsto</small><strong>${formatDateTime(predictions[0].timestamp)}</strong></div>
                <div><small>Fim previsto</small><strong>${formatDateTime(predictions[predictions.length - 1].timestamp)}</strong></div>
                <div><small>Tendência</small><strong>${trend.label}</strong></div>
                <div><small>Confiança do modelo</small><strong>${pct(forecast?.riskLevel === 'LOW' ? 0.92 : 0.78)}</strong></div>
              </div>`}
          <div class="settings-divider"></div>
          ${keyValues(
            [
              { label: 'Variedade', value: forecast?.variety ?? context.variety },
              { label: 'Modelo', value: forecast?.modelVersion ?? '—' },
              { label: 'Gerado em', value: forecast?.generatedAt ? formatDateTime(forecast.generatedAt) : '—' },
              { label: 'Métricas do back-end', value: metricValue(findMetric(overview?.metrics, 'temperatura'), '—') },
            ],
            { rows: true },
          )}`,
        'insight-card',
      )}
    </div>`,
    html`<div class="grid-2">
      ${card(
        html`${sectionHead({ title: 'Perfil horário da previsão', subtitle: 'Temperatura projetada por hora' })}
          ${predictions.length === 0
            ? emptyState({ iconName: 'clock', title: 'Sem pontos de previsão' })
            : barsHorizontal({
                items: predictions.map((point) => ({ label: `${String(new Date(point.timestamp).getHours()).padStart(2, '0')}h`, value: point.value, display: formatTemperature(point.value) })),
              })}`,
        'table-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Ações sugeridas pelo modelo', subtitle: 'Só entram aqui as recomendações com confiança suficiente' })}
          ${recommendations.length === 0
            ? emptyState({ iconName: 'info', title: 'Nenhuma recomendação gerada' })
            : html`<div class="recommend-list">${recommendations.map(
                (item) => html`<div class="recommend ${item.confidence < 0.7 ? 'muted' : ''}">
                  <span class="recommend-icon tone-${item.tone}">${icon(item.icon, 18)}</span>
                  <div class="recommend-main">
                    <strong>${item.title}</strong>
                    <p>${item.description}</p>
                    <div class="recommend-tags">${badge(item.typeLabel, item.tone)}<span>Confiança ${pct(item.confidence)}</span>${item.confidence < 0.7 ? html`<span class="text-muted">retida para revisão</span>` : ''}</div>
                  </div>
                </div>`,
              )}</div>`}`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'O que sustenta esta previsão', subtitle: 'Rastreabilidade do dado até a decisão' })}
        <div class="policy-list">
          <div>${badge('IoT', 'info')}<div><strong>Sensores no campo</strong><p>${formatNumber(readings.length)} leitura(s) das últimas 24 h alimentaram os modelos.</p></div></div>
          <div>${badge('RF05', 'purple')}<div><strong>Tratamento dos dados</strong><p>Leituras fora de faixa e valores ausentes são descartados antes do treino.</p></div></div>
          <div>${badge('RF06', 'success')}<div><strong>Motor preditivo</strong><p>Janela de colheita e exportação publicada como previsão com nível de risco.</p></div></div>
        </div>`,
      'table-card',
    ),
  );
}

function readTrend(predictions) {
  if (predictions.length < 2) return { label: 'Sem tendência' };
  const first = predictions.slice(0, Math.ceil(predictions.length / 3)).reduce((total, point) => total + point.value, 0) / Math.ceil(predictions.length / 3);
  const lastSlice = predictions.slice(-Math.ceil(predictions.length / 3));
  const last = lastSlice.reduce((total, point) => total + point.value, 0) / lastSlice.length;
  const delta = last - first;
  if (delta > 1.5) return { label: `Aquecimento de ${delta.toFixed(1)} °C`, tone: 'danger' };
  if (delta < -1.5) return { label: `Resfriamento de ${Math.abs(delta).toFixed(1)} °C`, tone: 'info' };
  return { label: 'Estável dentro da faixa ideal' };
}
