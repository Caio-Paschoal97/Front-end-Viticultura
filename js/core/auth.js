/**
 * Autenticação e sessão (RF08).
 *
 * Fluxo real: o gateway Java autentica, emite o JWT e informa o perfil; a API
 * Python confia nos cabeçalhos `X-User-Id` / `X-User-Role` (ver
 * `app/core/context.py`). Se o gateway não estiver acessível — situação comum
 * durante a apresentação do projeto — o acesso é validado nas contas de
 * demonstração e o evento fica registrado na trilha de segurança.
 *
 * Nenhuma senha é gravada: o cadastro apenas cria o registro do usuário
 * (nome, e-mail, perfil, status) para aprovação do administrador (RNF02/LGPD).
 */

import { ENV } from '../config/env.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES, demoAccountByEmail, inferRoleFromEmail, isKnownRole, roleLabel } from '../config/roles.js';
import { api } from './api-client.js';
import { firstPageFor } from './rbac.js';
import { SECURITY_EVENTS, logSecurityEvent } from './security-log.js';
import { clearSession, getSession, setSession } from './session.js';
import { getState, pushToast, setState } from './store.js';

export const MIN_PASSWORD_LENGTH = 6;

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

const buildSession = ({ id, name, email, role, token = null, mode }) => ({
  id: String(id ?? normalizeEmail(email) ?? 'usuario-demo'),
  name: name ?? 'Usuário',
  email: normalizeEmail(email),
  role,
  token,
  mode,
  startedAt: new Date().toISOString(),
});

export function validateCredentials(email, password) {
  const value = normalizeEmail(email);
  if (!value) return { ok: false, error: 'Informe o e-mail de acesso.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { ok: false, error: 'E-mail inválido. Use o formato nome@empresa.com.' };
  if (!password) return { ok: false, error: 'Informe a senha.' };
  if (String(password).length < MIN_PASSWORD_LENGTH) return { ok: false, error: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  return { ok: true, email: value };
}

/** Login pelo gateway Java (caminho de produção). */
async function signInWithGateway(email, password) {
  const payload = await api.gatewayLogin({ email, password });
  const role = payload?.role ?? payload?.perfil ?? payload?.user?.role;
  if (!isKnownRole(role)) {
    throw new Error('O gateway respondeu sem um perfil de acesso válido (PRODUCER, ANALYST ou ADMIN).');
  }
  return buildSession({
    id: payload?.id ?? payload?.user?.id ?? normalizeEmail(email),
    name: payload?.name ?? payload?.user?.name ?? email,
    email,
    role,
    token: payload?.token ?? payload?.access_token ?? null,
    mode: 'api',
  });
}

/** Login nas contas de demonstração (fallback controlado). */
function signInWithDemo(email, password) {
  const account = demoAccountByEmail(email);
  if (account) {
    if (password !== DEMO_PASSWORD) {
      return { error: `Senha incorreta para esta conta de demonstração. Use "${DEMO_PASSWORD}".` };
    }
    return {
      session: buildSession({ id: account.email, name: account.name, email: account.email, role: account.role, mode: 'demo' }),
      demo: true,
    };
  }

  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return { error: `Senha incorreta. No modo demonstração use "${DEMO_PASSWORD}" ou uma senha com ${MIN_PASSWORD_LENGTH}+ caracteres.` };
  }

  const role = inferRoleFromEmail(email);
  return {
    session: buildSession({ id: normalizeEmail(email), name: normalizeEmail(email).split('@')[0].replace(/[._-]+/g, ' '), email, role, mode: 'demo' }),
    demo: true,
  };
}

/**
 * Autentica o usuário. Retorna `{ ok, session, role, message }`.
 * Sempre registra o resultado no log de segurança (RF11).
 */
export async function signIn({ email, password }) {
  const validation = validateCredentials(email, password);
  if (!validation.ok) {
    logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILURE, { description: validation.error, actor: { email: normalizeEmail(email) }, meta: { reason: 'validation' } });
    return { ok: false, error: validation.error };
  }

  setState({ authBusy: true, authError: null });
  try {
    let session = null;
    let message = null;

    try {
      session = await signInWithGateway(validation.email, password);
      if (session.mode === 'api') logSecurityEvent(SECURITY_EVENTS.LOGIN_SUCCESS, { description: 'Autenticado pelo gateway de identidade.', actor: { email: session.email } });
    } catch (error) {
      if (!ENV.demoFallbackEnabled) {
        logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILURE, { description: error.message, actor: { email: validation.email } });
        return { ok: false, error: `Não foi possível autenticar no gateway: ${error.message}` };
      }
      const demo = signInWithDemo(validation.email, password);
      if (demo.error) {
        logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILURE, { description: demo.error, actor: { email: validation.email }, meta: { gateway: error.kind ?? 'unavailable' } });
        return { ok: false, error: demo.error };
      }
      session = demo.session;
      message = 'Gateway de identidade fora do ar: sessão iniciada no modo demonstração.';
      logSecurityEvent(SECURITY_EVENTS.LOGIN_FALLBACK, { description: 'Login validado nas contas de demonstração.', actor: { email: session.email }, meta: { gateway: error.kind ?? 'unavailable' } });
    }

    setSession(session);
    const page = firstPageFor(session.role);
    setState({
      authenticated: true,
      authBusy: false,
      authError: null,
      session,
      role: session.role,
      page,
      requestedPage: null,
      accessDenied: null,
    });

    if (message) pushToast({ title: 'Modo demonstração', message, tone: 'warn' });
    else pushToast({ title: `Bem-vindo, ${session.name.split(' ')[0]}!`, message: `Perfil ativo: ${roleLabel(session.role)}.`, tone: 'success' });

    return { ok: true, session, role: session.role, message };
  } finally {
    if (getState().authBusy) setState({ authBusy: false });
  }
}

