/**
 * Estado global da aplicação (store mínimo, sem dependências).
 *
 * `setState` recebe um patch e avisa os assinantes somente com as chaves que
 * realmente mudaram — é o que permite renderização parcial (trocar apenas a
 * área da página, manter a sidebar animada etc.).
 */

import { DEFAULT_VARIETY } from '../data/catalog.js';

export const createInitialState = () => ({
  /* --------------------------------------------------------------- Sessão */
  authenticated: false,
  authMode: 'login', // login | signup | forgot
  authError: null,
  authBusy: false,
  session: null, // { id, name, email, role, token, mode: 'demo' | 'api', startedAt }
  role: null, // ROLES.* — perfil ativo (RBAC)

  /* ------------------------------------------------------------ Navegação */
  page: null, // id da página (ex.: 'produtor/visao-geral')
  requestedPage: null, // última tentativa de navegação (usada no bloqueio RBAC)
  menuOpen: false,
  variety: DEFAULT_VARIETY,
  period: '24h',

  /* ----------------------------------------------------------------- Tema */
  theme: 'light', // light | dark

  /* ----------------------------------------------------------------- Dados */
  loading: [], // recursos em carregamento
  data: {}, // recurso -> dados normalizados
  sources: {}, // recurso -> 'api' | 'demo'
  dataErrors: {}, // recurso -> mensagem
  lastSync: null,
  apiStatus: { reachable: null, latencyMs: null, checkedAt: null, baseUrl: '', error: null, kind: null },

  /* ------------------------------------------------------------------ RBAC */
  permissionOverrides: {}, // perfil -> { páginas negadas }
  accessDenied: null, // { page, label, role, at }

  /* -------------------------------------------- Dados administrados no front */
  users: [],
  securityEvents: [],
  auditLogs: [],
  resolvedAlerts: [],
  settings: {},
  sensors: [],

  /* ------------------------------------------------ Interface (UI efêmera) */
  toasts: [],
  modal: null, // { type, payload }
  tabs: {}, // página -> aba ativa
  filters: {}, // página -> { campo: valor }
  reportResults: null, // relatório de testes (RF11) quando publicado
});

let state = createInitialState();
const listeners = new Set();

export const getState = () => state;

export function setState(patch) {
  const changedKeys = Object.keys(patch).filter((key) => state[key] !== patch[key]);
  if (changedKeys.length === 0) return;
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state, changedKeys));
}

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Volta ao estado inicial (usado no logout). */
export const resetState = () => setState(createInitialState());

/** Estado de página: cada página guarda seus filtros/abas sem interferir nas demais. */
export function setPageFilter(page, key, value) {
  setState({ filters: { ...state.filters, [page]: { ...(state.filters[page] ?? {}), [key]: value } } });
}

export const getPageFilter = (page, key, fallback = 'todos') => state.filters[page]?.[key] ?? fallback;

export function setActiveTab(page, tab) {
  setState({ tabs: { ...state.tabs, [page]: tab } });
}

export const getActiveTab = (page, fallback = null) => state.tabs[page] ?? fallback;

/** Notificações efêmeras (toasts) usadas para feedback de ações. */
export function pushToast({ title, message, tone = 'success', timeout = 4200 }) {
  const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  setState({ toasts: [...state.toasts, { id, title, message, tone }] });
  if (timeout && typeof setTimeout === 'function') {
    setTimeout(() => dismissToast(id), timeout);
  }
  return id;
}

export function dismissToast(id) {
  setState({ toasts: state.toasts.filter((toast) => toast.id !== id) });
}
