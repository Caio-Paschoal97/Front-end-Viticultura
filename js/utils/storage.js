/**
 * Acesso ao armazenamento local com proteção.
 *
 * O front-end guarda preferências (tema, URL da API, permissões ajustadas pelo
 * administrador) no navegador. NUNCA gravamos segredos aqui: a Read/Write Key do
 * ThingSpeak fica apenas no back-end (RNF02).
 */

export const STORAGE_KEYS = Object.freeze({
  theme: 'agroclima.theme',
  apiBaseUrl: 'agroclima.apiBaseUrl',
  permissions: 'agroclima.permissions',
  settings: 'agroclima.settings',
  session: 'agroclima.session',
  users: 'agroclima.users',
  securityLog: 'agroclima.securityLog',
  auditLog: 'agroclima.auditLog',
  resolvedAlerts: 'agroclima.resolvedAlerts',
});

const memory = new Map();

const hasStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch (error) {
    return false;
  }
};

export function readStorage(key, fallback = null) {
  try {
    const raw = hasStorage() ? window.localStorage.getItem(key) : memory.get(key) ?? null;
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export function writeStorage(key, value) {
  const payload = JSON.stringify(value);
  try {
    if (hasStorage()) window.localStorage.setItem(key, payload);
    else memory.set(key, payload);
    return true;
  } catch (error) {
    /* Modo privado/quota cheia: mantém em memória para não perder a sessão. */
    memory.set(key, payload);
    return false;
  }
}

export function removeStorage(key) {
  try {
    if (hasStorage()) window.localStorage.removeItem(key);
    memory.delete(key);
    return true;
  } catch (error) {
    memory.delete(key);
    return false;
  }
}
