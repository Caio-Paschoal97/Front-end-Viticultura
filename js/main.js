/**
 * Ponto de entrada do dashboard AgroClima Cloud.
 *
 * Responsabilidades:
 *  1. hidratar o estado global (sessão, tema, configurações, usuários, trilhas);
 *  2. garantir os dados da página atual (`primeData` + `ensureData`, com
 *     fallback demonstrativo quando a API está fora do ar);
 *  3. renderizar com atualização parcial: a área `main > .page` é substituída
 *     sem recriar sidebar/topbar, preservando foco e posição de rolagem;
 *  4. aplicar a guarda de acesso (RBAC) antes de montar qualquer tela.
 */

import { html } from './utils/html.js';
import { mount, queryRequired, replaceElement, scrollToTop } from './utils/dom.js';
import { STORAGE_KEYS, readStorage, writeStorage } from './utils/storage.js';
import { getState, setState, subscribe } from './core/store.js';
import { getPermissionOverrides } from './core/rbac.js';
import { restoreSession } from './core/auth.js';
import { LOG_CATEGORIES, listAuditLogs, logAudit, seedAuditLogs } from './core/audit-log.js';
import { listSecurityEvents } from './core/security-log.js';
import { applyTheme, currentTheme } from './components/theme-toggle.js';
import { DEMO_AUDIT_LOGS, DEMO_USERS } from './data/demo/records.js';
import { loadSettings, saveSettings } from './config/settings.js';
import { ensureData, primeData } from './services/data-service.js';
import { renderModal, renderPage, resourcesForPage } from './config/routes.js';
import { authView } from './views/auth-view.js';
import { gateView } from './views/gate-view.js';
import { footer, navigationItems, shellView, topbar } from './views/shell-view.js';
import { toastStack } from './components/ui.js';
import { bindEvents } from './events/index.js';

const root = queryRequired('#root');

/* ------------------------------------------------------------- Hidratação */

function hydrateState() {
  const storedUsers = readStorage(STORAGE_KEYS.users, null);
  const users = Array.isArray(storedUsers) && storedUsers.length > 0 ? storedUsers : [...DEMO_USERS];
  if (!Array.isArray(storedUsers) || storedUsers.length === 0) writeStorage(STORAGE_KEYS.users, users);

  seedAuditLogs(DEMO_AUDIT_LOGS);

  const theme = currentTheme();
  const settings = loadSettings();
  if (settings.theme !== theme) saveSettings({ theme });

  const storedAlerts = readStorage(STORAGE_KEYS.resolvedAlerts, []);

  setState({
    settings: { ...settings, theme },
    theme,
    users,
    auditLogs: listAuditLogs(),
    securityEvents: listSecurityEvents(),
    resolvedAlerts: Array.isArray(storedAlerts) ? storedAlerts : [],
    permissionOverrides: getPermissionOverrides(),
  });

  applyTheme(theme, { persist: false });

  const session = restoreSession();
  if (session) {
    logAudit('Sessão restaurada no navegador', {
      category: LOG_CATEGORIES.AUTH,
      actor: `${session.name} (${session.role})`,
      detail: 'Usuário reabriu o painel sem novo login.',
    });
    setState({ auditLogs: listAuditLogs() });
  }
}

/* ------------------------------------------------------------------ Dados */

/** Preenche o estado com cache/dados demonstrativos antes da primeira pintura. */
function primeForPage(state) {
  const resources = resourcesForPage(state.page);
  if (resources.length === 0) return;
  primeData(resources, { variety: state.variety, period: state.period, role: state.role });
}

/** Busca os recursos da página atual na API (com fallback demonstrativo). */
async function syncPage({ force = false } = {}) {
  const state = getState();
  if (!state.authenticated || !state.page) return;
  const resources = resourcesForPage(state.page);
  if (resources.length === 0) return;

  const context = { variety: state.variety, period: state.period, role: state.role };
  try {
    await ensureData(resources, context, { force });
  } catch (error) {
    // `ensureData` já converte falhas em dados demonstrativos; aqui só evitamos
    // que uma exceção inesperada interrompa a renderização.
    console.error('[AgroClima] Falha ao sincronizar os dados da página:', error);
  }
  setState({ auditLogs: listAuditLogs(), securityEvents: listSecurityEvents() });
}

/* ------------------------------------------------------------ Renderização */

function pageMarkup(state) {
  if (!state.authenticated) return html``;
  if (state.accessDenied) {
    const { role, page, label, at } = state.accessDenied;
    return gateView({ role, page, pageLabel: label, at });
  }
  if (!state.page) {
    return html`<section class="page">
      <div class="empty-state">
        <strong>Nenhuma página disponível para este perfil</strong>
        <p>Todas as telas do seu perfil foram revogadas pelo administrador. Solicite a revisão das permissões.</p>
      </div>
    </section>`;
  }
  return renderPage(state);
}

