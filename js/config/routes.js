/**
 * Roteamento: associa cada id do registro (`js/config/pages.js`) à função que
 * renderiza a página e monta o contexto consumido pelas telas.
 *
 * A verificação de permissão é feita ANTES de renderizar (ver
 * `js/core/rbac.js`): se o perfil não tem acesso, a página de bloqueio é
 * exibida e o evento fica registrado na trilha de segurança.
 */

import { html } from '../utils/html.js';
import { PAGES } from './pages.js';
import { sourceOf } from '../services/data-service.js';

/* ------------------------------------------------------------------ Telas */
import { producerOverview } from '../pages/produtor/visao-geral.js';
import { producerMonitoring } from '../pages/produtor/monitoramento.js';
import { producerForecasts } from '../pages/produtor/previsoes.js';
import { producerMarket } from '../pages/produtor/mercado.js';
import { producerComparison } from '../pages/produtor/comparacao.js';
import { producerReports } from '../pages/produtor/relatorios.js';

import { analystDashboard } from '../pages/analista/dashboard.js';
import { analystClimateData } from '../pages/analista/dados-climaticos.js';
import { analystMarketData } from '../pages/analista/dados-mercado.js';
import { analystComparison } from '../pages/analista/comparativa.js';
import { analystQuality } from '../pages/analista/qualidade.js';
import { analystModels } from '../pages/analista/modelos.js';
import { analystForecasts } from '../pages/analista/previsoes.js';
import { analystReports } from '../pages/analista/relatorios.js';

import { adminDashboard } from '../pages/admin/dashboard.js';
import { adminUsers, userFormModal, userDetailModal } from '../pages/admin/usuarios.js';
import { adminPermissions } from '../pages/admin/permissoes.js';
import { adminSecurity } from '../pages/admin/seguranca.js';
import { adminLogs } from '../pages/admin/logs.js';
import { adminIntegrations } from '../pages/admin/integracoes.js';
import { adminSettings } from '../pages/admin/configuracoes.js';
import { adminDesignSystem } from '../pages/admin/design-system.js';

import { alertsPage } from '../pages/comum/alertas.js';
import { historyPage } from '../pages/comum/historico.js';

export const PAGE_RENDERERS = Object.freeze({
  /* Produtor */
  'produtor/visao-geral': producerOverview,
  'produtor/monitoramento': producerMonitoring,
  'produtor/previsoes': producerForecasts,
  'produtor/mercado': producerMarket,
  'produtor/comparacao': producerComparison,
  'produtor/relatorios': producerReports,
  /* Analista */
  'analista/dashboard': analystDashboard,
  'analista/dados-climaticos': analystClimateData,
  'analista/dados-mercado': analystMarketData,
  'analista/comparativa': analystComparison,
  'analista/qualidade': analystQuality,
  'analista/modelos': analystModels,
  'analista/previsoes': analystForecasts,
  'analista/relatorios': analystReports,
  /* Administrador */
  'admin/dashboard': adminDashboard,
  'admin/usuarios': adminUsers,
  'admin/permissoes': adminPermissions,
  'admin/seguranca': adminSecurity,
  'admin/logs': adminLogs,
  'admin/integracoes': adminIntegrations,
  'admin/configuracoes': adminSettings,
  'admin/design-system': adminDesignSystem,
  /* Compartilhadas */
  'comum/alertas': alertsPage,
  'comum/historico': historyPage,
});

/** Modais globais (renderizados por cima da página pelo main.js). */
export const MODAL_RENDERERS = Object.freeze({
  'user-form': userFormModal,
  'user-detail': userDetailModal,
});

export const resourcesForPage = (pageId) => PAGES[pageId]?.resources ?? [];

/** Contexto entregue às páginas: estado + dados normalizados + origem. */
export function buildPageContext(state) {
  const definition = PAGES[state.page];
  const resources = resourcesForPage(state.page);
  return {
    state,
    page: state.page,
    pageDefinition: definition ?? null,
    role: state.role,
    session: state.session,
    variety: state.variety,
    period: state.period,
    resources,
    source: sourceOf(resources, state.sources),
    loading: state.loading.some((key) => resources.includes(key)),
    lastSync: state.lastSync,
  };
}

/** Renderiza a página atual (a checagem de permissão acontece em main.js). */
export function renderPage(state) {
  const renderer = PAGE_RENDERERS[state.page];
  if (!renderer) {
    return html`
      <section class="page">
        <div class="empty-state">
          <strong>Página não encontrada</strong>
          <p>O identificador "${state.page}" não corresponde a nenhuma tela registrada.</p>
        </div>
      </section>`;
  }
  return renderer(buildPageContext(state));
}

export function renderModal(state) {
  if (!state.modal) return null;
  const renderer = MODAL_RENDERERS[state.modal.type];
  if (!renderer) return null;
  return renderer(state, state.modal.payload ?? {});
}
