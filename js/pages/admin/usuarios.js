import { html } from '../../utils/html.js';
import { formatDateTime, formatNumber, relativeTime } from '../../utils/format.js';
import { badge, button, card, emptyState, inputField, modal, sectionHead, selectField } from '../../components/ui.js';
import { dataTable } from '../../components/tables.js';
import { icon } from '../../components/icons.js';
import { ROLE_INFO, ROLES, roleLabel } from '../../config/roles.js';
import { USER_STATUS, filterUsers, roleOptions, statusOptions, userSummary } from '../../services/users-service.js';
import { getPageFilter, setPageFilter } from '../../core/store.js';
import { header, page, strip } from '../support.js';

/**
 * Gestão de usuários (RF12).
 * Busca, filtros, cadastro, edição de perfil e bloqueio/reativação de contas.
 */
export function adminUsers(context) {
  const search = context.state.filters['admin/usuarios']?.search ?? '';
  const role = context.state.filters['admin/usuarios']?.role ?? 'todos';
  const status = context.state.filters['admin/usuarios']?.status ?? 'todos';
  const users = filterUsers({ search, role, status });
  const summary = userSummary(context.state.users ?? []);

  const rows = users.map((user) => ({
    ...user,
    lastAccessLabel: user.lastAccessAt ? `${relativeTime(user.lastAccessAt)} · ${formatDateTime(user.lastAccessAt)}` : 'Nunca acessou',
    actions: [
      button('Editar', { variant: 'icon', iconName: 'edit', action: 'open-modal', dataset: { modal: 'user-form', user: user.id } }),
      button(user.status === USER_STATUS.BLOCKED ? 'Reativar' : 'Bloquear', {
        variant: 'icon',
        iconName: user.status === USER_STATUS.BLOCKED ? 'user-check' : 'user-x',
        action: 'toggle-user',
        dataset: { user: user.id },
      }),
    ],
  }));

  return page(
    header(context, {
      title: 'Usuários',
      subtitle: 'Gerencie contas, perfis e acessos à plataforma',
      varietyMode: 'hidden',
      actions: [
        button('Exportar lista', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'users' } }),
        button('Novo usuário', { iconName: 'plus', action: 'open-modal', dataset: { modal: 'user-form' } }),
      ],
    }),
    strip(context, {
      extra: `${summary.total} conta(s) · ${summary.pending} aguardando aprovação`,
      loadingLabel: 'Consolidando a base de usuários…',
    }),
    html`<div class="metrics-grid four">
      <div class="card metric"><div class="metric-icon tone-green">${icon('users')}</div><div class="metric-copy"><span>Total de contas</span><strong>${formatNumber(summary.total)}</strong><small>Base completa da plataforma</small></div></div>
      <div class="card metric"><div class="metric-icon tone-blue">${icon('user-check')}</div><div class="metric-copy"><span>Ativos</span><strong>${formatNumber(summary.active)}</strong><small>Acesso liberado</small></div></div>
      <div class="card metric"><div class="metric-icon tone-gold">${icon('clock')}</div><div class="metric-copy"><span>Aguardando aprovação</span><strong>${formatNumber(summary.pending)}</strong><small>Autocadastros pendentes</small></div></div>
      <div class="card metric"><div class="metric-icon tone-red">${icon('user-x')}</div><div class="metric-copy"><span>Bloqueados</span><strong>${formatNumber(summary.blocked)}</strong><small>Sem acesso ao sistema</small></div></div>
    </div>`,
    card(
      html`<div class="searchbox">${icon('search')}<input type="search" placeholder="Buscar por nome, e-mail ou empresa" aria-label="Buscar usuários" value="${search}" data-action="set-filter" data-key="search" /></div>
        ${selectField({
          value: role,
          label: 'Perfil',
          options: [{ value: 'todos', label: 'Todos os perfis' }, ...roleOptions()],
          action: 'set-filter',
          dataset: { key: 'role' },
        })}
        ${selectField({
          value: status,
          label: 'Status',
          options: [{ value: 'todos', label: 'Todos os status' }, ...statusOptions()],
          action: 'set-filter',
          dataset: { key: 'status' },
        })}
        ${button('Novo usuário', { iconName: 'plus', action: 'open-modal', dataset: { modal: 'user-form' } })}`,
      'toolbar',
    ),
    card(
      html`${sectionHead({
        title: `${formatNumber(rows.length)} usuário(s) listado(s)`,
        subtitle: `${summary.active} ativos · ${summary.pending} pendentes · ${summary.blocked} bloqueados`,
        action: button('Limpar filtros', { variant: 'ghost', action: 'clear-user-filters' }),
      })}
      ${dataTable({
        columns: [
          { label: 'Usuário', render: (row) => html`<div class="user-cell"><span>${row.initials}</span><div><strong>${row.name}</strong><small>${row.company}</small></div></div>` },
          { label: 'E-mail', key: 'email' },
          { label: 'Perfil', render: (row) => badge(row.roleLabel, row.role === ROLES.ADMIN ? 'purple' : row.role === ROLES.ANALYST ? 'info' : 'success') },
          { label: 'Status', render: (row) => badge(row.status, row.statusTone) },
          { label: 'Último acesso', key: 'lastAccessLabel' },
          { label: 'Ações', render: (row) => html`<div class="actions">${row.actions}</div>` },
        ],
        rows,
        emptyTitle: 'Nenhum usuário encontrado',
        emptyMessage: 'Ajuste os filtros de busca ou cadastre uma nova conta.',
        foot: html`<span>Perfis de acesso: ${Object.values(ROLES).map((item) => roleLabel(item)).join(' · ')}</span><span>Base sincronizada ${relativeTime(context.lastSync)}</span>`,
      })}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Política de acesso por perfil', subtitle: 'Resumo do que cada perfil pode fazer (RBAC — RF08)' })}
      <div class="policy-list">${Object.values(ROLES).map(
        (roleKey) => html`<div>${badge(ROLE_INFO[roleKey].badge, roleKey === ROLES.ADMIN ? 'purple' : roleKey === ROLES.ANALYST ? 'info' : 'success')}<div><strong>${ROLE_INFO[roleKey].label}</strong><p>${ROLE_INFO[roleKey].description} ${formatNumber(summary.byRole[roleKey])} conta(s) neste perfil.</p></div></div>`,
      )}</div>`,
      'table-card',
    ),
  );
}

