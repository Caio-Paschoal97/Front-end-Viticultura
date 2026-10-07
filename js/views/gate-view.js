import { html } from '../utils/html.js';
import { PAGES } from '../config/pages.js';
import { ROLE_INFO } from '../config/roles.js';
import { allowedPages, firstPageFor } from '../core/rbac.js';
import { badge, button, card } from '../components/ui.js';
import { icon } from '../components/icons.js';

/**
 * Bloqueio de acesso (RBAC — RF08).
 *
 * Exibida quando o perfil ativo tenta abrir uma página de outro perfil: a tela
 * não é renderizada, a tentativa é registrada na trilha de segurança e o
 * usuário recebe o caminho de volta para o seu próprio painel.
 */
export function gateView({ role, page, pageLabel, at }) {
  const account = ROLE_INFO[role] ?? { label: 'Perfil desconhecido', scope: '—' };
  const pages = allowedPages(role);
  const landing = firstPageFor(role);

  return html`<section class="page">
    <div class="gate">
      ${card(
        html`<div class="gate-icon">${icon('lock', 28)}</div>
          <h1>Acesso restrito</h1>
          <p>
            O perfil <strong>${account.label}</strong> não tem permissão para abrir a página
            <strong>${pageLabel ?? page}</strong>. Cada tipo de usuário acessa apenas as telas do seu escopo
            (produtor, analista ou administrador).
          </p>
          <div class="gate-detail">
            <div class="kv-list rows">
              <div><span>Página solicitada</span><strong>${pageLabel ?? page} · <span class="mono">${page}</span></strong></div>
              <div><span>Perfil ativo</span><strong>${account.label}</strong></div>
              <div><span>Escopo autorizado</span><strong>${account.scope}</strong></div>
              <div><span>Tentativa registrada em</span><strong>${at ? new Date(at).toLocaleTimeString('pt-BR') : '—'}</strong></div>
              <div><span>Telas liberadas para este perfil</span><strong>${pages.length}</strong></div>
            </div>
          </div>
          <div class="button-row">
            ${landing ? button('Ir para o meu painel', { action: 'navigate', dataset: { page: landing } }) : ''}
            ${button('Ver minhas telas', { variant: 'secondary', action: 'close-menu', iconName: 'list' })}
          </div>
          <p class="helper">Páginas do seu perfil: ${pages.slice(0, 8).map((id) => badge(PAGES[id]?.label ?? id, 'neutral'))}</p>`,
        'gate-card',
      )}
    </div>
  </section>`;
}
