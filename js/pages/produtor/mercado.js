/**
 * Produtor/Exportador › Mercado e Exportação (RF03).
 *
 * Consolida o `MarketResponse` (preço, série histórica, nível de demanda) com o
 * comparativo das variedades e a logística de embarque — a decisão é "vender
 * agora ou esperar a janela".
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chartCard, emptyState, sectionHead } from '../../components/ui.js';
import { barChart, lineChart } from '../../components/charts.js';
import { icon } from '../../components/icons.js';
import { formatCurrency, formatNumber, formatPercent, relativeTime } from '../../utils/format.js';
import { MARKETS } from '../../data/catalog.js';
import { dataOf, header, keyValues, metricsRow, page, strip } from '../support.js';

export function producerMarket(context) {
  const market = dataOf(context, 'market');
  const varieties = dataOf(context, 'varieties') ?? [];
  const history = market?.priceHistory ?? [];
  const current = market?.price ?? history[history.length - 1]?.value ?? null;
  const previous = history.length > 1 ? history[history.length - 2].value : null;
  const delta = current !== null && previous ? ((current - previous) / previous) * 100 : null;
  const best = varieties[0] ?? null;

  return page(
    header(context, {
      title: 'Mercado e Exportação',
      subtitle: `Preço, demanda e logística de embarque — ${context.variety}`,
      varietyMode: 'live',
      actions: [
        button('Exportar mercado', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'market' } }),
        button('Atualizar', { iconName: 'refresh', action: 'refresh-data' }),
      ],
    }),
    strip(context, { extra: `${formatNumber(MARKETS.length)} mercados de destino monitorados`, loadingLabel: 'Consultando /market/summary…' }),
    metricsRow(
      [
        { icon: 'market', label: 'Preço atual', value: formatCurrency(current), meta: delta === null ? 'sem base de comparação' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% no último dia`, tone: 'green' },
        { icon: 'trend', label: 'Demanda', value: market?.demandLabel ?? '—', meta: `Nível ${market?.demandLevel ?? 'UNKNOWN'}`, tone: market?.demandTone === 'success' ? 'green' : 'gold' },
        { icon: 'truck', label: 'Melhor variedade', value: best ? best.name : '—', meta: best ? `score ${best.score.toFixed(1)} · ${best.riskLabel}` : 'sem comparativo', tone: 'purple' },
        { icon: 'package', label: 'Pontos de preço', value: formatNumber(history.length), meta: 'série histórica de 30 dias', tone: 'blue' },
      ],
      'four',
    ),
    html`<div class="grid-2">
      ${chartCard({
        title: 'Série de preços (30 dias)',
        subtitle: 'Referência de mercado usada nas recomendações de embarque',
        legend: html`<div class="chart-legend"><span><i class="series-dot chart-3"></i>R$/kg</span></div>`,
        content: lineChart({ series: [{ data: history, tone: 'chart-3' }], unit: 'R$/kg', emptyMessage: 'Sem histórico de preços' }),
      })}
      ${card(
        html`${sectionHead({ title: 'Leitura do mercado', subtitle: 'Como a variação afeta a decisão de embarque' })}
          ${keyValues(
            [
              { label: 'Variedade', value: market?.variety ?? context.variety },
              { label: 'Preço atual', value: formatCurrency(current) },
              { label: 'Variação diária', value: delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%` },
              { label: 'Nível de demanda', value: market?.demandLabel ?? '—' },
              { label: 'Atualizado', value: history.length ? relativeTime(history[history.length - 1].timestamp) : '—' },
            ],
            { rows: true },
          )}
          <p class="helper">Quando o preço sobe e a demanda está alta, o back-end publica uma recomendação de antecipação do embarque (categoria MARKET).</p>
          <div class="button-row">${button('Ver alertas de mercado', { variant: 'ghost', action: 'navigate-to', dataset: { page: 'comum/alertas' } })}</div>`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Comparativo das variedades', subtitle: 'Preço de referência, score do modelo e risco de cada variedade', action: button('Análise comparativa', { variant: 'ghost', action: 'navigate-to', dataset: { page: 'produtor/comparacao' } }) })}
        ${varieties.length === 0
          ? emptyState({ iconName: 'compare', title: 'Sem comparativo disponível', message: 'A rota de resumo das variedades não devolveu dados.' })
          : html`<div class="ranking-list">${varieties.map(
              (item, index) => html`<div class="ranking ${index === 0 ? 'first' : ''}">
                <span>${index + 1}º</span>
                <div><strong>${item.name}</strong><small>Score ${item.score.toFixed(1)} · ${item.riskLabel}</small></div>
                <em>${formatCurrency(item.marketPrice)}</em>
              </div>`,
            )}</div>`}`,
      'table-card',
    ),
    html`<div class="grid-2">
      ${card(
        html`${sectionHead({ title: 'Mercados de destino', subtitle: 'Participação e nível de demanda por praça importadora' })}
          ${barChart({
            values: MARKETS.map((market_) => market_.share),
            labels: MARKETS.map((market_) => market_.name),
            unit: '%',
          })}`,
        'chart-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Janela logística', subtitle: 'Do campo ao porto — pontos de atenção' })}
          <div class="policy-list">
            <div>${icon('truck', 18)}<div><strong>Transporte refrigerado</strong><p>Manter 5–8 °C até o embarque; variações acima de 3 °C comprometem a qualidade.</p></div>${badge('Rotina', 'info')}</div>
            <div>${icon('clock', 18)}<div><strong>Prazo de embarque</strong><p>Contêineres para Rotterdam exigem docas fechadas com 48 h de antecedência.</p></div>${badge('Atenção', 'warning')}</div>
            <div>${icon('shield', 18)}<div><strong>Certificações</strong><p>GlobalG.A.P. e rastreabilidade por lote são pré-requisito dos importadores europeus.</p></div>${badge('Conforme', 'success')}</div>
          </div>`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Métricas de qualidade da fruta', subtitle: 'Indicadores consolidados no período' })}
        <div class="metrics-inline">
          <div><span>Brix médio</span><strong>17,4°</strong><small>Faixa alvo 16–19°</small></div>
          <div><span>Firmeza da baga</span><strong>${formatPercent(88.6)}</strong><small>Acima do mínimo de 80%</small></div>
          <div><span>Perda pós-colheita</span><strong>${formatPercent(2.8)}</strong><small>Limite aceitável 4%</small></div>
          <div><span>Lotes rastreados</span><strong>${formatNumber(96)}</strong><small>100% com QR code de origem</small></div>
        </div>`,
      'table-card',
    ),
  );
}
