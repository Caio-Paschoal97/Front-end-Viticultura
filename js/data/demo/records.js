/**
 * Registros demonstrativos que não vêm da API REST do dashboard
 * (usuários, trilha de auditoria, sensores, integrações e catálogo de testes).
 *
 * Em produção esses dados viriam do gateway Java (usuários/permissões) e do
 * banco em nuvem (sensores e integrações) — ver docs/ARQUITETURA-BACKEND.md.
 */

import { ROLES } from '../../config/roles.js';
import { LOG_CATEGORIES } from '../../core/audit-log.js';

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

export const DEMO_USERS = [
  { id: 'usr-001', name: 'Mariana Costa', email: 'produtor@agroclima.com', company: 'Vale Export Frutas', jobTitle: 'Gerente de produção', role: ROLES.PRODUCER, status: 'Ativo', createdAt: minutesAgo(60 * 24 * 210), lastAccessAt: minutesAgo(12) },
  { id: 'usr-002', name: 'Rafael Nunes', email: 'analista@agroclima.com', company: 'AgroData Analytics', jobTitle: 'Cientista de dados', role: ROLES.ANALYST, status: 'Ativo', createdAt: minutesAgo(60 * 24 * 180), lastAccessAt: minutesAgo(38) },
  { id: 'usr-003', name: 'Carlos Almeida', email: 'admin@agroclima.com', company: 'AgroClima Cloud', jobTitle: 'Administrador do sistema', role: ROLES.ADMIN, status: 'Ativo', createdAt: minutesAgo(60 * 24 * 320), lastAccessAt: minutesAgo(4) },
  { id: 'usr-004', name: 'Luciana Freire', email: 'luciana@frutasul.com', company: 'Fruta Sul Export', jobTitle: 'Diretora comercial', role: ROLES.PRODUCER, status: 'Bloqueado', createdAt: minutesAgo(60 * 24 * 96), lastAccessAt: minutesAgo(60 * 24 * 21) },
  { id: 'usr-005', name: 'Diego Martins', email: 'diego@valedourado.com', company: 'Vale Dourado Agrícola', jobTitle: 'Supervisor de campo', role: ROLES.PRODUCER, status: 'Ativo', createdAt: minutesAgo(60 * 24 * 45), lastAccessAt: minutesAgo(60 * 19) },
  { id: 'usr-006', name: 'Patrícia Lemos', email: 'patricia@agrodata.com', company: 'AgroData Analytics', jobTitle: 'Analista de dados', role: ROLES.ANALYST, status: 'Ativo', createdAt: minutesAgo(60 * 24 * 30), lastAccessAt: minutesAgo(60 * 5) },
  { id: 'usr-007', name: 'Sérgio Andrade', email: 'sergio@exportnorte.com', company: 'Export Norte', jobTitle: 'Analista de logística', role: ROLES.PRODUCER, status: 'Aguardando aprovação', createdAt: minutesAgo(60 * 6), lastAccessAt: null },
];

export const DEMO_AUDIT_LOGS = [
  { id: 'log-seed-1', at: minutesAgo(9), action: 'Sincronização ThingSpeak concluída', category: LOG_CATEGORIES.INGESTION, actor: 'Sistema', detail: '96 registros recebidos, 93 válidos, 3 descartados pela validação.', status: 'Concluído', level: 'info' },
  { id: 'log-seed-2', at: minutesAgo(24), action: 'Permissões do perfil Analista revisadas', category: LOG_CATEGORIES.SECURITY, actor: 'Carlos Almeida', detail: 'Acesso à tela de Usuários revogado para o perfil Analista.', status: 'Concluído', level: 'warning' },
  { id: 'log-seed-3', at: minutesAgo(52), action: 'Modelo AC-Predict v3.2 executado', category: LOG_CATEGORIES.MODEL, actor: 'Rafael Nunes', detail: 'Previsão gerada para 72 h com precisão de 91,4%.', status: 'Concluído', level: 'info' },
  { id: 'log-seed-4', at: minutesAgo(96), action: 'Relatório de exportação gerado', category: LOG_CATEGORIES.REPORT, actor: 'Mariana Costa', detail: 'Planilha CSV da janela de colheita e embarque.', status: 'Concluído', level: 'info' },
  { id: 'log-seed-5', at: minutesAgo(140), action: 'Falha de autenticação registrada', category: LOG_CATEGORIES.AUTH, actor: 'sergio@exportnorte.com', detail: 'Três tentativas inválidas seguidas; conta mantida sob observação.', status: 'Alerta', level: 'warning' },
  { id: 'log-seed-6', at: minutesAgo(320), action: 'Configuração de sensores atualizada', category: LOG_CATEGORIES.SETTINGS, actor: 'Carlos Almeida', detail: 'Intervalo de ingestão ajustado para 15 s (RNF11).', status: 'Concluído', level: 'info' },
  { id: 'log-seed-7', at: minutesAgo(60 * 26), action: 'Backup do banco em nuvem finalizado', category: LOG_CATEGORIES.ADMIN, actor: 'Sistema', detail: 'Snapshot diário concluído com sucesso.', status: 'Concluído', level: 'info' },
  { id: 'log-seed-8', at: minutesAgo(60 * 30), action: 'Ingestão com atraso acima do limite', category: LOG_CATEGORIES.INGESTION, actor: 'Monitor de integração', detail: 'Canal do ThingSpeak respondeu em 5,2 s (limite 3 s).', status: 'Alerta', level: 'warning' },
];

