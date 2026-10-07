/**
 * Administrador › Configurações (RF12 / RNF11 / tema claro-escuro).
 *
 * Cada aba altera um grupo de parâmetros gravados no navegador
 * (`agroclima.settings`). Os limites de alerta são os mesmos usados pelo
 * `AlertService` do back-end — mudar aqui muda o que a interface considera
 * crítico, mas a decisão final continua no servidor.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, emptyState, inputField, rangeField, sectionHead, selectField, switchField, textareaField } from '../../components/ui.js';
import { icon } from '../../components/icons.js';
import { themeOptions } from '../../components/theme-toggle.js';
import { getApiBaseUrl } from '../../config/env.js';
import { VARIETIES } from '../../data/catalog.js';
import { SENSORS } from '../../data/demo/records.js';
import { getActiveTab } from '../../core/store.js';
import { formatNumber, formatPercent, formatCurrency } from '../../utils/format.js';
import { dataOf, header, keyValues, page, strip } from '../support.js';

const TABS = [
  { id: 'geral', label: 'Geral', iconName: 'settings' },
  { id: 'aparencia', label: 'Aparência', iconName: 'sun' },
  { id: 'notificacoes', label: 'Notificações', iconName: 'bell' },
  { id: 'seguranca', label: 'Segurança', iconName: 'shield' },
  { id: 'integracoes', label: 'Integrações', iconName: 'link' },
  { id: 'sensores', label: 'Sensores', iconName: 'cpu' },
  { id: 'variedades', label: 'Variedades', iconName: 'leaf' },
];

export function adminSettings(context) {
  const settings = context.state.settings ?? {};
  const active = getActiveTab(context.page, 'geral');
  const thingspeak = dataOf(context, 'thingspeak');
  const readings = dataOf(context, 'readings') ?? [];

  return page(
    header(context, {
      title: 'Configurações da Plataforma',
      subtitle: 'Parâmetros gerais, aparência, alertas, segurança, integrações e cadastros',
      varietyMode: 'hidden',
      actions: [button('Restaurar padrões', { variant: 'ghost', iconName: 'refresh', action: 'reset-settings' })],
    }),
    strip(context, { extra: 'alterações salvas neste navegador e registradas na trilha de auditoria', loadingLabel: 'Carregando parâmetros…' }),
    html`<div class="tabs" role="tablist">${TABS.map(
      (tab) => html`<button type="button" role="tab" aria-selected="${tab.id === active}" class="${tab.id === active ? 'active' : ''}" data-action="change-tab" data-tab="${tab.id}">${icon(tab.iconName, 15)}<span>${tab.label}</span></button>`,
    )}</div>`,
    html`<form data-form="settings">
      ${sectionFor(active, { settings, thingspeak, readings, context })}
      <div class="button-row end">
        ${button('Descartar alterações', { variant: 'secondary', action: 'reload-page' })}
        ${button('Salvar alterações', { type: 'submit' })}
      </div>
    </form>`,
  );
}

function sectionFor(tab, data) {
  if (tab === 'aparencia') return appearanceSection(data.settings);
  if (tab === 'notificacoes') return notificationsSection(data.settings);
  if (tab === 'seguranca') return securitySection(data);
  if (tab === 'integracoes') return integrationsSection(data);
  if (tab === 'sensores') return sensorsSection();
  if (tab === 'variedades') return varietiesSection();
  return generalSection(data.settings);
}

function generalSection(settings) {
  return card(
    html`${sectionHead({ title: 'Configurações gerais', subtitle: 'Informações institucionais e padrões da plataforma (RF12)' })}
      <div class="form-grid">
        ${inputField({ label: 'Nome do sistema', name: 'systemName', value: settings.systemName ?? '' })}
        ${inputField({ label: 'Região padrão', name: 'region', value: settings.region ?? '' })}
        ${selectField({ label: 'Idioma', name: 'language', value: settings.language ?? 'pt-BR', options: ['pt-BR', 'en-US', 'es-ES'] })}
        ${selectField({ label: 'Fuso horário', name: 'timezone', value: settings.timezone ?? 'America/Recife', options: ['America/Recife', 'America/Sao_Paulo', 'UTC'] })}
        ${textareaField({ label: 'Informações institucionais', name: 'institution', value: settings.institution ?? '' })}
      </div>
      ${keyValues(
        [
          { label: 'Versão da interface', value: 'AgroClima Cloud 2.0.0' },
          { label: 'Perfis aceitos', value: 'PRODUCER · ANALYST · ADMIN' },
          { label: 'Arquitetura', value: 'HTML + CSS + JS (módulos ES), sem build' },
        ],
        { rows: true },
      )}`,
    'settings-content',
  );
}

function appearanceSection(settings) {
  return card(
    html`${sectionHead({ title: 'Aparência', subtitle: 'Tema claro ou escuro — a preferência fica salva no navegador e é aplicada antes da primeira pintura' })}
      ${themeOptions(settings.theme ?? 'light')}
      <div class="settings-divider"></div>
      ${sectionHead({ title: 'Acessibilidade e usabilidade', subtitle: 'RNF06 — interface legível para produtores e exportadores' })}
      <div class="checks">
        <label><input type="checkbox" checked disabled /><span>Contraste AA garantido nos dois temas</span></label>
        <label><input type="checkbox" checked disabled /><span>Rótulos e textos em português claro</span></label>
        <label><input type="checkbox" checked disabled /><span>Navegação por teclado em menus, tabelas e modais</span></label>
        <label><input type="checkbox" checked disabled /><span>Layout responsivo para uso em campo (celular/tablet)</span></label>
      </div>
      <p class="helper">O tema também pode ser alternado a qualquer momento pelo botão na barra superior.</p>`,
    'settings-content',
  );
}

function notificationsSection(settings) {
  return card(
    html`${sectionHead({ title: 'Notificações e alertas', subtitle: 'Limites que disparam alertas automáticos (RF09)' })}
      <div class="form-grid">
        ${switchField({ label: 'Alertas críticos (temperatura extrema)', name: 'notifyCritical', checked: settings.notifyCritical !== false, hint: 'Envio imediato ao produtor responsável' })}
        ${switchField({ label: 'Avisos de atenção (umidade baixa)', name: 'notifyWarnings', checked: settings.notifyWarnings !== false, hint: 'Resumo a cada ciclo de ingestão' })}
        ${switchField({ label: 'Relatório diário consolidado', name: 'notifyDailyReport', checked: settings.notifyDailyReport !== false, hint: 'Enviado às 07h para os administradores' })}
      </div>
      <div class="settings-divider"></div>
      ${sectionHead({ title: 'Limites operacionais', subtitle: 'Mesmos valores usados pela validação e pelo AlertService do back-end' })}
      <div class="form-grid">
        ${rangeField({ label: 'Alerta crítico de temperatura', name: 'temperatureAlertHigh', value: settings.temperatureAlertHigh ?? 35, min: 25, max: 45, unit: ' °C' })}
        ${rangeField({ label: 'Atenção — umidade mínima', name: 'humidityAlertLow', value: settings.humidityAlertLow ?? 35, min: 20, max: 60, unit: '%' })}
        ${rangeField({ label: 'Temperatura ideal (mínima)', name: 'temperatureIdealMin', value: settings.temperatureIdealMin ?? 24, min: 15, max: 30, unit: ' °C' })}
        ${rangeField({ label: 'Temperatura ideal (máxima)', name: 'temperatureIdealMax', value: settings.temperatureIdealMax ?? 30, min: 25, max: 40, unit: ' °C' })}
        ${rangeField({ label: 'Umidade ideal (mínima)', name: 'humidityIdealMin', value: settings.humidityIdealMin ?? 60, min: 40, max: 75, unit: '%' })}
        ${rangeField({ label: 'Umidade ideal (máxima)', name: 'humidityIdealMax', value: settings.humidityIdealMax ?? 72, min: 60, max: 90, unit: '%' })}
      </div>`,
    'settings-content',
  );
}

function securitySection({ settings, readings }) {
  return card(
    html`${sectionHead({ title: 'Segurança e sessão', subtitle: 'Políticas aplicadas pelo gateway de identidade (RF08/RNF02)' })}
      <div class="form-grid">
        ${selectField({ label: 'Tempo de expiração da sessão', name: 'sessionTimeoutMinutes', value: `${settings.sessionTimeoutMinutes ?? 60}`, options: ['30', '60', '120', '480'] })}
        ${selectField({ label: 'Retenção da trilha de auditoria', name: 'auditRetentionDays', value: `${settings.auditRetentionDays ?? 90}`, options: ['30', '90', '180', '365'] })}
        ${switchField({ label: 'Exigir segundo fator (2FA) para administradores', name: 'twoFactorEnabled', checked: Boolean(settings.twoFactorEnabled) })}
      </div>
      <div class="settings-divider"></div>
      ${sectionHead({ title: 'Postura atual', subtitle: 'Controles ativos nesta instalação' })}
      <div class="policy-list">
        <div>${icon('lock', 18)}<div><strong>Chaves do ThingSpeak somente no servidor</strong><p>O front-end nunca carrega Read/Write Keys nem as expõe no código (RNF02).</p></div>${badge('Ativo', 'success')}</div>
        <div>${icon('key', 18)}<div><strong>JWT emitido pelo gateway</strong><p>A API Python confia apenas nos cabeçalhos <span class="mono">X-User-Id</span>/<span class="mono">X-User-Role</span> vindos do gateway.</p></div>${badge('Ativo', 'success')}</div>
        <div>${icon('shield', 18)}<div><strong>Validação das leituras</strong><p>${formatNumber(readings.length)} leitura(s) do ciclo passaram pela validação de faixas antes de serem exibidas.</p></div>${badge('Ativo', 'success')}</div>
      </div>`,
    'settings-content',
  );
}

function integrationsSection({ settings, thingspeak }) {
  return card(
    html`${sectionHead({ title: 'Integrações', subtitle: 'Endereços e intervalos usados pelo dashboard' })}
      <div class="form-grid">
        ${inputField({ label: 'URL base da API', name: 'apiBaseUrl', value: getApiBaseUrl(), full: true, hint: 'Padrão: mesma origem (/api/v1) com proxy para o FastAPI' })}
        ${inputField({ label: 'Gateway de identidade', name: 'authGatewayUrl', value: settings.authGatewayUrl ?? 'http://localhost:8080', full: true })}
        ${rangeField({ label: 'Intervalo de ingestão (ThingSpeak)', name: 'syncIntervalSeconds', value: settings.syncIntervalSeconds ?? 15, min: 15, max: 120, unit: ' s' })}
        ${rangeField({ label: 'Tempo de cache das consultas', name: 'cacheTtlSeconds', value: settings.cacheTtlSeconds ?? 30, min: 5, max: 300, unit: ' s' })}
      </div>
      <p class="helper">O intervalo mínimo do plano gratuito do ThingSpeak é de 15 s por canal (RNF11); valores menores são recusados pelo provedor.</p>
      <div class="settings-divider"></div>
      <div class="kv-list">
        <div><span>Status do canal</span><strong>${thingspeak?.statusLabel ?? '—'}</strong></div>
        <div><span>Channel ID</span><strong>${thingspeak?.channelId ?? 'não configurado'}</strong></div>
      </div>
      <div class="button-row">${button('Testar conexão agora', { variant: 'secondary', iconName: 'wifi', action: 'test-api' })}</div>`,
    'settings-content',
  );
}

function sensorsSection() {
  return card(
    html`${sectionHead({ title: 'Sensores', subtitle: 'Equipamentos cadastrados e situação na última sincronização' })}
      ${SENSORS.length === 0
        ? emptyState({ iconName: 'cpu', title: 'Nenhum sensor cadastrado' })
        : html`<div class="table-scroll"><table>
            <thead><tr><th>Código</th><th>Nome</th><th>Local</th><th>Variedade</th><th>Status</th></tr></thead>
            <tbody>${SENSORS.map(
              (sensor) => html`<tr>
                <td class="mono">${sensor.code}</td>
                <td><strong>${sensor.name}</strong></td>
                <td>${sensor.location}</td>
                <td>${sensor.variety}</td>
                <td>${badge(sensor.active ? 'Ativo' : 'Inativo', sensor.active ? 'success' : 'neutral')}</td>
              </tr>`,
            )}</tbody>
          </table></div>`}`,
    'settings-content',
  );
}

function varietiesSection() {
  return card(
    html`${sectionHead({ title: 'Variedades monitoradas', subtitle: 'Catálogo alinhado à tabela grape_varieties do back-end' })}
      <div class="table-scroll"><table>
        <thead><tr><th>Variedade</th><th>Tipo</th><th>Ciclo</th><th>Faixa ideal</th><th>Preço de referência</th><th>Situação</th></tr></thead>
        <tbody>${VARIETIES.map(
          (variety) => html`<tr>
            <td><div class="variety-cell"><span class="grape-dot" style="background:var(--grape-${variety.color})"></span><div><strong>${variety.name}</strong><small>${variety.market ?? ''}</small></div></div></td>
            <td>${variety.type}</td>
            <td>${formatNumber(variety.cycleDays)} dias</td>
            <td>${variety.idealTemperature.min}–${variety.idealTemperature.max} °C · ${variety.idealHumidity.min}–${variety.idealHumidity.max}%</td>
            <td><strong>${formatCurrency(variety.basePrice)}</strong></td>
            <td>${badge('Ativa', 'success')}</td>
          </tr>`,
        )}</tbody>
      </table></div>`,
    'settings-content',
  );
}

export { formatPercent };