function modalMarkup(state) {
  return renderModal(state) ?? '';
}

/** Descreve o elemento em foco para devolvê-lo depois de um patch de DOM. */
function captureFocus() {
  const active = document.activeElement;
  if (!active || active === document.body) return null;
  const dataset = active.dataset ?? {};
  if (!dataset.action && !active.name) return null;
  return {
    action: dataset.action ?? null,
    key: dataset.key ?? null,
    name: active.getAttribute('name'),
    selectionStart: typeof active.selectionStart === 'number' ? active.selectionStart : null,
  };
}

function restoreFocus(descriptor) {
  if (!descriptor) return;
  const selector = descriptor.action
    ? `[data-action="${descriptor.action}"]${descriptor.key ? `[data-key="${descriptor.key}"]` : ''}`
    : `[name="${descriptor.name}"]`;
  const element = document.querySelector(selector);
  if (!element || typeof element.focus !== 'function') return;
  element.focus({ preventScroll: true });
  if (descriptor.selectionStart !== null && typeof element.setSelectionRange === 'function') {
    try {
      element.setSelectionRange(descriptor.selectionStart, descriptor.selectionStart);
    } catch (error) {
      /* alguns tipos de input não suportam seleção — ignorar */
    }
  }
}

function patchPage(state) {
  const current = root.querySelector('main > .page');
  if (!current) {
    mount(root, shellView(state, { pageMarkup: pageMarkup(state), modalMarkup: modalMarkup(state) }));
    return;
  }
  replaceElement(current, pageMarkup(state));
}

function patchChrome(state) {
  const topbarRoot = root.querySelector('#topbar-root');
  if (topbarRoot) mount(topbarRoot, topbar(state));

  const footerRoot = root.querySelector('#footer-root');
  if (footerRoot) mount(footerRoot, footer(state));

  const navRoot = root.querySelector('#nav-root');
  if (navRoot) mount(navRoot, navigationItems(state));

  const progressRoot = root.querySelector('#progress-root');
  if (progressRoot) {
    mount(progressRoot, html`<div class="progress-line ${state.loading.length ? 'active' : ''}" role="status" aria-live="polite"></div>`);
  }

  const toastRoot = root.querySelector('#toast-root');
  if (toastRoot) mount(toastRoot, toastStack(state.toasts ?? []));

  const modalRoot = root.querySelector('#modal-root');
  if (modalRoot) mount(modalRoot, modalMarkup(state));
}

function render(state, changedKeys = []) {
  const has = (key) => changedKeys.includes(key);

  if (!state.authenticated) {
    mount(root, authView(state));
    return;
  }

  const structureChanged =
    has('page') ||
    has('role') ||
    has('session') ||
    has('accessDenied') ||
    has('permissionOverrides') ||
    !root.querySelector('.app-shell');

  if (structureChanged) {
    mount(root, shellView(state, { pageMarkup: pageMarkup(state), modalMarkup: modalMarkup(state) }));
    return;
  }

  const focus = captureFocus();
  if (has('data') || has('sources') || has('loading') || has('lastSync') || has('filters') || has('tabs') || has('resolvedAlerts') || has('users') || has('settings') || has('reportResults')) {
    patchPage(state);
  }
  if (has('apiStatus') || has('theme') || has('menuOpen') || has('data') || has('loading') || has('lastSync') || has('toasts') || has('modal')) {
    patchChrome(state);
  }
  restoreFocus(focus);
}

/* ------------------------------------------------------------------ Relógio */

function startClock() {
  const update = () => {
    const target = document.querySelector('[data-clock]');
    if (target) target.textContent = new Date().toLocaleTimeString('pt-BR');
  };
  update();
  setInterval(update, 1000);
}

/* --------------------------------------------------------------- Inicialização */

function updateMenu(state) {
  root.querySelector('.sidebar')?.classList.toggle('open', Boolean(state.menuOpen));
  root.querySelector('.sidebar-overlay')?.classList.toggle('show', Boolean(state.menuOpen));
}

hydrateState();
bindEvents({ onReloadPage: syncPage });
startClock();

subscribe((state, changedKeys) => {
  const has = (key) => changedKeys.includes(key);
  const dataChanged = (has('page') || has('variety') || has('period')) && state.authenticated && state.page;
  if (dataChanged) primeForPage(state);

  render(state, changedKeys);
  if (has('accessDenied') && state.accessDenied) {
    /* Um bloqueio do RBAC redireciona o menu para a página anterior segura. */
    updateMenu(state);
  } else if (has('menuOpen')) {
    updateMenu(state);
  }
  if (dataChanged) {
    if (has('page')) scrollToTop(root);
    syncPage({ reason: 'navigation' });
  }
});

render(getState(), ['authenticated', 'page']);
if (getState().authenticated) syncPage();
