/**
 * Administrador › Permissões e RBAC (RF08/RNF10).
 *
 * Mostra a matriz completa de páginas × perfis e permite REVOGAR acessos do
 * conjunto previsto. Conceder além da matriz base não é possível: as telas de
 * cada perfil continuam isoladas (menor privilégio).
 */

import { html } from '../../utils/html.js';
import { badge, button, card, sectionHead } from '../../components/ui.js';
import { icon } from '../../components/icons.js';
import { ROLE_INFO, ROLES } from '../../config/roles.js';
import { capabilityMatrix, permissionMatrix, rbacSummary } from '../../core/rbac.js';
import { formatNumber, formatPercent } from '../../utils/format.js';
import { getPageFilter, header, metricsRow, page, strip } from '../support.js';

export function adminPermissions(context) {
  const overrides = context.state.permissionOverrides ?? {};
  const matrix = permissionMatrix(overrides);
  const summary = rbacSummary(overrides);
  const capabilities = capabilityMatrix();
  const benchmark = getPageFilter(context.page, 'bench', null);
  const revokedTotal = summary.reduce((total, item) => total + item.revoked, 0);

  const rows = matrix.map((page_) => ({
    ...page_,
    cells: Object.values(ROLES).map((role) => {
      const cell = page_.roles[role];
      const label = !cell.base ? 'Não previsto' : cell.allowed ? 'Permitido' : 'Revogado';
      return html`<td>
        <button
          type="button"
          class="btn ${cell.allowed ? 'btn-soft' : 'btn-secondary'} btn-sm"
          ${cell.base ? '' : 'disabled'}
          data-action="toggle-permission"
          data-role="${role}"
          data-page="${page_.id}"
          title="${cell.base ? (cell.allowed ? 'Revogar o acesso deste perfil' : 'Restaurar o acesso previsto') : 'Este perfil não tem previsão de acesso a esta tela'}"
        >${label}</button>
      </td>`;
    }),
  }));

  return page(
    header(context, {
      title: 'Permissões e RBAC',
      subtitle: 'Matriz de acesso por perfil — cada tela pertence a um escopo (produtor, analista ou administrador)',
      varietyMode: 'hidden',
      actions: [
        button('Restaurar padrão', { variant: 'secondary', iconName: 'refresh', action: 'reset-permissions' }),
        button('Medir custo do RBAC', { iconName: 'activity', action: 'measure-rbac' }),
      ],
    }),
    strip(context, {
      extra: `${formatNumber(revokedTotal)} revogação(ões) ativa(s) · avaliação feita antes de renderizar a página`,
      loadingLabel: 'Consolidando a matriz de acesso…',
    }),
    metricsRow(
      [
        { icon: 'users', label: 'Perfis de acesso', value: formatNumber(summary.length), meta: 'produtor, analista e administrador', tone: 'purple' },
        { icon: 'list', label: 'Páginas protegidas', value: formatNumber(matrix.length), meta: 'cada uma com roles declaradas', tone: 'blue' },
        { icon: 'lock', label: 'Revogações ativas', value: formatNumber(revokedTotal), meta: 'aplicadas imediatamente no menu e nas rotas', tone: revokedTotal ? 'gold' : 'green' },
        { icon: 'shield', label: 'Cruzamento negado', value: formatNumber(matrix.length * 3 - matrix.reduce((total, page_) => total + Object.values(page_.roles).filter((cell) => cell.allowed).length, 0)), meta: 'pares página × perfil bloqueados', tone: 'red' },
      ],
      'four',
    ),
    card(
      html`${sectionHead({ title: 'Matriz de páginas × perfis', subtitle: 'Somente revogação é permitida — conceder além do previsto não é possível (menor privilégio)' })}
      <div class="table-scroll"><table class="matrix">
        <thead><tr><th>Página</th>${Object.values(ROLES).map((role) => html`<th>${ROLE_INFO[role].short}</th>`)}</tr></thead>
        <tbody>${rows.map(
          (row) => html`<tr>
            <td><strong>${row.label}</strong><br /><small class="text-muted mono">${row.id}</small></td>
            ${row.cells}
          </tr>`,
        )}</tbody>
      </table></div>
      <p class="helper">O ajuste vale só para este navegador (localStorage) e é registrado na trilha de segurança. Em produção a mesma matriz é aplicada no gateway de identidade (RF08).</p>`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Capacidades por perfil', subtitle: 'Além das páginas, cada perfil tem ações autorizadas dentro das telas' })}
      <div class="table-scroll"><table class="matrix">
        <thead><tr><th>Capacidade</th>${Object.values(ROLES).map((role) => html`<th>${ROLE_INFO[role].short}</th>`)}</tr></thead>
        <tbody>${capabilities.map(
          (item) => html`<tr>
            <td>${item.label}<br /><small class="text-muted mono">${item.capability}</small></td>
            ${Object.values(ROLES).map((role) => html`<td class="${item.roles[role] ? 'yes' : 'no'}">${item.roles[role] ? 'permitido' : '—'}</td>`)}
          </tr>`,
        )}</tbody>
      </table></div>`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Isolamento por tipo de usuário', subtitle: 'Como o projeto impede que um perfil abra a tela de outro' })}
        <div class="policy-list">
          <div>${icon('layers', 18)}<div><strong>Páginas separadas por pasta</strong><p><span class="mono">js/pages/produtor</span>, <span class="mono">js/pages/analista</span> e <span class="mono">js/pages/admin</span> — cada perfil importa apenas o seu conjunto.</p></div>${badge('Estrutura', 'info')}</div>
          <div>${icon('shield', 18)}<div><strong>Registro de páginas com roles</strong><p>Cada tela declara os perfis autorizados em <span class="mono">js/config/pages.js</span>.</p></div>${badge('Declarativo', 'purple')}</div>
          <div>${icon('lock', 18)}<div><strong>Guarda de navegação</strong><p>Toda navegação passa por <span class="mono">canAccessPage()</span>; a tentativa indevida gera evento de segurança e tela de bloqueio.</p></div>${badge('Execução', 'success')}</div>
          <div>${icon('activity', 18)}<div><strong>Custo desprezível</strong><p>A verificação percorre listas pequenas em memória — impacto muito abaixo dos 10% do RNF10.</p></div>${badge('RNF10', 'warning')}</div>
        </div>`,
      'table-card',
    ),
    benchmark
      ? card(
          html`${sectionHead({ title: 'Desempenho do controle de acesso (RNF10)', subtitle: 'Medição executada neste navegador' })}
            <div class="metrics-inline">
              <div><span>Verificações</span><strong>${formatNumber(benchmark.iterations)}</strong><small>chamadas a canAccessPage</small></div>
              <div><span>Tempo total</span><strong>${formatNumber(benchmark.totalMs, { digits: 2 })} ms</strong><small>custo agregado</small></div>
              <div><span>Custo médio</span><strong>${(benchmark.averageMs * 1000).toFixed(2)} µs</strong><small>por verificação</small></div>
              <div><span>Impacto no orçamento de 3 s</span><strong>${formatPercent((benchmark.totalMs / 3000) * 100, { digits: 4 })}</strong><small>RNF04</small></div>
            </div>`,
          'table-card',
        )
      : card(
          html`${sectionHead({ title: 'Desempenho do controle de acesso (RNF10)', subtitle: 'Ainda não medido nesta sessão' })}
            <p class="text-muted">Clique em <strong>Medir custo do RBAC</strong> para executar 10.000 verificações de permissão e comparar o resultado com o orçamento de 3 s por consulta.</p>`,
          'table-card',
        ),
  );
}
