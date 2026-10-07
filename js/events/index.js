/**
 * Camada de eventos da aplicação.
 *
 * Estratégia: um único ponto de delegação em `document`. Cada elemento
 * interativo carrega `data-action` (ações instantâneas) ou `data-form` (envio de
 * formulário), de modo que a remontagem parcial da tela nunca perde os
 * listeners — inclusive quando só o conteúdo de `main > .page` é substituído.
 *
 * Os módulos de página não conhecem o store: eles apenas declaram a intenção
 * (`action: 'export-report'`) e esta camada decide o que fazer, registrando as
 * operações relevantes na trilha de auditoria/segurança (RF11).
 */

import { DEMO_ACCOUNTS, DEMO_PASSWORD, isKnownRole, roleLabel } from '../config/roles.js';
import { PAGES } from '../config/pages.js';
import { getApiBaseUrl, setApiBaseUrl } from '../config/env.js';
import { loadSettings, resetSettings, saveSettings } from '../config/settings.js';
import { probeApi } from '../core/api-client.js';
import {
  canAccessPage,
  getPermissionOverrides,
  measurePermissionCost,
  setPermissionOverrides,
} from '../core/rbac.js';
import { requestPasswordReset, signIn, signOut, signUp } from '../core/auth.js';
import { LOG_CATEGORIES, clearAuditLogs, logAudit } from '../core/audit-log.js';
import { SECURITY_EVENTS, clearSecurityEvents, logSecurityEvent } from '../core/security-log.js';
import {
  dismissToast,
  getState,
  pushToast,
  setActiveTab,
  setPageFilter,
  setState,
} from '../core/store.js';
import { applyTheme, isTheme, toggleTheme } from '../components/theme-toggle.js';
import { exportReadingsReport, printExecutiveReport, runReport } from '../services/report-service.js';
import { invalidate } from '../services/data-service.js';
import { createUser, toggleUserStatus, updateUser } from '../services/users-service.js';
import { STORAGE_KEYS, writeStorage } from '../utils/storage.js';

/* --------------------------------------------------------------- Utilidades */

let reloadPageHandler = null;

/** main.js informa como recarregar a página atual (busca + renderização). */
export function bindEvents({ onReloadPage } = {}) {
  reloadPageHandler = typeof onReloadPage === 'function' ? onReloadPage : null;
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKeydown);
}

const reloadPage = (options = {}) => {
  if (reloadPageHandler) reloadPageHandler(options);
};

const actorLabel = () => {
  const { session } = getState();
  return session?.name ? `${session.name} (${roleLabel(session.role)})` : 'Sistema';
};

const audit = (action, options = {}) => logAudit(action, { actor: actorLabel(), ...options });

const closestAction = (target) => (target?.closest ? target.closest('[data-action]') : null);

const datasetOf = (element) => ({ ...(element?.dataset ?? {}) });

/** Converte `data-*` do botão em payload (ex.: data-user="usr-1"). */
const payloadOf = (dataset) => {
  const payload = {};
  Object.entries(dataset).forEach(([key, value]) => {
    if (key === 'action' || key === 'key' || key === 'toast') return;
    payload[key] = value;
  });
  return payload;
};

/* -------------------------------------------------------- Guarda de acesso */

/**
 * Navega respeitando o RBAC (RF08). Quando o perfil não tem acesso, a página não
 * é montada: registra-se a tentativa e a tela de bloqueio é exibida no lugar.
 */
function navigate(pageId) {
  const state = getState();
  if (!state.authenticated || !pageId || !PAGES[pageId]) return;

  if (!canAccessPage(state.role, pageId, state.permissionOverrides)) {
    const label = PAGES[pageId]?.label ?? pageId;
    logSecurityEvent(SECURITY_EVENTS.ACCESS_DENIED, {
      description: `Perfil ${roleLabel(state.role)} tentou abrir "${label}" (${pageId}), fora do escopo autorizado.`,
      actor: { email: state.session?.email ?? null },
      meta: { page: pageId, role: state.role },
    });
    audit('Acesso negado pelo RBAC', {
      category: LOG_CATEGORIES.SECURITY,
      detail: `Tentativa de abrir "${label}" com o perfil ${roleLabel(state.role)}.`,
      status: 'Bloqueado',
      level: 'warning',
    });
    setState({
      accessDenied: { page: pageId, label, role: state.role, at: new Date().toISOString() },
      requestedPage: pageId,
      menuOpen: false,
    });
    pushToast({ title: 'Acesso restrito', message: `O perfil ${roleLabel(state.role)} não pode abrir "${label}".`, tone: 'warn' });
    return;
  }

  setState({ page: pageId, requestedPage: null, accessDenied: null, menuOpen: false, modal: null });
}

