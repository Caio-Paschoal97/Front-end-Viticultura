/**
 * Administrador › Design System.
 *
 * Documentação viva da interface: tokens de cor, tipografia, componentes,
 * gráficos e estados. Serve de contrato visual entre as frentes do projeto
 * (front-end, back-end e documentação) e comprova que o tema escuro é apenas
 * troca de tokens — nenhum componente duplica regra de cor.
 */

import { html } from '../../utils/html.js';
import { badge, button, card, inputField, plainBadge, progressBar, sectionHead, selectField, switchField } from '../../components/ui.js';
import { barChart, donutChart, lineChart, sparkline } from '../../components/charts.js';
import { icon, iconNames } from '../../components/icons.js';
import { themeOptions } from '../../components/theme-toggle.js';
import { TEMPERATURE_SERIES_POINTS } from '../../data/demo/design-samples.js';
import { header, keyValues, page, strip } from '../support.js';

const SWATCHES = [
  { name: 'brand-900', token: 'var(--brand-900)' },
  { name: 'brand-600', token: 'var(--brand-600)' },
  { name: 'blue-700', token: 'var(--blue-700)' },
  { name: 'navy-800', token: 'var(--navy-800)' },
  { name: 'wine-700', token: 'var(--wine-700)' },
  { name: 'violet-700', token: 'var(--violet-700)' },
  { name: 'gold-600', token: 'var(--gold-600)' },
  { name: 'red-600', token: 'var(--red-600)' },
];

const STATES = [
  { icon: 'activity', title: 'Carregando', description: 'Consultando a API e atualizando a tela', className: '' },
  { icon: 'database', title: 'Sem dados', description: 'A rota respondeu sem registros no período', className: '' },
  { icon: 'wifi-off', title: 'Conexão perdida', description: 'Fallback automático para dados demonstrativos', className: 'demo' },
  { icon: 'lock', title: 'Acesso negado', description: 'Página fora do escopo do perfil (RBAC)', className: 'warning' },
];

