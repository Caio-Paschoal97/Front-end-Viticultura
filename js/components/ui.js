/**
 * Biblioteca de componentes visuais (RNF09 — reaproveitamento e padronização).
 *
 * Todo componente devolve marcação `SafeHtml` já escapada pelo template `html`
 * e fala com a aplicação apenas por `data-action`/`data-form` — nenhum deles
 * conhece o store (ver `js/events/index.js`).
 */

import { html } from '../utils/html.js';
import { icon } from './icons.js';

/* ------------------------------------------------------------------ Botões */

export function button(children, { variant = 'primary', iconName, type = 'button', action, disabled = false, title, dataset = {}, size } = {}) {
  const dataAttributes = Object.entries(dataset).map(([key, value]) => html` data-${key}="${value}"`);
  return html`<button
    type="${type}"
    class="btn btn-${variant}${size ? ` btn-${size}` : ''}"
    ${action ? html`data-action="${action}"` : ''}
    ${disabled ? 'disabled' : ''}
    ${title ? html`title="${title}"` : ''}
    ${dataAttributes}
  >${iconName ? icon(iconName, 16) : ''}<span>${children}</span></button>`;
}

export const iconButton = (iconName, { action, label, title = label, dataset = {}, active = false } = {}) =>
  html`<button type="button" class="icon-btn${active ? ' active' : ''}"${action ? html` data-action="${action}"` : ''}${Object.entries(dataset).map(([key, value]) => html` data-${key}="${value}"`)} aria-label="${title}" title="${title}">${icon(iconName, 18)}</button>`;

/* ------------------------------------------------------------------ Selos */

export const badge = (children, tone = 'success') => html`<span class="badge badge-${tone}"><span class="status-dot"></span>${children}</span>`;

export const plainBadge = (children, tone = 'neutral') => html`<span class="badge badge-${tone}">${children}</span>`;

/** Selo da origem dos dados: API real, demonstração ou mistura das duas. */
export function sourceBadge(source) {
  if (source === 'api') return badge('API conectada', 'success');
  if (source === 'mixed') return badge('Dados parciais', 'warning');
  return badge('Modo demonstração', 'warning');
}

/* ----------------------------------------------------------------- Cartões */

export const card = (children, className = '') => html`<div class="card ${className}">${children}</div>`;

export const sectionHead = ({ title, subtitle, action }) =>
  html`<div class="section-head"><div><h3>${title}</h3>${subtitle ? html`<p>${subtitle}</p>` : ''}</div>${action ?? ''}</div>`;

export const chartCard = ({ title, subtitle, legend, content, action }) =>
  card(
    html`<div class="card-title"><div><h3>${title}</h3>${subtitle ? html`<p>${subtitle}</p>` : ''}</div>${action ?? ''}</div>${legend ?? ''}${content}`,
    'chart-card',
  );

/* --------------------------------------------------------------- Métricas */

export const metric = ({ iconName, label, value, meta, trend, tone = 'green' }) =>
  html`<div class="card metric">
    <div class="metric-icon tone-${tone}">${icon(iconName, 20)}</div>
    <div class="metric-copy"><span>${label}</span><strong>${value}</strong>${meta ? html`<small class="${trend ?? ''}">${meta}</small>` : ''}</div>
  </div>`;

export const metricsGrid = (metrics, modifier = '') => html`<div class="metrics-grid ${modifier}">${metrics.map(metric)}</div>`;

export const progressBar = (value, tone = '') => html`<div class="progress ${tone}"><i style="width:${Math.max(0, Math.min(100, Number(value) || 0))}%"></i></div>`;

/* ---------------------------------------------------------------- Campos */

export function selectField({ value, options, label, action, name, dataset = {}, wide = false }) {
  const normalized = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
  const optionsMarkup = normalized.map((option) => html`<option value="${option.value}"${option.value === value ? html` selected` : ''}>${option.label}</option>`);
  const behavior = action ? html`data-action="${action}"` : html`data-locked-value="${value}"`;
  const dataAttributes = Object.entries(dataset).map(([key, item]) => html` data-${key}="${item}"`);
  return html`<label class="field compact${wide ? ' wide' : ''}">${label ? html`<span>${label}</span>` : ''}<select${name ? html` name="${name}"` : ''} ${behavior}${dataAttributes}>${optionsMarkup}</select></label>`;
}

