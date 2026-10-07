/**
 * Analista de Dados › Dados de Mercado (RF03).
 *
 * Série de preços com estatísticas calculadas localmente (variação, volatilidade,
 * mínima/máxima) e a leitura de demanda por mercado de destino.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chartCard, emptyState, sectionHead } from '../../components/ui.js';
import { barsHorizontal, lineChart, sparkline } from '../../components/charts.js';
import { dataTable } from '../../components/tables.js';
import { formatCurrency, formatNumber, formatPercent, relativeTime } from '../../utils/format.js';
import { MARKETS } from '../../data/catalog.js';
import { dataOf, header, keyValues, metricsRow, page, strip } from '../support.js';

const VARIATION = (values) => {
  if (values.length < 2) return null;
  const returns = [];
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] === 0) continue;
    returns.push((values[index] - values[index - 1]) / values[index - 1]);
  }
  if (returns.length === 0) return null;
  const mean = returns.reduce((total, value) => total + value, 0) / returns.length;
  const variance = returns.reduce((total, value) => total + (value - mean) ** 2, 0) / returns.length;
  return { mean: mean * 100, volatility: Math.sqrt(variance) * 100 };
};

export function analystMarketData(context) {
  const market = dataOf(context, 'market');
  const varieties = dataOf(context, 'varieties') ?? [];
  const history = market?.priceHistory ?? [];
  const values = history.map((point) => point.value);
  const stats = VARIATION(values);
  const rows = history
    .slice(-14)
    .reverse()
    .map((point, index, list) => {
      const previous = list[index + 1];
      const delta = previous ? ((point.value - previous.value) / previous.value) * 100 : null;
      return {
        ...point,
        when: new Date(point.timestamp).toLocaleString('pt-BR'),
        ago: relativeTime(point.timestamp),
        price: formatCurrency(point.value),
        delta: delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`,
        tone: delta === null ? 'neutral' : delta >= 0 ? 'success' : 'danger',
      };
    });

  return page(
    header(context, {
      title: 'Dados de Mercado',
      subtitle: `Preços, volatilidade e demanda de exportação — ${context.variety}`,
      varietyMode: 'live',
      actions: [button('Exportar mercado', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'market' } })],
    }),
    strip(context, { extra: `${formatNumber(history.length)} ponto(s) de preço na série`, loadingLabel: 'Consultando /market/summary…' }),
    metricsRow(
      [
        { icon: 'market', label: 'Preço mais recente', value: formatCurrency(values[values.length - 1] ?? market?.price), meta: history.length ? relativeTime(history[history.length - 1].timestamp) : 'sem série', tone: 'green' },
        { icon: 'activity', label: 'Volatilidade diária', value: stats ? formatPercent(stats.volatility, { digits: 2 }) : '—', meta: stats ? `retorno médio ${stats.mean >= 0 ? '+' : ''}${stats.mean.toFixed(2)}%` : 'série insuficiente', tone: 'orange' },
        { icon: 'trend', label: 'Mínima / máxima', value: values.length ? `${formatCurrency(Math.min(...values))}` : '—', meta: values.length ? `máxima ${formatCurrency(Math.max(...values))}` : '—', tone: 'blue' },
        { icon: 'package', label: 'Demanda atual', value: market?.demandLabel ?? '—', meta: `${formatNumber(MARKETS.length)} mercados monitorados`, tone: 'purple' },
      ],
      'four',
    ),
    chartCard({
      title: 'Série histórica de preços',
      subtitle: 'Referência de mercado consumida pelo back-end (RF03)',
      legend: html`<div class="chart-legend"><span><i class="series-dot chart-3"></i>R$/kg</span></div>`,
      content: lineChart({ series: [{ data: history, tone: 'chart-3' }], unit: 'R$/kg', emptyMessage: 'Sem histórico de preços' }),
      action: sparkline(values.slice(-12)),
    }),
    html`<div class="grid-2">
      ${card(
        html`${sectionHead({ title: 'Estatísticas da série', subtitle: 'Calculadas sobre o histórico devolvido pela API' })}
          ${keyValues(
            [
              { label: 'Pontos analisados', value: formatNumber(history.length) },
              { label: 'Média do período', value: values.length ? formatCurrency(values.reduce((total, value) => total + value, 0) / values.length) : '—' },
              { label: 'Desvio entre mínima e máxima', value: values.length ? formatCurrency(Math.max(...values) - Math.min(...values)) : '—' },
              { label: 'Amplitude', value: values.length && Math.min(...values) ? formatPercent(((Math.max(...values) - Math.min(...values)) / Math.min(...values)) * 100) : '—' },
              { label: 'Volatilidade (desvio dos retornos)', value: stats ? formatPercent(stats.volatility, { digits: 2 }) : '—' },
              { label: 'Tendência', value: stats ? (stats.mean > 0.05 ? 'Alta' : stats.mean < -0.05 ? 'Baixa' : 'Estável') : '—' },
            ],
            { rows: true },
          )}`,
        'table-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Demanda por mercado', subtitle: 'Participação esperada nas exportações da temporada' })}
          ${barsHorizontal({
            items: MARKETS.map((market_) => ({ label: market_.name, value: market_.share, display: formatPercent(market_.share, { digits: 0 }), tone: market_.demand === 'HIGH' ? 'green' : market_.demand === 'MEDIUM' ? 'gold' : 'neutral' })),
            unit: '',
          })}
          <p class="helper">Demanda alta em ${MARKETS.filter((market_) => market_.demand === 'HIGH').map((market_) => market_.name).join(', ') || 'nenhum mercado'} nesta temporada.</p>`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Preço por variedade', subtitle: 'Base para o comparativo multicritério' })}
        ${varieties.length === 0
          ? emptyState({ iconName: 'market', title: 'Sem dados por variedade' })
          : dataTable({
              columns: [
                { label: 'Variedade', render: (row) => html`<strong>${row.name}</strong>` },
                { label: 'Preço de referência', render: (row) => formatCurrency(row.marketPrice) },
                { label: 'Score do modelo', render: (row) => formatNumber(row.score, { digits: 1 }) },
                { label: 'Risco', render: (row) => badge(row.riskLabel, row.riskTone) },
                { label: 'Leitura', render: (row) => (row.marketPrice === null ? '—' : formatCurrency(row.marketPrice * 1000) + ' /ton') },
              ],
              rows: varieties,
            })}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Últimos pontos da série', subtitle: 'Variação diária calculada ponto a ponto' })}
        ${rows.length === 0
          ? emptyState({ iconName: 'trend', title: 'Sem pontos suficientes' })
          : dataTable({
              columns: [
                { label: 'Data / hora', render: (row) => html`${row.when}<br /><small class="text-muted">${row.ago}</small>` },
                { label: 'Preço', render: (row) => html`<strong>${row.price}</strong>` },
                { label: 'Variação', render: (row) => html`<span class="severity ${row.tone === 'success' ? 'info' : row.tone === 'danger' ? 'critical' : ''}"><i></i>${row.delta}</span>` },
              ],
              rows,
            })}`,
      'table-card',
    ),
  );
}
