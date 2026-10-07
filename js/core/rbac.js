/**
 * Controle de acesso baseado em perfis (RF08 / RNF10).
 *
 * Cada página declara em `js/config/pages.js` quais perfis podem abri-la. Além
 * disso existe uma matriz de capacidades (ações dentro das telas) para que o
 * RBAC não dependa apenas da rota.
 *
 * O administrador pode REVOGAR páginas de um perfil (ajuste fino registrado em
 * auditoria). Conceder além do previsto não é permitido: as telas de cada perfil
 * continuam isoladas — só o que a matriz base autoriza pode ser liberado.
 */

import { MENU, ROLE_INFO, ROLES, isKnownRole, landingPageFor } from '../config/roles.js';
import { PAGES } from '../config/pages.js';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';

export const CAPABILITIES = Object.freeze({
  'alerts.view': [ROLES.PRODUCER, ROLES.ANALYST, ROLES.ADMIN],
  'monitoring.view': [ROLES.PRODUCER, ROLES.ANALYST],
  'forecast.view': [ROLES.PRODUCER, ROLES.ANALYST],
  'market.view': [ROLES.PRODUCER, ROLES.ANALYST],
  'comparison.view': [ROLES.PRODUCER, ROLES.ANALYST],
  'history.view': [ROLES.PRODUCER, ROLES.ANALYST],
  'reports.view': [ROLES.PRODUCER, ROLES.ANALYST, ROLES.ADMIN],
  'quality.view': [ROLES.ANALYST, ROLES.ADMIN],
  'models.view': [ROLES.ANALYST, ROLES.ADMIN],
  'data.ingest': [ROLES.ANALYST, ROLES.ADMIN],
  'users.manage': [ROLES.ADMIN],
  'rbac.manage': [ROLES.ADMIN],
  'security.view': [ROLES.ADMIN],
  'logs.view': [ROLES.ADMIN],
  'integrations.manage': [ROLES.ADMIN],
  'settings.manage': [ROLES.ADMIN],
  'designSystem.view': [ROLES.ADMIN],
});

export const CAPABILITY_LABELS = Object.freeze({
  'alerts.view': 'Ver alertas',
  'monitoring.view': 'Acompanhar monitoramento',
  'forecast.view': 'Consultar previsões',
  'market.view': 'Consultar mercado',
  'comparison.view': 'Comparar variedades',
  'history.view': 'Consultar histórico',
  'reports.view': 'Exportar relatórios',
  'quality.view': 'Auditar qualidade dos dados',
  'models.view': 'Operar modelos preditivos',
  'data.ingest': 'Sincronizar ingestão de dados',
  'users.manage': 'Gerenciar usuários',
  'rbac.manage': 'Gerenciar permissões',
  'security.view': 'Ver relatórios de segurança',
  'logs.view': 'Ver logs do sistema',
  'integrations.manage': 'Gerenciar integrações',
  'settings.manage': 'Configurar a plataforma',
  'designSystem.view': 'Consultar design system',
});

/** Ajustes de permissão feitos pelo administrador (somente revogação). */
export function getPermissionOverrides() {
  const stored = readStorage(STORAGE_KEYS.permissions, null);
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
}

export function setPermissionOverrides(next) {
  const sanitized = {};
  Object.entries(next ?? {}).forEach(([role, pages]) => {
    if (!isKnownRole(role) || !pages || typeof pages !== 'object') return;
    const rolePages = {};
    Object.entries(pages).forEach(([pageId, allowed]) => {
      if (PAGES[pageId] && allowed === false) rolePages[pageId] = false;
    });
    if (Object.keys(rolePages).length > 0) sanitized[role] = rolePages;
  });
  writeStorage(STORAGE_KEYS.permissions, sanitized);
  return sanitized;
}

/** A página existe e o perfil consta na lista base de acesso. */
export const isPageAllowedByBase = (role, pageId) => Boolean(PAGES[pageId]?.roles?.includes(role));

/** Decisão final do RBAC para uma página. */
export function canAccessPage(role, pageId, overrides = getPermissionOverrides()) {
  if (!isKnownRole(role) || !PAGES[pageId]) return false;
  if (!isPageAllowedByBase(role, pageId)) return false;
  return overrides?.[role]?.[pageId] !== false;
}

/**
 * Decisão do RBAC para uma capacidade/ação.
 * As capacidades derivam da matriz estática (`CAPABILITIES`), que reflete os
 * atores descritos nos requisitos e as regras aplicadas no gateway.
 */
export function can(role, capability) {
  const allowed = CAPABILITIES[capability];
  if (!allowed || !isKnownRole(role)) return false;
  return allowed.includes(role);
}

export function allowedPages(role, overrides = getPermissionOverrides()) {
  return Object.keys(PAGES).filter((pageId) => canAccessPage(role, pageId, overrides));
}

export const pageDefinition = (pageId) => PAGES[pageId] ?? null;

/** Primeira página disponível do perfil (usada no login e em redirecionamentos). */
export function firstPageFor(role, overrides = getPermissionOverrides()) {
  const preferred = landingPageFor(role);
  if (preferred && canAccessPage(role, preferred, overrides)) return preferred;
  const sections = MENU[role] ?? [];
  for (const section of sections) {
    const found = section.pages.find((pageId) => canAccessPage(role, pageId, overrides));
    if (found) return found;
  }
  return null;
}

/** Menu do perfil já filtrado pelas permissões vigentes. */
export function menuFor(role, overrides = getPermissionOverrides()) {
  const sections = MENU[role] ?? [];
  return sections
    .map((section) => ({
      section: section.section,
      items: section.pages
        .filter((pageId) => canAccessPage(role, pageId, overrides))
        .map((pageId) => ({ id: pageId, ...PAGES[pageId] })),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Matriz de permissões (linhas = páginas, colunas = perfis) usada na tela
 * Admin › Permissões e RBAC e nos testes automatizados.
 */
export function permissionMatrix(overrides = getPermissionOverrides()) {
  return Object.values(PAGES).map((page) => ({
    id: page.id,
    label: page.label,
    group: page.group,
    roles: Object.fromEntries(
      Object.values(ROLES).map((role) => [
        role,
        { base: isPageAllowedByBase(role, page.id), allowed: canAccessPage(role, page.id, overrides) },
      ]),
    ),
  }));
}

export function capabilityMatrix() {
  return Object.entries(CAPABILITIES).map(([capability, roles]) => ({
    capability,
    label: CAPABILITY_LABELS[capability] ?? capability,
    roles: Object.fromEntries(Object.values(ROLES).map((role) => [role, Boolean(roles.includes(role))])),
  }));
}

/** Resumo exibido no painel administrativo. */
export function rbacSummary(overrides = getPermissionOverrides()) {
  return Object.values(ROLES).map((role) => ({
    role,
    label: ROLE_INFO[role].label,
    pages: allowedPages(role, overrides).length,
    revoked: Object.values(overrides?.[role] ?? {}).filter((value) => value === false).length,
  }));
}

/**
 * RNF10 — o controle de acesso não deve degradar o desempenho.
 * Mede o custo médio de uma verificação de permissão (amostra de 10.000).
 */
export function measurePermissionCost(iterations = 10000) {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  for (let index = 0; index < iterations; index += 1) {
    canAccessPage(ROLES.PRODUCER, 'produtor/visao-geral');
  }
  const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const total = endedAt - startedAt;
  return { iterations, totalMs: Number(total.toFixed(3)), averageMs: Number((total / iterations).toFixed(6)) };
}