export const inputField = ({ label, name, value = '', type = 'text', placeholder = '', hint, autocomplete, readonly = false, full = false, min, max, step, action, dataset = {} }) =>
  html`<label class="field${full ? ' full' : ''}">${label ? html`<span>${label}</span>` : ''}<input
    type="${type}"
    ${name ? html` name="${name}"` : ''}
    value="${value}"
    ${placeholder ? html` placeholder="${placeholder}"` : ''}
    ${autocomplete ? html` autocomplete="${autocomplete}"` : ''}
    ${readonly ? 'readonly' : ''}
    ${min !== undefined ? html` min="${min}"` : ''}
    ${max !== undefined ? html` max="${max}"` : ''}
    ${step !== undefined ? html` step="${step}"` : ''}
    ${action ? html` data-action="${action}"` : ''}
    ${Object.entries(dataset).map(([key, item]) => html` data-${key}="${item}"`)}
  />${hint ? html`<small class="field-hint">${hint}</small>` : ''}</label>`;

export const textareaField = ({ label, name, value = '', full = true, placeholder = '' }) =>
  html`<label class="field${full ? ' full' : ''}">${label ? html`<span>${label}</span>` : ''}<textarea${name ? html` name="${name}"` : ''}${placeholder ? html` placeholder="${placeholder}"` : ''}>${value}</textarea></label>`;

export const switchField = ({ label, name, checked = false, action, hint, dataset = {} }) =>
  html`<label class="switch"><input type="checkbox"${name ? html` name="${name}"` : ''}${checked ? html` checked` : ''}${action ? html` data-action="${action}"` : ''}${Object.entries(dataset).map(([key, value]) => html` data-${key}="${value}"`)} /><span>${label}</span>${hint ? html`<small class="field-hint">${hint}</small>` : ''}</label>`;

export const rangeField = ({ label, name, value, min, max, step = 1, unit = '' }) =>
  html`<div class="field"><span>${label}</span><div class="range-row"><input type="range" name="${name}" value="${value}" min="${min}" max="${max}" step="${step}" data-action="live-range" /><output data-range-output="${name}">${value}${unit}</output></div></div>`;

/* ------------------------------------------------------------ Listas / KV */

export const kvList = (items, { rows = false } = {}) =>
  html`<div class="kv-list${rows ? ' rows' : ''}">${items.map((item) => html`<div><span>${item.label}</span><strong>${item.value}</strong></div>`)}</div>`;

export const emptyState = ({ iconName = 'info', title, message, action }) =>
  html`<div class="empty-state">${icon(iconName, 30)}<strong>${title}</strong>${message ? html`<p>${message}</p>` : ''}${action ?? ''}</div>`;

export const banner = ({ tone = 'info', iconName = 'info', title, message, action }) =>
  html`<div class="banner ${tone}">${icon(iconName, 22)}<div><strong>${title}</strong><p>${message}</p></div>${action ?? ''}</div>`;

/* ----------------------------------------------------------------- Abas */

export const tabs = ({ items, active, action = 'change-tab' }) =>
  html`<div class="tabs" role="tablist">${items.map(
    (item) => html`<button type="button" role="tab" aria-selected="${item.id === active}" class="${item.id === active ? 'active' : ''}" data-action="${action}" data-tab="${item.id}">${item.iconName ? icon(item.iconName, 15) : ''}<span>${item.label}</span></button>`,
  )}</div>`;

export const chips = ({ items, active, action, name = 'filter' }) =>
  html`<div class="chips">${items.map(
    (item) => html`<button type="button" class="chip ${item.value === active ? 'active' : ''}" data-action="${action}" data-${name}="${item.value}">${item.label}${item.count !== undefined ? html` <span class="count">${item.count}</span>` : ''}</button>`,
  )}</div>`;

/* ---------------------------------------------------------------- Modais */

export const modal = ({ title, subtitle, body, footer, onClose = 'close-modal' }) =>
  html`<div class="modal-backdrop" data-action="backdrop-close">
    <div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-head"><div><h2>${title}</h2>${subtitle ? html`<p>${subtitle}</p>` : ''}</div>${iconButton('close', { action: onClose, label: 'Fechar' })}</div>
      <div class="modal-body">${body}</div>
      ${footer ? html`<div class="modal-foot">${footer}</div>` : ''}
    </div>
  </div>`;

export const toastStack = (toasts) =>
  html`<div class="toast-stack" aria-live="polite">${toasts.map(
    (toast) => html`<div class="toast ${toast.tone ?? ''}" data-action="dismiss-toast" data-toast="${toast.id}"><strong>${toast.title}</strong><span>${toast.message}</span></div>`,
  )}</div>`;

/* ------------------------------------------------------------------- Logo */

export const logo = ({ light = false } = {}) =>
  html`<div class="logo ${light ? 'logo-light' : ''}"><div class="logo-mark">${icon('leaf', 21)}</div><div><strong>AgroClima</strong><span>Cloud</span></div></div>`;
