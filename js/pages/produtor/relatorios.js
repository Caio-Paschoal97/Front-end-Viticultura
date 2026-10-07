/**
 * Produtor/Exportador › Relatórios (RF11).
 *
 * Cada cartão dispara uma ação da camada de relatórios (`js/services/report-service.js`),
 * que gera o CSV com os dados normalizados e registra a exportação na trilha de
 * auditoria (quem exportou, o quê e quando).
 */

import { html } from '../../utils/html.js';
import { badge, button, card, emptyState, sectionHead } from '../../components/ui.js';
import { icon } from '../../components/icons.js';
import { formatDateTime, formatNumber, formatPercent, relativeTime } from '../../utils/format.js';
import { dataOf, header, keyValues, page, pct, strip } from '../support.js';
import { LOG_CATEGORIES, listAuditLogs } from '../../core/audit-log.js';

const REPORTS = [
  { id: 'overview', icon: 'grid', title: 'Resumo da safra', description: 'Métricas do período, risco e recomendações do modelo.', scope: 'DashboardOverviewResponse' },
  { id: 'readings', icon: 'cloud', title: 'Leituras dos sensores', description: 'Todas as leituras válidas com sensor, data/hora e status.', scope: 'ReadingResponse' },
  { id: 'market', icon: 'market', title: 'Mercado e exportação', description: 'Preço, demanda e histórico de referência da variedade.', scope: 'MarketResponse' },
  { id: 'forecast', icon: 'trend', title: 'Previsão de colheita', description: 'Janela projetada, risco e recomendações retidas.', scope: 'ForecastResponse' },
  { id: 'history', icon: 'clock', title: 'Histórico climático', description: 'Série de temperatura e umidade do período consultado.', scope: 'sensor_readings' },
  { id: 'quality', icon: 'quality', title: 'Qualidade dos dados', description: 'Completude, consistência, inválidos e outliers.', scope: 'DataQualityResponse' },
];

export function producerReports(context) {
  const overview = dataOf(context, 'overview');
  const readings = dataOf(context, 'readings') ?? [];
  const quality = dataOf(context, 'quality');
  const market = dataOf(context, 'market');
  const exports_ = listAuditLogs().filter((entry) => entry.category === LOG_CATEGORIES.REPORT).slice(0, 5);

  return page(
    header(context, {
      title: 'Relatórios da Safra',
      subtitle: 'Exportação em CSV e impressão do relatório executivo',
      varietyMode: 'live',
      actions: [
        button('Imprimir relatório executivo', { variant: 'secondary', iconName: 'printer', action: 'print-report' }),
        button('Exportar resumo', { iconName: 'download', action: 'export-report', dataset: { report: 'overview' } }),
      ],
    }),
    strip(context, { extra: `${formatNumber(readings.length)} leitura(s) disponíveis para exportação`, loadingLabel: 'Preparando relatórios…' }),
    html`<div class="report-grid">${REPORTS.map(
      (report) => card(
        html`<span class="report-icon">${icon(report.icon, 22)}</span>
          <div>
            <strong>${report.title}</strong>
            <p>${report.description}</p>
            <small class="mono">${report.scope}</small>
          </div>
          ${button('Exportar CSV', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: report.id } })}`,
        'report-card',
      ),
    )}</div>`,
    card(
      html`${sectionHead({ title: 'Situação dos dados para exportação', subtitle: 'Um relatório só sai com dado consistente' })}
        ${keyValues(
          [
            { label: 'Variedade', value: context.variety },
            { label: 'Período selecionado', value: context.period === '24h' ? 'Últimas 24 horas' : context.period === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias' },
            { label: 'Leituras válidas', value: formatNumber(readings.filter((reading) => reading.status !== 'INVALID').length) },
            { label: 'Completude', value: quality ? pct(quality.completeness) : '—' },
            { label: 'Consistência', value: quality ? pct(quality.consistency) : '—' },
            { label: 'Preço de referência', value: market?.price === null || market?.price === undefined ? '—' : `R$ ${market.price.toFixed(2)}/kg` },
            { label: 'Risco da janela', value: overview?.riskLabel ?? '—' },
            { label: 'Registros descartados', value: formatNumber(quality?.invalidCount ?? 0) },
          ],
          { rows: true },
        )}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Últimas exportações', subtitle: 'Trilha de auditoria — quem exportou, o quê e quando' })}
        ${exports_.length === 0
          ? emptyState({ iconName: 'report', title: 'Nenhuma exportação registrada', message: 'Gere um relatório para vê-lo listado aqui.' })
          : html`<div class="list-rows">${exports_.map(
              (entry) => html`<div>
                <span class="activity-symbol tone-blue">${icon('download', 16)}</span>
                <div class="list-main"><strong>${entry.action}</strong><span>${entry.detail} · ${entry.actor}</span></div>
                <span class="list-meta">${relativeTime(entry.at)}</span>
              </div>`,
            )}</div>`}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Checklist de entrega ao importador', subtitle: 'Documentação que acompanha o embarque' })}
        <div class="checks">
          <label><input type="checkbox" checked disabled /><span>Relatório de condições climáticas do lote</span></label>
          <label><input type="checkbox" checked disabled /><span>Série de temperatura do transporte refrigerado</span></label>
          <label><input type="checkbox" checked disabled /><span>Laudo de qualidade (Brix, firmeza, calibre)</span></label>
          <label><input type="checkbox" checked disabled /><span>Rastreabilidade por QR code de origem</span></label>
          <label><input type="checkbox" disabled /><span>Certificado fitossanitário (emitido no embarque)</span></label>
        </div>
        ${badge(`Gerado em ${formatDateTime(new Date())}`, 'neutral')}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Como o relatório é produzido', subtitle: 'Transparência sobre a origem dos números' })}
        <div class="policy-list">
          <div>${icon('database', 18)}<div><strong>Fonte primária</strong><p>Leituras persistidas pelo back-end após o consumo do canal ThingSpeak (RF02/RF04).</p></div>${badge('API', 'info')}</div>
          <div>${icon('quality', 18)}<div><strong>Limpeza</strong><p>Valores fora de faixa, ausentes e outliers são excluídos antes da consolidação (RF05).</p></div>${badge('RF05', 'purple')}</div>
          <div>${icon('report', 18)}<div><strong>Formato</strong><p>CSV com ponto e vírgula e BOM UTF-8 — abre direto no Excel em português.</p></div>${badge('CSV', 'success')}</div>
          <div>${icon('printer', 18)}<div><strong>PDF</strong><p>Use "Imprimir relatório executivo" e escolha "Salvar como PDF" no navegador.</p></div>${badge('PDF', 'warning')}</div>
        </div>`,
      'table-card',
    ),
  );
}

export { formatPercent };
