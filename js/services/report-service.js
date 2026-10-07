/**
 * Geração de relatórios e exportações (RF11).
 *
 * Toda exportação é registrada na trilha de auditoria (quem exportou, o quê e
 * quando), o que alimenta a tela Admin › Logs do Sistema.
 */

import { LOG_CATEGORIES, logAudit } from '../core/audit-log.js';
import { summarizeSecurity, listSecurityEvents } from '../core/security-log.js';
import { getState, pushToast } from '../core/store.js';
import { exportCsv, printReport as printWindow, timestampedName } from '../utils/csv.js';
import { formatDateTime, formatPercent, formatTemperature, relativeTime } from '../utils/format.js';

const actorName = (state) => state.session?.name ?? 'Sistema';

const notify = (state, { title, message, tone = 'success' }) => pushToast({ title, message, tone });

const buildSeriesColumns = (label) => [
  { label: 'Data / hora', value: (row) => formatDateTime(row.timestamp) },
  { label, value: (row) => row.value },
];

const finish = (state, { filename, rows, columns, report, detail }) => {
  if (!rows || rows.length === 0) {
    pushToast({ title: 'Nada para exportar', message: 'A consulta atual não retornou registros.', tone: 'warn' });
    return false;
  }
  exportCsv(filename, rows, columns);
  logAudit(`Relatório exportado: ${report}`, {
    category: LOG_CATEGORIES.REPORT,
    actor: actorName(state),
    detail: `${rows.length} registro(s) · ${filename}`,
  });
  notify(state, { title: 'Relatório gerado', message: `${report} (${rows.length} registros).` });
  return true;
};

/** Resumo executivo da visão geral (métricas + recomendações). */
export function exportOverviewReport() {
  const state = getState();
  const overview = state.data.overview;
  const rows = [
    ...(overview?.metrics ?? []).map((metric) => ({ bloco: 'Métrica', item: metric.label, valor: `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`, referencia: metric.trend ?? '' })),
    ...(overview?.recommendations ?? []).map((recommendation) => ({
      bloco: 'Recomendação',
      item: recommendation.title,
      valor: recommendation.description,
      referencia: formatPercent(recommendation.confidence, { fromRatio: true }),
    })),
  ];
  return finish(state, {
    filename: timestampedName('agroclima-resumo-safra'),
    rows,
    report: 'Resumo de safra',
    columns: [
      { label: 'Bloco', value: (row) => row.bloco },
      { label: 'Item', value: (row) => row.item },
      { label: 'Valor', value: (row) => row.valor },
      { label: 'Referência', value: (row) => row.referencia },
    ],
  });
}

/** Leituras climáticas do período consultado. */
export function exportReadingsReport() {
  const state = getState();
  const readings = state.data.readings ?? [];
  return finish(state, {
    filename: timestampedName('agroclima-leituras'),
    rows: readings,
    report: 'Leituras climáticas',
    columns: [
      { label: 'Data / hora', value: (row) => formatDateTime(row.timestamp) },
      { label: 'Temperatura (°C)', value: (row) => (row.temperature ?? '') },
      { label: 'Umidade (%)', value: (row) => (row.humidity ?? '') },
      { label: 'Sensor', value: (row) => row.sensorCode },
      { label: 'Variedade', value: (row) => row.variety ?? '' },
      { label: 'Status', value: (row) => row.statusLabel },
    ],
  });
}

/** Série de preços e demanda (mercado). */
export function exportMarketReport() {
  const state = getState();
  const market = state.data.market;
  const rows = (market?.priceHistory ?? []).map((point) => ({
    timestamp: point.timestamp,
    price: point.value,
    demand: market?.demandLabel ?? '—',
  }));
  return finish(state, {
    filename: timestampedName('agroclima-mercado'),
    rows,
    report: 'Dados de mercado',
    columns: [
      { label: 'Data', value: (row) => formatDateTime(row.timestamp) },
      { label: 'Preço (R$/kg)', value: (row) => row.price },
      { label: 'Demanda', value: (row) => row.demand },
    ],
  });
}

/** Previsões do modelo preditivo. */
export function exportForecastReport() {
  const state = getState();
  const forecast = state.data.forecasts;
  const rows = (forecast?.predictions ?? []).map((point) => ({
    timestamp: point.timestamp,
    value: point.value,
    model: forecast?.modelVersion ?? '—',
    risk: forecast?.riskLabel ?? '—',
  }));
  return finish(state, {
    filename: timestampedName('agroclima-previsoes'),
    rows,
    report: 'Previsões',
    columns: [
      { label: 'Alvo da previsão', value: (row) => formatDateTime(row.timestamp) },
      { label: 'Temperatura prevista (°C)', value: (row) => row.value },
      { label: 'Modelo', value: (row) => row.model },
      { label: 'Risco', value: (row) => row.risk },
    ],
  });
}

/** Histórico climático consolidado (RF10). */
export function exportHistoryReport() {
  const state = getState();
  const readings = state.data.readings ?? [];
  const rows = readings.map((reading) => ({
    timestamp: reading.timestamp,
    temperature: reading.temperature,
    humidity: reading.humidity,
    status: reading.statusLabel,
    variety: reading.variety ?? '',
  }));
  return finish(state, {
    filename: timestampedName('agroclima-historico-climatico'),
    rows,
    report: 'Histórico climático',
    columns: [
      { label: 'Data / hora', value: (row) => formatDateTime(row.timestamp) },
      { label: 'Temperatura (°C)', value: (row) => row.temperature ?? '' },
      { label: 'Umidade (%)', value: (row) => row.humidity ?? '' },
      { label: 'Status da leitura', value: (row) => row.status },
      { label: 'Variedade', value: (row) => row.variety },
    ],
  });
}

