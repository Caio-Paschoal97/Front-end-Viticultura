/**
 * Produtor/Exportador › Comparação (RF06/RF07).
 *
 * Ranking das variedades monitoradas a partir do `VarietySummaryDto`, com
 * critérios ponderados (score do modelo, clima, mercado e risco) calculados em
 * cima do que a API devolveu — nenhum índice é inventado na tela.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, chartCard, emptyState, sectionHead } from '../../components/ui.js';
import { barsHorizontal } from '../../components/charts.js';
import { comparisonTable } from '../../components/tables.js';
import { formatCurrency, formatNumber, formatPercent, formatTemperature } from '../../utils/format.js';
import { dataOf, header, metricsRow, page, pct, strip } from '../support.js';

/** Pesos usados na leitura gerencial (documentados na própria tela). */
const CRITERIA = [
  { key: 'score', label: 'Score do modelo', weight: 0.4 },
  { key: 'climate', label: 'Conforto climático', weight: 0.3 },
  { key: 'market', label: 'Preço de mercado', weight: 0.2 },
  { key: 'risk', label: 'Risco da janela', weight: 0.1 },
];

const riskScore = (level) => (level === 'LOW' ? 100 : level === 'MEDIUM' ? 60 : level === 'HIGH' ? 25 : 50);

function weightedScore(item, bounds) {
  const climate = item.temperature === null || item.humidity === null ? 50 : fit(item, bounds);
  const market = bounds.price.max === bounds.price.min ? 50 : ((item.marketPrice ?? bounds.price.min) - bounds.price.min) / (bounds.price.max - bounds.price.min) * 100;
  const components = {
    score: item.score,
    climate,
    market,
    risk: riskScore(item.risk),
  };
  const total = CRITERIA.reduce((accumulator, criterion) => accumulator + components[criterion.key] * criterion.weight, 0);
  return { total, components };
}

const fit = (item, bounds) => {
  const temperature = bounds.temperature;
  const distance = Math.abs(item.temperature - (temperature.min + temperature.max) / 2);
  const range = Math.max(1, (temperature.max - temperature.min) / 2);
  return Math.max(0, 100 - (distance / range) * 100);
};

export function producerComparison(context) {
  const varieties = dataOf(context, 'varieties') ?? [];
  const market = dataOf(context, 'market');

  const bounds = {
    temperature: { min: Math.min(...varieties.map((item) => item.temperature ?? 0)), max: Math.max(...varieties.map((item) => item.temperature ?? 0)) },
    price: { min: Math.min(...varieties.map((item) => item.marketPrice ?? 0)), max: Math.max(...varieties.map((item) => item.marketPrice ?? 0)) },
  };

  const ranked = varieties
    .map((item) => ({ ...item, weighted: weightedScore(item, bounds) }))
    .sort((a, b) => b.weighted.total - a.weighted.total);

  const winner = ranked[0] ?? null;

  return page(
    header(context, {
      title: 'Comparação entre Variedades',
      subtitle: 'Ranking ponderado por score do modelo, clima, mercado e risco',
      varietyMode: 'locked',
      actions: [button('Exportar comparativo', { variant: 'secondary', iconName: 'download', action: 'export-report', dataset: { report: 'overview' } })],
    }),
    strip(context, { extra: `${formatNumber(varieties.length)} variedades no comparativo`, loadingLabel: 'Consultando /varieties/summary…' }),
    ranked.length === 0
      ? card(emptyState({ iconName: 'compare', title: 'Sem dados para comparar', message: 'A rota de resumo das variedades não devolveu registros.' }), 'table-card')
      : page(
          metricsRow(
            [
              { icon: 'compare', label: 'Melhor escolha', value: winner.name, meta: `Score ponderado ${winner.weighted.total.toFixed(1)}`, tone: 'green' },
              { icon: 'market', label: 'Maior preço', value: formatCurrency(Math.max(...ranked.map((item) => item.marketPrice ?? 0))), meta: 'referência de mercado', tone: 'purple' },
              { icon: 'thermo', label: 'Melhor clima', value: ranked.slice().sort((a, b) => b.weighted.components.climate - a.weighted.components.climate)[0].name, meta: `conforto ${ranked.slice().sort((a, b) => b.weighted.components.climate - a.weighted.components.climate)[0].weighted.components.climate.toFixed(0)}/100`, tone: 'orange' },
              { icon: 'shield', label: 'Menor risco', value: ranked.filter((item) => item.risk === 'LOW').length ? `${ranked.filter((item) => item.risk === 'LOW').length} variedade(s)` : 'Nenhuma', meta: 'risco classificado como baixo', tone: 'blue' },
            ],
            'four',
          ),
          comparisonTable(
            ranked.map((item) => ({ name: item.name, score: item.weighted.total, temperature: item.temperature, humidity: item.humidity, marketPrice: item.marketPrice, riskLabel: item.riskLabel, riskTone: item.riskTone })),
            { title: 'Ranking consolidado', subtitle: 'Score final = 40% modelo + 30% clima + 20% mercado + 10% risco' },
          ),
          html`<div class="grid-2">
            ${card(
              html`${sectionHead({ title: 'Critérios e pesos', subtitle: 'Como o ranking é calculado na ausência de uma rota de scoring no back-end' })}
                <div class="table-scroll"><table>
                  <thead><tr><th>Critério</th><th>Peso</th><th>Fonte</th><th>Melhor colocada</th></tr></thead>
                  <tbody>${CRITERIA.map((criterion) => html`<tr>
                    <td>${criterion.label}</td>
                    <td>${formatPercent(criterion.weight * 100, { digits: 0 })}</td>
                    <td class="mono">${criterion.key === 'market' ? 'MarketResponse' : criterion.key === 'risk' ? 'risk_level' : criterion.key === 'score' ? 'VarietySummaryDto.score' : 'temperature/humidity'}</td>
                    <td>${ranked.slice().sort((a, b) => b.weighted.components[criterion.key] - a.weighted.components[criterion.key])[0].name}</td>
                  </tr>`)}</tbody>
                </table></div>`,
              'table-card',
            )}
            ${chartCard({
              title: 'Participação do preço',
              subtitle: 'Preço de referência por variedade (R$/kg)',
              content: barsHorizontal({
                items: ranked.map((item) => ({ label: item.name, value: item.marketPrice ?? 0, display: formatCurrency(item.marketPrice) })),
              }),
            })}
          </div>`,
          card(
            html`${sectionHead({ title: 'Recomendação para o embarque', subtitle: 'O que fazer com o resultado do ranking' })}
              <div class="policy-list">
                <div>${badge('Prioridade', 'success')}<div><strong>Embarcar ${winner.name}</strong><p>Melhor combinação de score e risco neste momento${winner.marketPrice === null ? '' : ` · ${formatCurrency(winner.marketPrice)}`}.</p></div></div>
                <div>${badge('Monitorar', 'warning')}<div><strong>${ranked[1]?.name ?? '—'}</strong><p>Segunda colocada: acompanhar preço e umidade antes de decidir a troca de lote.</p></div></div>
                <div>${badge('Atenção', 'danger')}<div><strong>${ranked[ranked.length - 1].name}</strong><p>Última colocada: risco ${ranked[ranked.length - 1].riskLabel.toLowerCase()} — revisar manejo antes de exportar.</p></div></div>
              </div>
              <p class="helper">Clima: ${ranked.map((item) => `${item.name} ${item.temperature === null ? '—' : formatTemperature(item.temperature)}`).join(' · ')} · mercado base ${formatCurrency(market?.price)}.</p>`,
            'table-card',
          ),
        ),
  );
}
