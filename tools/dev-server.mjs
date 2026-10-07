#!/usr/bin/env node
/**
 * Servidor de desenvolvimento do AgroClima Cloud.
 *
 * Duas funções:
 *   1. servir os arquivos estáticos do front-end (HTML/CSS/JS puros, sem build);
 *   2. encaminhar `/api/v1/**` e `/health` para o back-end FastAPI, evitando
 *      problemas de CORS e mantendo a API fora do código do navegador.
 *
 * Uso:
 *   npm start                 # porta 4173, API em http://localhost:8000
 *   PORT=5173 npm start
 *   API_TARGET=http://192.168.0.10:8000 npm start
 *
 * Nada de chave do ThingSpeak aqui: a Read Key permanece no servidor Python
 * (`THINGSPEAK_READ_API_KEY` no `.env` do back-end) — RNF02.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number.parseInt(process.env.PORT ?? '4173', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const API_TARGET = (process.env.API_TARGET ?? 'http://localhost:8000').replace(/\/$/, '');
const INDEX_FILE = join(ROOT, 'index.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const shouldProxy = (pathname) => pathname === '/health' || pathname.startsWith('/api/');

/** O FastAPI expõe o health check na raiz (`/health`), não sob `/api/v1`. */
const rewriteTargetPath = (pathname) => {
  if (pathname === '/api/v1/health') return '/health';
  return pathname;
};

function serveStatic(request, response, pathname) {
  const decoded = decodeURIComponent(pathname);
  const safePath = resolve(join(ROOT, decoded));
  const insideRoot = safePath === ROOT || safePath.startsWith(ROOT + sep);
  const isFile = insideRoot && existsSync(safePath) && statSync(safePath).isFile();
  const target = isFile ? safePath : INDEX_FILE;
  const extension = extname(target).toLowerCase();

  if (!isFile && extname(decoded)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('404 — arquivo não encontrado');
    return;
  }

  const headers = {
    'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
    'Cache-Control': extension === '.html' || extension === '.js' || extension === '.css' ? 'no-store' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  };
  response.writeHead(200, headers);
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(target).pipe(response);
}

function proxyToApi(request, response, url) {
  const target = new URL(API_TARGET);
  const path = `${target.pathname.replace(/\/$/, '')}${rewriteTargetPath(url.pathname)}${url.search}`;

  const headers = { ...request.headers, host: target.host };
  // Cabeçalhos de identidade do gateway são repassados como estão (o Python os
  // valida); nunca adicionamos segredos do lado do navegador.
  delete headers['accept-encoding'];

  const upstream = httpRequest(
    { protocol: target.protocol, hostname: target.hostname, port: target.port || 80, method: request.method, path, headers },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, {
        ...upstreamResponse.headers,
        'access-control-allow-origin': request.headers.origin ?? '*',
        'access-control-allow-headers': 'content-type, authorization, x-user-id, x-user-role',
        'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      });
      upstreamResponse.pipe(response);
    },
  );

  upstream.on('error', (error) => {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(
      JSON.stringify({
        detail: `Back-end indisponível em ${API_TARGET} (${error.code ?? error.message}). O dashboard seguirá em modo demonstração.`,
      }),
    );
  });

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': request.headers.origin ?? '*',
      'access-control-allow-headers': 'content-type, authorization, x-user-id, x-user-role',
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    });
    response.end();
    upstream.destroy();
    return;
  }

  request.pipe(upstream);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const startedAt = Date.now();

  response.on('finish', () => {
    const kind = shouldProxy(url.pathname) ? 'API' : 'WEB';
    console.log(`${kind} ${request.method} ${url.pathname} → ${response.statusCode} (${Date.now() - startedAt} ms)`);
  });

  if (shouldProxy(url.pathname)) {
    proxyToApi(request, response, url);
    return;
  }
  serveStatic(request, response, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log('AgroClima Cloud — servidor de desenvolvimento');
  console.log(`  Dashboard .... http://localhost:${PORT}/`);
  console.log(`  Proxy da API . ${API_TARGET} (rotas /api/v1/** e /health)`);
  console.log('  Sem build: HTML + CSS + módulos ES servidos direto do repositório.');
  console.log(`  Se o back-end estiver fora do ar, o dashboard usa os dados demonstrativos.`);
});