export function adminDesignSystem(context) {
  const theme = context.state.theme ?? 'light';

  return page(
    header(context, {
      title: 'Design System',
      subtitle: 'Fundamentos, componentes e estados — base visual compartilhada pelas três áreas do sistema',
      varietyMode: 'hidden',
      actions: [button('Exportar tokens', { variant: 'ghost', iconName: 'download', action: 'export-report', dataset: { report: 'overview' } })],
    }),
    strip(context, { extra: `tema ativo: ${theme === 'dark' ? 'escuro' : 'claro'} · tokens em css/variables.css e css/theme-dark.css`, loadingLabel: 'Carregando amostras…' }),
    html`<div class="ds-grid">
      ${card(
        html`<h3>Cores do produto</h3>
          <div class="swatches">${SWATCHES.map(
            (swatch) => html`<div><i style="background:${swatch.token}"></i><span>${swatch.name}</span></div>`,
          )}</div>
          <p class="helper">Os componentes usam apenas tokens semânticos (<span class="mono">--surface</span>, <span class="mono">--text</span>, <span class="mono">--brand</span>…), por isso o tema escuro não duplica CSS.</p>`,
      )}
      ${card(
        html`<h3>Tipografia</h3>
          <div class="type-samples">
            <b>Manrope 800 — títulos de destaque</b>
            <strong>Manrope 700 — títulos de seção</strong>
            <p>DM Sans 400/500 — textos corridos, tabelas e rótulos. Escala usada: 26/19/14/13/11/9 px.</p>
          </div>
          <div class="settings-divider"></div>
          <h3>Tema</h3>
          ${themeOptions(theme)}`,
      )}
      ${card(
        html`<h3>Botões e selos</h3>
          <div class="component-row">
            ${button('Primário')}
            ${button('Secundário', { variant: 'secondary' })}
            ${button('Suave', { variant: 'soft' })}
            ${button('Texto', { variant: 'ghost' })}
            ${button('Perigo', { variant: 'danger' })}
            ${button('Com ícone', { iconName: 'download' })}
          </div>
          <div class="settings-divider"></div>
          <div class="component-row">
            ${badge('Sucesso')}${badge('Atenção', 'warning')}${badge('Crítico', 'danger')}${badge('Info', 'info')}${plainBadge('Neutro')}${plainBadge('Roxo', 'purple')}
          </div>
          <div class="settings-divider"></div>
          <div class="component-row">${progressBar(72)}${progressBar(38, 'warn')}${progressBar(14, 'danger')}</div>
          <div class="settings-divider"></div>
          <div class="component-row">${sparkline([4, 9, 6, 12, 8, 15, 11, 18])}</div>`,
      )}
      ${card(
        html`<h3>Formulários</h3>
          <div class="form-grid">
            ${inputField({ label: 'Campo de texto', name: 'sample', placeholder: 'Digite algo' })}
            ${selectField({ label: 'Seleção', value: 'Opção A', options: ['Opção A', 'Opção B'] })}
          </div>
          <div class="settings-divider"></div>
          ${switchField({ label: 'Interruptor de preferência', name: 'sample-switch', checked: true })}
          <div class="settings-divider"></div>
          <div class="field"><span>Intervalo</span><div class="range-row"><input type="range" name="sample-range" value="15" min="15" max="120" data-action="live-range" /><output data-range-output="sample-range">15 s</output></div></div>`,
      )}
      ${card(
        html`<h3>Ícones (${iconNames.length})</h3>
          <div class="component-row">${iconNames.slice(0, 24).map(
            (name) => html`<span class="icon-chip" title="${name}">${icon(name, 20)}${name}</span>`,
          )}</div>
          <p class="helper">Conjunto fixo em <span class="mono">js/components/icons.js</span> — nenhum ícone é carregado de CDN.</p>`,
      )}
      ${card(
        html`<h3>Gráficos</h3>
          ${lineChart({ series: [{ data: TEMPERATURE_SERIES_POINTS, tone: 'chart-1' }], unit: '°C' })}
          <div class="settings-divider"></div>
          <div class="grid-2">
            <div>${barChart({ values: [62, 78, 54, 88, 70, 92, 66], labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] })}</div>
            <div>${donutChart({ total: '251', caption: 'contas', segments: [{ label: 'Produtores', value: 164 }, { label: 'Analistas', value: 68 }, { label: 'Admins', value: 19 }] })}</div>
          </div>`,
      )}
      ${card(
        html`<h3>Estados do sistema</h3>
          <div class="state-grid">${STATES.map(
            (state) => html`<div class="${state.className}">${icon(state.icon)}<b>${state.title}</b><span>${state.description}</span></div>`,
          )}</div>`,
      )}
      ${card(
        html`<h3>Governança técnica</h3>
          ${keyValues(
            [
              { label: 'Arquivos de estilo', value: '9 folhas em cascata' },
              { label: 'Tokens semânticos', value: 'mais de 60 variáveis' },
              { label: 'Tema escuro', value: 'css/theme-dark.css (só tokens)' },
              { label: 'Componentes', value: 'ui.js · charts.js · tables.js · icons.js' },
              { label: 'Testes', value: 'npm test (node --test)' },
            ],
            { rows: true },
          )}`,
      )}
    </div>`,
    card(
      html`${sectionHead({ title: 'Estrutura de arquivos do front-end', subtitle: 'Separação por responsabilidade — nada de CSS/JS duplicado nas telas' })}
        <div class="table-scroll"><table>
          <thead><tr><th>Pasta</th><th>Conteúdo</th><th>Quem importa</th></tr></thead>
          <tbody>
            <tr><td class="mono">js/pages/produtor</td><td>Telas do produtor/exportador</td><td>rotas + RBAC</td></tr>
            <tr><td class="mono">js/pages/analista</td><td>Telas do analista de dados</td><td>rotas + RBAC</td></tr>
            <tr><td class="mono">js/pages/admin</td><td>Telas do administrador</td><td>rotas + RBAC</td></tr>
            <tr><td class="mono">js/components</td><td>Biblioteca de componentes</td><td>todas as páginas</td></tr>
            <tr><td class="mono">js/core</td><td>Contratos, RBAC, sessão, qualidade</td><td>páginas + serviços</td></tr>
            <tr><td class="mono">js/services</td><td>Dados, relatórios e usuários</td><td>páginas + eventos</td></tr>
          </tbody>
        </table></div>`,
      'table-card',
    ),
  );
}
