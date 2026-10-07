/**
 * Configurações da plataforma (RF12) com os valores padrão de fábrica.
 *
 * As preferências ficam no navegador (`agroclima.settings`) para que o
 * administrador possa ajustar limites, notificações e integrações durante a
 * demonstração sem depender do back-end. Em produção, os mesmos campos são
 * persistidos pelo gateway Java e lidos por todos os perfis.
 */

import { API_PREFIX, ENV } from './env.js';
import { ALERT_THRESHOLDS, IDEAL } from '../core/data-quality.js';
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '../utils/storage.js';

export const DEFAULT_SETTINGS = Object.freeze({
  /* Geral */
  systemName: 'AgroClima Cloud',
  region: ENV.region,
  language: 'pt-BR',
  timezone: 'America/Recife',
  institution: 'Projeto Integrador — 4º módulo de Análise e Desenvolvimento de Sistemas. Dashboard de monitoramento climático e logístico em nuvem para exportadoras de frutas do Vale do São Francisco.',

  /* Aparência */
  theme: 'light',

  /* Notificações e limites (espelham o AlertService do back-end) */
  notifyCritical: true,
  notifyWarnings: true,
  notifyDailyReport: true,
  temperatureAlertHigh: ALERT_THRESHOLDS.temperatureHigh,
  humidityAlertLow: ALERT_THRESHOLDS.humidityLow,
  temperatureIdealMin: IDEAL.temperature.min,
  temperatureIdealMax: IDEAL.temperature.max,
  humidityIdealMin: IDEAL.humidity.min,
  humidityIdealMax: IDEAL.humidity.max,

  /* Segurança */
  sessionTimeoutMinutes: 60,
  auditRetentionDays: 90,
  twoFactorEnabled: false,

  /* Integrações */
  apiBaseUrl: '',
  authGatewayUrl: ENV.authGatewayUrl,
  syncIntervalSeconds: ENV.thingspeakMinIntervalSeconds,
  cacheTtlSeconds: 30,
});

/** Números que precisam chegar como número ao store (inputs devolvem string). */
const NUMERIC_KEYS = Object.freeze([
  'temperatureAlertHigh',
  'humidityAlertLow',
  'temperatureIdealMin',
  'temperatureIdealMax',
  'humidityIdealMin',
  'humidityIdealMax',
  'sessionTimeoutMinutes',
  'auditRetentionDays',
  'syncIntervalSeconds',
  'cacheTtlSeconds',
]);

const BOOLEAN_KEYS = Object.freeze(['notifyCritical', 'notifyWarnings', 'notifyDailyReport', 'twoFactorEnabled']);

/** Normaliza o que veio do formulário (string) para o tipo correto. */
export function normalizeSettings(patch = {}) {
  const next = {};
  Object.entries(patch).forEach(([key, value]) => {
    if (!(key in DEFAULT_SETTINGS)) return;
    if (NUMERIC_KEYS.includes(key)) {
      const parsed = Number(String(value).replace(',', '.'));
      next[key] = Number.isFinite(parsed) ? parsed : DEFAULT_SETTINGS[key];
      return;
    }
    if (BOOLEAN_KEYS.includes(key)) {
      next[key] = value === true || value === 'true' || value === 'on' || value === '1';
      return;
    }
    next[key] = value;
  });

  /* Coerência dos limites: mínima nunca acima da máxima (evita alerta invertido). */
  if (next.temperatureIdealMin !== undefined && next.temperatureIdealMax !== undefined && next.temperatureIdealMin > next.temperatureIdealMax) {
    next.temperatureIdealMax = next.temperatureIdealMin;
  }
  if (next.humidityIdealMin !== undefined && next.humidityIdealMax !== undefined && next.humidityIdealMin > next.humidityIdealMax) {
    next.humidityIdealMax = next.humidityIdealMin;
  }
  /* RNF11 — o plano gratuito do ThingSpeak recusa intervalos menores que 15 s. */
  if (next.syncIntervalSeconds !== undefined && next.syncIntervalSeconds < ENV.thingspeakMinIntervalSeconds) {
    next.syncIntervalSeconds = ENV.thingspeakMinIntervalSeconds;
  }
  return next;
}

export function loadSettings() {
  const stored = readStorage(STORAGE_KEYS.settings, {});
  const merged = { ...DEFAULT_SETTINGS, ...(stored && typeof stored === 'object' ? stored : {}) };
  return { ...merged, region: merged.region || ENV.region };
}

export function saveSettings(patch) {
  const normalized = normalizeSettings(patch);
  const merged = { ...loadSettings(), ...normalized };
  writeStorage(STORAGE_KEYS.settings, merged);
  return merged;
}

export function resetSettings() {
  removeStorage(STORAGE_KEYS.settings);
  return loadSettings();
}

/** Rótulo usado nas faixas de status ("R$ ..." já formatado pelas páginas). */
export const settingsSummary = () => {
  const settings = loadSettings();
  return {
    syncInterval: `${settings.syncIntervalSeconds} s`,
    apiBaseUrl: settings.apiBaseUrl || `${API_PREFIX} (mesma origem)`,
    retention: `${settings.auditRetentionDays} dias`,
  };
};
