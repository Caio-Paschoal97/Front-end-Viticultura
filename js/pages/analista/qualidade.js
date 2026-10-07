import { html } from '../../utils/html.js';
import { formatDateTime, formatNumber, formatPercent } from '../../utils/format.js';
import { badge, button, card, emptyState, sectionHead } from '../../components/ui.js';
import { donutChart } from '../../components/charts.js';
import { dataTable } from '../../components/tables.js';
import { ALERT_THRESHOLDS, IDEAL, LIMITS, calculateQuality, validateReading } from '../../core/data-quality.js';
import { dataOf, header, metricsRow, page, pct, strip } from '../support.js';

/**
 * Qualidade dos dados (RF05/RF11).
 * Compara os indicadores devolvidos pelo back-end com os recalculados no
 * front-end (mesmas regras), evidenciando divergências.
 */
export function analystQuality(context) {
  const quality = dataOf(context, 'quality');
  const readings = dataOf(context, 'readings') ?? [];
  const local = calculateQuality(readings);
  const divergence = quality ? Math.abs((quality.consistency ?? 0) - local.consistency) : null;

  const problems = readings
    .map((reading) => ({ reading, validation: validateReading(reading) }))
    .filter((item) => !item.validation.valid)
    .map(({ reading, validation }) => ({
      ...reading,
      errorLabel: validation.errors.map(translateError).join(', '),
    }));

  return page(
    header(context, {
      title: 'Qualidade dos Dados',
      subtitle: 'Completude, consistência e outliers das séries que alimentam o motor preditivo',
      actions: [
        button('Reprocessar validação', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' }),
        button('Exportar relatório', { variant: 'ghost', iconName: 'download', action: 'export-report', dataset: { report: 'quality' } }),
      ],
    }),
    strip(context, {
      extra: `${formatNumber(readings.length)} leitura(s) reavaliada(s) com as regras do DataQualityService`,
      loadingLabel: 'Consultando /analytics/data-quality…',
    }),
    metricsRow(
      [
        { icon: 'quality', label: 'Completude (API)', value: quality ? pct(quality.completeness) : '—', meta: 'Leituras com temperatura e umidade' },
        { icon: 'check', label: 'Consistência (API)', value: quality ? pct(quality.consistency) : '—', meta: `${formatNumber(quality?.validCount ?? 0)} registros aprovados`, tone: 'blue' },
        { icon: 'x-circle', label: 'Ausentes', value: formatNumber(quality?.missingCount ?? 0), meta: 'Campos obrigatórios sem valor', tone: 'orange' },
        { icon: 'warning', label: 'Outliers', value: formatNumber(quality?.outlierCount ?? 0), meta: `${LIMITS.temperature.min} a ${LIMITS.temperature.max} °C`, tone: 'purple' },
      ],
      'four',
    ),
    html`<div class="grid-main">
      ${card(
        html`<div class="card-title"><div><h3>Distribuição dos registros</h3><p>Resultado do ciclo de validação atual</p></div>${badge('RF05', 'info')}</div>
          ${donutChart({
            total: pct(quality?.consistency ?? 0),
            caption: 'consistentes',
            segments: [
              { label: 'Válidos', value: quality?.validCount ?? 0, tone: 1 },
              { label: 'Outliers', value: quality?.outlierCount ?? 0, tone: 3 },
              { label: 'Ausentes/inválidos', value: quality?.invalidCount ?? 0, tone: 'danger' },
            ],
          })}`,
        'chart-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Conferência independente', subtitle: 'Mesmo cálculo executado no navegador a partir das leituras recebidas' })}
          <div class="kv-list rows">
            <div><span>Completude (front-end)</span><strong>${pct(local.completeness)}</strong></div>
            <div><span>Consistência (front-end)</span><strong>${pct(local.consistency)}</strong></div>
            <div><span>Registros avaliados</span><strong>${formatNumber(local.validCount + local.invalidCount)}</strong></div>
            <div><span>Divergência vs. API</span><strong>${divergence === null ? '—' : formatPercent(divergence * 100, { digits: 2 })}</strong></div>
          </div>
          <p class="helper" style="margin-top:12px">Se a divergência passar de 1 ponto percentual, o pipeline do back-end precisa ser verificado: as regras de negócio devem ser idênticas.</p>`,
        'insight-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Regras de validação aplicadas', subtitle: 'Faixas físicas e limites de alerta configurados (espelham o back-end)' })}
      <div class="table-scroll"><table>
        <thead><tr><th>Verificação</th><th>Regra</th><th>Código no back-end</th></tr></thead>
        <tbody>
          <tr><td>Temperatura presente</td><td>Campo obrigatório entre ${LIMITS.temperature.min} e ${LIMITS.temperature.max} °C</td><td class="mono">temperature_missing / temperature_out_of_range</td></tr>
          <tr><td>Umidade presente</td><td>Campo obrigatório entre ${LIMITS.humidity.min} e ${LIMITS.humidity.max}%</td><td class="mono">humidity_missing / humidity_out_of_range</td></tr>
          <tr><td>Faixa ideal agronômica</td><td>${IDEAL.temperature.min}–${IDEAL.temperature.max} °C e ${IDEAL.humidity.min}–${IDEAL.humidity.max}%</td><td class="mono">classifyReading → NORMAL/WARNING</td></tr>
          <tr><td>Limite de alerta crítico</td><td>${ALERT_THRESHOLDS.temperatureHigh} °C ou mais</td><td class="mono">AlertService.evaluate_reading</td></tr>
          <tr><td>Limite de atenção</td><td>umidade abaixo de ${ALERT_THRESHOLDS.humidityLow}%</td><td class="mono">AlertService.evaluate_reading</td></tr>
        </tbody>
      </table></div>`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Registros reprovados no ciclo', subtitle: 'Descartados antes da modelagem — nenhuma linha inválida entra na base de treino' })}
      ${problems.length === 0
        ? emptyState({ iconName: 'check-circle', title: 'Nenhum registro reprovado', message: 'Todas as leituras do ciclo passaram pela validação.' })
        : dataTable({
            columns: [
              { label: 'Data / hora', render: (row) => formatDateTime(row.timestamp) },
              { label: 'Temperatura', render: (row) => (row.temperature === null ? 'ausente' : `${row.temperature} °C`) },
              { label: 'Umidade', render: (row) => (row.humidity === null ? 'ausente' : `${row.humidity}%`) },
              { label: 'Motivo', render: (row) => badge(row.errorLabel, 'danger') },
              { label: 'Sensor', render: (row) => html`<span class="mono">${row.sensorCode}</span>` },
            ],
            rows: problems,
          })}`,
      'table-card',
    ),
  );
}

const translateError = (code) => {
  if (code === 'temperature_missing') return 'temperatura ausente';
  if (code === 'humidity_missing') return 'umidade ausente';
  if (code === 'temperature_out_of_range') return 'temperatura fora de faixa';
  if (code === 'humidity_out_of_range') return 'umidade fora de faixa';
  return code;
};
