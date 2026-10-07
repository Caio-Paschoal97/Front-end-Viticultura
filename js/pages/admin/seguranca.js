/**
 * Administrador › Segurança (RF11 / RNF02 / RNF08).
 *
 * Relatório de segurança do sistema: acessos, falhas de autenticação, bloqueios
 * do RBAC, alterações de permissão, políticas aplicadas e conformidade
 * (LGPD/GDPR).
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chips, emptyState, sectionHead } from '../../components/ui.js';
import { barChart } from '../../components/charts.js';
import { icon } from '../../components/icons.js';
import { eventSeverity, listSecurityEvents, loginsByDay, summarizeSecurity } from '../../core/security-log.js';
import { ROLE_INFO, ROLES } from '../../config/roles.js';
import { formatDateTime, formatNumber, relativeTime } from '../../utils/format.js';
import { SECURITY_POLICY } from '../../data/demo/records.js';
import { dataOf, header, metricsRow, page, pct, strip } from '../support.js';

const SEVERITY_TONE = { critical: 'danger', warning: 'warning', info: 'info' };

export function adminSecurity(context) {
  const events = listSecurityEvents();
  const summary = summarizeSecurity(events);
  const quality = dataOf(context, 'quality');
  const daily = loginsByDay(events);
  const hasDaily = daily.some((bucket) => bucket.value > 0);
  const filter = context.state.filters['admin/seguranca']?.severity ?? 'todas';
  const visible = filter === 'todas' ? events.slice(0, 24) : events.filter((event) => eventSeverity(event.type) === filter).slice(0, 24);

  const severityChips = [
    { value: 'todas', label: 'Todos os eventos', count: events.length },
    { value: 'critical', label: 'Críticos', count: events.filter((event) => eventSeverity(event.type) === 'critical').length },
    { value: 'warning', label: 'Advertências', count: events.filter((event) => eventSeverity(event.type) === 'warning').length },
    { value: 'info', label: 'Informativos', count: events.filter((event) => eventSeverity(event.type) === 'info').length },
  ];

  return page(
    header(context, {
      title: 'Segurança da Plataforma',
      subtitle: 'Acessos, incidentes, políticas vigentes e conformidade',
      varietyMode: 'hidden',
      actions: [
        button('Exportar relatório', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'security' } }),
        button('Limpar trilha', { variant: 'ghost', iconName: 'trash', action: 'clear-security' }),
      ],
    }),
    strip(context, { extra: `${formatNumber(summary.total)} evento(s) registrado(s) neste navegador`, loadingLabel: 'Consolidando a trilha de segurança…' }),
    metricsRow(
      [
        { icon: 'login', label: 'Logins bem-sucedidos', value: formatNumber(summary.logins), meta: `${formatNumber(summary.total)} evento(s) na trilha`, tone: 'green' },
        { icon: 'alert-triangle', label: 'Falhas de autenticação', value: formatNumber(summary.failures), meta: summary.failures ? 'verificar tentativas repetidas' : 'nenhuma tentativa inválida', tone: 'orange', metaTone: summary.failures ? 'negative' : 'neutral' },
        { icon: 'lock', label: 'Bloqueios do RBAC', value: formatNumber(summary.blocked), meta: 'acessos fora do escopo do perfil', tone: 'red' },
        { icon: 'shield', label: 'Incidentes críticos', value: formatNumber(summary.incidents), meta: `${formatNumber(summary.warnings)} advertência(s)`, tone: 'purple' },
      ],
      'four',
    ),
    html`<div class="grid-2">
      ${card(
        html`${sectionHead({ title: 'Acessos por dia', subtitle: 'Logins registrados nos últimos 7 dias' })}
          ${hasDaily
            ? barChart({ values: daily.map((bucket) => bucket.value), labels: daily.map((bucket) => bucket.label), unit: 'logins' })
            : html`<div class="chart-empty">${icon('shield', 26)}<span>Sem logins registrados nesta sessão. Entre com as contas de demonstração para gerar dados.</span></div>`}`,
        'chart-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Controle de acesso em vigor', subtitle: 'Perfis e escopos definidos no RBAC' })}
          <div class="policy-list">${Object.values(ROLES).map(
            (role) => html`<div>${badge(ROLE_INFO[role].badge, role === ROLES.ADMIN ? 'purple' : role === ROLES.ANALYST ? 'info' : 'success')}<div><strong>${ROLE_INFO[role].label}</strong><p>${ROLE_INFO[role].description}</p></div></div>`,
          )}</div>`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Políticas de segurança aplicadas', subtitle: 'Controles exigidos pelas disciplinas de Segurança da Informação, Cloud e IoT' })}
      <div class="policy-list">${SECURITY_POLICY.map(
        (policy) => html`<div>${icon('shield', 18)}<div><strong>${policy.title}</strong><p>${policy.description}</p></div>${badge(policy.status, 'success')}</div>`,
      )}</div>`,
      'table-card',
    ),
    chips({ items: severityChips, active: filter, action: 'set-filter', name: 'severity' }),
    card(
      html`${sectionHead({ title: 'Eventos da trilha', subtitle: 'Logins, falhas, bloqueios do RBAC, alterações de permissão e de cadastro' })}
      ${visible.length === 0
        ? emptyState({ iconName: 'shield', title: 'Nenhum evento para este filtro', message: 'A trilha está vazia ou não há eventos com o nível selecionado.' })
        : html`<div class="list-rows">${visible.map(
            (event) => html`<div>
              <span class="activity-symbol tone-${SEVERITY_TONE[eventSeverity(event.type)] === 'danger' ? 'red' : SEVERITY_TONE[eventSeverity(event.type)] === 'warning' ? 'gold' : 'blue'}">${icon(event.type === 'ACCESS_DENIED' ? 'lock' : event.type.startsWith('LOGIN') ? 'login' : 'shield', 16)}</span>
              <div class="list-main">
                <strong>${event.label}</strong>
                <span>${event.description}</span>
                <small>${event.actor?.email ?? 'Sistema'} · ${formatDateTime(event.at)}</small>
              </div>
              ${badge(eventSeverity(event.type) === 'critical' ? 'Crítico' : eventSeverity(event.type) === 'warning' ? 'Atenção' : 'Informativo', SEVERITY_TONE[eventSeverity(event.type)])}
            </div>`,
          )}</div>`}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Conformidade e qualidade associada', subtitle: 'Relação entre segurança, dados e privacidade' })}
      <div class="kv-list">
        <div><span>Completude dos dados</span><strong>${quality ? pct(quality.completeness) : '—'}</strong></div>
        <div><span>Consistência</span><strong>${quality ? pct(quality.consistency) : '—'}</strong></div>
        <div><span>Retenção da trilha</span><strong>${context.state.settings?.auditRetentionDays ?? 90} dias</strong></div>
        <div><span>Chaves do ThingSpeak</span><strong>Apenas no servidor (RNF02)</strong></div>
        <div><span>Dados pessoais</span><strong>Minimização e consentimento (LGPD/GDPR)</strong></div>
        <div><span>Último evento</span><strong>${summary.lastEventAt ? relativeTime(summary.lastEventAt) : '—'}</strong></div>
      </div>`,
      'table-card',
    ),
  );
}
