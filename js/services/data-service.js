/**
 * Camada de dados (RF02/RF05/RF07/RF10).
 *
 * Cada recurso declara três coisas: como buscar na API (`fetch`), como montar o
 * dado demonstrativo equivalente (`demo`) e como normalizar o payload do
 * back-end (`normalize`). O mesmo normalizador processa API e demonstração — se
 * o contrato mudar, os dois caminhos quebram juntos (e os testes acusam).
 *
 * Estratégia de carregamento:
 *  1. `primeData` preenche o estado de forma SÍNCRONA (cache ou demo) para a tela
 *     aparecer preenchida na primeira pintura;
 *  2. `ensureData` consulta a API em paralelo; o que responder vira `source:
 *     'api'`, o que falhar permanece demonstrativo e o evento fica registrado
 *     em segurança (fallback explícito, sem esconder a indisponibilidade).
 */

import { ENV, getApiBaseUrl } from '../config/env.js';
import { api } from '../core/api-client.js';
import {
  normalizeAlerts,
  normalizeForecast,
  normalizeMarket,
  normalizeModels,
  normalizeOverview,
  normalizeQuality,
  normalizeReadings,
  normalizeTestReport,
  normalizeThingSpeakStatus,
  normalizeVarietySummaries,
} from '../core/contracts.js';
import { classifyReading } from '../core/data-quality.js';
import { SECURITY_EVENTS, logSecurityEvent } from '../core/security-log.js';
import { getState, setState } from '../core/store.js';
import { findVariety } from '../data/catalog.js';
import * as demo from '../data/demo/dto.js';
import { TEST_REPORT_FALLBACK } from '../data/demo/records.js';

export const RESOURCES = Object.freeze({
  overview: {
    label: 'Visão geral',
    endpoint: 'GET /dashboard/overview?variety=',
    fetch: ({ variety }) => api.dashboardOverview({ variety }),
    demo: ({ variety }) => demo.overviewDto(variety),
    normalize: (payload) => normalizeOverview(payload),
  },
  readings: {
    label: 'Leituras dos sensores',
    endpoint: 'GET /readings/current',
    fetch: () => api.currentReadings(),
    demo: ({ variety }) => demo.readingsDto(variety),
    normalize: (payload, { variety }) => normalizeReadings(payload, { classify: classifyReading, variety }),
  },
  quality: {
    label: 'Qualidade dos dados',
    endpoint: 'GET /analytics/data-quality',
    fetch: () => api.dataQuality(),
    demo: ({ variety }) => demo.qualityDto(variety),
    normalize: (payload) => normalizeQuality(payload),
  },
  alerts: {
    label: 'Alertas',
    endpoint: 'GET /alerts',
    fetch: () => api.alerts({}),
    demo: ({ variety }) => demo.alertsDto(variety),
    normalize: (payload) => normalizeAlerts(payload),
  },
  models: {
    label: 'Modelos preditivos',
    endpoint: 'GET /models',
    fetch: () => api.models(),
    demo: () => demo.modelsDto(),
    normalize: (payload) => normalizeModels(payload),
  },
  thingspeak: {
    label: 'Status do ThingSpeak',
    endpoint: 'GET /integrations/thingspeak/status',
    fetch: () => api.thingSpeakStatus(),
    demo: (context) => demo.thingSpeakStatusDto(context),
    normalize: (payload) => normalizeThingSpeakStatus(payload),
  },
  /* Rotas previstas nos DTOs do back-end (MarketResponse/ForecastResponse/
     VarietySummaryDto). Enquanto não existirem no FastAPI, a API devolve 404 e
     a tela continua com o dado demonstrativo — o contrato já está pronto. */
  market: {
    label: 'Mercado',
    endpoint: 'GET /market/summary?variety=',
    fetch: ({ variety }) => api.market({ variety }),
    demo: ({ variety }) => demo.marketDto(variety),
    normalize: (payload) => normalizeMarket(payload),
  },
  forecasts: {
    label: 'Previsões',
    endpoint: 'GET /forecasts/latest?variety=',
    fetch: ({ variety }) => api.forecasts({ variety }),
    demo: ({ variety }) => demo.forecastDto(variety),
    normalize: (payload) => normalizeForecast(payload),
  },
  varieties: {
    label: 'Comparativo de variedades',
    endpoint: 'GET /varieties/summary',
    fetch: () => api.varieties(),
    demo: () => demo.varietiesDto(),
    normalize: (payload) => normalizeVarietySummaries(payload),
  },
  testReport: {
    label: 'Relatório de testes',
    endpoint: 'GET ./reports/test-results.json',
    fetch: async () => {
      const response = await fetch('./reports/test-results.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Relatório de testes ainda não publicado.');
      return response.json();
    },
    demo: () => TEST_REPORT_FALLBACK,
    normalize: (payload) => normalizeTestReport(payload) ?? TEST_REPORT_FALLBACK,
  },
});

