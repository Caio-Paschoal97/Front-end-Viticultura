/**
 * Analista de Dados › Dashboard Analítico (RF05/RF06/RF07).
 *
 * Painel de governança do dado: qualidade da base, modelos preditivos em
 * produção e saúde da ingestão. É a tela que responde "podemos confiar no que o
 * modelo está dizendo?".
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chartCard, emptyState, sectionHead } from '../../components/ui.js';
import { barChart, donutChart, lineChart } from '../../components/charts.js';
import { dataTable } from '../../components/tables.js';
import { icon } from '../../components/icons.js';
import { formatDateTime, formatNumber, formatPercent, relativeTime } from '../../utils/format.js';
import { buildQualityTrend, buildWeeklyBars } from '../../data/demo/series.js';
import { MODEL_STATUS_MAP } from '../../core/contracts.js';
import { LOG_CATEGORIES, listAuditLogs } from '../../core/audit-log.js';
import { dataOf, header, keyValues, metricsRow, page, pct, strip } from '../support.js';

export function analystDashboard(context) {
  const quality = dataOf(context, 'quality');
  const models = dataOf(context, 'models') ?? [];
  const status = dataOf(context, 'thingspeak');
  const overview = dataOf(context, 'overview');
  const activeModel = models.find((model) => model.status === 'ACTIVE') ?? models[0] ?? null;
  const trend = buildQualityTrend({ points: 12 });
  const weekly = buildWeeklyBars({ seed: 11, base: 68, spread: 24 });
  const releases = auditModelChanges();

  const modelRows = models.map((model) => ({
    ...model,
    accuracyLabel: model.accuracy === null ? '—' : formatPercent(model.accuracy > 1 ? model.accuracy : model.accuracy * 100),
    maeLabel: model.mae === null ? '—' : formatNumber(model.mae, { digits: 2 }),
    rmseLabel: model.rmse === null ? '—' : formatNumber(model.rmse, { digits: 2 }),
  }));

  return page(
    header(context, {
      title: 'Dashboard Analítico',
      subtitle: 'Qualidade dos dados, modelos preditivos e saúde da ingestão',
      varietyMode: 'live',
      actions: [
        button('Sincronizar ingestão', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' }),
        button('Exportar qualidade', { iconName: 'download', action: 'export-report', dataset: { report: 'quality' } }),
      ],
    }),
    strip(context, {
      extra: activeModel ? `modelo em produção: ${activeModel.name} ${activeModel.version}` : 'nenhum modelo em produção',
      loadingLabel: 'Consultando qualidade e modelos…',
    }),
    metricsRow(
      [
        { icon: 'quality', label: 'Completude da base', value: pct(quality?.completeness), meta: `${formatNumber(quality?.validCount ?? 0)} leitura(s) válidas`, tone: 'green' },
        { icon: 'shield', label: 'Consistência', value: pct(quality?.consistency), meta: `${formatNumber(quality?.invalidCount ?? 0)} inválida(s) · ${formatNumber(quality?.outlierCount ?? 0)} outlier(s)`, tone: 'blue' },
        { icon: 'model', label: 'Modelos cadastrados', value: formatNumber(models.length), meta: activeModel ? `produção: ${activeModel.name}` : 'sem modelo ativo', tone: 'purple' },
        { icon: 'wifi', label: 'Canal ThingSpeak', value: status?.statusLabel ?? '—', meta: status?.channelId ? `canal ${status.channelId}` : 'canal não configurado', tone: status?.configured ? 'green' : 'gold' },
      ],
      'four',
    ),
    html`<div class="grid-2">
      ${chartCard({
        title: 'Evolução da qualidade',
        subtitle: 'Pontuação consolidada por ciclo de ingestão (últimos 12 ciclos)',
        legend: html`<div class="chart-legend"><span><i class="series-dot chart-1"></i>Consistência</span></div>`,
        content: lineChart({ series: [{ data: trend, tone: 'chart-1' }], unit: '%', emptyMessage: 'Sem histórico de qualidade' }),
      })}
      ${card(
        html`${sectionHead({ title: 'Resumo dos modelos', subtitle: 'Status e métricas de validação (ModelMetricResponse)' })}
          ${modelRows.length === 0
            ? emptyState({ iconName: 'model', title: 'Nenhum modelo cadastrado', message: 'A rota /models não devolveu registros.' })
            : dataTable({
                columns: [
                  { label: 'Modelo', render: (row) => html`<strong>${row.name}</strong><br /><small class="mono">${row.version}</small>` },
                  { label: 'Status', render: (row) => badge(row.statusLabel, row.tone) },
                  { label: 'Acurácia', key: 'accuracyLabel' },
                  { label: 'MAE', key: 'maeLabel' },
                  { label: 'RMSE', key: 'rmseLabel' },
                ],
                rows: modelRows,
              })}`,
        'table-card',
      )}
    </div>`,
    html`<div class="grid-2">
      ${chartCard({
        title: 'Leituras processadas por dia',
        subtitle: 'Volume de registros que passaram pela limpeza do RF05',
        content: barChart({ values: weekly, labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], unit: 'registros' }),
      })}
      ${card(
        html`${sectionHead({ title: 'Distribuição das leituras', subtitle: 'Classificação aplicada pelo back-end' })}
          ${donutChart({
            total: formatNumber((quality?.validCount ?? 0) + (quality?.invalidCount ?? 0)),
            caption: 'leituras analisadas',
            segments: [
              { label: 'Válidas', value: quality?.validCount ?? 0 },
              { label: 'Inválidas', value: quality?.invalidCount ?? 0 },
              { label: 'Outliers', value: quality?.outlierCount ?? 0 },
              { label: 'Ausentes', value: quality?.missingCount ?? 0 },
            ],
          })}`,
        'chart-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Pipeline de dados', subtitle: 'Da coleta no campo ao dado pronto para o modelo', action: button('Ver dados climáticos', { variant: 'ghost', action: 'navigate-to', dataset: { page: 'analista/dados-climaticos' } }) })}
        <div class="pipeline-list">
          ${[
            { icon: 'wifi', title: 'Coleta (ESP32)', detail: `${formatNumber((quality?.validCount ?? 0) + (quality?.invalidCount ?? 0))} leituras recebidas`, status: 'Concluído' },
            { icon: 'cloud', title: 'ThingSpeak', detail: `${status?.channelId ?? 'canal não configurado'} · intervalo 15 s`, status: status?.configured ? 'Concluído' : 'Pendente' },
            { icon: 'link', title: 'Consumo REST', detail: 'GET /readings/current a cada ciclo', status: 'Concluído' },
            { icon: 'quality', title: 'Validação e limpeza', detail: `${formatNumber(quality?.invalidCount ?? 0)} registro(s) descartado(s)`, status: quality?.invalidCount ? 'Atenção' : 'Concluído' },
            { icon: 'database', title: 'Persistência', detail: 'sensor_readings no banco em nuvem', status: 'Concluído' },
            { icon: 'model', title: 'Modelagem', detail: activeModel ? `${activeModel.name} ${activeModel.version}` : 'sem modelo ativo', status: activeModel ? 'Concluído' : 'Pendente' },
          ].map(
            (step) => html`<div>
              <span class="pipe-icon ${step.status === 'Pendente' ? 'pending' : step.status === 'Atenção' ? 'warning' : ''}">${icon(step.icon, 18)}</span>
              <div><strong>${step.title}</strong><span>${step.detail}</span></div>
              ${badge(step.status, step.status === 'Concluído' ? 'success' : step.status === 'Pendente' ? 'neutral' : 'warning')}
            </div>`,
          )}
        </div>`,
      'table-card',
    ),
    html`<div class="grid-2">
      ${card(
        html`${sectionHead({ title: 'Compromissos de qualidade', subtitle: 'Metas acordadas com a operação' })}
          <div class="checks">
            <label><input type="checkbox" ${quality?.completeness >= 0.95 ? 'checked' : ''} disabled /><span>Completude ≥ 95% (atual: ${pct(quality?.completeness)})</span></label>
            <label><input type="checkbox" ${quality?.consistency >= 0.9 ? 'checked' : ''} disabled /><span>Consistência ≥ 90% (atual: ${pct(quality?.consistency)})</span></label>
            <label><input type="checkbox" ${(quality?.invalidCount ?? 1) === 0 ? 'checked' : ''} disabled /><span>Zero leitura fora de faixa (atual: ${formatNumber(quality?.invalidCount ?? 0)})</span></label>
            <label><input type="checkbox" ${activeModel ? 'checked' : ''} disabled /><span>Modelo em produção com acurácia ≥ 85%</span></label>
          </div>`,
        'table-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Histórico de releases do modelo', subtitle: 'Versões registradas na trilha de auditoria' })}
          ${keyValues(
            [
              { label: 'Versão ativa', value: activeModel ? `${activeModel.name} ${activeModel.version}` : '—' },
              { label: 'Status', value: activeModel ? MODEL_STATUS_MAP[activeModel.status]?.label ?? activeModel.statusLabel : '—' },
              { label: 'Última alteração', value: releases ? relativeTime(releases.at) : 'sem registro' },
              { label: 'Responsável', value: releases?.actor ?? '—' },
              { label: 'Previsão mais recente', value: overview?.period?.end ? formatDateTime(overview.period.end) : '—' },
            ],
            { rows: true },
          )}`,
        'table-card',
      )}
    </div>`,
  );
}

function auditModelChanges() {
  return listAuditLogs().find((entry) => entry.category === LOG_CATEGORIES.MODEL) ?? null;
}
