/**
 * Produtor/Exportador › Visão Geral (RF07).
 *
 * Painel de decisão do dia: condições de campo medidas pelos sensores, risco de
 * janela de colheita, preço/mercado e próximas ações recomendadas pelo motor
 * preditivo — tudo do `DashboardOverviewResponse`.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chartCard, emptyState, sectionHead } from '../../components/ui.js';
import { lineChart, sparkline } from '../../components/charts.js';
import { readingsTable } from '../../components/tables.js';
import { icon } from '../../components/icons.js';
import { formatNumber, formatPercent, formatTemperature, relativeTime } from '../../utils/format.js';
import { dataOf, findMetric, header, keyValues, metricValue, metricsRow, page, pct, strip } from '../support.js';

export function producerOverview(context) {
  const overview = dataOf(context, 'overview');
  const readings = dataOf(context, 'readings') ?? [];
  const alerts = (dataOf(context, 'alerts') ?? []).filter((alert) => !alert.resolved);
  const temperature = findMetric(overview?.metrics, 'temperatura');
  const humidity = findMetric(overview?.metrics, 'umidade');
  const market = findMetric(overview?.metrics, 'preço') ?? findMetric(overview?.metrics, 'mercado');
  const ideal = findMetric(overview?.metrics, 'ideal');
  const recommendations = overview?.recommendations ?? [];

  return page(
    header(context, {
      title: 'Visão Geral da Safra',
      subtitle: `Condições de campo, janela de colheita e mercado — ${context.variety}`,
      varietyMode: 'live',
      actions: [
        button('Exportar resumo', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'overview' } }),
        button('Atualizar agora', { iconName: 'refresh', action: 'refresh-data' }),
      ],
      context: 'Visão Geral',
    }),
    strip(context, { extra: `${formatNumber(readings.length)} leitura(s) no ciclo atual`, loadingLabel: 'Consultando /dashboard/overview…' }),
    metricsRow(
      [
        { icon: 'thermo', label: 'Temperatura atual', value: temperature ? metricValue(temperature) : formatTemperature(readings[0]?.temperature), meta: temperature?.trend ?? 'Sem tendência informada', tone: 'orange' },
        { icon: 'drop', label: 'Umidade do ar', value: humidity ? metricValue(humidity) : formatPercent(readings[0]?.humidity), meta: humidity?.trend ?? 'Sem tendência informada', tone: 'blue' },
        { icon: 'market', label: 'Preço de referência', value: market ? metricValue(market) : '—', meta: market?.trend ?? 'Mercado sem movimento', tone: 'purple' },
        { icon: 'quality', label: 'Conforto da variedade', value: ideal ? metricValue(ideal) : '—', meta: `${readings.length} pontos avaliados`, tone: 'green' },
      ],
      'four',
    ),
    html`<div class="grid-main">
      ${card(
        html`<div class="card-title">
            <div><h3>Risco da janela de colheita</h3><p>${overview?.riskLabel ?? 'Sem avaliação'} · avaliado pelo modelo ${context.state.data.models?.[0]?.name ?? 'preditivo'}</p></div>
            ${badge(overview?.riskLabel ?? 'Sem avaliação', overview?.riskTone ?? 'neutral')}
          </div>
          ${keyValues(
            [
              { label: 'Variedade analisada', value: context.variety },
              { label: 'Início do período', value: overview?.period?.start ? new Date(overview.period.start).toLocaleString('pt-BR') : '—' },
              { label: 'Fim do período', value: overview?.period?.end ? new Date(overview.period.end).toLocaleString('pt-BR') : '—' },
              { label: 'Alertas em aberto', value: formatNumber(alerts.length) },
            ],
            { rows: true },
          )}
          ${overview?.message ? html`<p class="helper">${overview.message}</p>` : ''}`,
        'insight-card',
      )}
      ${card(
        html`${sectionHead({
            title: 'Ações recomendadas',
            subtitle: 'Geradas pelo motor preditivo a partir das condições medidas',
            action: button('Central de alertas', { variant: 'ghost', action: 'navigate-to', dataset: { page: 'comum/alertas' } }),
          })}
          ${recommendations.length === 0
            ? emptyState({ iconName: 'check-circle', title: 'Nenhuma ação pendente', message: 'As condições atuais não exigem intervenção.' })
            : html`<div class="recommend-list">${recommendations.slice(0, 3).map(
                (item) => html`<div class="recommend">
                  <span class="recommend-icon tone-${item.tone}">${icon(item.icon, 18)}</span>
                  <div class="recommend-main">
                    <strong>${item.title}</strong>
                    <p>${item.description}</p>
                    <div class="recommend-tags">${badge(item.typeLabel, item.tone)}<span>Confiança ${pct(item.confidence)}</span>${item.createdAt ? html`<span>${relativeTime(item.createdAt)}</span>` : ''}</div>
                  </div>
                </div>`,
              )}</div>`}`,
        'insight-card',
      )}
    </div>`,
    html`<div class="grid-2">
      ${chartCard({
        title: 'Temperatura nas últimas 24 h',
        subtitle: 'Sensores ESP32 → ThingSpeak → API (RF01/RF02)',
        legend: html`<div class="chart-legend"><span><i class="series-dot chart-1"></i>Temperatura</span><span class="text-muted">faixa ideal 24–30 °C</span></div>`,
        content: lineChart({ series: [{ data: overview?.temperatureSeries ?? [], tone: 'chart-1' }], unit: '°C' }),
        action: sparkline((overview?.temperatureSeries ?? []).map((point) => point.value)),
      })}
      ${chartCard({
        title: 'Umidade relativa',
        subtitle: 'Umidade abaixo de 35% dispara alerta automático (RF09)',
        content: lineChart({ series: [{ data: overview?.humiditySeries ?? [], tone: 'chart-2' }], unit: '%', emptyMessage: 'Sem série de umidade' }),
      })}
    </div>`,
    readingsTable(readings, {
      title: 'Leituras recentes do campo',
      subtitle: 'Cada registro passa pela validação de faixas antes de aparecer aqui',
      limit: 6,
      action: button('Ver histórico completo', { variant: 'ghost', action: 'navigate-to', dataset: { page: 'comum/historico' } }),
    }),
    card(
      html`${sectionHead({
        title: 'Alertas que exigem atenção',
        subtitle: 'Clima, colheita, mercado e sistema',
        action: button('Todos os alertas', { variant: 'ghost', action: 'navigate-to', dataset: { page: 'comum/alertas' } }),
      })}
      ${alerts.length === 0
        ? emptyState({ iconName: 'shield', title: 'Nenhum alerta em aberto', message: 'Todas as condições monitoradas estão dentro do esperado.' })
        : html`<div class="alerts-list">${alerts.slice(0, 3).map(
            (alert) => html`<div class="alert-row ${alert.severity === 'critical' ? 'alert-critical' : alert.severity === 'warning' ? 'alert-warning' : ''}">
              <div class="alert-icon">${icon(alert.icon, 20)}</div>
              <div>
                <div>${badge(alert.levelLabel, alert.tone)}<span>${alert.categoryLabel} · ${alert.source}</span></div>
                <h3>${alert.title}</h3>
                <p>${alert.message}</p>
              </div>
              <div class="alert-time"><span>${relativeTime(alert.createdAt)}</span></div>
            </div>`,
          )}</div>`}`,
      'table-card',
    ),
  );
}
