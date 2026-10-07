/**
 * Registro de páginas (metadados).
 *
 * Fica separado de `routes.js` (que associa cada id à função de renderização)
 * para que o RBAC (`js/core/rbac.js`) possa consultar as permissões sem
 * importar as próprias telas — evitando importação circular.
 *
 * `roles` = perfis autorizados a abrir a página (RF08).
 * `resources` = recursos de dados consumidos (ver js/services/data-service.js).
 */

import { ROLES } from './roles.js';

const { PRODUCER, ANALYST, ADMIN } = ROLES;

export const PAGES = Object.freeze({
  /* ------------------------------------------------------------ Produtor */
  'produtor/visao-geral': {
    id: 'produtor/visao-geral',
    label: 'Visão Geral',
    icon: 'grid',
    roles: [PRODUCER],
    resources: ['overview', 'alerts'],
    group: 'Operação',
    description: 'Painel de decisão do produtor/exportador',
  },
  'produtor/monitoramento': {
    id: 'produtor/monitoramento',
    label: 'Monitoramento',
    icon: 'cloud',
    roles: [PRODUCER],
    resources: ['readings', 'overview', 'thingspeak'],
    group: 'Operação',
    description: 'Dados dos sensores IoT via ThingSpeak',
  },
  'produtor/previsoes': {
    id: 'produtor/previsoes',
    label: 'Previsões',
    icon: 'trend',
    roles: [PRODUCER],
    resources: ['forecasts', 'overview'],
    group: 'Operação',
    description: 'Janela ideal de colheita e exportação',
  },
  'produtor/mercado': {
    id: 'produtor/mercado',
    label: 'Mercado e Exportação',
    icon: 'market',
    roles: [PRODUCER],
    resources: ['market', 'varieties'],
    group: 'Operação',
    description: 'Preços, demanda e logística de embarque',
  },
  'produtor/comparacao': {
    id: 'produtor/comparacao',
    label: 'Comparação',
    icon: 'compare',
    roles: [PRODUCER],
    resources: ['varieties', 'market'],
    group: 'Decisão',
    description: 'Ranking de variedades por cenário',
  },
  'produtor/relatorios': {
    id: 'produtor/relatorios',
    label: 'Relatórios',
    icon: 'report',
    roles: [PRODUCER],
    resources: ['overview', 'readings', 'market', 'quality'],
    group: 'Decisão',
    description: 'Relatórios de safra e exportação (CSV/impressão)',
  },

  /* ------------------------------------------------------------ Analista */
  'analista/dashboard': {
    id: 'analista/dashboard',
    label: 'Dashboard Analítico',
    icon: 'grid',
    roles: [ANALYST],
    resources: ['overview', 'quality', 'models', 'thingspeak'],
    group: 'Análise',
    description: 'Qualidade, modelos e desempenho dos dados',
  },
  'analista/dados-climaticos': {
    id: 'analista/dados-climaticos',
    label: 'Dados Climáticos',
    icon: 'cloud',
    roles: [ANALYST],
    resources: ['readings', 'overview', 'quality'],
    group: 'Análise',
    description: 'Séries de temperatura e umidade tratadas (RF05)',
  },
  'analista/dados-mercado': {
    id: 'analista/dados-mercado',
    label: 'Dados de Mercado',
    icon: 'market',
    roles: [ANALYST],
    resources: ['market', 'varieties'],
    group: 'Análise',
    description: 'Preços e demanda de exportação (RF03)',
  },
  'analista/comparativa': {
    id: 'analista/comparativa',
    label: 'Análise Comparativa',
    icon: 'compare',
    roles: [ANALYST],
    resources: ['varieties', 'market'],
    group: 'Análise',
    description: 'Comparação multicritério entre variedades',
  },
  'analista/qualidade': {
    id: 'analista/qualidade',
    label: 'Qualidade dos Dados',
    icon: 'quality',
    roles: [ANALYST],
    resources: ['quality', 'readings'],
    group: 'Modelagem',
    description: 'Completude, consistência e outliers (RF05)',
  },
  'analista/modelos': {
    id: 'analista/modelos',
    label: 'Modelos Preditivos',
    icon: 'model',
    roles: [ANALYST],
    resources: ['models', 'forecasts'],
    group: 'Modelagem',
    description: 'Treinamento, avaliação e governança dos modelos (RF06)',
  },
  'analista/previsoes': {
    id: 'analista/previsoes',
    label: 'Previsões',
    icon: 'trend',
    roles: [ANALYST],
    resources: ['forecasts', 'overview', 'models'],
    group: 'Modelagem',
    description: 'Validação das previsões do motor preditivo',
  },
  'analista/relatorios': {
    id: 'analista/relatorios',
    label: 'Relatórios',
    icon: 'report',
    roles: [ANALYST],
    resources: ['quality', 'models', 'testReport'],
    group: 'Modelagem',
    description: 'Relatórios de qualidade e execução de testes (RF11)',
  },

  /* ------------------------------------------------------- Administrador */
  'admin/dashboard': {
    id: 'admin/dashboard',
    label: 'Dashboard Admin',
    icon: 'grid',
    roles: [ADMIN],
    resources: ['thingspeak', 'models'],
    group: 'Administração',
    description: 'Governança, segurança e disponibilidade',
  },
  'admin/usuarios': {
    id: 'admin/usuarios',
    label: 'Usuários',
    icon: 'users',
    roles: [ADMIN],
    resources: [],
    group: 'Administração',
    description: 'Cadastro e gestão de usuários (RF12)',
  },
  'admin/permissoes': {
    id: 'admin/permissoes',
    label: 'Permissões e RBAC',
    icon: 'lock',
    roles: [ADMIN],
    resources: [],
    group: 'Administração',
    description: 'Matriz de acesso por perfil (RF08)',
  },
  'admin/seguranca': {
    id: 'admin/seguranca',
    label: 'Segurança',
    icon: 'shield',
    roles: [ADMIN],
    resources: ['quality'],
    group: 'Segurança e auditoria',
    description: 'Acessos, incidentes e políticas (RF11)',
  },
  'admin/logs': {
    id: 'admin/logs',
    label: 'Logs do Sistema',
    icon: 'logs',
    roles: [ADMIN],
    resources: [],
    group: 'Segurança e auditoria',
    description: 'Trilha de auditoria e eventos do sistema',
  },
  'admin/integracoes': {
    id: 'admin/integracoes',
    label: 'Integrações',
    icon: 'link',
    roles: [ADMIN],
    resources: ['thingspeak', 'readings'],
    group: 'Plataforma',
    description: 'ThingSpeak, banco em nuvem e arquitetura IoT (RF02/RF04)',
  },
  'admin/configuracoes': {
    id: 'admin/configuracoes',
    label: 'Configurações',
    icon: 'settings',
    roles: [ADMIN],
    resources: ['thingspeak'],
    group: 'Plataforma',
    description: 'Parâmetros, tema e integrações',
  },
  'admin/design-system': {
    id: 'admin/design-system',
    label: 'Design System',
    icon: 'quality',
    roles: [ADMIN],
    resources: [],
    group: 'Plataforma',
    description: 'Fundamentos visuais e componentes',
  },

  /* ------------------------------------------------- Páginas compartilhadas */
  'comum/alertas': {
    id: 'comum/alertas',
    label: 'Alertas',
    icon: 'bell',
    roles: [PRODUCER, ANALYST],
    resources: ['alerts'],
    group: 'Consulta',
    description: 'Alertas de colheita, clima, mercado e sistema (RF09)',
  },
  'comum/historico': {
    id: 'comum/historico',
    label: 'Histórico',
    icon: 'clock',
    roles: [PRODUCER, ANALYST],
    resources: ['readings', 'quality', 'market'],
    group: 'Consulta',
    description: 'Séries históricas de clima e safra (RF10)',
  },
});

export const pageIds = Object.freeze(Object.keys(PAGES));
export const pageResources = (pageId) => PAGES[pageId]?.resources ?? [];
export const pageDefinition = (pageId) => PAGES[pageId] ?? null;