/**
 * Cadastro de solicitação de acesso (RF12).
 * Cria o registro com status "Aguardando aprovação" e abre a sessão do usuário.
 */
export function signUp(form) {
  const validation = validateCredentials(form.email, form.password);
  if (!validation.ok) return { ok: false, error: validation.error };
  if (form.password !== form.confirmPassword) return { ok: false, error: 'A confirmação de senha não confere.' };
  if (!String(form.name ?? '').trim()) return { ok: false, error: 'Informe o nome completo.' };

  const role = isKnownRole(form.role) ? form.role : ROLES.PRODUCER;
  const user = {
    id: `usr-${Date.now()}`,
    name: String(form.name).trim(),
    email: validation.email,
    company: String(form.company ?? '').trim() || '—',
    jobTitle: String(form.jobTitle ?? '').trim() || '—',
    phone: String(form.phone ?? '').trim() || '—',
    role,
    status: 'Aguardando aprovação',
    createdAt: new Date().toISOString(),
    lastAccessAt: new Date().toISOString(),
  };

  setState({ users: [...getState().users, user] });
  logSecurityEvent(SECURITY_EVENTS.USER_CREATED, { description: `Autocadastro de ${user.name} (${roleLabel(role)}) aguardando aprovação.`, actor: { email: user.email } });

  const session = buildSession({ id: user.id, name: user.name, email: user.email, role, mode: 'demo' });
  setSession(session);
  setState({ authenticated: true, session, role, page: firstPageFor(role), authMode: 'login', authError: null, requestedPage: null });
  pushToast({ title: 'Cadastro enviado', message: 'Seu acesso foi registrado e está aguardando aprovação do administrador.', tone: 'success' });
  return { ok: true, session };
}

/** Recuperação de senha: no protótipo só registra a solicitação. */
export function requestPasswordReset(email) {
  const value = normalizeEmail(email);
  if (!value) return { ok: false, error: 'Informe o e-mail cadastrado.' };
  const event = logSecurityEvent(SECURITY_EVENTS.SETTINGS_CHANGED, {
    description: `Solicitação de redefinição de senha para ${value}.`,
    actor: { email: value },
    meta: { flow: 'password-reset' },
  });
  return { ok: true, event };
}

/** Restaura a sessão gravada no navegador (mantém o usuário logado ao recarregar). */
export function restoreSession() {
  const session = getSession();
  if (!session || !isKnownRole(session.role)) return null;
  const page = firstPageFor(session.role);
  setState({ authenticated: true, session, role: session.role, page, requestedPage: null });
  logSecurityEvent(SECURITY_EVENTS.SESSION_RESTORED, { description: 'Sessão restaurada do armazenamento local.', actor: { email: session.email } });
  return session;
}

/** Encerra a sessão e volta para a tela de login. */
export function signOut() {
  const session = getSession();
  if (session) {
    logSecurityEvent(SECURITY_EVENTS.LOGOUT, { description: 'Logout solicitado pelo usuário.', actor: { email: session.email } });
  }
  clearSession();
  setState({
    authenticated: false,
    session: null,
    role: null,
    page: null,
    requestedPage: null,
    accessDenied: null,
    menuOpen: false,
    authMode: 'login',
    authError: null,
    modal: null,
  });
}

export const demoAccounts = () => DEMO_ACCOUNTS;
export const demoPassword = () => DEMO_PASSWORD;
