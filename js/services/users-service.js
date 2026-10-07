/**
 * Gestão de usuários e permissões (RF12).
 *
 * No ambiente real, cadastro e alteração de perfil são feitos pelo gateway Java
 * (`/api/auth/...`). Aqui a operação é executada sobre a lista mantida no estado
 * e persistida em localStorage, com registro em auditoria e no log de segurança
 * — suficiente para demonstrar o fluxo completo do administrador.
 */

import { ROLES, isKnownRole, roleLabel } from '../config/roles.js';
import { LOG_CATEGORIES, logAudit } from '../core/audit-log.js';
import { SECURITY_EVENTS, logSecurityEvent } from '../core/security-log.js';
import { getState, pushToast, setState } from '../core/store.js';
import { STORAGE_KEYS, writeStorage } from '../utils/storage.js';
import { normalizeText } from '../utils/format.js';

export const USER_STATUS = Object.freeze({
  ACTIVE: 'Ativo',
  BLOCKED: 'Bloqueado',
  PENDING: 'Aguardando aprovação',
});

export const USER_STATUS_TONE = {
  [USER_STATUS.ACTIVE]: 'success',
  [USER_STATUS.BLOCKED]: 'danger',
  [USER_STATUS.PENDING]: 'warning',
};

/** Preenche rótulos derivados dos enums do back-end. */
export const normalizeUser = (user) => ({
  ...user,
  roleLabel: roleLabel(user.role),
  statusTone: USER_STATUS_TONE[user.status] ?? 'neutral',
  initials: (user.name ?? '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
});

export const listUsers = () => (getState().users ?? []).map(normalizeUser);

export function filterUsers({ search = '', role = 'todos', status = 'todos' } = {}) {
  const term = normalizeText(search);
  return listUsers().filter((user) => {
    if (role !== 'todos' && user.role !== role) return false;
    if (status !== 'todos' && user.status !== status) return false;
    if (!term) return true;
    return (
      normalizeText(user.name).includes(term) ||
      normalizeText(user.email).includes(term) ||
      normalizeText(user.company ?? '').includes(term)
    );
  });
}

function persistUsers(users) {
  writeStorage(STORAGE_KEYS.users, users);
  setState({ users });
}

export function userSummary(users = getState().users ?? []) {
  const byRole = { [ROLES.PRODUCER]: 0, [ROLES.ANALYST]: 0, [ROLES.ADMIN]: 0 };
  users.forEach((user) => {
    if (byRole[user.role] !== undefined) byRole[user.role] += 1;
  });
  return {
    total: users.length,
    active: users.filter((user) => user.status === USER_STATUS.ACTIVE).length,
    blocked: users.filter((user) => user.status === USER_STATUS.BLOCKED).length,
    pending: users.filter((user) => user.status === USER_STATUS.PENDING).length,
    byRole,
  };
}

export function createUser({ name, email, role, company = '—', jobTitle = '—', status = USER_STATUS.ACTIVE }) {
  const state = getState();
  if (!String(name ?? '').trim()) return { ok: false, error: 'Informe o nome completo.' };
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { ok: false, error: 'Informe um e-mail válido.' };
  if (state.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, error: 'Já existe um usuário com este e-mail.' };
  }
  if (!isKnownRole(role)) return { ok: false, error: 'Selecione um perfil de acesso válido.' };

  const user = {
    id: `usr-${Date.now()}`,
    name: String(name).trim(),
    email: normalizedEmail,
    company,
    jobTitle,
    role,
    status,
    createdAt: new Date().toISOString(),
    lastAccessAt: null,
  };

  persistUsers([...state.users, user]);
  logSecurityEvent(SECURITY_EVENTS.USER_CREATED, {
    description: `Usuário ${user.name} criado com o perfil ${roleLabel(role)}.`,
    actor: state.session ? { email: state.session.email } : null,
  });
  logAudit('Usuário cadastrado', {
    category: LOG_CATEGORIES.ADMIN,
    actor: state.session?.name ?? 'Administrador',
    detail: `${user.name} · ${user.email} · ${roleLabel(role)}`,
  });
  pushToast({ title: 'Usuário cadastrado', message: `${user.name} agora tem acesso como ${roleLabel(role)}.` });
  return { ok: true, user };
}

export function updateUser(id, patch) {
  const state = getState();
  const target = state.users.find((user) => user.id === id);
  if (!target) return { ok: false, error: 'Usuário não encontrado.' };
  if (patch.role && !isKnownRole(patch.role)) return { ok: false, error: 'Perfil inválido.' };

  const updated = { ...target, ...patch };
  persistUsers(state.users.map((user) => (user.id === id ? updated : user)));
  logSecurityEvent(SECURITY_EVENTS.USER_UPDATED, {
    description: `Cadastro de ${updated.name} atualizado (perfil ${roleLabel(updated.role)}, status ${updated.status}).`,
    actor: state.session ? { email: state.session.email } : null,
  });
  logAudit('Usuário atualizado', {
    category: LOG_CATEGORIES.ADMIN,
    actor: state.session?.name ?? 'Administrador',
    detail: `${updated.name} · ${roleLabel(updated.role)} · ${updated.status}`,
  });
  pushToast({ title: 'Usuário atualizado', message: `${updated.name} · ${roleLabel(updated.role)} · ${updated.status}.` });
  return { ok: true, user: updated };
}

export function toggleUserStatus(id) {
  const state = getState();
  const target = state.users.find((user) => user.id === id);
  if (!target) return { ok: false, error: 'Usuário não encontrado.' };
  const nextStatus = target.status === USER_STATUS.BLOCKED ? USER_STATUS.ACTIVE : USER_STATUS.BLOCKED;
  const result = updateUser(id, { status: nextStatus });
  if (result.ok && nextStatus === USER_STATUS.BLOCKED) {
    logSecurityEvent(SECURITY_EVENTS.USER_BLOCKED, {
      description: `Acesso de ${target.name} bloqueado pelo administrador.`,
      actor: state.session ? { email: state.session.email } : null,
    });
  }
  return result;
}

export function approveUser(id) {
  return updateUser(id, { status: USER_STATUS.ACTIVE });
}

export const roleOptions = () =>
  Object.values(ROLES).map((role) => ({ value: role, label: roleLabel(role) }));

export const statusOptions = () =>
  Object.values(USER_STATUS).map((status) => ({ value: status, label: status }));
