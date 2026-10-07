/**
 * Autenticação (RF08), sessão e gestão de usuários (RF12).
 *
 * O gateway Java é o caminho de produção; quando ele não está no ar a sessão é
 * aberta nas contas de demonstração, o que mantém a apresentação do projeto
 * funcionando sem esconder a indisponibilidade (evento fica na trilha).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES } from '../js/config/roles.js';
import { MIN_PASSWORD_LENGTH, demoPassword, restoreSession, signIn, signOut, validateCredentials } from '../js/core/auth.js';
import { getFetchImpl, setFetchImpl } from '../js/core/api-client.js';
import { createInitialState, getState, setState } from '../js/core/store.js';
import { clearSession, getSession, identityHeaders, normalizeSession, setSession } from '../js/core/session.js';
import { USER_STATUS, createUser, filterUsers, toggleUserStatus, updateUser, userSummary } from '../js/services/users-service.js';
import { DEMO_USERS } from '../js/data/demo/records.js';
import { SECURITY_EVENTS, listSecurityEvents } from '../js/core/security-log.js';

const withOfflineGateway = async (run) => {
  const previous = getFetchImpl();
  setFetchImpl(async () => {
    throw new TypeError('fetch failed');
  });
  try {
    return await run();
  } finally {
    setFetchImpl(previous);
  }
};

test('validação de credenciais cobre e-mail e senha (RF08)', () => {
  assert.equal(validateCredentials('', '').ok, false);
  assert.equal(validateCredentials('sem-arroba', DEMO_PASSWORD).ok, false);
  assert.equal(validateCredentials('produtor@agroclima.com', '123').ok, false);
  assert.equal(validateCredentials('produtor@agroclima.com', DEMO_PASSWORD).ok, true);
  assert.equal(MIN_PASSWORD_LENGTH, 6);
  assert.equal(validateCredentials('PRODUTOR@AgroClima.com', DEMO_PASSWORD).email, 'produtor@agroclima.com');
});

test('login nas contas de demonstração abre a sessão com o perfil correto', async () => {
  setState(createInitialState());
  clearSession();

  for (const account of DEMO_ACCOUNTS) {
    const result = await withOfflineGateway(() => signIn({ email: account.email, password: demoPassword() }));
    assert.equal(result.ok, true, `falha no login de ${account.email}`);
    assert.equal(result.role, account.role);
    assert.equal(getState().authenticated, true);
    assert.equal(getState().page, account.role === ROLES.PRODUCER ? 'produtor/visao-geral' : account.role === ROLES.ANALYST ? 'analista/dashboard' : 'admin/dashboard');
    assert.equal(getSession().mode, 'demo');
  }

  const fallback = listSecurityEvents({ type: SECURITY_EVENTS.LOGIN_FALLBACK });
  assert.ok(fallback.length >= 1, 'o uso do modo demonstração precisa ficar registrado');
});

test('senha incorreta não autentica e fica na trilha de segurança', async () => {
  setState(createInitialState());
  clearSession();
  const before = listSecurityEvents({ type: SECURITY_EVENTS.LOGIN_FAILURE }).length;
  const result = await withOfflineGateway(() => signIn({ email: 'produtor@agroclima.com', password: 'senha-errada' }));
  assert.equal(result.ok, false);
  assert.equal(getState().authenticated, false);
  assert.equal(listSecurityEvents({ type: SECURITY_EVENTS.LOGIN_FAILURE }).length >= before + 1, true);
});

test('sessão é restaurada e alimenta os cabeçalhos de identidade da API', () => {
  setSession({ id: 'u-1', name: 'Rafael Nunes', email: 'analista@agroclima.com', role: ROLES.ANALYST, token: 'jwt-demo' });
  const session = restoreSession();
  assert.equal(session.role, ROLES.ANALYST);
  const headers = identityHeaders();
  assert.equal(headers['X-User-Id'], 'u-1');
  assert.equal(headers['X-User-Role'], ROLES.ANALYST);
  assert.equal(headers.Authorization, 'Bearer jwt-demo');
  assert.equal(normalizeSession({ role: 'DESCONHECIDO' }), null, 'perfil fora do enum precisa ser recusado');

  signOut();
  assert.equal(getSession(), null);
  assert.equal(getState().authenticated, false);
});

test('gestão de usuários: criar, aprovar, bloquear e resumir (RF12)', () => {
  setState({ ...createInitialState(), users: [...DEMO_USERS] });
  const before = userSummary();

  const created = createUser({ name: 'Novo Produtor', email: 'novo@fazenda.com', role: ROLES.PRODUCER, company: 'Fazenda Nova', jobTitle: 'Produtor' });
  assert.equal(created.ok, true);
  assert.equal(userSummary().total, before.total + 1);

  const pending = createUser({ name: 'Pendente', email: 'pendente@fazenda.com', role: ROLES.ANALYST, status: USER_STATUS.PENDING });
  assert.equal(pending.ok, true);
  const summary = userSummary();
  assert.equal(summary.pending >= 1, true);
  assert.equal(summary.byRole[ROLES.PRODUCER] > 0, true);

  const blocked = toggleUserStatus(created.user.id);
  assert.equal(blocked.ok, true);
  assert.equal(blocked.user.status, USER_STATUS.BLOCKED);
  assert.equal(toggleUserStatus(created.user.id).user.status, USER_STATUS.ACTIVE);
  const updated = updateUser(created.user.id, { jobTitle: 'Diretor' });
  assert.equal(updated.user.jobTitle, 'Diretor');

  assert.equal(filterUsers({ search: 'novo' }).length >= 1, true);
  assert.equal(filterUsers({ role: ROLES.ADMIN }).every((user) => user.role === ROLES.ADMIN), true);

  assert.equal(createUser({ name: '', email: 'x@y.com' }).ok, false);
  assert.equal(createUser({ name: 'Duplicado', email: 'novo@fazenda.com', role: ROLES.PRODUCER }).ok, false, 'e-mail duplicado deve ser recusado');
});
