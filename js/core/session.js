/**
 * Sessão autenticada.
 *
 * Fica separada do store para evitar importação circular entre o cliente HTTP
 * (que precisa dos headers de identidade) e o módulo de autenticação (que usa o
 * cliente HTTP para falar com o gateway).
 */

import { isKnownRole } from '../config/roles.js';
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '../utils/storage.js';

let session = readStorage(STORAGE_KEYS.session, null);

/** Sessão no formato esperado pelo gateway: id + perfil + token (JWT). */
export function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object' || !isKnownRole(raw.role)) return null;
  return {
    id: String(raw.id ?? raw.userId ?? 'anon'),
    name: raw.name ?? 'Usuário',
    email: raw.email ?? '',
    role: raw.role,
    token: raw.token ?? null,
    mode: raw.mode === 'api' ? 'api' : 'demo',
    startedAt: raw.startedAt ?? new Date().toISOString(),
  };
}

export const getSession = () => session;

export function setSession(raw) {
  session = normalizeSession(raw);
  if (session) writeStorage(STORAGE_KEYS.session, session);
  else removeStorage(STORAGE_KEYS.session);
  return session;
}

export function clearSession() {
  session = null;
  removeStorage(STORAGE_KEYS.session);
}

/** Headers de identidade repassados ao back-end Python (ver docs/CONTRATO-API.md). */
export function identityHeaders() {
  if (!session) return {};
  const headers = { 'X-User-Id': session.id, 'X-User-Role': session.role };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  return headers;
}
