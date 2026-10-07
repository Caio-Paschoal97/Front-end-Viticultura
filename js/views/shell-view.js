/**
 * Estrutura da aplicação autenticada (sidebar + topbar + área da página).
 *
 * Cada região tem um contêiner estável (`#nav-root`, `#topbar-root`,
 * `#footer-root`, `#toast-root`, `#modal-root`) para que main.js possa substituir
 * apenas o que mudou — a área de conteúdo é atualizada separadamente via
 * `main > .page` (ver renderização parcial em `js/main.js`).
 */

import { html } from '../utils/html.js';
import { ENV } from '../config/env.js';
import { ROLE_INFO } from '../config/roles.js';
import { can, menuFor } from '../core/rbac.js';
import { icon } from '../components/icons.js';
import { logo, toastStack } from '../components/ui.js';
import { themeToggleButton } from '../components/theme-toggle.js';
import { relativeTime } from '../utils/format.js';

/** Itens do menu lateral já filtrados pelas permissões vigentes (RF08). */
export function navigationItems(state) {
  const { role, page } = state;
  const openAlerts = (state.data.alerts ?? []).filter((alert) => !alert.resolved).length;

  return menuFor(role, state.permissionOverrides).map(
    (section) => html`<span class="nav-label">${section.section}</span>
      ${section.items.map((item) => {
        const isActive = item.id === page;
        const showBadge = item.id === 'comum/alertas' && openAlerts > 0;
        return html`<button type="button" class="${isActive ? 'active' : ''}"${isActive ? html` aria-current="page"` : ''} data-action="navigate" data-page="${item.id}" title="${item.description}">
          ${icon(item.icon)}<span>${item.label}</span>${showBadge ? html`<em>${openAlerts}</em>` : ''}
        </button>`;
      })}`,
  );
}

export function sidebar(state) {
  const { role, menuOpen, apiStatus, lastSync } = state;
  const account = ROLE_INFO[role] ?? { label: '—', badge: '—', landing: null };
  const apiOnline = apiStatus?.reachable === true;

  return html`<div class="sidebar-overlay ${menuOpen ? 'show' : ''}" data-action="close-menu"></div>
    <aside class="sidebar ${menuOpen ? 'open' : ''}" aria-label="Menu lateral">
      <div class="sidebar-top">
        ${logo({ light: true })}
        <button type="button" class="mobile-close" data-action="close-menu" aria-label="Fechar menu">${icon('close')}</button>
      </div>
      <div class="role-pill">
        <span>${account.badge}</span>
        <div><small>Perfil ativo</small><strong>${account.label}</strong></div>
      </div>
      <nav id="nav-root" aria-label="Navegação principal">${navigationItems(state)}</nav>
      <div class="sidebar-bottom">
        ${account.landing ? html`<button type="button" data-action="navigate" data-page="${account.landing}" title="Página inicial do perfil">${icon('help')}<span>Início do perfil</span></button>` : ''}
        <div class="system-mini">
          <span><i class="${apiOnline ? '' : 'offline'}"></i>${apiOnline ? 'API conectada' : apiStatus?.reachable === false ? 'Modo demonstração' : 'Verificando API'}</span>
          <small>${ENV.version} · ${lastSync ? `sincronizado ${relativeTime(lastSync)}` : 'aguardando primeira consulta'}</small>
        </div>
      </div>
    </aside>`;
}

export function topbar(state) {
  const { role, session, menuOpen } = state;
  const account = ROLE_INFO[role] ?? { label: '—', scope: '—', badge: '—' };
  const openAlerts = (state.data.alerts ?? []).filter((alert) => !alert.resolved).length;
  const canSeeAlerts = can(role, 'alerts.view');

  return html`<header class="topbar">
    <button type="button" class="menu-btn" data-action="open-menu" aria-label="Abrir menu" aria-expanded="${menuOpen}">${icon('menu')}</button>
    <div class="topbar-status">
      <span><i class="${state.apiStatus?.reachable === false ? 'offline' : ''}"></i>${state.apiStatus?.reachable === false ? 'Plataforma em modo demonstração' : 'Plataforma operacional'}</span>
      <small>${ENV.region} · <span data-clock>--:--:--</span></small>
    </div>
    <div class="topbar-actions">
      <button type="button" class="icon-btn" data-action="refresh-data" aria-label="Atualizar dados" title="Atualizar dados">${icon('refresh', 18)}</button>
      ${canSeeAlerts
        ? html`<button type="button" class="icon-btn notification" data-action="navigate" data-page="comum/alertas" aria-label="Alertas" title="Ver alertas">
            ${icon('bell', 18)}${openAlerts > 0 ? html`<em>${openAlerts}</em>` : ''}
          </button>`
        : ''}
      <div class="access-scope">${icon('lock', 15)}<span>Acesso ${account.scope}</span></div>
      ${themeToggleButton(state.theme)}
      <div class="profile">
        <span>${session?.initials ?? account.badge}</span>
        <div><strong>${session?.name ?? '—'}</strong><small>${account.label}</small></div>
      </div>
      <button type="button" class="icon-btn" data-action="logout" title="Sair" aria-label="Sair">${icon('logout', 18)}</button>
    </div>
  </header>`;
}

export function footer(state) {
  const online = state.apiStatus?.reachable === true;
  const source = online ? 'Dados da API AgroClima' : state.apiStatus?.reachable === false ? 'Dados demonstrativos (API indisponível)' : 'Verificando a API…';
  return html`<span>AgroClima Cloud · Projeto Integrador 4º módulo ADS · v${ENV.version}</span>
    <span>${source} · ${state.lastSync ? `última sincronização ${relativeTime(state.lastSync)}` : 'sem sincronização'}</span>`;
}

export function shellView(state, { pageMarkup, modalMarkup }) {
  return html`<div class="app-shell">
    ${sidebar(state)}
    <main>
      <div id="topbar-root">${topbar(state)}</div>
      <div id="progress-root"><div class="progress-line ${state.loading.length ? 'active' : ''}" role="status" aria-live="polite"></div></div>
      ${pageMarkup}
      <footer class="app-footer" id="footer-root">${footer(state)}</footer>
    </main>
    <div id="toast-root">${toastStack(state.toasts ?? [])}</div>
    <div id="modal-root">${modalMarkup ?? ''}</div>
  </div>`;
}
