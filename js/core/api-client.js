/**
 * Cliente HTTP da API Python (FastAPI).
 *
 * Responsabilidades:
 *  - montar URL/headers conforme o contrato (`docs/CONTRATO-API.md`);
 *  - repassar a identidade do usuário (`Authorization`, `X-User-Id`,
 *    `X-User-Role`) como o gateway Java faz na arquitetura real;
 *  - classificar falhas (`offline`, `timeout`, `unauthorized`, `http`, `parse`)
 *    para que a camada de dados decida entre usar a API ou os dados
 *    demonstrativos.
 *
 * Importante (Segurança da Informação / RNF02): cabeçalhos de identidade só
 * podem ser aceitos pelo back-end quando vindos do gateway confiável. No modo
 * de desenvolvimento, o Python aceita esses headers — por isso este cliente
 * NUNCA carrega chaves do ThingSpeak nem segredos.
 */

import { ENV, getApiBaseUrl, getAuthGatewayUrl } from '../config/env.js';
import { identityHeaders } from './session.js';

export class ApiError extends Error {
  constructor(message, { kind = 'unknown', status = null, endpoint = '', payload = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.endpoint = endpoint;
    this.payload = payload;
    this.cause = cause;
  }
}

let fetchImpl = typeof fetch === 'function' ? fetch.bind(globalThis) : null;

/** Permite injetar um `fetch` (usado nos testes automatizados). */
export function setFetchImpl(implementation) {
  fetchImpl = implementation;
}

export const getFetchImpl = () => fetchImpl;

const buildUrl = (endpoint, query) => {
  const base = getApiBaseUrl();
  const path = `${base}/${String(endpoint).replace(/^\//, '')}`;
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    params.append(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export function buildHeaders({ auth = true, headers = {} } = {}) {
  const base = { Accept: 'application/json' };
  if (auth) Object.assign(base, identityHeaders());
  return { ...base, ...headers };
}

/**
 * Requisição com timeout. Lança `ApiError` classificado.
 * `absolute: true` é usado para falar com o gateway de autenticação (outra porta).
 */
export async function request(endpoint, { method = 'GET', query, body, auth = true, headers = {}, timeout = ENV.requestTimeoutMs, absolute = false, signal = null } = {}) {
  if (!fetchImpl) {
    throw new ApiError('Cliente HTTP indisponível neste ambiente.', { kind: 'offline', endpoint });
  }

  const url = absolute ? endpoint : buildUrl(endpoint, query);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const response = await fetchImpl(url, {
      method,
      headers: {
        ...buildHeaders({ auth, headers }),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller ? controller.signal : signal,
      mode: 'cors',
    });

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        if (response.ok) {
          throw new ApiError('A API respondeu um conteúdo que não é JSON.', { kind: 'parse', status: response.status, endpoint, payload: text.slice(0, 200), cause: error });
        }
      }
    }

    if (!response.ok) {
      const kind =
        response.status === 401 || response.status === 403
          ? 'unauthorized'
          : response.status === 404
            ? 'not-found'
            : /* 502/503/504 = o proxy não alcançou o back-end: tratamos como indisponível. */
              response.status === 502 || response.status === 503 || response.status === 504
              ? 'offline'
              : 'http';
      throw new ApiError(payload?.detail ?? `A API respondeu ${response.status}.`, { kind, status: response.status, endpoint, payload });
    }

    return { payload, status: response.status };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ApiError(`Tempo esgotado ao consultar ${endpoint} (${timeout} ms).`, { kind: 'timeout', endpoint, cause: error });
    }
    throw new ApiError('Não foi possível alcançar a API (rede indisponível ou CORS).', { kind: 'offline', endpoint, cause: error });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ---------------------------------------------------------- Endpoints (RF02) */

/**
 * Desembrulha o `{ payload, status }` devolvido por `request`.
 * As telas trabalham somente com o JSON do DTO — o status HTTP só interessa
 * para o diagnóstico exibido em Administrador › Integrações.
 */
const json = async (pending) => (await pending).payload;

export const api = {
  health: async ({ timeout = ENV.healthTimeoutMs } = {}) => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const { payload } = await request('health', { auth: false, timeout });
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return { ...payload, latencyMs: Math.round(endedAt - startedAt) };
  },

  /** RF02/RF07 — métricas, séries e recomendações da visão geral. */
  dashboardOverview: ({ variety } = {}) => json(request('dashboard/overview', { query: { variety } })),

  /** RF01/RF02/RF10 — leituras correntes dos sensores via ThingSpeak → banco. */
  currentReadings: () => json(request('readings/current')),

  /** RF05 — indicadores de qualidade calculados no back-end. */
  dataQuality: () => json(request('analytics/data-quality')),

  /** RF09 — alertas ativos (filtro opcional por categoria do enum AlertCategory). */
  alerts: ({ category } = {}) => json(request('alerts', { query: { category } })),

  /** RF06 — modelos preditivos cadastrados com métricas de validação. */
  models: () => json(request('models')),

  /** RF02/RNF11 — status do canal ThingSpeak configurado no servidor. */
  thingSpeakStatus: () => json(request('integrations/thingspeak/status')),

  /* Endpoints previstos nos DTOs do back-end (MarketResponse, ForecastResponse,
     VarietySummaryDto, MonitoringResponse). Enquanto as rotas não existem, a
     camada de dados usa os dados demonstrativos — ver docs/CONTRATO-API.md. */
  market: ({ variety } = {}) => json(request('market/summary', { query: { variety } })),
  forecasts: ({ variety } = {}) => json(request('forecasts/latest', { query: { variety } })),
  varieties: () => json(request('varieties/summary')),

  /** Autenticação: feita pelo gateway Java (RF08). */
  gatewayLogin: ({ email, password }) =>
    json(request(getAuthGatewayUrl(), { method: 'POST', auth: false, absolute: true, body: { email, password }, timeout: ENV.requestTimeoutMs })),
};

/** Testa a conectividade com a API e atualiza a percepção de disponibilidade. */
export async function probeApi() {
  const baseUrl = getApiBaseUrl();
  const checkedAt = new Date().toISOString();
  try {
    const result = await api.health();
    return { reachable: true, latencyMs: result.latencyMs ?? null, service: result.service ?? null, baseUrl, checkedAt, error: null, kind: null };
  } catch (error) {
    return { reachable: false, latencyMs: null, error: error.message, kind: error.kind, baseUrl, checkedAt };
  }
}

export const apiBaseUrl = getApiBaseUrl;
