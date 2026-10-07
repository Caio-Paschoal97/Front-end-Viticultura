/**
 * Configuração de ambiente do front-end.
 *
 * O dashboard consome a API Python/FastAPI descrita no back-end
 * (`app/api/router.py`, prefixo `/api/v1`). Nada de chave de API aqui: a
 * Read Key do ThingSpeak permanece no servidor (RNF02).
 */

import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '../utils/storage.js';

export const API_PREFIX = '/api/v1';

const readQueryParam = (name) => {
  if (typeof window === 'undefined' || !window.location?.search) return null;
  return new URLSearchParams(window.location.search).get(name);
};

/**
 * Base padrão da API:
 *  - servido por HTTP/HTTPS → mesma origem (`/api/v1`), caminho que o
 *    `tools/dev-server.mjs` encaminha para o FastAPI (sem problemas de CORS);
 *  - aberto por `file://` → `http://localhost:8000/api/v1`.
 */
export function resolveDefaultApiBaseUrl() {
  if (typeof window === 'undefined' || !window.location) return 'http://localhost:8000/api/v1';
  const { protocol, origin } = window.location;
  if (protocol === 'http:' || protocol === 'https:') return `${origin}${API_PREFIX}`;
  return 'http://localhost:8000/api/v1';
}

export const ENV = Object.freeze({
  appName: 'AgroClima Cloud',
  version: '2.0.0',
  subtitle: 'Dashboard de monitoramento climático e logístico',
  region: 'Petrolina / Juazeiro — Vale do São Francisco',
  apiPrefix: API_PREFIX,
  requestTimeoutMs: 6000,
  healthTimeoutMs: 2500,
  cacheTtlMs: 30000,
  /** RNF11 — intervalo mínimo do plano gratuito do ThingSpeak (15 s por canal). */
  thingspeakMinIntervalSeconds: 15,
  /** Gateway Java responsável por autenticação/RBAC (RF08). */
  authGatewayUrl: 'http://localhost:8080',
  authGatewayPath: '/api/auth/login',
  /** Modo demonstração: valida o acesso nas contas locais quando o gateway não responde. */
  demoFallbackEnabled: true,
  /** Papéis aceitos; qualquer outro valor devolvido pelo gateway é recusado. */
  roles: ['PRODUCER', 'ANALYST', 'ADMIN'],
});

/** URL base da API considerando override em localStorage e `?api=` na URL. */
export function getApiBaseUrl() {
  const fromQuery = readQueryParam('api');
  if (fromQuery) return fromQuery.replace(/\/$/, '');
  const stored = readStorage(STORAGE_KEYS.apiBaseUrl, null);
  if (typeof stored === 'string' && stored.trim()) return stored.trim().replace(/\/$/, '');
  return resolveDefaultApiBaseUrl();
}

export function setApiBaseUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) {
    removeStorage(STORAGE_KEYS.apiBaseUrl);
    return getApiBaseUrl();
  }
  writeStorage(STORAGE_KEYS.apiBaseUrl, value.replace(/\/$/, ''));
  return getApiBaseUrl();
}

export const getAuthGatewayUrl = () => `${ENV.authGatewayUrl}${ENV.authGatewayPath}`;

/** Rótulo curto da origem dos dados para exibir na interface. */
export const apiHostLabel = (baseUrl = getApiBaseUrl()) => {
  try {
    const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return url.host;
  } catch (error) {
    return baseUrl;
  }
};
