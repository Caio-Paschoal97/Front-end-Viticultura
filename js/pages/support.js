/**
 * Apoio comum às páginas (por perfil).
 *
 * Concentra o que todos os módulos de página usam: contêiner `section.page`,
 * cabeçalho, faixa de origem dos dados, recorte por período e formatações
 * derivadas dos DTOs.
 */

import { html } from '../utils/html.js';
import { formatNumber, formatPercent, normalizeText, ratioToPercent, relativeTime } from '../utils/format.js';
import { badge, card, kvList, sectionHead } from '../components/ui.js';
import { pageHeader, syncStrip } from '../components/page-header.js';
import { icon as renderIcon } from '../components/icons.js';
import { sourceLabel } from '../services/data-service.js';

/** Filtros por página (definidos em `js/core/store.js`, reexportados para as telas). */
export { getPageFilter, setPageFilter } from '../core/store.js';

export const page = (...children) => html`<section class="page">${children}</section>`;

/** Acesso ao dado já normalizado (nunca nulo depois do `primeData`). */
export const dataOf = (context, key) => context.state.data[key] ?? null;

/** Cabeçalho da página com seletor de variedade/período. */
export function header(context, { title, subtitle, varietyMode = 'live', actions = null, context: breadcrumb }) {
  return pageHeader({
    title,
    subtitle,
    variety: context.variety,
    period: context.period,
    varietyMode,
    actions,
    context: breadcrumb,
  });
}

/** Faixa de status (API × demonstração) exibida no topo das telas de dados. */
export function strip(context, extra = null) {
  const options = typeof extra === 'string' ? { extra } : extra ?? {};
  return syncStrip({
    source: context.source,
    lastSync: context.lastSync,
    loading: context.loading,
    loadingLabel: options.loadingLabel,
    error: context.state.apiStatus?.error,
    apiBaseUrl: context.state.apiStatus?.baseUrl,
    extra: options.extra ?? null,
  });
}

/* -------------------------------------------------------------- Formatações */

/** Razões do back-end (0–1) → "98,7%" (aceita 98.7 sem duplicar a conversão). */
export const pct = (value, { digits = 1 } = {}) => {
  const percent = ratioToPercent(value);
  return percent === null ? '—' : formatPercent(percent, { digits });
};

/** Classe de cor de uma linha de alerta a partir do enum AlertLevel. */
export const alertToneClass = (level) => (level === 'CRITICAL' ? 'critical' : level === 'WARNING' ? 'warning' : 'info');

export const riskTone = (level) => (level === 'LOW' ? 'success' : level === 'MEDIUM' ? 'warning' : level === 'HIGH' ? 'danger' : 'neutral');

export const countBy = (items, selector) =>
  items.reduce((accumulator, item) => {
    const key = selector(item);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

/**
 * Recorte por período das séries devolvidas pela API.
 * As rotas atuais entregam 24 h por consulta (`/readings/current`,
 * `/dashboard/overview`); períodos maiores são marcados como truncados para não
 * dar a impressão de que existe histórico onde ainda não existe.
 */
export function sliceByPeriod(series = [], period = '24h') {
  const hours = period === '7d' ? 24 * 7 : period === '30d' ? 24 * 30 : 24;
  const sorted = [...series].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const last = sorted[sorted.length - 1];
  if (!last || !last.timestamp) return { series: sorted, truncated: false };
  const limit = new Date(last.timestamp).getTime() - hours * 3600000;
  const windowed = sorted.filter((point) => new Date(point.timestamp).getTime() >= limit);
  return { series: windowed, truncated: period !== '24h' && sorted.length === windowed.length && sorted.length > 0 };
}

export const periodLabel = (period) => (period === '7d' ? 'Últimos 7 dias' : period === '30d' ? 'Últimos 30 dias' : 'Últimas 24 horas');

/* ---------------------------------------------------------------- Cartões */

export const metricCard = ({ icon, label, value, meta, tone = 'green', metaTone }) =>
  html`<div class="card metric">
    <div class="metric-icon tone-${tone}">${renderIcon(icon, 20)}</div>
    <div class="metric-copy"><span>${label}</span><strong>${value}</strong>${meta ? html`<small class="${metaTone ?? ''}">${meta}</small>` : ''}</div>
  </div>`;

export const metricsRow = (items, modifier = '') => html`<div class="metrics-grid ${modifier}">${items.map(metricCard)}</div>`;

export const spotlightCard = ({ overline, title, headline, description, footer, className = '', iconName, tone = 'green' }) =>
  card(
    html`${overline ? html`<span class="overline">${overline}</span>` : ''}
      ${iconName ? html`<div class="insight-mark tone-${tone}">${renderIcon(iconName, 24)}</div>` : ''}
      ${title ? html`<h3>${title}</h3>` : ''}
      ${headline ? html`<strong class="headline">${headline}</strong>` : ''}
      ${description ? html`<p>${description}</p>` : ''}
      ${footer ?? ''}`,
    className,
  );

export const keyValues = (items, { rows = false } = {}) => kvList(items, { rows });

export const blockHead = (title, subtitle, action) => sectionHead({ title, subtitle, action });

/** Selo indicando a origem do recurso ("Dados da API" / "Dados demonstrativos"). */
export const sourceLine = (context, keys = []) => {
  const source = keys.length === 0 ? context.source : context.source ?? 'demo';
  return badge(sourceLabel(source), source === 'api' ? 'success' : source === 'mixed' ? 'warning' : 'warning');
};

/* ------------------------------------------------------- Utilidades de DTO */

/** Localiza uma métrica do `DashboardOverviewResponse` pelo rótulo. */
export const findMetric = (metrics = [], keyword) =>
  metrics.find((metric) => normalizeText(metric.label).includes(normalizeText(keyword))) ?? null;

export const metricValue = (metric, fallback = '—') => (metric ? `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}` : fallback);

export const metricHint = (metric, fallback = 'Sem leitura do back-end') => metric?.trend ?? fallback;

export const numberOrDash = (value, digits = 1) => (value === null || value === undefined ? '—' : formatNumber(value, { digits }));

export const percentOrDash = (value) => (value === null || value === undefined ? '—' : formatPercent(value));

export const ratioPercent = (value) => pct(value);

export const ago = (value) => (value ? relativeTime(value) : '—');

export { badge, card, sectionHead, sourceLabel };
