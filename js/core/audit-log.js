/**
 * Trilha de auditoria do sistema (RF11 — rastreabilidade).
 *
 * Registra ações relevantes (ingestão, alteração de modelo, exportação de
 * relatório, mudanças administrativas) com autor, categoria e resultado.
 */

import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';

export const LOG_CATEGORIES = Object.freeze({
  AUTH: 'Autenticação',
  MONITORING: 'Monitoramento',
  INGESTION: 'Ingestão',
  MODEL: 'Modelagem',
  REPORT: 'Relatório',
  SECURITY: 'Segurança',
  ADMIN: 'Administração',
  SETTINGS: 'Configuração',
});

const MAX_LOGS = 400;

const load = () => {
  const stored = readStorage(STORAGE_KEYS.auditLog, []);
  return Array.isArray(stored) ? stored : [];
};

let logs = load();

const persist = () => writeStorage(STORAGE_KEYS.auditLog, logs.slice(-MAX_LOGS));

export function logAudit(action, { category = LOG_CATEGORIES.ADMIN, actor = 'Sistema', detail = '', status = 'Concluído', level = 'info' } = {}) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    at: new Date().toISOString(),
    action,
    category,
    actor,
    detail,
    status,
    level,
  };
  logs = [...logs.slice(-(MAX_LOGS - 1)), entry];
  persist();
  return entry;
}

export const listAuditLogs = () => [...logs].reverse();

/**
 * Semeia a trilha na primeira execução (dados demonstrativos).
 * Em produção a trilha vem do banco; aqui serve para as telas de auditoria e
 * segurança terem conteúdo na apresentação.
 */
export function seedAuditLogs(entries = []) {
  if (logs.length > 0 || entries.length === 0) return logs.length;
  logs = [...entries].sort((a, b) => new Date(a.at) - new Date(b.at)).slice(-MAX_LOGS);
  persist();
  return logs.length;
}

export function clearAuditLogs() {
  logs = [];
  persist();
}

export const auditCategories = () => Object.values(LOG_CATEGORIES);

export function summarizeLogs(list = logs) {
  const today = new Date().toDateString();
  const errors = list.filter((entry) => entry.level === 'warning' || entry.status === 'Alerta');
  return {
    total: list.length,
    today: list.filter((entry) => new Date(entry.at).toDateString() === today).length,
    errors: errors.length,
    lastAt: list.length ? list[list.length - 1].at : null,
  };
}