/* ----------------------------------------------------------------- Filtros */

const clearFilters = (page) => {
  const state = getState();
  setState({ filters: { ...state.filters, [page]: {} } });
};

const CHANGE_ONLY_ACTIONS = new Set(['change-variety', 'change-period', 'set-theme']);

/* ------------------------------------------------------- Ações de clique */

const CLICK_ACTIONS = {
  navigate: (element) => navigate(element.dataset.page ?? element.dataset.to),

  'navigate-to': (element) => navigate(element.dataset.page ?? element.dataset.to),

  'open-menu': () => setState({ menuOpen: true }),

  'close-menu': () => setState({ menuOpen: false }),

  logout: () => {
    audit('Sessão encerrada', { category: LOG_CATEGORIES.AUTH, detail: 'Logout solicitado pelo usuário.', status: 'Concluído' });
    signOut();
    pushToast({ title: 'Sessão encerrada', message: 'Você saiu da plataforma com segurança.', tone: 'info' });
  },

  'auth-mode': (element) => setState({ authMode: element.dataset.mode ?? 'login', authError: null }),

  'demo-login': async (element) => {
    const account = DEMO_ACCOUNTS.find((item) => item.email === element.dataset.email);
    const email = element.dataset.email ?? '';
    const input = document.querySelector('input[name="email"]');
    if (input) input.value = email;
    const result = await signIn({ email, password: DEMO_PASSWORD });
    if (!result.ok) setState({ authError: result.error });
    else pushToast({ title: 'Acesso de demonstração', message: `Perfil ativo: ${account ? roleLabel(account.role) : roleLabel(result.role)}.`, tone: 'success' });
  },

  'toggle-theme': () => {
    const theme = toggleTheme();
    setState({ theme });
  },

  'refresh-data': async () => {
    invalidate();
    const status = await probeApi();
    setState({ apiStatus: status });
    await reloadPage({ force: true, reason: 'refresh-data' });
    logSecurityEvent(SECURITY_EVENTS.SETTINGS_CHANGED, { description: 'Sincronização manual solicitada na interface.' });
    pushToast({
      title: 'Sincronização solicitada',
      message: status.reachable ? 'Dados atualizados a partir da API.' : 'API indisponível: dados demonstrativos recarregados.',
      tone: status.reachable ? 'success' : 'warn',
    });
  },

  'test-api': async () => {
    const status = await probeApi();
    setState({ apiStatus: status });
    if (status.reachable) await reloadPage({ force: true, reason: 'test-api' });
    pushToast({
      title: status.reachable ? 'API conectada' : 'API indisponível',
      message: status.reachable
        ? `${getApiBaseUrl()} respondeu em ${status.latencyMs ?? 0} ms.`
        : `${getApiBaseUrl()} não respondeu. O dashboard segue com dados demonstrativos.`,
      tone: status.reachable ? 'success' : 'warn',
    });
  },

  'reload-page': async () => {
    setState({ settings: loadSettings() });
    await reloadPage({ force: true, reason: 'reload-page' });
  },

  'export-report': (element) => runReport(element.dataset.report),

  'export-readings': () => exportReadingsReport(),

  'print-report': () => printExecutiveReport(getState()),

  'open-modal': (element) => setState({ modal: { type: element.dataset.modal, payload: payloadOf(datasetOf(element)) } }),

  'close-modal': () => setState({ modal: null }),

  'backdrop-close': (element, event) => {
    if (event.target === element) setState({ modal: null });
  },

  'dismiss-toast': (element) => dismissToast(element.dataset.toast),

  'set-tab': (element) => setActiveTab(getState().page, element.dataset.tab),

  'change-tab': (element) => setActiveTab(getState().page, element.dataset.tab),

  'set-filter': (element, event) => {
    const tag = element.tagName;
    if (tag === 'SELECT' || tag === 'INPUT') return; // tratados em change/input
    applyFilterChip(element, event);
  },

  'reset-filters': () => {
    clearFilters(getState().page);
    pushToast({ title: 'Filtros limpos', message: 'A tela voltou a exibir todos os registros.', tone: 'info' });
  },

  'clear-user-filters': () => {
    clearFilters('admin/usuarios');
    pushToast({ title: 'Filtros limpos', message: 'A lista completa de usuários foi restaurada.', tone: 'info' });
  },

  'resolve-alert': (element) => {
    const id = element.dataset.alert;
    const state = getState();
    if (!id || state.resolvedAlerts.includes(id)) return;
    const resolvedAlerts = [...state.resolvedAlerts, id];
    writeStorage(STORAGE_KEYS.resolvedAlerts, resolvedAlerts);
    setState({ resolvedAlerts });
    audit('Alerta marcado como resolvido', { category: LOG_CATEGORIES.MONITORING, detail: `Alerta ${id} tratado pela interface.` });
    pushToast({ title: 'Alerta resolvido', message: 'O alerta saiu da fila de pendências.', tone: 'success' });
  },

  'run-model': (element) => {
    const model = element.dataset.model ?? 'modelo';
    audit('Execução de modelo solicitada', { category: LOG_CATEGORIES.MODEL, detail: `Modelo "${model}" enfileirado para execução.` });
    pushToast({ title: 'Execução agendada', message: `O modelo "${model}" foi enfileirado; acompanhe na trilha de auditoria.`, tone: 'success' });
  },

  'toggle-user': (element) => {
    const result = toggleUserStatus(element.dataset.user);
    if (!result?.ok) pushToast({ title: 'Não foi possível alterar', message: result?.error ?? 'Usuário não encontrado.', tone: 'warn' });
  },

  'toggle-permission': (element) => {
    const { role, page } = element.dataset;
    const state = getState();
    if (!isKnownRole(role) || !PAGES[page]) return;
    const current = canAccessPage(role, page, state.permissionOverrides);
    const next = { ...state.permissionOverrides, [role]: { ...(state.permissionOverrides[role] ?? {}) } };
    if (current) next[role][page] = false;
    else delete next[role][page];
    const sanitized = setPermissionOverrides(next);
    setState({ permissionOverrides: sanitized });
    const label = PAGES[page].label;
    logSecurityEvent(SECURITY_EVENTS.PERMISSION_CHANGE, {
      description: current
        ? `Acesso de ${roleLabel(role)} à tela "${label}" revogado.`
        : `Acesso de ${roleLabel(role)} à tela "${label}" restaurado.`,
      actor: { email: state.session?.email ?? null },
      meta: { role, page, allowed: !current },
    });
    audit('Permissões revisadas', {
      category: LOG_CATEGORIES.SECURITY,
      detail: `${roleLabel(role)} · "${label}" ${current ? 'revogada' : 'restaurada'}.`,
      level: 'warning',
      status: 'Concluído',
    });
    pushToast({
      title: current ? 'Acesso revogado' : 'Acesso restaurado',
      message: `${roleLabel(role)} · ${label}`,
      tone: current ? 'warn' : 'success',
    });
  },

  'reset-permissions': () => {
    setPermissionOverrides({});
    setState({ permissionOverrides: getPermissionOverrides() });
    logSecurityEvent(SECURITY_EVENTS.PERMISSION_CHANGE, { description: 'Matriz de permissões restaurada ao padrão do sistema.' });
    audit('Permissões restauradas', { category: LOG_CATEGORIES.SECURITY, detail: 'Matriz de RBAC voltou ao padrão.', level: 'warning' });
    pushToast({ title: 'Padrão restaurado', message: 'As revogações feitas no navegador foram desfeitas.', tone: 'success' });
  },

  'measure-rbac': () => {
    const bench = measurePermissionCost();
    setPageFilter('admin/permissoes', 'bench', bench);
    pushToast({
      title: 'Custo do RBAC medido',
      message: `${bench.iterations} verificações em ${bench.totalMs} ms (${(bench.averageMs * 1000).toFixed(2)} µs cada) — muito abaixo de 10% do orçamento (RNF10).`,
      tone: 'success',
    });
  },

  'clear-logs': () => {
    clearAuditLogs();
    setState({ auditLogs: [] });
    pushToast({ title: 'Trilha limpa', message: 'Os registros de auditoria deste navegador foram removidos.', tone: 'info' });
  },

  'clear-security': () => {
    clearSecurityEvents();
    pushToast({ title: 'Eventos limpos', message: 'A trilha de segurança deste navegador foi esvaziada.', tone: 'info' });
  },

  'reset-settings': () => {
    const settings = resetSettings();
    applyTheme(settings.theme);
    setState({ settings, theme: settings.theme });
    audit('Configurações restauradas', { category: LOG_CATEGORIES.SETTINGS, detail: 'Padrões de fábrica reaplicados.', level: 'warning' });
    pushToast({ title: 'Padrões restaurados', message: 'Todas as configurações voltaram ao valor original.', tone: 'success' });
  },
};