/** Relatório de qualidade dos dados (RF05/RF11 — analista). */
export function exportQualityReport() {
  const state = getState();
  const quality = state.data.quality;
  const rows = [
    { indicador: 'Completude', valor: formatPercent(quality?.completeness ?? 0, { fromRatio: true }), observacao: 'Leituras com temperatura e umidade presentes' },
    { indicador: 'Consistência', valor: formatPercent(quality?.consistency ?? 0, { fromRatio: true }), observacao: 'Registros aprovados na validação' },
    { indicador: 'Registros válidos', valor: quality?.validCount ?? 0, observacao: 'Base de treino do modelo' },
    { indicador: 'Registros inválidos', valor: quality?.invalidCount ?? 0, observacao: 'Descartados pela camada de limpeza' },
    { indicador: 'Valores ausentes', valor: quality?.missingCount ?? 0, observacao: 'Campos obrigatórios sem valor' },
    { indicador: 'Outliers', valor: quality?.outlierCount ?? 0, observacao: 'Fora das faixas físicas (-10 a 60 °C / 0 a 100%)' },
  ];
  return finish(state, {
    filename: timestampedName('agroclima-qualidade-dados'),
    rows,
    report: 'Qualidade dos dados',
    columns: [
      { label: 'Indicador', value: (row) => row.indicador },
      { label: 'Valor', value: (row) => row.valor },
      { label: 'Observação', value: (row) => row.observacao },
    ],
  });
}

/** Relatório de segurança (acessos e incidentes — RF11). */
export function exportSecurityReport() {
  const state = getState();
  const events = listSecurityEvents();
  const summary = summarizeSecurity(events);
  const rows = [
    { item: 'Total de eventos registrados', valor: summary.total, detalhe: 'Trilha de auditoria de segurança' },
    { item: 'Logins bem-sucedidos', valor: summary.logins, detalhe: 'Sessões autenticadas no período' },
    { item: 'Falhas de autenticação', valor: summary.failures, detalhe: 'Credenciais inválidas ou conta bloqueada' },
    { item: 'Acessos bloqueados pelo RBAC', valor: summary.blocked, detalhe: 'Tentativas de abrir página fora do perfil' },
    { item: 'Incidentes críticos', valor: summary.incidents, detalhe: 'Eventos classificados como críticos' },
    ...events.slice(0, 40).map((event) => ({
      item: `${event.label} — ${event.actor?.email ?? 'sistema'}`,
      valor: formatDateTime(event.at),
      detalhe: event.description,
    })),
  ];
  return finish(state, {
    filename: timestampedName('agroclima-seguranca'),
    rows,
    report: 'Relatório de segurança',
    columns: [
      { label: 'Item', value: (row) => row.item },
      { label: 'Valor', value: (row) => row.valor },
      { label: 'Detalhe', value: (row) => row.detalhe },
    ],
  });
}

/** Relatório de usuários e permissões (RF12). */
export function exportUsersReport() {
  const state = getState();
  const rows = state.users ?? [];
  return finish(state, {
    filename: timestampedName('agroclima-usuarios'),
    rows,
    report: 'Usuários e permissões',
    columns: [
      { label: 'Nome', value: (row) => row.name },
      { label: 'E-mail', value: (row) => row.email },
      { label: 'Perfil', value: (row) => row.roleLabel ?? row.role },
      { label: 'Status', value: (row) => row.status },
      { label: 'Último acesso', value: (row) => (row.lastAccessAt ? `${relativeTime(row.lastAccessAt)}` : 'sem acesso') },
    ],
  });
}

/** Relatório de logs do sistema (RF11 — auditoria). */
export function exportAuditReport() {
  const state = getState();
  const rows = state.auditLogs ?? [];
  return finish(state, {
    filename: timestampedName('agroclima-logs'),
    rows,
    report: 'Logs do sistema',
    columns: [
      { label: 'Data / hora', value: (row) => formatDateTime(row.at) },
      { label: 'Ação', value: (row) => row.action },
      { label: 'Categoria', value: (row) => row.category },
      { label: 'Autor', value: (row) => row.actor },
      { label: 'Detalhe', value: (row) => row.detail },
      { label: 'Status', value: (row) => row.status },
    ],
  });
}

/** Relatório executivo para impressão/PDF (usado nas telas de relatórios). */
export function printExecutiveReport(state = getState()) {
  logAudit('Relatório executivo impresso', {
    category: LOG_CATEGORIES.REPORT,
    actor: actorName(state),
    detail: 'Impressão/PDF gerado a partir do dashboard.',
  });
  printWindow();
  notify(state, { title: 'Relatório em impressão', message: 'Escolha "Salvar como PDF" na janela de impressão para arquivar o relatório.' });
}

/** Despachante usado pelos botões `data-action="export-report"`. */
export const REPORTS = {
  overview: exportOverviewReport,
  readings: exportReadingsReport,
  market: exportMarketReport,
  forecast: exportForecastReport,
  history: exportHistoryReport,
  quality: exportQualityReport,
  security: exportSecurityReport,
  users: exportUsersReport,
  logs: exportAuditReport,
};

export function runReport(reportId) {
  const handler = REPORTS[reportId];
  if (!handler) {
    pushToast({ title: 'Relatório indisponível', message: `Nenhum gerador configurado para "${reportId}".`, tone: 'warn' });
    return false;
  }
  return handler();
}

export { buildSeriesColumns };
