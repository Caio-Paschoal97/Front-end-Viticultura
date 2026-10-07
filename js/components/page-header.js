/**
 * Cabeçalho padrão das páginas + faixas de status (fonte de dados e ThingSpeak).
 *
 * `varietyMode` controla o seletor de variedade:
 *  - 'hidden'  → a tela é global (admin) e não mostra variedade;
 *  - 'live'    → o seletor altera a variedade de todo o painel;
 *  - 'locked'  → mostra a variedade atual, sem permitir troca.
 */

import { html } from '../utils/html.js';
import { findVariety, VARIETIES } from '../data/catalog.js';
import { apiHostLabel } from '../config/env.js';
import { icon } from './icons.js';
import { badge, selectField, sourceBadge } from './ui.js';

const PERIOD_OPTIONS = [
  { value: '24h', label: 'Últimas 24 horas' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
];

function varietySelector(varietyName, { locked }) {
  const current = findVariety(varietyName);
  return html`<div class="variety-selector">
    <div class="grape-dot" style="background:var(--grape-${current.color ?? 'purple'})"></div>
    ${selectField({
      label: 'Variedade analisada',
      value: varietyName,
      options: VARIETIES.map((variety) => ({ value: variety.name, label: variety.name })),
      action: locked ? undefined : 'change-variety',
    })}
    <div class="variety-type">${current.type}</div>
  </div>`;
}

export function pageHeader({ title, subtitle, variety = null, period = '24h', varietyMode = 'live', actions = null, context = null }) {
  return html`<header class="page-heading">
    <div>
      <div class="eyebrow">AgroClima Cloud <span>/</span> ${context ?? title}</div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="page-filters">
      ${varietyMode !== 'hidden' && variety ? varietySelector(variety, { locked: varietyMode === 'locked' }) : ''}
      <div class="field compact">${selectField({ label: 'Período', value: period, options: PERIOD_OPTIONS, action: 'change-period' })}</div>
    </div>
    ${actions ? html`<div class="page-actions">${actions}</div>` : ''}
  </header>`;
}

/**
 * Faixa de status da origem dos dados.
 * Deixa explícito se a tela está com dados da API real ou demonstrativos — o
 * fallback nunca é silencioso (requisito de transparência dos dados).
 */
export function syncStrip({ source = 'demo', lastSync = null, loading = false, loadingLabel = 'Consultando a API…', error = null, apiBaseUrl, extra = null }) {
  const isApi = source === 'api';
  const relative = lastSync ? new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;

  return html`<div class="sync-strip${isApi ? '' : ' demo'}">
    <div>
      ${icon(isApi ? 'cloud' : 'wifi-off', 17)}
      <strong>${isApi ? 'API AgroClima conectada' : 'Modo demonstração'}</strong>
      <span>${isApi
        ? `Dados do back-end (${apiBaseUrl ?? apiHostLabel()})${relative ? ` · sincronizado às ${relative}` : ''}`
        : `API indisponível em ${apiBaseUrl ?? apiHostLabel()} — exibindo dados simulados${error ? ` (${error})` : ''}`}</span>
      ${extra ? html`<span>· ${extra}</span>` : ''}
    </div>
    <div class="flex-center">
      ${loading ? html`<span class="flex-center"><i class="loading-dot"></i><span class="text-muted">${loadingLabel}</span></span>` : ''}
      ${sourceBadge(source)}
    </div>
  </div>`;
}

/** Faixa específica do canal ThingSpeak (monitoramento/integrações). */
export function thingSpeakStrip({ status, lastSync, readingCount, source = 'demo' }) {
  return html`<div class="integration-status">
    <div class="thing-logo">${icon('cloud', 22)}</div>
    <div><span>Fonte de dados IoT</span><strong>${status.provider} · Channel Feeds</strong></div>
    ${badge(status.statusLabel, status.tone)}
    <div class="status-detail"><span>Canal</span><strong>${status.channelId ?? 'não configurado'}</strong></div>
    <div class="status-detail"><span>Última sincronização</span><strong>${lastSync ? new Date(lastSync).toLocaleTimeString('pt-BR') : '—'}</strong></div>
    <div class="status-detail"><span>Leituras no ciclo</span><strong>${readingCount ?? '—'}</strong></div>
    <div class="status-detail"><span>Intervalo mínimo</span><strong>${status.minIntervalSeconds}s (RNF11)</strong></div>
    <div class="status-detail"><span>Origem</span><strong>${source === 'api' ? 'API REST' : 'Demonstração'}</strong></div>
  </div>`;
}