function applyFilterChip(element) {
  const dataset = datasetOf(element);
  const state = getState();
  const page = state.page;
  if (dataset.key) {
    setPageFilter(page, dataset.key, element.value ?? dataset[dataset.key]);
    return;
  }
  const entries = Object.entries(payloadOf(dataset));
  const [key, value] = entries[0] ?? [];
  if (key) setPageFilter(page, key, value);
}

function onClick(event) {
  const element = closestAction(event.target);
  if (!element) return;
  const action = element.dataset.action;
  const handler = CLICK_ACTIONS[action];
  if (!handler) return;
  if (CHANGE_ONLY_ACTIONS.has(action) && ['SELECT', 'INPUT', 'TEXTAREA'].includes(element.tagName)) return;
  if (action === 'set-filter' && element.tagName === 'INPUT' && element.type === 'search') return;
  event.preventDefault();
  handler(element, event);
}

/* ------------------------------------------------------- Ações de mudança */

const CHANGE_ACTIONS = {
  'change-variety': (element) => {
    const variety = element.value;
    const state = getState();
    if (!variety || variety === state.variety) return;
    setState({ variety });
    audit('Variedade analisada alterada', {
      category: LOG_CATEGORIES.MONITORING,
      detail: `Painel reposicionado para "${variety}".`,
      status: 'Concluído',
    });
    /* A troca de variedade já dispara a recarga em `js/main.js`
       (o store notifica a mudança de `variety`). */
  },

  'change-period': (element) => {
    const period = element.value;
    if (!period || period === getState().period) return;
    setState({ period });
    /* `period` também é observado por `js/main.js`, que refaz a consulta. */
  },

  'set-theme': (element) => {
    if (!isTheme(element.value)) return;
    const theme = applyTheme(element.value);
    setState({ theme, settings: saveSettings({ theme }) });
  },

  'set-filter': (element) => {
    const dataset = datasetOf(element);
    const page = getState().page;
    if (dataset.key) {
      setPageFilter(page, dataset.key, element.value);
      return;
    }
    const entries = Object.entries(payloadOf(dataset));
    const [key] = entries[0] ?? [];
    if (key) setPageFilter(page, key, element.value);
  },

  'change-tab': (element) => setActiveTab(getState().page, element.value ?? element.dataset.tab),

  'set-tab': (element) => setActiveTab(getState().page, element.value ?? element.dataset.tab),
};