/** Modal de cadastro/edição de usuário (renderizado por `renderModal`). */
export function userFormModal(state, payload = {}) {
  const editing = (state.users ?? []).find((user) => user.id === payload.user);
  const isEdit = Boolean(editing);
  return modal({
    title: isEdit ? `Editar ${editing.name}` : 'Novo usuário',
    subtitle: isEdit ? 'Atualize perfil, status ou dados de contato' : 'A conta criada já fica disponível para acesso conforme o perfil escolhido',
    body: html`<form data-form="user" id="user-form">
      <input type="hidden" name="id" value="${editing?.id ?? ''}" />
      ${inputField({ label: 'Nome completo', name: 'name', value: editing?.name ?? '', placeholder: 'Ex.: Ana Souza', full: true })}
      ${inputField({ label: 'E-mail corporativo', name: 'email', value: editing?.email ?? '', type: 'email', placeholder: 'nome@empresa.com', full: true })}
      ${inputField({ label: 'Empresa', name: 'company', value: editing?.company ?? '', placeholder: 'Nome da empresa' })}
      ${inputField({ label: 'Cargo', name: 'jobTitle', value: editing?.jobTitle ?? '', placeholder: 'Ex.: Supervisor de campo' })}
      ${selectField({ label: 'Perfil de acesso', name: 'role', value: editing?.role ?? ROLES.PRODUCER, options: roleOptions() })}
      ${selectField({ label: 'Status', name: 'status', value: editing?.status ?? USER_STATUS.ACTIVE, options: statusOptions() })}
      <p class="helper">A senha é definida pelo gateway de identidade; nenhuma credencial é armazenada no navegador (RNF02).</p>
    </form>`,
    footer: html`<button type="button" class="btn btn-secondary" data-action="close-modal"><span>Cancelar</span></button><button type="submit" form="user-form" class="btn btn-primary"><span>${isEdit ? 'Salvar alterações' : 'Criar usuário'}</span></button>`,
  });
}

/** Modal somente-leitura com os detalhes de um acesso. */
export function userDetailModal(state, payload = {}) {
  const user = (state.users ?? []).find((item) => item.id === payload.user);
  if (!user) return modal({ title: 'Usuário não encontrado', body: emptyState({ iconName: 'user-x', title: 'Registro removido' }) });
  return modal({
    title: user.name,
    subtitle: user.email,
    body: html`<div class="kv-list rows">
      <div><span>Perfil</span><strong>${roleLabel(user.role)}</strong></div>
      <div><span>Status</span><strong>${user.status}</strong></div>
      <div><span>Empresa</span><strong>${user.company}</strong></div>
      <div><span>Cargo</span><strong>${user.jobTitle}</strong></div>
      <div><span>Criado em</span><strong>${formatDateTime(user.createdAt)}</strong></div>
      <div><span>Último acesso</span><strong>${user.lastAccessAt ? formatDateTime(user.lastAccessAt) : 'Nunca acessou'}</strong></div>
    </div>`,
  });
}

export { getPageFilter, setPageFilter };
