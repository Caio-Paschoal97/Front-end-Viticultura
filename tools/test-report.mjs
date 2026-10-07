#!/usr/bin/env node
/**
 * Relatório de execução dos testes automatizados (RNF05 / RF11).
 *
 * Roda cada arquivo de `tests/` em sequência com o reporter TAP do `node --test`,
 * consolida o resultado e publica:
 *
 *   reports/test-results.json   → consumido pela tela Analista › Relatórios
 *                                 (recurso `testReport` do data-service);
 *   docs/RELATORIO-TESTES.md    → evidência legível para a documentação do PI.
 *
 * Uso: `npm run test:report` (o código de saída acompanha o resultado da suíte).
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEST_SUITES } from '../js/data/demo/records.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TESTS_DIR = join(ROOT, 'tests');
const REPORTS_DIR = join(ROOT, 'reports');
const DOCS_DIR = join(ROOT, 'docs');

const describeSuite = (file) => TEST_SUITES.find((suite) => suite.file === `tests/${file}`) ?? { name: file, description: 'Suíte automatizada do front-end.' };

/** Executa um arquivo de teste e traduz o TAP em resultados por caso. */
function runSuite(file) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', join('tests', file)], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const tests = [];
  output.split('\n').forEach((line) => {
    const match = line.match(/^(not ok|ok)\s+\d+\s+-\s+(.*)$/);
    if (!match) return;
    const name = match[2].replace(/\s*#.*$/, '').trim();
    if (/^Subtest:/i.test(name)) return;
    tests.push({ name, passed: match[1] === 'ok' });
  });
  const passed = tests.filter((test) => test.passed).length;
  const failed = tests.length - passed;
  const reported = Number.parseFloat(output.match(/# duration_ms\s+([\d.]+)/)?.[1] ?? '');
  const durationMs = Number.isFinite(reported) ? Math.round(reported) : Date.now() - startedAt;
  return { file: `tests/${file}`, ...describeSuite(file), tests, passed, failed, durationMs };
}

const suiteFiles = readdirSync(TESTS_DIR).filter((file) => file.endsWith('.test.mjs')).sort();
if (suiteFiles.length === 0) {
  console.error('Nenhum arquivo tests/*.test.mjs encontrado.');
  process.exit(1);
}

console.log(`Executando ${suiteFiles.length} suíte(s) de teste…\n`);
const suites = suiteFiles.map((file) => {
  const suite = runSuite(file);
  const icon = suite.failed === 0 ? '✔' : '✘';
  console.log(`${icon} ${suite.file} — ${suite.passed}/${suite.tests.length} caso(s) em ${suite.durationMs} ms`);
  if (suite.failed > 0) suite.tests.filter((test) => !test.passed).forEach((test) => console.log(`    ✘ ${test.name}`));
  return suite;
});

const total = suites.reduce((accumulator, suite) => accumulator + suite.tests.length, 0);
const passed = suites.reduce((accumulator, suite) => accumulator + suite.passed, 0);
const failed = total - passed;
const durationMs = suites.reduce((accumulator, suite) => accumulator + suite.durationMs, 0);
const executedAt = new Date().toISOString();

const report = {
  executedAt,
  command: 'npm run test:report (node --test tests/*.test.mjs)',
  total,
  passed,
  failed,
  durationMs,
  suites: suites.map((suite) => ({ name: suite.name, file: suite.file, passed: suite.passed, failed: suite.failed, total: suite.tests.length, durationMs: suite.durationMs })),
  cases: suites.flatMap((suite) => suite.tests.map((test) => ({ suite: suite.name, name: test.name, passed: test.passed }))),
};

mkdirSync(REPORTS_DIR, { recursive: true });
writeFileSync(join(REPORTS_DIR, 'test-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const percent = total === 0 ? 0 : Math.round((passed / total) * 100);
const markdown = `# Relatório de testes automatizados (RNF05)

Gerado por \`npm run test:report\` em ${new Date(executedAt).toLocaleString('pt-BR')}.

- **Casos executados:** ${total}
- **Aprovados:** ${passed}
- **Falhas:** ${failed}
- **Aproveitamento:** ${percent}%
- **Duração total:** ${durationMs} ms

| Suíte | Descrição | Casos | Aprovados | Falhas | Duração |
| --- | --- | ---: | ---: | ---: | ---: |
${suites.map((suite) => `| \`${suite.file}\` | ${suite.name} | ${suite.tests.length} | ${suite.passed} | ${suite.failed} | ${suite.durationMs} ms |`).join('\n')}

## Casos por suíte

${suites
  .map(
    (suite) => `### ${suite.name} — \`${suite.file}\`

${suite.description}

${suite.tests.map((test) => `- ${test.passed ? '✅' : '❌'} ${test.name}`).join('\n')}`,
  )
  .join('\n\n')}

## Como reproduzir

\`\`\`bash
npm install --no-package-lock   # nada a instalar: o projeto não tem dependências
npm test                        # executa as suítes com node --test
npm run test:report             # regenera este relatório + reports/test-results.json
\`\`\`

O JSON publicado em \`reports/test-results.json\` é lido pela tela **Analista de Dados › Relatórios** (recurso \`testReport\`), atendendo ao requisito de relatório de execução de testes do RF11.
`;

mkdirSync(DOCS_DIR, { recursive: true });
writeFileSync(join(DOCS_DIR, 'RELATORIO-TESTES.md'), markdown, 'utf8');

console.log(`\nRelatório: docs/RELATORIO-TESTES.md`);
console.log(`JSON......: reports/test-results.json`);
console.log(`Resultado.: ${passed}/${total} aprovados (${percent}%) — ${failed === 0 ? 'sucesso' : 'com falhas'}`);

process.exit(failed === 0 ? 0 : 1);