function onChange(event) {
  const element = event.target?.closest?.('[data-action]') ?? null;
  if (!element) return;
  const handler = CHANGE_ACTIONS[element.dataset.action];
  if (!handler) return;
  handler(element, event);
}

/* --------------------------------------------- Ações contínuas (intervalos) */

let searchTimer = null;

function onInput(event) {
  const element = event.target;
  if (!element?.dataset) return;

  /* Barras de intervalo: atualiza o valor exibido ao lado (sem re-render). */
  if (element.dataset.action === 'live-range') {
    const field = element.closest('.field');
    const output = field?.querySelector(`[data-range-output="${element.name}"]`);
    if (output) {
      const unit = output.textContent.replace(/^[\d.,\s]+/, '');
      output.textContent = `${element.value}${unit}`;
    }
    return;
  }

  /* Busca textual: aguarda o usuário parar de digitar para re-renderizar. */
  if (element.dataset.action === 'set-filter' && element.dataset.key) {
    const page = getState().page;
    const key = element.dataset.key;
    const value = element.value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setPageFilter(page, key, value), 320);
  }
}

/* -------------------------------------------------------------- Formulários */

const FORM_HANDLERS = {
  async login(form) {
    const values = formValues(form);
    const result = await signIn({ email: values.email, password: values.password });
    if (!result.ok) setState({ authError: result.error });
    else setState({ authError: null });
  },

  signup(form) {
    const result = signUp(formValues(form));
    if (!result.ok) setState({ authError: result.error });
  },

  forgot(form) {
    const { email } = formValues(form);
    const result = requestPasswordReset(email);
    if (!result.ok) {
      setState({ authError: result.error });
      return;
    }
    setState({ authMode: 'login', authError: null });
    pushToast({ title: 'Solicitação registrada', message: `Se existir uma conta para ${email}, o link de redefinição será enviado.`, tone: 'info' });
  },

  user(form) {
    const values = formValues(form);
    const result = values.id ? updateUser(values.id, values) : createUser(values);
    if (result?.ok === false) {
      pushToast({ title: 'Não foi possível salvar', message: result.error, tone: 'warn' });
      return;
    }
    setState({ modal: null });
  },

  settings(form) {
    const values = formValues(form);
    const settings = saveSettings(values);
    if (settings.theme !== getState().theme) applyTheme(settings.theme);
    setState({ settings, theme: settings.theme });
    audit('Configurações atualizadas', {
      category: LOG_CATEGORIES.SETTINGS,
      detail: `Campos alterados: ${Object.keys(values).join(', ') || 'nenhum'}.`,
      status: 'Concluído',
    });
    logSecurityEvent(SECURITY_EVENTS.SETTINGS_CHANGED, { description: 'Parâmetros da plataforma atualizados pelo administrador.' });
    pushToast({ title: 'Configurações salvas', message: 'As alterações já valem para esta instalação.', tone: 'success' });
  },

  async 'api-config'(form) {
    const { apiBaseUrl } = formValues(form);
    const saved = setApiBaseUrl(apiBaseUrl);
    const settings = saveSettings({ apiBaseUrl: saved === getApiBaseUrl() ? saved : apiBaseUrl });
    setState({ settings });
    invalidate();
    const status = await probeApi();
    setState({ apiStatus: status });
    await reloadPage({ force: true, reason: 'api-config' });
    pushToast({
      title: status.reachable ? 'API conectada' : 'API indisponível',
      message: status.reachable ? `Consultas passam a usar ${getApiBaseUrl()}.` : `Não foi possível alcançar ${getApiBaseUrl()}; seguimos com dados demonstrativos.`,
      tone: status.reachable ? 'success' : 'warn',
    });
    audit('Endpoint da API alterado', { category: LOG_CATEGORIES.SETTINGS, detail: `Nova base: ${getApiBaseUrl()}.`, level: 'warning' });
  },
};

function formValues(form) {
  const values = {};
  new FormData(form).forEach((value, key) => {
    values[key] = value;
  });
  form.querySelectorAll('input[type="checkbox"][name]').forEach((input) => {
    values[input.name] = input.checked;
  });
  return values;
}

function onSubmit(event) {
  const form = event.target?.closest?.('[data-form]');
  if (!form) return;
  const handler = FORM_HANDLERS[form.dataset.form];
  if (!handler) return;
  event.preventDefault();
  handler(form, event);
}

/* ---------------------------------------------------------------- Teclado */

function onKeydown(event) {
  if (event.key !== 'Escape') return;
  const state = getState();
  if (state.modal) {
    setState({ modal: null });
    return;
  }
  if (state.menuOpen) setState({ menuOpen: false });
}
