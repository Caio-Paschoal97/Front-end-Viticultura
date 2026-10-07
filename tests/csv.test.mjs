/**
 * Exportação CSV (RF11) — formato aceito pelo Excel em português:
 * separador `;` e BOM UTF-8.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { timestampedName, toCsv } from '../js/utils/csv.js';

const columns = [
  { label: 'Data', value: (row) => row.when },
  { label: 'Temperatura (°C)', value: (row) => row.temperature },
];

test('gera CSV com cabeçalho, separador ponto e vírgula e números pt-BR', () => {
  const csv = toCsv([{ when: '10/03/2026 12:00', temperature: 28.4 }], columns);
  const [header, line] = csv.split('\r\n');
  assert.equal(header, 'Data;Temperatura (°C)');
  assert.equal(line, '10/03/2026 12:00;28,4');
  assert.equal(csv.includes('\ufeff'), false, 'o BOM é aplicado só no download do arquivo');
});

test('valores com ponto e vírgula, aspas ou quebra de linha são citados', () => {
  const csv = toCsv(
    [
      { when: 'linha; com separador', temperature: 'aspas "duplas"' },
      { when: 'quebra\nde linha', temperature: 1 },
    ],
    columns,
  );
  assert.equal(csv.includes('"linha; com separador"'), true);
  assert.equal(csv.includes('"aspas ""duplas"""'), true);
  assert.equal(csv.includes('"quebra\nde linha"'), true);
});

test('valores ausentes viram campo vazio e listas vazias geram só o cabeçalho', () => {
  const csv = toCsv([{ when: '10/03/2026', temperature: null }], columns);
  assert.equal(csv.split('\r\n')[1], '10/03/2026;');
  assert.equal(toCsv([], columns), 'Data;Temperatura (°C)');
});

test('nome do arquivo ganha data e hora', () => {
  const name = timestampedName('agroclima-leituras');
  assert.match(name, /^agroclima-leituras-\d{8}-\d{4}\.csv$/);
  assert.match(timestampedName('relatorio', 'txt'), /\.txt$/);
});
