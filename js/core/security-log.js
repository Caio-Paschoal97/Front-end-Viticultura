/**
 * Log de eventos de segurança (RF11 — relatórios de segurança).
 *
 * Registra acessos, falhas de autenticação, tentativas de acesso indevido
 * (bloqueio do RBAC) e alterações de permissão. Persistido no navegador para
 * sobreviver ao recarregamento e exibido em Admin › Segurança / Logs.
 */

import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';

export const SECURITY_EVENTS = Object.freeze({
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGIN_FALLBACK: 'LOGIN_FALLBACK',
  LOGOUT: 'LOGOUT',
  ACCESS_DENIED: 'ACCESS_DENIED',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_BLOCKED: 'USER_BLOCKED',
  SESSION_RESTORED: 'SESSION_RESTORED',
  DATA_SOURCE_FALLBACK: 'DATA_SOURCE_FALLBACK',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
});

const EVENT_CATALOG = {
  [SECURITY_EVENTS.LOGIN_SUCCESS]: { label: 'Login realizado', severity: 'info' },
  [SECURITY_EVENTS.LOGIN_FAILURE]: { label: 'Falha de autenticação', severity: 'warning' },
  [SECURITY_EVENTS.LOGIN_FALLBACK]: { label: 'Login em modo demonstração', severity: 'warning' },
  [SECURITY_EVENTS.LOGOUT]: { label: 'Logout', severity: 'info' },
  [SECURITY_EVENTS.ACCESS_DENIED]: { label: 'Acesso bloqueado pelo RBAC', severity: 'critical' },
  [SECURITY_EVENTS.PERMISSION_CHANGE]: { label: 'Permissões alteradas', severity: 'warning' },
  [SECURITY_EVENTS.USER_CREATED]: { label: 'Usuário cadastrado', severity: 'info' },
  [SECURITY_EVENTS.USER_UPDATED]: { label: 'Usuário atualizado', severity: 'info' },
  [SECURITY_EVENTS.USER_BLOCKED]: { label: 'Usuário bloqueado', severity: 'warning' },
  [SECURITY_EVENTS.SESSION_RESTORED]: { label: 'Sessão restaurada', severity: 'info' },
  [SECURITY_EVENTS.DATA_SOURCE_FALLBACK]: { label: 'Fallback para dados demonstrativos', severity: 'warning' },
  [SECURITY_EVENTS.SETTINGS_CHANGED]: { label: 'Configuração alterada', severity: 'warning' },
};

const MAX_EVENTS = 300;

const load = () => {
  const stored = readStorage(STORAGE_KEYS.securityLog, []);
  return Array.isArray(stored) ? stored : [];
};

let events = load();

const persist = () => writeStorage(STORAGE_KEYS.securityLog, events.slice(-MAX_EVENTS));

export const eventLabel = (type) => EVENT_CATALOG[type]?.label ?? type;
export const eventSeverity = (type) => EVENT_CATALOG[type]?.severity ?? 'info';
export const catalog = () => EVENT_CATALOG;

export function logSecurityEvent(type, { description = '', actor = null, meta = {} } = {}) {
  const event = {
    id: `sec-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    type,
    label: eventLabel(type),
    severity: eventSeverity(type),
    description,
    actor,
    meta,
    at: new Date().toISOString(),
  };
  events = [...events.slice(-(MAX_EVENTS - 1)), event];
  persist();
  return event;
}

export const listSecurityEvents = () => [...events].reverse();

export function clearSecurityEvents() {
  events = [];
  persist();
}

/**
 * Indicadores usados nos cartões do painel de segurança.
 * `blocked` conta tentativas de acesso indevido; `incidents` conta eventos críticos.
 */
export function summarizeSecurity(list = events) {
  const count = (type) => list.filter((event) => event.type === type).length;
  return {
    total: list.length,
    logins: count(SECURITY_EVENTS.LOGIN_SUCCESS),
    failures: count(SECURITY_EVENTS.LOGIN_FAILURE),
    blocked: count(SECURITY_EVENTS.ACCESS_DENIED),
    incidents: list.filter((event) => event.severity === 'critical').length,
    warnings: list.filter((event) => event.severity === 'warning').length,
    lastEventAt: list.length ? list[list.length - 1].at : null,
  };
}

/** Série diária de acessos (últimos 7 dias) para o gráfico do painel admin. */
export function loginsByDay(list = events, days = 7) {
  const today = new Date();
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    date.setHours(0, 0, 0, 0);
    return {
      label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      start: date.getTime(),
      value: 0,
    };
  });

  list
    .filter((event) => event.type === SECURITY_EVENTS.LOGIN_SUCCESS)
    .forEach((event) => {
      const at = new Date(event.at).getTime();
      const bucket = [...buckets].reverse().find((item) => at >= item.start);
      if (bucket) bucket.value += 1;
    });

  return buckets;
}
