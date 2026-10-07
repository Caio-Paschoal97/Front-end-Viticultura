/**
 * Administrador › Integrações (RF02/RF04/RNF11).
 *
 * Documenta e monitora o caminho do dado: ESP32 → ThingSpeak (canal IoT) →
 * consumo REST pelo back-end → banco em nuvem → dashboard. Mostra também os
 * endereços configurados e o status do canal.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, emptyState, inputField, sectionHead } from '../../components/ui.js';
import { icon } from '../../components/icons.js';
import { API_PREFIX, ENV, getApiBaseUrl } from '../../config/env.js';
import { ARCHITECTURE_STEPS, INTEGRATIONS, SENSORS } from '../../data/demo/records.js';
import { validateReading } from '../../core/data-quality.js';
import { formatDateTime, formatNumber, relativeTime } from '../../utils/format.js';
import { dataOf, header, metricsRow, page, strip } from '../support.js';

const ENDPOINTS = [
  { method: 'GET', path: '/dashboard/overview?variety=', description: 'Métricas, séries e recomendações da visão geral', resource: 'overview' },
  { method: 'GET', path: '/readings/current', description: 'Leituras correntes consumidas do ThingSpeak', resource: 'readings' },
  { method: 'GET', path: '/analytics/data-quality', description: 'Indicadores de qualidade dos dados', resource: 'quality' },
  { method: 'GET', path: '/alerts?category=', description: 'Alertas ativos por categoria', resource: 'alerts' },
  { method: 'GET', path: '/models', description: 'Modelos preditivos e métricas de validação', resource: 'models' },
  { method: 'GET', path: '/integrations/thingspeak/status', description: 'Status do canal ThingSpeak', resource: 'thingspeak' },
];

export function adminIntegrations(context) {
  const thingspeak = dataOf(context, 'thingspeak');
  const readings = dataOf(context, 'readings') ?? [];
  const apiStatus = context.state.apiStatus ?? {};
  const invalid = readings.filter((reading) => !validateReading(reading).valid).length;
  const lastReading = readings[0] ?? null;

  return page(
    header(context, {
      title: 'Integrações e Arquitetura IoT',
      subtitle: 'ThingSpeak, banco em nuvem, API REST e sensores de campo',
      varietyMode: 'hidden',
      actions: [
        button('Testar conexão', { variant: 'secondary', iconName: 'wifi', action: 'test-api' }),
        button('Sincronizar ThingSpeak', { iconName: 'refresh', action: 'refresh-data' }),
      ],
    }),
    strip(context, {
      extra: `API: ${getApiBaseUrl()}${apiStatus.latencyMs ? ` · ${apiStatus.latencyMs} ms` : ''}`,
      loadingLabel: 'Verificando integrações…',
    }),
    metricsRow(
      [
        { icon: 'cloud', label: 'Canal ThingSpeak', value: thingspeak?.statusLabel ?? '—', meta: thingspeak?.channelId ? `canal ${thingspeak.channelId}` : 'não configurado', tone: thingspeak?.configured ? 'green' : 'gold' },
        { icon: 'cpu', label: 'Sensores cadastrados', value: formatNumber(SENSORS.length), meta: `${formatNumber(SENSORS.filter((sensor) => sensor.active).length)} ativo(s)`, tone: 'blue' },
        { icon: 'database', label: 'Leituras processadas', value: formatNumber(readings.length), meta: `${formatNumber(invalid)} descartada(s) na validação`, tone: 'purple' },
        { icon: 'clock', label: 'Última leitura', value: lastReading ? relativeTime(lastReading.timestamp) : '—', meta: 'intervalo mínimo de 15 s (RNF11)', tone: 'orange' },
      ],
      'four',
    ),
    apiStatus.reachable === false
      ? card(
          html`<div class="banner warn">${icon('wifi-off', 22)}<div><strong>API não respondeu em ${getApiBaseUrl()}</strong><p>O dashboard está usando dados demonstrativos. Suba o back-end Python (<span class="mono">uvicorn app.main:app --port 8000</span>) e sirva o front pelo proxy (<span class="mono">npm start</span>), que encaminha <span class="mono">${API_PREFIX}</span> para o FastAPI.</p></div>${button('Testar novamente', { variant: 'ghost', action: 'test-api' })}</div>`,
          'table-card',
        )
      : card(
          html`<div class="banner success">${icon('check-circle', 22)}<div><strong>Integração ativa</strong><p>Consultas passam por ${getApiBaseUrl()}${apiStatus.latencyMs ? ` com ${apiStatus.latencyMs} ms de latência` : ''} e usam o contrato documentado em <span class="mono">docs/CONTRATO-API.md</span>.</p></div></div>`,
          'table-card',
        ),
    card(
      html`${sectionHead({ title: 'Fluxo de dados IoT', subtitle: 'O ESP32 publica no ThingSpeak; o dashboard nunca recebe dados direto do dispositivo (RF01/RF02)' })}
        <div class="architecture-flow">${ARCHITECTURE_STEPS.map(
          (step, index) => html`<div class="arch-group">
            <div class="arch-step ${step.featured ? 'featured' : ''}">
              <div>${icon(step.icon)}</div>
              <strong>${step.name}</strong>
              <span>${step.detail}</span>
              <span class="helper">${step.note}</span>
              ${step.featured ? badge('Recepção IoT', 'info') : ''}
            </div>
            ${index < ARCHITECTURE_STEPS.length - 1 ? html`<span class="flow-arrow">→</span>` : ''}
          </div>`,
        )}</div>
        <div class="architecture-note">${icon('lock', 18)}<span><strong>Arquitetura correta:</strong> o ESP32 envia ao ThingSpeak via HTTP/MQTT; a camada Python consome os <em>channel feeds</em> pela API REST e persiste no banco em nuvem. As chaves de leitura/escrita ficam apenas no servidor (RNF02).</span></div>`,
      'architecture',
    ),
    html`<div class="integration-grid">${INTEGRATIONS.map((integration) => {
      const isThingSpeak = integration.id === 'thingspeak';
      const status = isThingSpeak ? thingspeak?.statusLabel ?? 'Sem resposta' : integration.status;
      const tone = isThingSpeak ? (thingspeak?.configured ? 'success' : 'warning') : 'success';
      return card(
        html`<div class="integration-card-top"><div class="service-icon">${icon(integration.icon)}</div>${badge(status, tone)}</div>
          <h3>${integration.name}</h3>
          <p>${integration.description}</p>
          <div><span>Responsável</span><strong>${integration.owner}</strong></div>
          <div><span>Indicador</span><strong>${integration.metric}</strong></div>`,
        'integration-card',
      );
    })}</div>`,
    html`<div class="grid-2">
      ${card(
        html`${sectionHead({ title: 'Canal ThingSpeak', subtitle: 'Configuração usada pelo back-end para consumir os feeds' })}
          <div class="kv-list rows">
            <div><span>Provider</span><strong>${thingspeak?.provider ?? 'ThingSpeak'}</strong></div>
            <div><span>Channel ID</span><strong>${thingspeak?.channelId ?? 'não configurado'}</strong></div>
            <div><span>Status</span><strong>${thingspeak?.statusLabel ?? '—'}</strong></div>
            <div><span>Intervalo mínimo entre mensagens</span><strong>${ENV.thingspeakMinIntervalSeconds} s (RNF11)</strong></div>
            <div><span>Read Key</span><strong>•••••••• (apenas no servidor)</strong></div>
            <div><span>Registros processados</span><strong>${formatNumber(readings.length)}</strong></div>
            <div><span>Descartados pela validação</span><strong>${formatNumber(invalid)}</strong></div>
            <div><span>Última leitura</span><strong>${lastReading ? relativeTime(lastReading.timestamp) : '—'}</strong></div>
          </div>
          <p class="helper">A ingestão respeita ${ENV.thingspeakMinIntervalSeconds} s entre chamadas — abaixo disso o plano gratuito descarta mensagens.</p>`,
        'table-card',
      )}
      ${card(
        html`${sectionHead({ title: 'Endpoints consumidos', subtitle: 'Contrato completo em docs/CONTRATO-API.md' })}
          <div class="table-scroll"><table>
            <thead><tr><th>Método</th><th>Rota</th><th>Descrição</th><th>Origem</th></tr></thead>
            <tbody>${ENDPOINTS.map(
              (endpoint) => html`<tr>
                <td class="mono">${endpoint.method}</td>
                <td class="mono">${API_PREFIX}${endpoint.path}</td>
                <td>${endpoint.description}</td>
                <td>${badge(context.state.sources?.[endpoint.resource] === 'api' ? 'API' : 'demo', context.state.sources?.[endpoint.resource] === 'api' ? 'success' : 'warning')}</td>
              </tr>`,
            )}</tbody>
          </table></div>`,
        'table-card',
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Configuração da API', subtitle: 'Aponte o dashboard para o endereço do back-end (por padrão, a mesma origem com proxy para o FastAPI)' })}
        <form data-form="api-config" class="form-grid">
          ${inputField({ label: 'URL base da API', name: 'apiBaseUrl', value: getApiBaseUrl(), full: true, hint: `Exemplos: ${API_PREFIX} (mesma origem via proxy) ou http://localhost:8000${API_PREFIX}` })}
          <div class="button-row end full">
            ${button('Testar conexão', { variant: 'secondary', iconName: 'wifi', action: 'test-api' })}
            ${button('Salvar e recarregar', { type: 'submit' })}
          </div>
        </form>
        <p class="helper">Ao abrir o front por <span class="mono">file://</span>, o padrão passa a ser <span class="mono">http://localhost:8000${API_PREFIX}</span>. Nesse caso o FastAPI precisa liberar CORS para a origem do dashboard.</p>`,
      'form-card',
    ),
    card(
      html`${sectionHead({ title: 'Sensores cadastrados', subtitle: 'Equipamentos que alimentam o canal (ESP32 + sensores de temperatura/umidade)' })}
        ${SENSORS.length === 0
          ? emptyState({ iconName: 'cpu', title: 'Nenhum sensor cadastrado' })
          : html`<div class="table-scroll"><table>
              <thead><tr><th>Código</th><th>Nome</th><th>Local</th><th>Variedade</th><th>Status</th><th>Última leitura</th></tr></thead>
              <tbody>${SENSORS.map(
                (sensor) => html`<tr>
                  <td class="mono">${sensor.code}</td>
                  <td><strong>${sensor.name}</strong></td>
                  <td>${sensor.location}</td>
                  <td>${sensor.variety}</td>
                  <td>${badge(sensor.active ? 'Ativo' : 'Inativo', sensor.active ? 'success' : 'neutral')}</td>
                  <td>${formatDateTime(sensor.lastSeenAt)}</td>
                </tr>`,
              )}</tbody>
            </table></div>`}`,
      'table-card',
    ),
  );
}
