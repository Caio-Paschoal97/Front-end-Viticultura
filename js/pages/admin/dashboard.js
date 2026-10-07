import { html } from '../../utils/html.js';
import { formatNumber, relativeTime } from '../../utils/format.js';
import { badge, button, card, sectionHead } from '../../components/ui.js';
import { barChart, donutChart } from '../../components/charts.js';
import { icon } from '../../components/icons.js';
import { LOG_CATEGORIES } from '../../core/audit-log.js';
import { loginsByDay, summarizeSecurity, listSecurityEvents } from '../../core/security-log.js';
import { ROLE_INFO, ROLES } from '../../config/roles.js';
import { INTEGRATIONS, SENSORS } from '../../data/demo/records.js';
import { userSummary } from '../../services/users-service.js';
import { dataOf, header, page, strip } from '../support.js';

/**
 * Painel administrativo (RF08/RF11/RF12).
 * Indicadores de governança, disponibilidade e segurança do sistema.
 */
export function adminDashboard(context) {
  const users = context.state.users ?? [];
  const summary = userSummary(users);
  const security = summarizeSecurity(listSecurityEvents());
  const thingspeak = dataOf(context, 'thingspeak');
  const models = dataOf(context, 'models') ?? [];
  const activeSensors = SENSORS.filter((sensor) => sensor.active).length;
  const accessSeries = loginsByDay();
  const hasAccessData = accessSeries.some((bucket) => bucket.value > 0);
  const recentActivity = (context.state.auditLogs ?? []).slice(0, 5);

  return page(
    header(context, {
      title: 'Dashboard Administrativo',
      subtitle: 'Governança de usuários, segurança e disponibilidade da plataforma',
      varietyMode: 'hidden',
      actions: [
        button('Atualizar indicadores', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' }),
        button('Exportar segurança', { variant: 'ghost', iconName: 'download', action: 'export-report', dataset: { report: 'security' } }),
      ],
    }),
    strip(context, {
      extra: `${summary.total} conta(s) · ${activeSensors}/${SENSORS.length} sensores ativos`,
      loadingLabel: 'Verificando integrações…',
    }),
    html`<div class="metrics-grid four">
      <div class="card metric"><div class="metric-icon tone-green">${icon('users')}</div><div class="metric-copy"><span>Usuários ativos</span><strong>${formatNumber(summary.active)}</strong><small>${summary.pending} aguardando aprovação</small></div></div>
      <div class="card metric"><div class="metric-icon tone-orange">${icon('lock')}</div><div class="metric-copy"><span>Contas bloqueadas</span><strong>${formatNumber(summary.blocked)}</strong><small class="${summary.blocked ? 'negative' : 'neutral'}">${summary.blocked ? 'Requer revisão' : 'Nenhuma pendência'}</small></div></div>
      <div class="card metric"><div class="metric-icon tone-blue">${icon('activity')}</div><div class="metric-copy"><span>Acessos registrados</span><strong>${formatNumber(security.logins)}</strong><small>${security.failures} falha(s) de autenticação</small></div></div>
      <div class="card metric"><div class="metric-icon tone-purple">${icon('shield')}</div><div class="metric-copy"><span>Incidentes críticos</span><strong>${formatNumber(security.incidents)}</strong><small>${security.blocked} acesso(s) bloqueado(s) pelo RBAC</small></div></div>
    </div>`,
    html`<div class="services">${INTEGRATIONS.slice(0, 4).map((integration) => {
      const isThingSpeak = integration.id === 'thingspeak';
      const status = isThingSpeak ? thingspeak?.statusLabel ?? integration.status : integration.status;
      const tone = isThingSpeak && thingspeak && !thingspeak.configured ? 'warning' : 'success';
      return card(
        html`<div class="service-icon tone-${integration.id === 'database' ? 'blue' : integration.id === 'market' ? 'purple' : 'green'}">${icon(integration.icon)}</div>
          <div><span>${integration.name}</span><strong>${status}</strong></div>${badge(integration.metric, tone)}`,
        'service-card',
      );
    })}</div>`,
    html`<div class="grid-2">
      ${card(
        html`<div class="card-title"><div><h3>Acessos autenticados</h3><p>Sessões registradas na trilha de segurança — últimos 7 dias</p></div>${badge(`${security.logins} login(s)`, 'info')}</div>
          ${hasAccessData
            ? barChart({ values: accessSeries.map((bucket) => bucket.value), labels: accessSeries.map((bucket) => bucket.label) })
            : html`<div class="chart-empty">${icon('shield', 26)}<span>Nenhum login registrado nesta sessão do navegador. Entre com outros perfis de demonstração para popular a trilha de segurança.</span></div>`}`,
        'chart-card',
      )}
      ${card(
        html`<div class="card-title"><div><h3>Usuários por perfil</h3><p>Distribuição das ${formatNumber(summary.total)} contas cadastradas</p></div></div>
          ${donutChart({
            total: formatNumber(summary.total),
            caption: 'contas',
            segments: [
              { label: ROLE_INFO[ROLES.PRODUCER].label, value: summary.byRole[ROLES.PRODUCER], tone: 1 },
              { label: ROLE_INFO[ROLES.ANALYST].label, value: summary.byRole[ROLES.ANALYST], tone: 2 },
              { label: ROLE_INFO[ROLES.ADMIN].label, value: summary.byRole[ROLES.ADMIN], tone: 3 },
            ],
          })}`,
        'chart-card',
      )}
    </div>`,
    card(
      html`${sectionHead({
        title: 'Atividade recente',
        subtitle: 'Eventos administrativos e operacionais relevantes',
        action: button('Ver todos os logs', { variant: 'ghost', action: 'navigate-to', dataset: { page: 'admin/logs' } }),
      })}
      <div class="activity-list">${recentActivity.map(
        (entry) => html`<div>
          <span class="activity-symbol tone-${entry.level === 'warning' ? 'gold' : 'green'}">${icon(entry.category === LOG_CATEGORIES.SECURITY ? 'shield' : entry.category === LOG_CATEGORIES.INGESTION ? 'cloud' : 'logs')}</span>
          <div><strong>${entry.action}</strong><span>${entry.detail}</span></div>
          <time>${entry.actor} · ${relativeTime(entry.at)}</time>
        </div>`,
      )}</div>`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Modelos e processos monitorados', subtitle: 'Estado dos componentes que sustentam as previsões' })}
      <div class="kv-list">
        <div><span>Modelos cadastrados</span><strong>${formatNumber(models.length)}</strong></div>
        <div><span>Modelo ativo</span><strong>${models.find((model) => model.status === 'ACTIVE')?.name ?? '—'}</strong></div>
        <div><span>Canal ThingSpeak</span><strong>${thingspeak?.channelId ?? 'não configurado'}</strong></div>
        <div><span>Intervalo de ingestão</span><strong>${thingspeak?.minIntervalSeconds ?? 15}s (RNF11)</strong></div>
        <div><span>Última verificação</span><strong>${relativeTime(context.lastSync)}</strong></div>
      </div>`,
      'table-card',
    ),
  );
}
