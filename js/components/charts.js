/**
 * Gráficos em SVG/HTML puro (sem bibliotecas externas — RNF07).
 *
 * As séries recebidas têm o formato normalizado em `js/core/contracts.js`
 * (`[{ timestamp, value }]`), mas os componentes também aceitam números soltos,
 * o que simplifica o uso nas telas que só têm contagens.
 */

import { html, trusted } from '../utils/html.js';
import { formatHour, formatNumber, isNumber, formatShortDate } from '../utils/format.js';

const WIDTH = 720;
const PAD = { top: 18, right: 20, bottom: 30, left: 46 };

const asNumber = (point) => (isNumber(point) ? point : isNumber(point?.value) ? point.value : null);

const seriesValues = (series = []) => series.flatMap((item) => (item?.data ?? []).map(asNumber)).filter((value) => value !== null);

const niceExtent = (values) => {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * 0.12;
  return { min: min - pad, max: max + pad };
};

const yFor = (value, { min, max }, height) => {
  const ratio = (value - min) / (max - min || 1);
  return height - PAD.bottom - ratio * (height - PAD.top - PAD.bottom);
};

const xFor = (index, count, width) => {
  if (count <= 1) return PAD.left + (width - PAD.left - PAD.right) / 2;
  return PAD.left + (index / (count - 1)) * (width - PAD.left - PAD.right);
};

const labelFor = (point, index, labels) => {
  if (labels && labels[index] !== undefined) return labels[index];
  if (!point || typeof point === 'number') return '';
  const date = point.timestamp ?? point.label ?? null;
  if (!date) return '';
  return new Date(date).getHours() === 0 ? formatShortDate(date) : formatHour(date);
};

const tickValues = ({ min, max }) => Array.from({ length: 4 }, (_, index) => min + ((max - min) * index) / 3);

export const chartEmpty = (message = 'Sem dados no período') =>
  html`<div class="chart-empty">${trusted('<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19h16M4 15l5-5 4 3 7-8"/></svg>')}<span>${message}</span></div>`;

/**
 * Gráfico de linhas com preenchimento opcional.
 * `series`: [{ data: [{ timestamp, value }] | number[], tone: 'chart-1' }]
 */
export function lineChart({ series = [], labels, unit = '', height = 230, area = true, emptyMessage = 'Sem dados no período' } = {}) {
  const values = seriesValues(series);
  if (values.length === 0) return chartEmpty(emptyMessage);

  const extent = niceExtent(values);
  const width = WIDTH;
  const gridLines = tickValues(extent).map(
    (tick) => `<line x1="${PAD.left}" y1="${yFor(tick, extent, height).toFixed(1)}" x2="${width - PAD.right}" y2="${yFor(tick, extent, height).toFixed(1)}" class="gridline"/><text x="${PAD.left - 8}" y="${(yFor(tick, extent, height) + 4).toFixed(1)}" class="axis-text" text-anchor="end">${formatNumber(tick, { digits: 1 })}</text>`,
  );

  const paths = series
    .filter((item) => (item?.data ?? []).length > 0)
    .map((item) => {
      const count = item.data.length;
      const coordinates = item.data.map((point, index) => {
        const value = asNumber(point);
        return { x: xFor(index, count, width), y: yFor(value ?? extent.min, extent, height) };
      });
      const line = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
      const tone = item.tone ?? 'chart-1';
      const areaPath = area
        ? `<path d="${line} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${height - PAD.bottom} L ${coordinates[0].x.toFixed(1)} ${height - PAD.bottom} Z" class="area-fill ${tone}-fill"/>`
        : '';
      const dots = coordinates.length <= 24
        ? coordinates.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.4" class="series-dot ${tone}"/>`).join('')
        : '';
      return `${areaPath}<path d="${line}" class="line-path ${tone}" fill="none"/>${dots}`;
    })
    .join('');

  const primary = series.find((item) => (item?.data ?? []).length > 0)?.data ?? [];
  const axisLabels = [0, Math.floor((primary.length - 1) / 2), primary.length - 1]
    .filter((index, position, list) => index >= 0 && list.indexOf(index) === position)
    .map(
      (index) =>
        `<text x="${xFor(index, primary.length, width).toFixed(1)}" y="${height - 8}" class="axis-text" text-anchor="${index === 0 ? 'start' : index === primary.length - 1 ? 'end' : 'middle'}">${labelFor(primary[index], index, labels)}</text>`,
    )
    .join('');

  const svg = `<svg viewBox="0 0 ${width} ${height}" class="line-chart" role="img" aria-label="Série temporal${unit ? ` em ${unit}` : ''}" preserveAspectRatio="none">
    <g class="gridlines">${gridLines.join('')}</g>
    ${paths}
    ${axisLabels}
  </svg>`;

  return html`<div class="chart-wrap">${trusted(svg)}</div>`;
}

