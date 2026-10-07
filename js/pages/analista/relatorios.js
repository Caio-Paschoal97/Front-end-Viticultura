import { html } from '../../utils/html.js';
import { formatDateTime, formatNumber, relativeTime } from '../../utils/format.js';
import { badge, button, card, emptyState, sectionHead } from '../../components/ui.js';
import { dataTable } from '../../components/tables.js';
import { TEST_SUITES } from '../../data/demo/records.js';
import { dataOf, header, keyValues, page, pct, strip } from '../support.js';

/**
 * Relatórios do analista (RF11 — qualidade e execução de testes; RNF05).
 * Mostra o resultado dos testes automatizados publicados em
 * `reports/test-results.json` (gerado por `npm run test:report`).
 */
export function analystReports(context) {
  const quality = dataOf(context, 'quality');
  const models = dataOf(context, 'models') ?? [];
  const report = dataOf(context, 'testReport');
  const active = models.find((model) => model.status === 'ACTIVE') ?? models[0] ?? null;

  const suiteRows = (report?.suites?.length ? report.suites : []).map((suite) => ({
    ...suite,
    status: suite.failed === 0 ? 'Aprovada' : 'Falhou',
    tone: suite.failed === 0 ? 'success' : 'danger',
  }));

  const passRate = report && report.total > 0 ? report.passed / report.total : null;

  return page(
    header(context, {
      title: 'Relatórios',
      subtitle: 'Relatórios de qualidade dos dados e de execução dos testes automatizados das funcionalidades críticas',
      varietyMode: 'hidden',
      actions: [
        button('Exportar qualidade (CSV)', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'quality' } }),
        button('Relatório executivo', { iconName: 'report', action: 'print-report' }),
      ],
    }),
    strip(context, {
      extra: report?.executedAt ? `testes executados ${relativeTime(report.executedAt)}` : 'relatório de testes ainda não publicado',
      loadingLabel: 'Procurando reports/test-results.json…',
    }),
    html`<div class="grid-2">
      ${card(
        html`${sectionHead({ title: 'Relatório de qualidade (RF05)', subtitle: 'Indicadores consolidados do ciclo de validação' })}
          ${keyValues(
            [
              { label: 'Completude', value: quality ? pct(quality.completeness) : '—' },
              { label: 'Consistência', value: quality ? pct(quality.consistency) : '—' },
              { label: 'Registros válidos', value: formatNumber(quality?.validCount ?? 0) },
              { label: 'Outliers', value: formatNumber(quality?.outlierCount ?? 0) },
              { label: 'Ausentes', value: formatNumber(quality?.missingCount ?? 0) },
              { label: 'Modelo em produção', value: active ? `${active.name} ${active.version}` : '—' },
            ],
            { rows: true },
          )}
          <div class="button-row" style="margin-top:16px">${button('Exportar relatório de qualidade', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'quality' } })}</div>`,
        'table-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Execução dos testes (RNF05)', subtitle: 'Resultado publicado por npm run test:report' })}
          ${report?.executedAt
            ? html`<div class="metric-inline">
                <div><span>Total</span><strong>${formatNumber(report.total)}</strong></div>
                <div><span>Aprovados</span><strong>${formatNumber(report.passed)}</strong></div>
                <div><span>Falhas</span><strong>${formatNumber(report.failed)}</strong></div>
                <div><span>Taxa de sucesso</span><strong>${passRate === null ? '—' : pct(passRate)}</strong></div>
              </div>
              <p class="helper" style="margin-top:12px">Executado em ${formatDateTime(report.executedAt)}${report.durationMs ? ` · duração ${formatNumber(report.durationMs / 1000, { digits: 1 })} s` : ''}.</p>`
            : emptyState({
                iconName: 'flask',
                title: 'Relatório de testes não publicado',
                message: report?.hint ?? 'Execute "npm run test:report" na raiz do projeto para gerar o arquivo reports/test-results.json.',
                action: button('Atualizar', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' }),
              })}`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Resultado por suíte', subtitle: 'Suítes que cobrem as funcionalidades críticas: RBAC/autenticação, contrato da API e limpeza de dados' })}
      ${suiteRows.length === 0
        ? emptyState({ iconName: 'clipboard', title: 'Sem resultado por suíte', message: 'O arquivo reports/test-results.json não trouxe o detalhamento por suíte.' })
        : dataTable({
            columns: [
              { label: 'Suíte', render: (row) => html`<strong>${row.name}</strong>` },
              { label: 'Aprovados', render: (row) => formatNumber(row.passed) },
              { label: 'Falhas', render: (row) => formatNumber(row.failed) },
              { label: 'Situação', render: (row) => badge(row.status, row.tone) },
            ],
            rows: suiteRows,
          })}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Testes mantidos no repositório', subtitle: 'Cada arquivo cobre uma funcionalidade crítica exigida pelo RNF05' })}
      <div class="test-list">${TEST_SUITES.map(
        (suite) => html`<div>
          <div class="test-badge tone-green">${badge('JS', 'neutral')}</div>
          <div><strong>${suite.name}</strong><span>${suite.description}</span></div>
          <span class="mono">${suite.file}</span>
        </div>`,
      )}</div>
      <p class="helper" style="margin-top:14px">Execução local: <span class="mono">npm test</span> · relatório em JSON: <span class="mono">npm run test:report</span>.</p>`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Checklist de qualidade de software', subtitle: 'Evidências para a disciplina de Qualidade de Software' })}
      <div class="policy-list">
        <div>${badge('OK', 'success')}<div><strong>Autenticação e RBAC testados</strong><p>Testes garantem que cada perfil acesse apenas as suas páginas e que revogações de permissão tenham efeito imediato.</p></div></div>
        <div>${badge('OK', 'success')}<div><strong>Contrato da API testado</strong><p>Respostas vazias (listas vazias e risco UNKNOWN, como o back-end devolve sem dados) são tratadas sem quebrar a tela.</p></div></div>
        <div>${badge('OK', 'success')}<div><strong>Limpeza de dados testada</strong><p>As faixas de validação e a fórmula de completude/consistência têm testes que espelham o DataQualityService.</p></div></div>
        <div>${badge('OK', 'success')}<div><strong>Renderização de todas as páginas testada</strong><p>Todas as telas são renderizadas para todos os perfis, com dados da API e demonstrativos.</p></div></div>
      </div>`,
      'table-card',
    ),
  );
}