/** Cache em memória com TTL (RNF04: evita repetir consultas na troca de telas). */
const cache = new Map();

/** Chave de cache: cada combinação recurso × variedade tem seu próprio valor. */
const cacheKey = (key, context) => `${key}::${context.variety ?? ''}`;

const ttlFor = (key) => (key === 'testReport' ? 300000 : ENV.cacheTtlMs);

const isFresh = (key) => {
  const entry = cache.get(key);
  return Boolean(entry) && Date.now() - entry.at < ttlFor(entry.resource);
};

/** Valor demonstrativo já normalizado (usado como estado inicial/último recurso). */
function demoValue(resourceKey, context) {
  const definition = RESOURCES[resourceKey];
  try {
    return definition.normalize(definition.demo(context), context);
  } catch (error) {
    console.warn(`[AgroClima] Dados demonstrativos inválidos para "${resourceKey}":`, error.message);
    return resourceKey === 'testReport' ? TEST_REPORT_FALLBACK : null;
  }
}

/**
 * Preenchimento síncrono: a página aparece com dado (cache ou demonstração) e o
 * selo de origem informa de onde ele veio; a API chega logo depois.
 */
export function primeData(keys, context = {}) {
  const state = getState();
  const data = { ...state.data };
  const sources = { ...state.sources };
  const pending = [];

  keys.forEach((key) => {
    if (!RESOURCES[key]) return;
    const entry = cache.get(cacheKey(key, context));
    if (entry && isFresh(cacheKey(key, context))) {
      data[key] = entry.value;
      sources[key] = entry.source;
      return;
    }
    data[key] = demoValue(key, context);
    sources[key] = 'demo';
    pending.push(key);
  });

  setState({
    data,
    sources,
    loading: pending.length ? Array.from(new Set([...state.loading, ...pending])) : state.loading,
  });
}

async function loadResource(key, context, force) {
  const definition = RESOURCES[key];
  const cached = cache.get(cacheKey(key, context));

  if (!force && cached && isFresh(cacheKey(key, context))) {
    return { key, value: cached.value, source: cached.source, cached: true };
  }

  try {
    const payload = await definition.fetch(context);
    const value = definition.normalize(payload, context);
    cache.set(cacheKey(key, context), { value, at: Date.now(), source: 'api', resource: key });
    return { key, value, source: 'api' };
  } catch (error) {
    const value = demoValue(key, context);
    cache.set(cacheKey(key, context), { value, at: Date.now(), source: 'demo', resource: key, error: error.kind ?? 'error' });
    return { key, value, source: 'demo', error };
  }
}

/**
 * Consulta os recursos informados e atualiza o estado.
 * Retorna `{ source, fromApi, total, error }` — a origem agregada usada pela
 * faixa de status das páginas (`js/components/page-header.js`).
 */