/** Barras verticais (divs — herdam o tema sem recalcular SVG). */
export function barChart({ values = [], labels = [], unit = '', max = null }) {
  const numbers = values.map((value) => (isNumber(value) ? value : 0));
  if (numbers.length === 0 || numbers.every((value) => value === 0)) return chartEmpty();
  const ceiling = max ?? Math.max(...numbers) * 1.1;

  return html`<div class="bar-chart">${numbers.map(
    (value, index) => html`<div class="bar-col">
      <span class="bar-value">${formatNumber(value, { digits: 0 })}</span>
      <div class="bar" style="height:${Math.max(3, (value / ceiling) * 100).toFixed(1)}%"></div>
      <span class="bar-label">${labels[index] ?? ''}</span>
    </div>`,
  )}</div>${unit ? html`<p class="helper">Valores em ${unit}</p>` : ''}`;
}

/** Barras horizontais com rótulo, valor e trilho — usada em rankings e mercados. */
export function barsHorizontal({ items = [], unit = '', max = null }) {
  if (items.length === 0) return chartEmpty();
  const ceiling = max ?? (Math.max(...items.map((item) => Number(item.value) || 0)) * 1.05 || 1);
  return html`<div class="bars-horizontal">${items.map(
    (item) => html`<div class="bar-row">
      <span class="bar-label">${item.label}</span>
      <div class="track"><i style="width:${Math.max(2, ((Number(item.value) || 0) / ceiling) * 100).toFixed(1)}%" class="${item.tone ? `tone-${item.tone}` : ''}"></i></div>
      <strong>${item.display ?? formatNumber(item.value, { digits: item.digits ?? 0 })}${unit ? html` <small>${unit}</small>` : ''}</strong>
    </div>`,
  )}</div>`;
}

/** Rosca com legenda (participação por perfil, categoria etc.). */
export function donutChart({ total, caption = '', segments = [] }) {
  const values = segments.map((segment) => Math.max(0, Number(segment.value) || 0));
  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  if (sum === 0) return chartEmpty('Sem dados para distribuir');

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = segments
    .map((segment, index) => {
      const share = values[index] / sum;
      const length = share * circumference;
      const arc = `<circle cx="70" cy="70" r="${radius}" fill="none" stroke-width="18" class="tone-${index + 1}" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 70 70)"/>`;
      offset += length;
      return arc;
    })
    .join('');

  return html`<div class="donut-wrap">
    <div class="donut">
      ${trusted(`<svg viewBox="0 0 140 140" role="img" aria-label="Distribuição">${arcs}</svg>`)}
      <div class="donut-center"><strong>${total ?? formatNumber(sum)}</strong><span>${caption}</span></div>
    </div>
    <div class="donut-labels">${segments.map(
      (segment, index) => html`<div><span class="series-dot tone-${index + 1}"></span>${segment.label}<strong>${formatNumber(segment.value)}</strong></div>`,
    )}</div>
  </div>`;
}

export const chartLegend = (items = []) =>
  html`<div class="chart-legend">${items.map(
    (item) => html`<span><i class="series-dot ${item.tone ?? 'chart-1'}"></i>${item.label}</span>`,
  )}</div>`;

/** Minigráfico para cartões de métrica (sem eixos). */
export const sparkline = (values = [], { highlightLast = true } = {}) => {
  const numbers = values.map((value) => (isNumber(value) ? value : 0));
  if (numbers.length < 2) return html``;
  const width = 120;
  const height = 34;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const coordinates = numbers.map((value, index) => ({
    x: (index / (numbers.length - 1)) * width,
    y: height - ((value - min) / (max - min || 1)) * (height - 6) - 3,
  }));
  const line = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const last = coordinates[coordinates.length - 1];
  return html`<span class="sparkline">${trusted(
    `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${line}" fill="none" class="chart-1" stroke-width="2"/>${highlightLast ? `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3" class="series-dot chart-1"/>` : ''}</svg>`,
  )}</span>`;
};

/** Linha do tempo vertical (pipelines, arquitetura, etapas de limpeza). */
export const timeline = (steps = []) =>
  html`<ol class="timeline">${steps.map(
    (step) => html`<li class="timeline-card ${step.done ? 'done' : ''}">
      <span class="timeline-mark">${step.index ?? ''}</span>
      <div><strong>${step.title}</strong><p>${step.description}</p>${step.meta ? html`<small>${step.meta}</small>` : ''}</div>
    </li>`,
  )}</ol>`;
