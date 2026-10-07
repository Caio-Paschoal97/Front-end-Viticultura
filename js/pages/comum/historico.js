import { html } from '../../utils/html.js';
import { formatDateTime, formatNumber, formatPercent, formatTemperature, relativeTime } from '../../utils/format.js';
import { badge, banner, button, card, emptyState, sectionHead } from '../../components/ui.js';
import { lineChart } from '../../components/charts.js';
import { dataTable } from '../../components/tables.js';
import { average, maxOf, minOf } from '../../utils/format.js';
import { dataOf, header, metricsRow, page, pct, periodLabel, sliceByPeriod, strip } from '../support.js';

/**
 * Histórico climático e de safra (RF10) — compartilhado por produtor e analista.
 * A API devolve 24 h por consulta (`/readings/current`); o período selecionado é
 * aplicado sobre o histórico disponível e a limitação é informada na tela.
 */
export function historyPage(context) {
  const readings = dataOf(context, 'readings') ?? [];
  const quality = dataOf(context, 'quality');
  const market = dataOf(context, 'market');
  const windowed = sliceByPeriod([...readings].reverse(), context.period);
  const temperatures = windowed.series.map((reading) => reading.temperature).filter((value) => typeof value === 'number');
  const humidities = windowed.series.map((reading) => reading.humidity).filter((value) => typeof value === 'number');
  const priceWindow = sliceByPeriod(market?.priceHistory ?? [], context.period);

  const rows = [...readings].reverse().map((reading) => ({
    ...reading,
    when: formatDateTime(reading.timestamp),
    ago: relativeTime(reading.timestamp),
  }));

  return page(
    header(context, {
      title: 'Histórico',
      subtitle: `${periodLabel(context.period)} de dados climáticos e de mercado — ${context.variety}`,
      varietyMode: 'live',
      actions: [
        button('Atualizar', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' }),
        button('Exportar histórico', { iconName: 'download', action: 'export-report', dataset: { report: 'history' } }),
      ],
    }),
    strip(context, {
      extra: `${rows.length} registro(s) disponíveis para consulta`,
      loadingLabel: 'Consultando o histórico…',
    }),
    windowed.truncated
      ? banner({
          tone: 'info',
          iconName: 'info',
          title: 'Janela da API:',
          message: `a rota /readings/current devolve as últimas 24 h. Para ${periodLabel(context.period).toLowerCase()} o histórico completo precisa da rota /readings/history (prevista no back-end), que consulta a tabela sensor_readings por período.`,
        })
      : '',
    metricsRow(
      [
        { icon: 'database', label: 'Registros no período', value: formatNumber(rows.length), meta: `Última leitura ${rows.length ? relativeTime(readings[0].timestamp) : '—'}` },
        { icon: 'thermo', label: 'Temperatura média', value: average(temperatures) === null ? '—' : formatTemperature(average(temperatures)), meta: `Mín. ${formatTemperature(minOf(temperatures))} · Máx. ${formatTemperature(maxOf(temperatures))}`, tone: 'orange' },
        { icon: 'drop', label: 'Umidade média', value: average(humidities) === null ? '—' : formatPercent(average(humidities)), meta: `Mín. ${formatPercent(minOf(humidities))} · Máx. ${formatPercent(maxOf(humidities))}`, tone: 'blue' },
        { icon: 'quality', label: 'Consistência histórica', value: quality ? pct(quality.consistency) : '—', meta: `${formatNumber(quality?.invalidCount ?? 0)} registro(s) descartado(s)`, tone: 'purple' },
      ],
      'four',
    ),
    html`<div class="grid-2">
      ${card(
        html`<div class="card-title"><div><h3>Temperatura no período</h3><p>°C · leituras válidas da tabela sensor_readings</p></div></div>
          ${lineChart({ series: [{ data: windowed.series.map((reading) => ({ timestamp: reading.timestamp, value: reading.temperature })), tone: 'chart-1' }], unit: '°C', emptyMessage: 'Sem histórico de temperatura' })}`,
        'chart-card',
      )}
      ${card(
        html`<div class="card-title"><div><h3>Série de preços</h3><p>R$/kg · 30 dias de referência de mercado</p></div></div>
          ${lineChart({ series: [{ data: priceWindow.series, tone: 'chart-3' }], unit: 'R$/kg', emptyMessage: 'Sem histórico de preços' })}`,
        'chart-card',
      )}
    </div>`,
    card(
      html`${sectionHead({
        title: 'Registros do histórico',
        subtitle: 'Cada linha traz sensor, variedade, valores e status da validação',
        action: button('Exportar CSV', { variant: 'ghost', iconName: 'download', action: 'export-report', dataset: { report: 'history' } }),
      })}
      ${rows.length === 0
        ? emptyState({ iconName: 'clock', title: 'Sem registros no período', message: 'A API não devolveu leituras para a janela consultada.' })
        : dataTable({
            columns: [
              { label: 'Data / hora', render: (row) => html`${row.when}<br /><small class="text-muted">${row.ago}</small>` },
              { label: 'Temperatura', render: (row) => formatTemperature(row.temperature) },
              { label: 'Umidade', render: (row) => formatPercent(row.humidity) },
              { label: 'Sensor', render: (row) => html`<span class="mono">${row.sensorCode}</span>` },
              { label: 'Variedade', render: (row) => row.variety ?? '—' },
              { label: 'Status', render: (row) => badge(row.statusLabel, row.statusTone) },
            ],
            rows,
            foot: html`<span>Retenção configurada: ${context.state.settings?.auditRetentionDays ?? 90} dias de trilha · histórico climático mantido no banco em nuvem</span>`,
          })}`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Uso do histórico', subtitle: 'Para que os dados são reaproveitados nas disciplinas' })}
      <div class="policy-list">
        <div>${badge('DS', 'info')}<div><strong>Data Science</strong><p>Base de treino e validação dos modelos preditivos de janela de colheita.</p></div></div>
        <div>${badge('IoT', 'purple')}<div><strong>IoT</strong><p>Auditoria dos registros enviados pelo ESP32 ao canal do ThingSpeak, com carimbo de tempo do sensor.</p></div></div>
        <div>${badge('Cloud', 'success')}<div><strong>Cloud Computing</strong><p>Persistência em banco gerenciado, com retenção e consulta por período (RF04/RF10).</p></div></div>
      </div>`,
      'table-card',
    ),
  );
}
