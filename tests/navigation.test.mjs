/**
 * Registro de páginas, rotas, menu e ícones (RF07/RF08/RNF09).
 *
 * Garante que todo item de menu tem tela registrada, que nenhum renderizador
 * ficou órfão e que o conjunto de recursos de dados de cada página existe no
 * serviço de dados.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGES } from '../js/config/pages.js';
import { MODAL_RENDERERS, PAGE_RENDERERS, resourcesForPage } from '../js/config/routes.js';
import { MENU, ROLES } from '../js/config/roles.js';
import { allowedPages, menuFor } from '../js/core/rbac.js';
import { RESOURCES } from '../js/services/data-service.js';
import { hasIcon } from '../js/components/icons.js';

test('toda página registrada tem renderizador e vice-versa', () => {
  const pageIds = Object.keys(PAGES).sort();
  const rendererIds = Object.keys(PAGE_RENDERERS).sort();
  assert.deepEqual(rendererIds, pageIds, 'PAGES e PAGE_RENDERERS estão fora de sincronia');
  pageIds.forEach((id) => {
    assert.equal(typeof PAGE_RENDERERS[id], 'function', `${id} não é uma função de renderização`);
    assert.equal(PAGES[id].id, id, `${id} tem id divergente do registro`);
    assert.ok(PAGES[id].label.length > 0, `${id} sem rótulo para o menu`);
    assert.ok(PAGES[id].roles.length > 0, `${id} sem perfis autorizados`);
  });
});

test('os modais globais têm renderizador', () => {
  assert.deepEqual(Object.keys(MODAL_RENDERERS).sort(), ['user-detail', 'user-form']);
  Object.values(MODAL_RENDERERS).forEach((renderer) => assert.equal(typeof renderer, 'function'));
});

test('cada página declara apenas recursos de dados existentes', () => {
  Object.keys(PAGES).forEach((id) => {
    resourcesForPage(id).forEach((resource) => {
      assert.ok(RESOURCES[resource], `${id} consome o recurso inexistente "${resource}"`);
    });
  });
});

test('o menu de cada perfil só lista páginas dentro do seu escopo (RF08)', () => {
  Object.values(ROLES).forEach((role) => {
    const allowed = new Set(allowedPages(role));
    const items = menuFor(role).flatMap((section) => section.items.map((item) => item.id));
    assert.ok(items.length > 0, `menu vazio para ${role}`);
    items.forEach((id) => {
      assert.ok(allowed.has(id), `${role} tem no menu a página fora do escopo "${id}"`);
      assert.ok(PAGES[id], `o menu de ${role} aponta para a página inexistente "${id}"`);
    });
    assert.equal(new Set(items).size, items.length, `menu de ${role} tem itens duplicados`);
  });
});

test('a navegação declarada em roles.js cobre exatamente as páginas liberadas', () => {
  Object.values(ROLES).forEach((role) => {
    const declared = MENU[role].flatMap((section) => section.pages);
    const allowed = allowedPages(role);
    assert.deepEqual(declared.slice().sort(), allowed.slice().sort(), `menu e RBAC divergem para ${role}`);
  });
});

test('todos os ícones usados no registro de páginas existem', () => {
  Object.keys(PAGES).forEach((id) => {
    assert.ok(hasIcon(PAGES[id].icon), `${id} usa o ícone inexistente "${PAGES[id].icon}"`);
  });
});

test('a página inicial de cada perfil é acessível', () => {
  Object.values(ROLES).forEach((role) => {
    const landing = MENU[role][0].pages[0];
    assert.ok(allowedPages(role).includes(landing), `${role} começa em página bloqueada`);
  });
});
