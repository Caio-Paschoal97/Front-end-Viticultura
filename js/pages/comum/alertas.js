import { html } from '../../utils/html.js';
import { formatDateTime, formatNumber, relativeTime } from '../../utils/format.js';
import { badge, button, card, chips, emptyState, sectionHead } from '../../components/ui.js';
import { icon } from '../../components/icons.js';
import { ALERT_CATEGORY_MAP, ALERT_LEVEL_MAP } from '../../core/contracts.js';
import { getPageFilter, setPageFilter } from '../../core/store.js';
import { alertToneClass, countBy, dataOf, header, page, strip } from '../support.js';

/**
 * Central de alertas (RF09) — compartilhada por produtor e analista.
 * Os alertas vêm de `GET /alerts` (enum AlertCategory/AlertLevel do back-end).
 */
export function alertsPage(context) {
  const alerts = dataOf(context, 'alerts') ?? [];
  const category = getPageFilter(context.page, 'category', 'todas');
  const level = getPageFilter(context.page, 'level', 'todos');
  const resolved = context.state.resolvedAlerts ?? [];

  const decorated = alerts.map((alert) => ({
    ...alert,
    resolved: alert.resolved || resolved.includes(alert.id),
  }));

  const filtered = decorated.filter((alert) => {
    if (category !== 'todas' && alert.category !== category) return false;
    if (level !== 'todos' && alert.level !== level) return false;
    return true;
  });

  const byCategory = countBy(decorated, (alert) => alert.category);
  const byLevel = countBy(decorated, (alert) => alert.level);
  const openCount = decorated.filter((alert) => !alert.resolved).length;
  const criticalCount = decorated.filter((alert) => alert.severity === 'critical' && !alert.resolved).length;

  const categoryChips = [
    { value: 'todas', label: 'Todos', count: decorated.length },
    ...Object.entries(ALERT_CATEGORY_MAP).map(([value, info]) => ({ value, label: info.label, count: byCategory[value] ?? 0 })),
  ];
  const levelChips = [
    { value: 'todos', label: 'Todos os níveis' },
    ...Object.entries(ALERT_LEVEL_MAP).map(([value, info]) => ({ value, label: info.label, count: byLevel[value] ?? 0 })),
  ];

  return page(
    header(context, {
      title: 'Central de Alertas',
      subtitle: 'Priorize eventos climáticos, de colheita, de mercado e do sistema identificados automaticamente',
      varietyMode: 'hidden',
      actions: [
        button('Atualizar alertas', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' }),
        button('Exportar', { variant: 'ghost', iconName: 'download', action: 'export-report', dataset: { report: 'forecast' } }),
      ],
    }),
    strip(context, {
      extra: `${openCount} alerta(s) em aberto · ${criticalCount} crítico(s)`,
      loadingLabel: 'Consultando /alerts…',
    }),
    html`<div class="metrics-grid four">
      <div class="card metric"><div class="metric-icon tone-blue">${icon('bell')}</div><div class="metric-copy"><span>Alertas no período</span><strong>${formatNumber(decorated.length)}</strong><small>Fonte: GET /alerts</small></div></div>
      <div class="card metric"><div class="metric-icon tone-red">${icon('alert-triangle')}</div><div class="metric-copy"><span>Em aberto</span><strong>${formatNumber(openCount)}</strong><small>Requerem ação ou ciência</small></div></div>
      <div class="card metric"><div class="metric-icon tone-gold">${icon('warning')}</div><div class="metric-copy"><span>Atenção</span><strong>${formatNumber(byLevel.WARNING ?? 0)}</strong><small>Desvios dentro do tolerável</small></div></div>
      <div class="card metric"><div class="metric-icon tone-green">${icon('check-circle')}</div><div class="metric-copy"><span>Resolvidos</span><strong>${formatNumber(decorated.length - openCount)}</strong><small>Marcados como tratados</small></div></div>
    </div>`,
    chips({ items: categoryChips, active: category, action: 'set-filter', name: 'category' }),
    html`<div style="margin:14px 0 16px">${chips({ items: levelChips, active: level, action: 'set-filter', name: 'level' })}</div>`,
    filtered.length === 0
      ? card(
          emptyState({
            iconName: 'check-circle',
            title: 'Nenhum alerta para este filtro',
            message: 'Todas as condições monitoradas estão dentro da faixa esperada.',
            action: button('Ver todos os alertas', { variant: 'ghost', action: 'reset-filters' }),
          }),
          'table-card',
        )
      : html`<div class="alerts-list">${filtered.map(
          (alert) => card(
            html`<div class="alert-icon">${icon(alert.icon)}</div>
              <div>
                <div>${badge(alert.levelLabel, alert.tone === 'critical' ? 'danger' : alert.tone === 'warning' ? 'warning' : 'info')}<span>${alert.categoryLabel} · ${alert.source}</span></div>
                <h3>${alert.title}</h3>
                <p>${alert.message}</p>
                <p class="helper">${formatDateTime(alert.createdAt)}</p>
              </div>
              <div class="alert-time">
                <span>${relativeTime(alert.createdAt)}</span>
                ${alert.resolved
                  ? badge('Resolvido', 'success')
                  : button('Marcar como resolvido', { variant: 'ghost', action: 'resolve-alert', dataset: { alert: alert.id } })}
              </div>`,
            `alert-row ${alertToneClass(alert.level)} ${alert.resolved ? 'alert-resolved' : ''}`,
          ),
        )}</div>`,
    card(
      html`${sectionHead({ title: 'Como os alertas são gerados', subtitle: 'Regras automáticas do back-end + previsões do modelo' })}
      <div class="policy-list">
        <div>${icon('thermo', 18)}<div><strong>Limites climáticos</strong><p><span class="mono">AlertService.evaluate_reading</span> dispara alerta crítico acima de 35 °C e aviso quando a umidade fica abaixo de 35%.</p></div>${badge('CLIMATE', 'info')}</div>
        <div>${icon('leaf', 18)}<div><strong>Janela de colheita</strong><p>Quando o motor preditivo identifica condições ideais para a variedade selecionada, publica uma recomendação do tipo <span class="mono">HARVEST</span>.</p></div>${badge('HARVEST', 'success')}</div>
        <div>${icon('market', 18)}<div><strong>Oportunidade de mercado</strong><p>Aumento de preço ou de demanda acima do esperado gera alerta <span class="mono">MARKET</span> para antecipar o embarque.</p></div>${badge('MARKET', 'purple')}</div>
        <div>${icon('settings', 18)}<div><strong>Sistema e integrações</strong><p>Falhas de sincronização, atraso de ingestão ou descarte de leituras geram alerta <span class="mono">SYSTEM</span>.</p></div>${badge('SYSTEM', 'warning')}</div>
      </div>`,
      'table-card',
    ),
  );
}

export { setPageFilter };
