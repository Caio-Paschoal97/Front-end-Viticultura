/**
 * Tabelas reutilizáveis (RNF09).
 *
 * `dataTable` é genérica: cada coluna informa `key` (valor direto) ou `render`
 * (função que devolve marcação) — é o que permite à mesma tabela servir para
 * usuários, alertas, logs, leituras e histórico.
 */

import { html, trusted } from '../utils/html.js';
import { formatDateTime, formatPercent, formatTemperature } from '../utils/format.js';
import { badge, card, emptyState, sectionHead } from './ui.js';

export const tableWrapper = (head, body, { className = '', foot = null } = {}) =>
  html`<div class="table-scroll"><table class="${className}">
      <thead>${head}</thead>
      <tbody>${body}</tbody>
      ${foot ? html`<tfoot>${foot}</tfoot>` : ''}
    </table></div>`;

/**
 * Tabela de dados genérica.
 * `columns`: [{ label, key?, render?(row), align? }]
 */
export function dataTable({ columns = [], rows = [], emptyTitle = 'Nenhum registro', emptyMessage, emptyAction, foot = null, className = '' }) {
  if (rows.length === 0) return emptyState({ iconName: 'database', title: emptyTitle, message: emptyMessage, action: emptyAction });

  const head = html`<tr>${columns.map(
    (column) => html`<th${column.align ? html` class="text-${column.align}"` : ''}>${column.label}</th>`,
  )}</tr>`;

  const body = rows.map(
    (row) => html`<tr${row.__rowAttributes ? trustedAttributes(row.__rowAttributes) : ''}>${columns.map(
      (column) => html`<td${column.align ? html` class="text-${column.align}"` : ''}>${column.render ? column.render(row) : row[column.key] ?? '—'}</td>`,
    )}</tr>`,
  );

  return tableWrapper(head, body, { className, foot });
}

/* Marcação de atributos de linha (ex.: data-action="open-modal"). */
const trustedAttributes = (attributes) => trusted(` ${String(attributes).trim()}`);

/**
 * Comparativo das variedades monitoradas (`VarietySummaryDto`).
 * Ordena pelo score do modelo e destaca a líder.
 */
export function comparisonTable(summaries = [], { title = 'Comparativo de variedades', subtitle = 'Cenário consolidado para decisão de colheita e embarque' } = {}) {
  if (summaries.length === 0) {
    return card(sectionHead({ title, subtitle }) + emptyState({ iconName: 'compare', title: 'Sem dados de comparativo', message: 'A API não devolveu o resumo das variedades.' }), 'table-card');
  }

  const leader = summaries[0];
  const finalists = summaries.slice(0, 3).map((item, index) => ({ ...item, position: index + 1 }));

  const rows = summaries.map(
    (item, index) => html`<tr class="${item.name === leader.name ? 'winner' : ''}">
      <td><strong>${index + 1}º</strong></td>
      <td><div class="variety-cell"><span class="grape-dot"></span><div><strong>${item.name}</strong><small>Score ${item.score.toFixed(1)}</small></div></div></td>
      <td>${item.temperature === null ? '—' : formatTemperature(item.temperature)}</td>
      <td>${item.humidity === null ? '—' : formatPercent(item.humidity)}</td>
      <td>${item.marketPrice === null ? '—' : `R$ ${item.marketPrice.toFixed(2)}`}</td>
      <td>${badge(item.riskLabel, item.riskTone)}</td>
    </tr>`,
  );

  return card(
    `${sectionHead({ title, subtitle })}
    <div class="ranking-list">${finalists.map(
      (item) => html`<div class="ranking ${item.position === 1 ? 'first' : ''}"><span>${item.position}º</span><div><strong>${item.name}</strong><small>Score ${item.score.toFixed(1)} · ${item.riskLabel}</small></div>${item.marketPrice === null ? '' : html`<em>R$ ${item.marketPrice.toFixed(2)}</em>`}</div>`,
    )}</div>
    ${tableWrapper(
      html`<tr><th>#</th><th>Variedade</th><th>Temperatura</th><th>Umidade</th><th>Preço</th><th>Risco</th></tr>`,
      rows,
      { className: 'compare-table' },
    )}`,
    'table-card',
  );
}

/** Últimas leituras dos sensores com selo de status (RF01/RF02). */
export function readingsTable(readings = [], { title = 'Leituras recentes', subtitle = 'Registros consumidos da API do ThingSpeak e validados pela camada de processamento', limit = 8, action = null } = {}) {
  const rows = readings.slice(0, limit).map(
    (reading) => html`<tr>
      <td>${formatDateTime(reading.timestamp)}</td>
      <td class="mono">${reading.sensorCode ?? '—'}</td>
      <td>${reading.variety ?? '—'}</td>
      <td>${formatTemperature(reading.temperature)}</td>
      <td>${formatPercent(reading.humidity)}</td>
      <td>${badge(reading.statusLabel, reading.statusTone)}</td>
    </tr>`,
  );

  if (readings.length === 0) {
    return card(`${sectionHead({ title, subtitle, action })}${emptyState({ iconName: 'cloud', title: 'Sem leituras no período', message: 'O canal do ThingSpeak não devolveu registros para a janela consultada.' })}`, 'table-card');
  }

  return card(
    `${sectionHead({ title, subtitle, action })}
    ${tableWrapper(
      html`<tr><th>Data / hora</th><th>Sensor</th><th>Variedade</th><th>Temperatura</th><th>Umidade</th><th>Status</th></tr>`,
      rows,
    )}`,
    'table-card',
  );
}

export { formatDateTime };
