/**
 * RBAC e isolamento das páginas por tipo de usuário (RF08/RNF10).
 *
 * Este é o teste que garante o requisito "isole as páginas referentes aos tipos
 * de usuários": nenhum perfil alcança as telas de outro, nem por atalho de menu,
 * nem por navegação direta.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES } from '../js/config/roles.js';
import { PAGES } from '../js/config/pages.js';
import {
  CAPABILITIES,
  allowedPages,
  can,
  canAccessPage,
  capabilityMatrix,
  firstPageFor,
  isPageAllowedByBase,
  measurePermissionCost,
  menuFor,
  permissionMatrix,
  setPermissionOverrides,
} from '../js/core/rbac.js';

const pageOwners = (prefix) => Object.keys(PAGES).filter((id) => id.startsWith(`${prefix}/`));

test('cada página pertence a um único escopo (produtor, analista ou administrador)', () => {
  const ownScope = {
    PRODUCER: pageOwners('produtor'),
    ANALYST: pageOwners('analista'),
    ADMIN: pageOwners('admin'),
  };
  for (const [role, pages] of Object.entries(ownScope)) {
    for (const page of pages) {
      assert.equal(isPageAllowedByBase(role, page), true, `${role} deveria acessar ${page}`);
      for (const other of Object.values(ROLES).filter((candidate) => candidate !== role)) {
        assert.equal(isPageAllowedByBase(other, page), false, `${other} NÃO deveria acessar ${page}`);
      }
    }
  }
});

test('páginas compartilhadas são liberadas somente para os perfis declarados', () => {
  for (const page of pageOwners('comum')) {
    const roles = PAGES[page].roles;
    Object.values(ROLES).forEach((role) => {
      assert.equal(canAccessPage(role, page), roles.includes(role), `escopo divergente em ${page} para ${role}`);
    });
  }
});

test('perfil desconhecido não acessa nada e não recebe página inicial', () => {
  assert.equal(canAccessPage('VISITANTE', 'produtor/visao-geral'), false);
  assert.equal(firstPageFor('VISITANTE'), null);
  assert.equal(allowedPages('VISITANTE').length, 0);
});

test('a revogação do administrador remove o acesso e pode ser desfeita', () => {
  setPermissionOverrides({});
  const before = canAccessPage(ROLES.PRODUCER, 'produtor/mercado');
  assert.equal(before, true);

  setPermissionOverrides({ PRODUCER: { 'produtor/mercado': false } });
  assert.equal(canAccessPage(ROLES.PRODUCER, 'produtor/mercado'), false, 'a página revogada deve ser bloqueada');
  assert.equal(canAccessPage(ROLES.ANALYST, 'analista/dashboard'), true, 'a revogação de um perfil não afeta os outros');

  const menu = menuFor(ROLES.PRODUCER).flatMap((section) => section.items.map((item) => item.id));
  assert.equal(menu.includes('produtor/mercado'), false, 'o item revogado sai do menu');

  setPermissionOverrides({});
  assert.equal(canAccessPage(ROLES.PRODUCER, 'produtor/mercado'), true);
  setPermissionOverrides({});
});

test('a matriz de permissões exibe base, revogação e perfil não previsto', () => {
  setPermissionOverrides({ ANALYST: { 'analista/modelos': false } });
  const matrix = permissionMatrix();
  const page = matrix.find((item) => item.id === 'analista/modelos');
  assert.equal(page.roles.ANALYST.base, true);
  assert.equal(page.roles.ANALYST.allowed, false);
  assert.equal(page.roles.PRODUCER.base, false);
  assert.equal(page.roles.PRODUCER.allowed, false);
  setPermissionOverrides({});
});

test('capacidades restringem ações dentro das telas', () => {
  assert.equal(can(ROLES.PRODUCER, 'alerts.view'), true);
  assert.equal(can(ROLES.PRODUCER, 'reports.view'), true);
  assert.equal(can(ROLES.PRODUCER, 'users.manage'), false);
  assert.equal(can(ROLES.PRODUCER, 'quality.view'), false);
  assert.equal(can(ROLES.ANALYST, 'models.view'), true);
  assert.equal(can(ROLES.ANALYST, 'rbac.manage'), false);
  assert.equal(can(ROLES.ADMIN, 'rbac.manage'), true);
  assert.equal(can(ROLES.ADMIN, 'security.view'), true);
  assert.equal(can(ROLES.ADMIN, 'capability.inexistente'), false);
  assert.equal(CAPABILITIES['users.manage'].includes(ROLES.ADMIN), true);

  const matrix = capabilityMatrix();
  assert.equal(matrix.length > 10, true);
  matrix.forEach((item) => assert.ok(item.label.length > 0));
});

test('RNF10: a verificação de acesso é barata o suficiente', () => {
  const measurement = measurePermissionCost(5000);
  assert.equal(measurement.iterations, 5000);
  assert.ok(measurement.averageMs < 0.5, `custo médio alto: ${measurement.averageMs} ms`);
});