export const SENSORS = [
  { code: 'THS-ESP32-04', name: 'Sensor campo Norte', location: 'Parreiral Norte — Petrolina/PE', variety: 'Uva Itália', active: true, lastSeenAt: minutesAgo(1) },
  { code: 'THS-ESP32-07', name: 'Sensor campo Sul', location: 'Parreiral Sul — Petrolina/PE', variety: 'Crimson Seedless', active: true, lastSeenAt: minutesAgo(2) },
  { code: 'THS-ESP32-11', name: 'Sensor casa de embalagem', location: 'Packing house — Juazeiro/BA', variety: 'Sweet Globe', active: true, lastSeenAt: minutesAgo(3) },
  { code: 'THS-ESP32-15', name: 'Sensor câmara fria', location: 'Pré-resfriamento — Juazeiro/BA', variety: 'Thompson Seedless', active: false, lastSeenAt: minutesAgo(60 * 6) },
];

export const INTEGRATIONS = [
  { id: 'thingspeak', name: 'ThingSpeak', description: 'API REST · Channel Feeds (RF02)', icon: 'cloud', status: 'Conectado', metric: '96 registros por ciclo', owner: 'IoT / Cloud' },
  { id: 'database', name: 'Banco de dados em nuvem', description: 'PostgreSQL gerenciado (RF04)', icon: 'database', status: 'Online', metric: 'Latência média 18 ms', owner: 'Cloud Computing' },
  { id: 'market', name: 'Serviço de mercado', description: 'Market Data API (RF03)', icon: 'market', status: 'Online', metric: 'Atualizado há 34 min', owner: 'Data Science' },
  { id: 'engine', name: 'Motor de processamento', description: 'AgroClima Engine · validação e previsão', icon: 'activity', status: 'Online', metric: '1,8 s por ciclo', owner: 'Data Science' },
  { id: 'gateway', name: 'Gateway de identidade', description: 'Autenticação e RBAC (RF08)', icon: 'lock', status: 'Online', metric: 'JWT · 1 h de validade', owner: 'Segurança' },
];

/** Etapas da arquitetura de integração IoT (ESP32 → ThingSpeak → API → banco). */
export const ARCHITECTURE_STEPS = [
  { name: 'ESP32', detail: 'Coleta no campo', icon: 'wifi', note: 'Publica temperatura e umidade a cada 15 s' },
  { name: 'ThingSpeak', detail: 'Canal IoT', icon: 'cloud', note: 'Recebe os dados via HTTP/MQTT (RF01)', featured: true },
  { name: 'API REST', detail: 'Channel Feeds', icon: 'link', note: 'Back-end consome os feeds (RF02)' },
  { name: 'Processamento', detail: 'Validação e regras', icon: 'activity', note: 'Limpeza e tratamento (RF05)' },
  { name: 'Banco em nuvem', detail: 'Persistência', icon: 'database', note: 'Histórico climático e de safra (RF04/RF10)' },
  { name: 'AgroClima Cloud', detail: 'Análise e decisão', icon: 'grid', note: 'Dashboard e previsões (RF06/RF07)' },
];

/** Suítes de teste automatizado mantidas no repositório (RNF05 / RF11). */
export const TEST_SUITES = [
  { file: 'tests/rbac.test.mjs', name: 'RBAC e isolamento de páginas', description: 'Garante que cada perfil acesse apenas as suas telas e que revogações valham.' },
  { file: 'tests/contracts.test.mjs', name: 'Contrato com o back-end', description: 'Valida a tradução dos DTOs/enums do FastAPI e o tratamento de respostas vazias.' },
  { file: 'tests/api-client.test.mjs', name: 'Cliente HTTP', description: 'Confere URL, cabeçalhos de identidade, timeout e classificação de erros.' },
  { file: 'tests/data-quality.test.mjs', name: 'Qualidade dos dados (RF05)', description: 'Reproduz as regras do DataQualityService do back-end Python.' },
  { file: 'tests/pages.test.mjs', name: 'Renderização das páginas', description: 'Renderiza todas as telas de todos os perfis com dados da API e demonstrativos.' },
];

export const SECURITY_POLICY = [
  { title: 'Criptografia em trânsito e em repouso', description: 'HTTPS/TLS obrigatório entre dashboard, API e banco; dados de clientes internacionais criptografados em repouso (RNF02).', status: 'Ativo' },
  { title: 'Chaves do ThingSpeak fora do código-fonte', description: 'Read/Write Keys ficam no servidor (variáveis de ambiente). O front-end nunca recebe nem exibe as chaves (RNF02).', status: 'Ativo' },
  { title: 'RBAC no gateway de identidade', description: 'O gateway Java emite o JWT e o perfil; a API Python aceita apenas os cabeçalhos X-User-Id e X-User-Role vindos dele (RF08).', status: 'Ativo' },
  { title: 'Senhas com no mínimo 8 caracteres', description: 'Hash com fator de custo alto no servidor; nenhuma credencial é gravada no navegador.', status: 'Ativo' },
  { title: 'Registro de acessos e incidentes', description: 'Logins, falhas, bloqueios do RBAC e alterações de permissão ficam na trilha de auditoria (RF11).', status: 'Ativo' },
  { title: 'LGPD/GDPR', description: 'Dados de clientes internacionais tratados com base legal definida e retenção limitada (RNF08).', status: 'Ativo' },
];

/*
 * As configurações padrão vivem em `js/config/settings.js` (fonte única);
 * aqui apenas reexportamos para quem já importava deste módulo.
 */
export { DEFAULT_SETTINGS } from '../../config/settings.js';

/** Resumo do relatório de testes usado quando `reports/test-results.json` não existe. */
export const TEST_REPORT_FALLBACK = {
  executedAt: null,
  total: 0,
  passed: 0,
  failed: 0,
  suites: [],
  hint: 'Execute `npm test` (ou `npm run test:report`) para gerar o relatório de execução dos testes automatizados.',
};
