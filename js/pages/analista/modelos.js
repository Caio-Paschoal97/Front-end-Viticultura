import { html } from '../../utils/html.js';
import { formatDateTime, formatNumber, formatPercent, relativeTime } from '../../utils/format.js';
import { badge, button, card, emptyState, sectionHead, selectField, switchField } from '../../components/ui.js';
import { chartLegend, lineChart } from '../../components/charts.js';
import { dataTable } from '../../components/tables.js';
import { icon } from '../../components/icons.js';
import { dataOf, header, keyValues, page, pct, sliceByPeriod, strip } from '../support.js';

const FEATURES = ['Temperatura', 'Umidade', 'Preço', 'Demanda', 'Histórico climático'];
const MODEL_OPTIONS = ['AC-Predict v3.2 (ativo)', 'Random Forest v2.8', 'LSTM Climate v1.7'];

/**
 * Modelos preditivos (RF06).
 * Catálogo de modelos do back-end (`GET /models`), configuração da próxima
 * execução e comparação de métricas de validação.
 */
export function analystModels(context) {
  const models = dataOf(context, 'models') ?? [];
  const forecast = dataOf(context, 'forecasts');
  const active = models.find((model) => model.status === 'ACTIVE') ?? models[0] ?? null;
  const observed = sliceByPeriod(context.state.data.overview?.temperatureSeries ?? [], context.period);

  const rows = models.map((model) => ({
    ...model,
    accuracyLabel: model.accuracy === null ? '—' : formatPercent(model.accuracy, { fromRatio: true }),
    maeLabel: model.mae === null ? '—' : formatNumber(model.mae, { digits: 2 }),
    rmseLabel: model.rmse === null ? '—' : formatNumber(model.rmse, { digits: 2 }),
  }));

  return page(
    header(context, {
      title: 'Modelos Preditivos',
      subtitle: 'Treinamento, avaliação e governança dos modelos de previsão de safra e exportação',
      varietyMode: 'hidden',
      actions: [
        button('Executar treinamento', { variant: 'secondary', iconName: 'activity', action: 'run-model' }),
        button('Executar previsão', { iconName: 'model', action: 'refresh-data' }),
      ],
    }),
    strip(context, { extra: `${models.length} modelo(s) cadastrado(s) · rota GET /models`, loadingLabel: 'Consultando o catálogo de modelos…' }),
    active
      ? card(
          html`<div class="model-badge">${icon('model', 28)}</div>
            <div>
              <span class="overline">Modelo em produção</span>
              <h2>${active.name} ${active.version}</h2>
              <p>Previsão combinada de colheita e exportação · última execução ${relativeTime(context.lastSync)}</p>
            </div>
            <div class="model-stats">
              <div><span>Precisão</span><strong>${active.accuracy === null ? '—' : formatPercent(active.accuracy, { fromRatio: true })}</strong></div>
              <div><span>MAE</span><strong>${active.mae === null ? '—' : formatNumber(active.mae, { digits: 2 })}</strong></div>
              <div><span>RMSE</span><strong>${active.rmse === null ? '—' : formatNumber(active.rmse, { digits: 2 })}</strong></div>
              <div><span>Versão</span><strong>${active.version}</strong></div>
            </div>
            <div class="button-row">
              ${button('Testar modelo', { variant: 'secondary', action: 'run-model', dataset: { model: active.name } })}
              ${button('Exportar previsões', { variant: 'ghost', iconName: 'download', action: 'export-report', dataset: { report: 'forecast' } })}
            </div>`,
          'model-hero',
        )
      : card(emptyState({ iconName: 'model', title: 'Catálogo vazio', message: 'A rota /models respondeu sem modelos cadastrados.' }), 'table-card'),
    html`<div class="grid-2">
      ${card(
        html`<div class="card-title"><div><h3>Previsão x observado</h3><p>Validação da versão em produção contra as leituras recentes</p></div>${badge(forecast?.modelVersion ?? '—', 'info')}</div>
          ${chartLegend([{ tone: '1', label: 'Observado' }, { tone: '2', label: 'Previsto' }])}
          ${lineChart({ series: [{ data: observed.series, tone: 'chart-1' }, { data: forecast?.predictions ?? [], tone: 'chart-2', dashed: true }], unit: '°C' })}`,
        'chart-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Configuração da próxima execução', subtitle: 'Parâmetros enviados ao serviço de modelagem' })}
          <div class="form-grid">
            ${selectField({ value: MODEL_OPTIONS[0], options: MODEL_OPTIONS, label: 'Modelo' })}
            ${selectField({ value: 'Todas as variedades', options: ['Todas as variedades', 'Somente a variedade selecionada'], label: 'Escopo' })}
            ${selectField({ value: 'Últimos 24 meses', options: ['Últimos 12 meses', 'Últimos 24 meses', 'Todo o histórico'], label: 'Período histórico' })}
            ${selectField({ value: '95%', options: ['90%', '95%', '99%'], label: 'Nível de confiança' })}
          </div>
          <div class="checks">${FEATURES.map((feature) => html`<label><input type="checkbox" checked /><span>${feature}</span></label>`)}</div>
          ${switchField({ label: 'Reprocessar dados antes do treino', name: 'reprocess' })}
          <div class="button-row" style="margin-top:16px">
            ${button('Salvar configuração', { variant: 'secondary', action: 'run-model', dataset: { model: 'config' } })}
            ${button('Executar modelo', { action: 'run-model' })}
          </div>`,
        'form-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Comparação de modelos', subtitle: 'Métricas de validação retornadas pelo back-end' })}
      ${dataTable({
        columns: [
          { label: 'Modelo', render: (row) => html`<strong>${row.name}</strong>` },
          { label: 'Versão', key: 'version' },
          { label: 'Precisão', key: 'accuracyLabel' },
          { label: 'MAE', key: 'maeLabel' },
          { label: 'RMSE', key: 'rmseLabel' },
          { label: 'Status', render: (row) => badge(row.statusLabel, row.tone) },
          {
            label: 'Ações',
            render: (row) => html`<div class="actions">${button('Executar', { variant: 'icon', iconName: 'activity', action: 'run-model', dataset: { model: row.name } })}</div>`,
          },
        ],
        rows,
        emptyTitle: 'Nenhum modelo para comparar',
      })}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Governança do modelo', subtitle: 'Informações de rastreabilidade exigidas pela disciplina de Data Science' })}
      ${keyValues(
        [
          { label: 'Versão em produção', value: active ? `${active.name} ${active.version}` : '—' },
          { label: 'Gerado em', value: forecast?.generatedAt ? formatDateTime(forecast.generatedAt) : '—' },
          { label: 'Risco projetado', value: forecast?.riskLabel ?? '—' },
          { label: 'Artefato', value: 'joblib em storage/models (servidor)' },
          { label: 'Registro na trilha', value: 'Cada execução é gravada em Admin › Logs' },
        ],
        { rows: true },
      )}
      <p class="helper" style="margin-top:12px">O navegador nunca recebe o arquivo do modelo nem chaves: apenas métricas e previsões agregadas (RNF02).</p>`,
      'table-card',
    ),
  );
}
