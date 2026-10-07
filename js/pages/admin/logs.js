/**
 * Administrador › Logs do Sistema (RF11).
 *
 * Trilha de auditoria completa (quem fez, o quê, quando e com que resultado) com
 * busca, filtro por categoria e exportação — a evidência de rastreabilidade
 * exigida nos relatórios de segurança e qualidade.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chips, emptyState, sectionHead } from '../../components/ui.js';
import { dataTable } from '../../components/tables.js';
import { icon } from '../../components/icons.js';
import { LOG_CATEGORIES, auditCategories, listAuditLogs } from '../../core/audit-log.js';
import { listSecurityEvents } from '../../core/security-log.js';
import { formatDateTime, formatNumber, normalizeText, relativeTime } from '../../utils/format.js';
import { getPageFilter, header, metricsRow, page, strip } from '../support.js';

export function adminLogs(context) {
  const category = getPageFilter(context.page, 'category', 'todas');
  const search = getPageFilter(context.page, 'search', '');
  const logs = listAuditLogs();
  const security = listSecurityEvents().slice(0, 6);

  const filtered = logs.filter((entry) => {
    if (category !== 'todas' && entry.category !== category) return false;
    if (!search) return true;
    const term = normalizeText(search);
    return normalizeText(entry.action).includes(term) || normalizeText(entry.detail).includes(term) || normalizeText(entry.actor).includes(term);
  });

  const rows = filtered.map((entry) => ({
    ...entry,
    when: `${formatDateTime(entry.at)} · ${relativeTime(entry.at)}`,
    statusTone: entry.status === 'Concluído' ? 'success' : 'warning',
  }));

  const categoryChips = [
    { value: 'todas', label: 'Todas', count: logs.length },
    ...auditCategories().map((name) => ({ value: name, label: name, count: logs.filter((entry) => entry.category === name).length })).filter((chip) => chip.count > 0),
  ];

  const today = logs.filter((entry) => new Date(entry.at).toDateString() === new Date().toDateString()).length;
  const warnings = logs.filter((entry) => entry.level === 'warning' || entry.status === 'Alerta').length;

  return page(
    header(context, {
      title: 'Logs do Sistema',
      subtitle: 'Trilha de auditoria das atividades das três frentes do projeto',
      varietyMode: 'hidden',
      actions: [
        button('Exportar logs', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'logs' } }),
        button('Limpar trilha', { variant: 'ghost', iconName: 'trash', action: 'clear-logs' }),
      ],
    }),
    strip(context, { extra: `${formatNumber(logs.length)} registro(s) · ${formatNumber(today)} hoje`, loadingLabel: 'Carregando a trilha de auditoria…' }),
    metricsRow(
      [
        { icon: 'logs', label: 'Registros na trilha', value: formatNumber(logs.length), meta: 'limite de 400 entradas por navegador', tone: 'blue' },
        { icon: 'calendar', label: 'Eventos de hoje', value: formatNumber(today), meta: 'sessão atual incluída', tone: 'green' },
        { icon: 'alert-triangle', label: 'Com alerta', value: formatNumber(warnings), meta: 'requerem acompanhamento', tone: 'orange' },
        { icon: 'clock', label: 'Último registro', value: logs.length ? relativeTime(logs[0].at) : '—', meta: logs.length ? formatDateTime(logs[0].at) : 'sem eventos', tone: 'purple' },
      ],
      'four',
    ),
    card(
      html`<div class="searchbox">${icon('search')}<input type="search" placeholder="Buscar por ação, autor ou detalhe" aria-label="Buscar nos logs" value="${search}" data-action="set-filter" data-key="search" /></div>
        ${button('Exportar', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'logs' } })}`,
      'toolbar',
    ),
    chips({ items: categoryChips, active: category, action: 'set-filter', name: 'category' }),
    card(
      html`${sectionHead({ title: `${formatNumber(rows.length)} registro(s)`, subtitle: 'Filtre por categoria e busque por autor ou ação' })}
      ${rows.length === 0
        ? emptyState({ iconName: 'logs', title: 'Nenhum registro', message: 'Ajuste os filtros para encontrar os eventos desejados.' })
        : dataTable({
            columns: [
              { label: 'Quando', render: (row) => html`${row.when}` },
              { label: 'Ação', render: (row) => html`<strong>${row.action}</strong>` },
              { label: 'Categoria', render: (row) => badge(row.category, row.level === 'warning' ? 'warning' : 'neutral') },
              { label: 'Autor', key: 'actor' },
              { label: 'Detalhe', key: 'detail' },
              { label: 'Status', render: (row) => badge(row.status, row.statusTone) },
            ],
            rows,
          })}`,
      'table-card',
    ),
    card(
      html`${sectionHead({
        title: 'Eventos de segurança recentes',
        subtitle: 'Complementa a trilha com autenticação e bloqueios do RBAC',
        action: button('Abrir painel de segurança', { variant: 'ghost', action: 'navigate-to', dataset: { page: 'admin/seguranca' } }),
      })}
      ${security.length === 0
        ? emptyState({ iconName: 'shield', title: 'Sem eventos de segurança', message: 'Nenhum login ou bloqueio registrado nesta sessão.' })
        : html`<div class="list-rows">${security.map(
            (event) => html`<div>
              <span class="activity-symbol tone-${event.severity === 'critical' ? 'red' : event.severity === 'warning' ? 'gold' : 'blue'}">${icon(event.type === 'ACCESS_DENIED' ? 'lock' : 'shield', 16)}</span>
              <div class="list-main"><strong>${event.label}</strong><span>${event.description}</span></div>
              <span class="list-meta">${relativeTime(event.at)}</span>
            </div>`,
          )}</div>`}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Como a trilha é formada', subtitle: 'Origem de cada categoria de log' })}
      <div class="policy-list">
        <div>${badge('API', 'info')}<div><strong>Ingestão e integrações</strong><p>Cada ciclo de leitura do ThingSpeak, falha de sincronização e erro de contrato é registrado em <span class="mono">${LOG_CATEGORIES.INGESTION}</span>.</p></div></div>
        <div>${badge('RBAC', 'purple')}<div><strong>Segurança</strong><p>Logins, falhas, bloqueios de página e alterações de permissão em <span class="mono">${LOG_CATEGORIES.SECURITY}</span>.</p></div></div>
        <div>${badge('REL', 'success')}<div><strong>Relatórios</strong><p>Toda exportação (CSV/PDF) fica registrada em <span class="mono">${LOG_CATEGORIES.REPORT}</span> com autor e volume de registros.</p></div></div>
        <div>${badge('ADM', 'warning')}<div><strong>Administração</strong><p>Cadastro de usuários, revisão de permissões e configurações em <span class="mono">${LOG_CATEGORIES.ADMIN}</span>.</p></div></div>
      </div>`,
      'table-card',
    ),
  );
}