export async function ensureData(keys, context = {}, { force = false } = {}) {
  const pending = keys.filter((key) => RESOURCES[key]);
  if (pending.length === 0) return { source: 'demo', fromApi: 0, total: 0 };

  const results = await Promise.all(pending.map((key) => loadResource(key, context, force)));
  const state = getState();
  const data = { ...state.data };
  const sources = { ...state.sources };
  const dataErrors = { ...state.dataErrors };
  let fromApi = 0;
  let firstError = null;

  results.forEach((result) => {
    data[result.key] = result.value;
    sources[result.key] = result.source;
    if (result.source === 'api') fromApi += 1;
    if (result.error) {
      firstError = firstError ?? result.error;
      dataErrors[result.key] = result.error.message;
    } else {
      delete dataErrors[result.key];
    }
  });

  const total = results.length;
  const source = fromApi === total ? 'api' : fromApi === 0 ? 'demo' : 'mixed';

  setState({
    data,
    sources,
    dataErrors,
    loading: state.loading.filter((key) => !pending.includes(key)),
    lastSync: fromApi > 0 ? new Date().toISOString() : state.lastSync,
    apiStatus: {
      /* A API é considerada alcançável quando algum recurso respondeu; um
         erro HTTP (404/401) também prova que o servidor está no ar — o que
         caracteriza indisponibilidade é falha de rede ou tempo esgotado. */
      reachable: fromApi > 0 ? true : firstError ? REACHABLE_ERROR_KINDS.has(firstError.kind) : state.apiStatus?.reachable ?? null,
      latencyMs: state.apiStatus?.latencyMs ?? null,
      checkedAt: new Date().toISOString(),
      baseUrl: getApiBaseUrl(),
      error: firstError ? firstError.message : null,
      kind: firstError?.kind ?? null,
    },
  });

  if (fromApi === 0 && total > 0 && firstError && OFFLINE_ERROR_KINDS.has(firstError.kind)) {
    reportFallback(pending.join(', '), firstError);
  }

  return { source, fromApi, total, error: firstError };
}

/** Erros que provam que o servidor respondeu (API no ar, rota/permissão pendente). */
const REACHABLE_ERROR_KINDS = new Set(['not-found', 'http', 'unauthorized', 'parse']);
/** Erros que caracterizam API indisponível (fallback demonstrativo). */
const OFFLINE_ERROR_KINDS = new Set(['offline', 'timeout', 'unknown']);

/* O aviso de indisponibilidade é registrado uma vez por sessão (evita poluir a
   trilha de segurança a cada troca de página). */
let fallbackReported = false;

function reportFallback(resources, error) {
  if (fallbackReported) return;
  fallbackReported = true;
  logSecurityEvent(SECURITY_EVENTS.DATA_SOURCE_FALLBACK, {
    description: `API indisponível em ${getApiBaseUrl()} (${error.kind ?? 'erro'}). O painel está usando dados demonstrativos.`,
    meta: { resources, kind: error.kind ?? null },
  });
}

/** Chamado quando a API volta a responder: permite registrar o próximo fallback. */
export function resetFallbackFlag() {
  fallbackReported = false;
}

/** Origem agregada de um conjunto de recursos ('api' | 'demo' | 'mixed'). */
export function sourceOf(keys, sources = getState().sources) {
  const values = keys.map((key) => sources[key]).filter(Boolean);
  if (values.length === 0) return 'demo';
  if (values.every((value) => value === 'api')) return 'api';
  if (values.every((value) => value === 'demo')) return 'demo';
  return 'mixed';
}

export function sourceLabel(source) {
  if (source === 'api') return 'Dados da API';
  if (source === 'mixed') return 'Dados parciais';
  return 'Dados demonstrativos';
}

/** Leitura do estado usada pelas páginas (nunca lança). */
export const dataFor = (state, key) => state.data?.[key] ?? null;

/** Rótulo da variedade selecionada (fallback para a primeira do catálogo). */
export const varietyOf = (name) => findVariety(name);

/** Descarta o cache (de um recurso específico ou de todos). */
export function invalidate(key = null) {
  if (!key) {
    cache.clear();
    resetFallbackFlag();
    return;
  }
  [...cache.keys()].filter((entry) => entry.startsWith(`${key}::`)).forEach((entry) => cache.delete(entry));
}

export { demo };
