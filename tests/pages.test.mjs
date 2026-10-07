/**
 * Renderização de todas as telas (RF07/RNF06/RNF09).
 *
 * Cada página é montada com o dado demonstrativo já normalizado — o mesmo
 * caminho da primeira pintura no navegador — e o HTML resultante é inspecionado
 * para garantir que nenhuma tela exponha "undefined", "NaN" ou "[object Object]".
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGES } from '../js/config/pages.js';
import { PAGE_RENDERERS, buildPageContext, resourcesForPage } from '../js/config/routes.js';
import { createInitialState, getState, setState } from '../js/core/store.js';
import { primeData } from '../js/services/data-service.js';
import { DEMO_AUDIT_LOGS, DEMO_USERS } from '../js/data/demo/records.js';
import { loadSettings } from '../js/config/settings.js';

const PERIODS = ['24h', '7d', '30d'];

function mountPage(pageId, { period = '24h' } = {}) {
  const definition = PAGES[pageId];
  const role = definition.roles[0];
  setState({
    ...createInitialState(),
    authenticated: true,
    role,
    session: { id: 'teste', name: 'Mariana Costa', email: 'produtor@agroclima.com', role, initials: 'MC', mode: 'demo' },
    page: pageId,
    period,
    users: DEMO_USERS,
    settings: loadSettings(),
    auditLogs: [...DEMO_AUDIT_LOGS],
  });
  primeData(resourcesForPage(pageId), { variety: 'Uva Itália', period, role });
  return String(PAGE_RENDERERS[pageId](buildPageContext(getState())));
}

test('todas as páginas renderizam com dados demonstrativos', () => {
  const ids = Object.keys(PAGES);
  assert.ok(ids.length >= 20, `esperado o conjunto completo de telas, encontrado ${ids.length}`);
  ids.forEach((pageId) => {
    const markup = mountPage(pageId);
    assert.ok(markup.includes('class="page"'), `${pageId} não devolveu a seção .page`);
    assert.ok(markup.length > 400, `${pageId} renderizou pouco conteúdo (${markup.length} caracteres)`);
  });
});

test('nenhuma tela vaza valor inválido para o usuário', () => {
  Object.keys(PAGES).forEach((pageId) => {
    const markup = mountPage(pageId);
    assert.equal(markup.includes('undefined'), false, `${pageId} exibe "undefined"`);
    assert.equal(markup.includes('[object Object]'), false, `${pageId} exibe "[object Object]"`);
    assert.equal(/\bNaN\b/.test(markup), false, `${pageId} exibe "NaN"`);
  });
});

test('as telas com recorte de período respondem às três janelas', () => {
  Object.keys(PAGES)
    .filter((id) => resourcesForPage(id).includes('readings'))
    .forEach((pageId) => {
      PERIODS.forEach((period) => {
        const markup = mountPage(pageId, { period });
        assert.ok(markup.includes('class="page"'), `${pageId} falhou no período ${period}`);
      });
    });
});

test('o HTML é escapado: o conteúdo dinâmico não vira markup', () => {
  const markup = mountPage('produtor/visao-geral');
  assert.equal(/<script/i.test(markup), false, 'a página injetou <script>');
  assert.equal(markup.includes('onerror='), false, 'a página injetou handler inline');
});
