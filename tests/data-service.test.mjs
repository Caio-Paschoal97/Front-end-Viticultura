/**
 * Camada de dados (RF02/RF05/RF07): API real quando disponível, dado
 * demonstrativo quando não há back-end — sempre informando a origem na tela.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getFetchImpl, setFetchImpl } from '../js/core/api-client.js';
import { invalidate, primeData, RESOURCES, ensureData, sourceLabel, sourceOf } from '../js/services/data-service.js';
import { createInitialState, getState, setState } from '../js/core/store.js';

const CONTEXT = { variety: 'Uva Itália', period: '24h', role: 'PRODUCER' };

const withFetch = async (stub, run) => {
  const previous = getFetchImpl();
  setFetchImpl(stub);
  invalidate();
  try {
    return await run();
  } finally {
    setFetchImpl(previous);
    invalidate();
  }
};

test('primeData preenche a tela na primeira pintura com dado demonstrativo', () => {
  setState(createInitialState());
  primeData(['overview', 'alerts'], CONTEXT);
  const state = getState();
  assert.ok(state.data.overview, 'a visão geral deveria estar preenchida');
  assert.ok(Array.isArray(state.data.alerts));
  assert.equal(state.sources.overview, 'demo');
  assert.deepEqual(state.loading.sort(), ['alerts', 'overview']);
});

test('API fora do ar: cai para o dado demonstrativo e registra o fallback', async () => {
  setState({ ...createInitialState(), authenticated: true, role: 'PRODUCER', session: { name: 'Teste' } });
  const result = await withFetch(
    async () => {
      throw new TypeError('fetch failed');
    },
    () => ensureData(['overview', 'quality'], CONTEXT),
  );

  assert.equal(result.source, 'demo');
  assert.equal(result.fromApi, 0);
  assert.equal(getState().sources.overview, 'demo');
  assert.ok(getState().data.quality, 'a qualidade deveria ter valor demonstrativo');
  assert.equal(getState().apiStatus.reachable, false);
  assert.equal(getState().loading.length, 0);
  assert.equal(sourceLabel('demo'), 'Dados demonstrativos');
});

test('API respondendo: os dados vêm do back-end e a origem muda para "api"', async () => {
  setState({ ...createInitialState(), authenticated: true, role: 'ADMIN', session: { name: 'Teste' } });
  const payloads = {
    '/integrations/thingspeak/status': { provider: 'ThingSpeak', configured: true, channel_id: '987654' },
    '/models': [{ name: 'AC-Predict', version: '3.2', accuracy: 0.91, mae: 1.2, rmse: 1.7, status: 'ACTIVE' }],
  };
  let calls = 0;

  const result = await withFetch(
    async (url) => {
      calls += 1;
      const path = Object.keys(payloads).find((key) => url.includes(key));
      if (!path) return { ok: false, status: 404, text: async () => JSON.stringify({ detail: 'Not Found' }) };
      return { ok: true, status: 200, text: async () => JSON.stringify(payloads[path]) };
    },
    () => ensureData(['thingspeak', 'models'], CONTEXT),
  );

  assert.equal(result.fromApi, 2);
  assert.equal(result.source, 'api');
  assert.equal(getState().data.thingspeak.channelId, '987654');
  assert.equal(getState().data.models[0].statusLabel.length > 0, true);
  assert.equal(getState().apiStatus.reachable, true);
  assert.equal(sourceOf(['thingspeak', 'models']), 'api');

  // Segunda consulta usa o cache (RNF04: evita repetir chamadas na troca de tela).
  await ensureData(['thingspeak', 'models'], CONTEXT);
  assert.equal(calls, 2, 'o cache deveria evitar novas chamadas');
});

test('404 em rota prevista no contrato mantém o dado demonstrativo sem marcar queda', async () => {
  setState({ ...createInitialState(), authenticated: true, role: 'PRODUCER', session: { name: 'Teste' } });
  const result = await withFetch(
    async () => ({ ok: false, status: 404, text: async () => JSON.stringify({ detail: 'Not Found' }) }),
    () => ensureData(['market'], CONTEXT),
  );
  assert.equal(result.fromApi, 0);
  assert.equal(getState().data.market.price > 0, true, 'o mercado deve continuar com dado demonstrativo');
  assert.equal(getState().apiStatus.reachable, true, '404 prova que o servidor respondeu');
});

test('todos os recursos do contrato têm demonstração válida', async () => {
  setState(createInitialState());
  await withFetch(
    async () => {
      throw new TypeError('offline');
    },
    () => ensureData(Object.keys(RESOURCES), CONTEXT),
  );
  Object.keys(RESOURCES).forEach((key) => {
    assert.notEqual(getState().data[key], null, `o recurso "${key}" ficou sem dado demonstrativo`);
    assert.equal(getState().sources[key], 'demo');
  });
});
