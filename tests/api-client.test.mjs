/**
 * Cliente HTTP (RF02/RF05) — classificação das falhas que decidem entre usar a
 * API real e cair nos dados demonstrativos.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, api, buildHeaders, getFetchImpl, request, setFetchImpl } from '../js/core/api-client.js';
import { getApiBaseUrl, setApiBaseUrl } from '../js/config/env.js';

const jsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(payload),
});

const withStub = async (stub, run) => {
  const previous = getFetchImpl();
  setFetchImpl(stub);
  try {
    return await run();
  } finally {
    setFetchImpl(previous);
  }
};

test('monta a URL a partir da base configurada + endpoint', async () => {
  const calls = [];
  await withStub(async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ variety: 'Uva Itália' });
  }, async () => {
    const payload = await api.dashboardOverview({ variety: 'Uva Itália' });
    assert.equal(payload.variety, 'Uva Itália');
  });
  assert.equal(calls[0].url.startsWith(`${getApiBaseUrl()}/dashboard/overview`), true);
  assert.match(calls[0].url, /variety=Uva(\+|%20)It%C3%A1lia/);
  assert.equal(calls[0].options.headers.Accept, 'application/json');
});

test('401 e 404 são tratados como API no ar com rota/permissão pendente', async () => {
  await withStub(async () => jsonResponse({ detail: 'Contexto autenticado ausente' }, 401), async () => {
    await assert.rejects(api.models(), (error) => error instanceof ApiError && error.kind === 'unauthorized' && error.status === 401);
  });
  await withStub(async () => jsonResponse({ detail: 'Not Found' }, 404), async () => {
    await assert.rejects(api.market({ variety: 'Uva Itália' }), (error) => error instanceof ApiError && error.kind === 'not-found');
  });
});

test('502/503/504 do proxy contam como API indisponível', async () => {
  await withStub(async () => ({ ok: false, status: 502, text: async () => JSON.stringify({ detail: 'Back-end indisponível' }) }), async () => {
    await assert.rejects(api.dataQuality(), (error) => error instanceof ApiError && error.kind === 'offline' && error.status === 502);
  });
});

test('falha de rede vira "offline" e resposta não-JSON vira "parse"', async () => {
  await withStub(async () => {
    throw new TypeError('fetch failed');
  }, async () => {
    await assert.rejects(api.currentReadings(), (error) => error instanceof ApiError && error.kind === 'offline');
  });
  await withStub(async () => ({ ok: true, status: 200, text: async () => '<html>portal</html>' }), async () => {
    await assert.rejects(api.dataQuality(), (error) => error instanceof ApiError && error.kind === 'parse');
  });
});

test('tempo esgotado vira "timeout"', async () => {
  await withStub(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
    async () => {
      await assert.rejects(request('dashboard/overview', { timeout: 20 }), (error) => error instanceof ApiError && error.kind === 'timeout');
    },
  );
});

test('health mede a latência da resposta', async () => {
  const result = await withStub(async () => jsonResponse({ status: 'ok' }), () => api.health());
  assert.equal(result.status, 'ok');
  assert.equal(typeof result.latencyMs, 'number');
});

test('a base da API pode ser trocada em tempo de execução', () => {
  const previous = getApiBaseUrl();
  setApiBaseUrl('http://192.168.0.10:8000/api/v1');
  assert.equal(getApiBaseUrl(), 'http://192.168.0.10:8000/api/v1');
  setApiBaseUrl(previous);
  assert.equal(getApiBaseUrl(), previous);
});

test('cabeçalhos de identidade só entram quando solicitados', () => {
  const publicHeaders = buildHeaders({ auth: false });
  assert.equal('X-User-Role' in publicHeaders, false);
  assert.equal(publicHeaders.Accept, 'application/json');
});
