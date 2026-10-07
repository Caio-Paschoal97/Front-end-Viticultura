import { html } from '../../utils/html.js';
import { formatCurrency, formatNumber, formatPercent, formatTemperature } from '../../utils/format.js';
import { badge, button, card, emptyState, sectionHead } from '../../components/ui.js';
import { barsHorizontal, lineChart } from '../../components/charts.js';
import { comparisonTable } from '../../components/tables.js';
import { findVariety, VARIETIES } from '../../data/catalog.js';
import { fitScore } from '../../data/demo/dto.js';
import { dataOf, header, page, strip } from '../support.js';

/**
 * Análise comparativa multicritério (RF07).
 * Compara clima, mercado e potencial de exportação entre as variedades.
 */
export function analystComparison(context) {
  const varieties = dataOf(context, 'varieties') ?? [];
  const market = dataOf(context, 'market');
  const ranking = varieties.map((variety, index) => {
    const catalog = findVariety(variety.name);
    return { ...variety, position: index + 1, color: catalog.color, type: catalog.type, cycleDays: catalog.cycleDays };
  });
  const leader = ranking[0] ?? null;

  const criteria = [
    { label: 'Ajuste climático', value: leader ? Math.round(fitScore(leader.temperature ?? 0, findVariety(leader.name).idealTemperature)) : 0, weight: 32 },
    { label: 'Ajuste de umidade', value: leader ? Math.round(fitScore(leader.humidity ?? 0, findVariety(leader.name).idealHumidity)) : 0, weight: 28 },
    { label: 'Preço de mercado', value: leader?.marketPrice ? Math.round(Math.min(100, (leader.marketPrice / 10.5) * 100)) : 0, weight: 24 },
    { label: 'Demanda internacional', value: 88, weight: 16 },
  ].map((item) => ({ ...item, weighted: Number(((item.value * item.weight) / 100).toFixed(1)) }));

  const priceLines = VARIETIES.slice(0, 3).map((variety, index) => ({
    tone: `chart-${index + 1}`,
    data: dataOf(context, 'market')?.priceHistory?.map((point, position) => ({ timestamp: point.timestamp, value: Number((variety.basePrice + Math.sin(position / 2 + index) * 0.35).toFixed(2)) })) ?? [],
  }));

  return page(
    header(context, {
      title: 'Análise Comparativa',
      subtitle: 'Compare clima, mercado e potencial de exportação entre as cinco variedades monitoradas',
      varietyMode: 'hidden',
      actions: [button('Recalcular ranking', { variant: 'secondary', iconName: 'refresh', action: 'refresh-data' })],
    }),
    strip(context, { extra: `${ranking.length} variedades · pesos: clima 32%, umidade 28%, preço 24%, demanda 16%`, loadingLabel: 'Consolidando o ranking…' }),
    leader
      ? card(
          html`<div><span class="overline">Ranking preditivo</span><h2>${leader.name} lidera com score ${formatNumber(leader.score)}/100</h2><p>Melhor combinação de condições climáticas, preço e demanda para a janela atual. Mercado principal: ${findVariety(leader.name).market}.</p></div>
          <div class="ranking-list">${ranking.map(
            (variety) => html`<div class="${variety.position === 1 ? 'winner' : ''}">
              <b>${variety.position}º</b>
              <span class="grape-dot grape-${variety.color}"></span>
              <strong>${variety.name}</strong>
              <div><i style="width:${Math.max(4, variety.score)}%"></i></div>
              <em>${formatNumber(variety.score)}</em>
            </div>`,
          )}</div>`,
          'ranking',
        )
      : card(emptyState({ iconName: 'compare', title: 'Sem dados de comparação', message: 'A rota /varieties/summary ainda não está publicada no back-end.' }), 'table-card'),
    html`<div class="grid-2">
      ${card(
        html`<div class="card-title"><div><h3>Critérios do score</h3><p>Como a variedade líder pontua em cada dimensão ponderada</p></div>${badge(leader?.name ?? '—', 'info')}</div>
          ${barsHorizontal({ items: criteria.map((item) => ({ label: `${item.label} (${item.weight}%)`, value: item.value })), max: 100 })}`,
        'chart-card',
      )}
      ${card(
        html`<div class="card-title"><div><h3>Linhas de preço comparadas</h3><p>Três variedades de referência ao longo do histórico de mercado</p></div></div>
          ${lineChart({ series: priceLines, unit: 'R$/kg', emptyMessage: 'Sem histórico para comparar' })}`,
        'chart-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Detalhamento por variedade', subtitle: 'Clima atual, risco, ciclo produtivo e preço de referência' })}
      <div class="table-scroll"><table>
        <thead><tr><th>Variedade</th><th>Temperatura</th><th>Umidade</th><th>Faixa ideal</th><th>Ciclo</th><th>Preço</th><th>Risco</th></tr></thead>
        <tbody>${ranking.map((variety) => {
          const catalog = findVariety(variety.name);
          return html`<tr>
            <td><div class="variety-cell"><span class="grape-dot grape-${variety.color}"></span><div><strong>${variety.name}</strong><small>${catalog.type}</small></div></div></td>
            <td>${formatTemperature(variety.temperature)}</td>
            <td>${formatPercent(variety.humidity)}</td>
            <td>${catalog.idealTemperature.min}–${catalog.idealTemperature.max} °C · ${catalog.idealHumidity.min}–${catalog.idealHumidity.max}%</td>
            <td>${catalog.cycleDays} dias</td>
            <td><strong>${formatCurrency(variety.marketPrice)}</strong></td>
            <td>${badge(variety.riskLabel, variety.riskTone)}</td>
          </tr>`;
        })}</tbody>
      </table></div>`,
      'table-card',
    ),
    comparisonTable(ranking, { title: 'Tabela comparativa consolidada', subtitle: 'Mesmo comparativo exibido ao produtor, com o score do motor preditivo' }),
  );
}
