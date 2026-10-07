/**
 * Perfis de acesso (RBAC — RF08), navegação por perfil e contas de demonstração.
 *
 * Cada perfil tem seu próprio conjunto de páginas: as telas do produtor, do
 * analista e do administrador ficam em pastas separadas
 * (`js/pages/produtor`, `js/pages/analista`, `js/pages/admin`) e só são
 * acessíveis pelo perfil correspondente (ver `js/core/rbac.js`).
 */

export const ROLES = Object.freeze({
  PRODUCER: 'PRODUCER',
  ANALYST: 'ANALYST',
  ADMIN: 'ADMIN',
});

export const ROLE_INFO = Object.freeze({
  [ROLES.PRODUCER]: {
    label: 'Produtor/Exportador',
    short: 'Produtor',
    description: 'Consulta clima, janela de colheita, mercado e logística de exportação.',
    badge: 'PE',
    scope: 'produtor',
    landing: 'produtor/visao-geral',
  },
  [ROLES.ANALYST]: {
    label: 'Analista de Dados',
    short: 'Analista',
    description: 'Alimenta e ajusta os modelos preditivos, audita a qualidade dos dados.',
    badge: 'AN',
    scope: 'analítico',
    landing: 'analista/dashboard',
  },
  [ROLES.ADMIN]: {
    label: 'Administrador',
    short: 'Administrador',
    description: 'Gerencia usuários, permissões, integrações e a integridade do sistema.',
    badge: 'AD',
    scope: 'administrativo',
    landing: 'admin/dashboard',
  },
});

/** Navegação lateral: seções nomeadas por perfil (ordem de exibição). */
export const MENU = Object.freeze({
  [ROLES.PRODUCER]: [
    { section: 'Operação', pages: ['produtor/visao-geral', 'produtor/monitoramento', 'produtor/previsoes', 'produtor/mercado'] },
    { section: 'Decisão', pages: ['produtor/comparacao', 'comum/alertas', 'comum/historico', 'produtor/relatorios'] },
  ],
  [ROLES.ANALYST]: [
    { section: 'Análise', pages: ['analista/dashboard', 'analista/dados-climaticos', 'analista/dados-mercado', 'analista/comparativa'] },
    { section: 'Modelagem', pages: ['analista/qualidade', 'analista/modelos', 'analista/previsoes', 'analista/relatorios'] },
    { section: 'Consulta', pages: ['comum/alertas', 'comum/historico'] },
  ],
  [ROLES.ADMIN]: [
    { section: 'Administração', pages: ['admin/dashboard', 'admin/usuarios', 'admin/permissoes'] },
    { section: 'Segurança e auditoria', pages: ['admin/seguranca', 'admin/logs'] },
    { section: 'Plataforma', pages: ['admin/integracoes', 'admin/configuracoes', 'admin/design-system'] },
  ],
});

/** Senha única das contas de demonstração (o cadastro real é feito pelo gateway). */
export const DEMO_PASSWORD = 'agro123';

export const DEMO_ACCOUNTS = Object.freeze([
  {
    role: ROLES.PRODUCER,
    name: 'Mariana Costa',
    email: 'produtor@agroclima.com',
    initials: 'MC',
    company: 'Vale Export Frutas',
    jobTitle: 'Gerente de produção',
    description: 'Vê clima, previsões, mercado e logística.',
  },
  {
    role: ROLES.ANALYST,
    name: 'Rafael Nunes',
    email: 'analista@agroclima.com',
    initials: 'RN',
    company: 'AgroData Analytics',
    jobTitle: 'Cientista de dados',
    description: 'Vê qualidade dos dados, modelos e previsões.',
  },
  {
    role: ROLES.ADMIN,
    name: 'Carlos Almeida',
    email: 'admin@agroclima.com',
    initials: 'CA',
    company: 'AgroClima Cloud',
    jobTitle: 'Administrador do sistema',
    description: 'Vê usuários, permissões, segurança e integrações.',
  },
]);

export const roleLabel = (role) => ROLE_INFO[role]?.label ?? 'Sem perfil';
export const roleShortLabel = (role) => ROLE_INFO[role]?.short ?? 'Sem perfil';
export const isKnownRole = (role) => Boolean(ROLE_INFO[role]);
export const landingPageFor = (role) => ROLE_INFO[role]?.landing ?? null;
export const demoAccountByEmail = (email) =>
  DEMO_ACCOUNTS.find((account) => account.email.toLowerCase() === String(email ?? '').trim().toLowerCase()) ?? null;

/**
 * Compatibilidade com o comportamento anterior do protótipo: quando o e-mail
 * não é uma conta de demonstração conhecida, o perfil é deduzido do endereço.
 */
export function inferRoleFromEmail(email) {
  const normalized = String(email ?? '').toLowerCase();
  if (normalized.includes('admin')) return ROLES.ADMIN;
  if (normalized.includes('analista') || normalized.includes('analyst')) return ROLES.ANALYST;
  return ROLES.PRODUCER;
}
