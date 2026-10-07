# AgroClima Cloud

Dashboard de **monitoramento climático e logístico em nuvem para exportadoras de
frutas** do Vale do São Francisco (Petrolina/PE · Juazeiro/BA) — Projeto
Integrador do 4º módulo de Análise e Desenvolvimento de Sistemas.

Front-end em **HTML, CSS e JavaScript puros (módulos ES)**: sem framework, sem
biblioteca e sem etapa de build. A interface conversa com o back-end Python
(FastAPI + ThingSpeak) descrito em [`docs/CONTRATO-API.md`](docs/CONTRATO-API.md)
e continua funcional em **modo demonstração** quando a API não está no ar.

## Sumário

- [O que o sistema faz](#o-que-o-sistema-faz)
- [Como executar](#como-executar)
- [Acessos de demonstração](#acessos-de-demonstração)
- [Páginas por tipo de usuário (RBAC)](#páginas-por-tipo-de-usuário-rbac)
- [Tema claro e escuro](#tema-claro-e-escuro)
- [Integração com o back-end](#integração-com-o-back-end)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Testes automatizados](#testes-automatizados)
- [Requisitos atendidos](#requisitos-atendidos)

## O que o sistema faz

| Frente | Recursos na interface |
| --- | --- |
| **Monitoramento climático (IoT)** | leituras de temperatura/umidade por sensor, status do canal ThingSpeak, séries históricas, faixa ideal da variedade |
| **Qualidade dos dados** | completude, consistência, inválidos, ausentes e outliers — regras idênticas às do back-end (`js/core/data-quality.js`) |
| **Previsão de colheita e exportação** | janela ideal, risco (`LOW`/`MEDIUM`/`HIGH`), recomendações do modelo e versão em produção |
| **Mercado e logística** | preço de referência, série de 30 dias, demanda por mercado de destino e comparativo entre variedades |
| **BI e relatórios** | painel do produtor, dashboard analítico, exportação CSV, impressão em PDF e relatório de execução dos testes |
| **Alertas** | fila por categoria (`CLIMATE`, `HARVEST`, `MARKET`, `SYSTEM`) e nível (`INFO`, `WARNING`, `CRITICAL`) |
| **Segurança e auditoria** | trilha de acessos, falhas de login, bloqueios do RBAC, alterações de permissão e relatório de segurança |
| **Administração** | usuários (criar, editar, aprovar, bloquear), matriz de permissões, integrações e configurações |

Fontes dos dados: canal **ThingSpeak** (ESP32 → HTTP/MQTT), banco em nuvem e
serviço de mercado. O dashboard nunca fala com o dispositivo: consome as rotas
REST do back-end (RF01/RF02).

## Como executar

```bash
npm start          # node tools/dev-server.mjs → http://localhost:4173
```

O `tools/dev-server.mjs` serve os arquivos estáticos e faz **proxy** de
`/api/v1/**` e `/health` para `http://localhost:8000` (back-end FastAPI), o que
elimina problemas de CORS. Ajuste o destino com `API_TARGET` e a porta com
`PORT`:

```bash
API_TARGET=http://192.168.0.10:8000 PORT=5173 npm start
```

Alternativas sem Node:

```bash
python3 -m http.server 8080    # abra http://localhost:8080
```

> Módulos ES não funcionam por `file://`. Servido por HTTP, o padrão da API é a
> própria origem (`/api/v1`); aberto por `file://`, o padrão passa a
> `http://localhost:8000/api/v1`. O endereço também pode ser trocado em
> **Administrador › Integrações** ou por `?api=http://host:8000/api/v1`.

## Acessos de demonstração

Os botões da tela de login entram com um clique (senha `agro123`):

| Perfil | E-mail | Escopo |
| --- | --- | --- |
| Produtor/Exportador | `produtor@agroclima.com` | clima, previsões, mercado, logística |
| Analista de Dados | `analista@agroclima.com` | qualidade, modelos, dados tratados |
| Administrador | `admin@agroclima.com` | usuários, permissões, integrações, auditoria |

Em produção quem autentica é o **gateway Java**, que emite o JWT e o perfil; a
API Python confia nos cabeçalhos `X-User-Id` e `X-User-Role`. Sem o gateway, o
login é validado nas contas locais e o evento `LOGIN_FALLBACK` fica na trilha de
segurança.

## Páginas por tipo de usuário (RBAC)

Cada perfil tem pastas, menu e rotas **separados**, e a verificação acontece
antes de qualquer tela ser montada (`js/core/rbac.js` → `canAccessPage`).
Tentativas fora do escopo geram `ACCESS_DENIED` na trilha e uma tela de bloqueio.

| Perfil | Páginas |
| --- | --- |
| **Produtor/Exportador** | Visão Geral · Monitoramento · Previsões · Mercado e Exportação · Comparação · Alertas · Histórico · Relatórios |
| **Analista de Dados** | Dashboard Analítico · Dados Climáticos · Dados de Mercado · Análise Comparativa · Qualidade dos Dados · Modelos Preditivos · Previsões · Histórico · Relatórios |
| **Administrador** | Dashboard Admin · Usuários · Permissões e RBAC · Segurança · Logs do Sistema · Integrações · Configurações · Design System |

O administrador pode **revogar** acessos na matriz de permissões (menor
privilégio: nunca é possível conceder além do previsto). O ajuste vale para o
navegador atual, é auditado e reflete imediatamente no menu e nas rotas.

## Tema claro e escuro

- **Padrão: claro.** O botão de alternância fica na barra superior e a
  preferência é salva em `agroclima.theme`.
- O tema é aplicado em `<html data-theme="…">` **antes da primeira pintura**
  (script inline no `index.html`), sem “flash” de tela clara.
- As cores vivem em tokens (`css/variables.css` e `css/theme-dark.css`): nenhum
  componente repete regra de cor, por isso os dois temas não divergem.

## Integração com o back-end

- Contrato completo, exemplos de payload e enums em
  [`docs/CONTRATO-API.md`](docs/CONTRATO-API.md).
- `js/core/api-client.js` monta as requisições, injeta a identidade e classifica
  falhas (`offline`, `timeout`, `unauthorized`, `not-found`, `http`, `parse`).
- `js/services/data-service.js` faz cache de 30 s (RNF04), preenche a tela com
  dado demonstrativo na primeira pintura e substitui pelo dado real quando a API
  responde — sempre informando a origem na faixa de status.
- **Nenhuma chave do ThingSpeak no front-end** (RNF02): a *Read API Key* fica no
  `.env` do servidor e o painel só mostra `••••••••`.

## Estrutura de arquivos

```text
index.html                  documento base + script inline que aplica o tema salvo
css/                        10 folhas em cascata (reset → variables → theme-dark → … → utilities)
js/
  main.js                   hidratação, primeData/ensureData, renderização parcial
  core/                     contratos, RBAC, sessão, autenticação, qualidade, trilhas (auditoria/segurança)
  config/                   env, roles (perfis + menu), pages (registro), routes (renderizadores), settings
  services/                 data-service (API × demonstração), report-service (CSV/PDF), users-service
  components/               ui, charts (SVG), tables, icons, page-header, theme-toggle
  pages/produtor|analista|admin|comum   telas separadas por perfil
  views/                    shell autenticado, tela de login, bloqueio do RBAC
  events/index.js           delegação de eventos (data-action / data-form)
  utils/                    html (autoescape), dom, format (pt-BR), csv, storage
tools/dev-server.mjs        servidor estático + proxy para o FastAPI
tools/test-report.mjs       executa as suítes e publica reports/test-results.json
tests/                      suítes automatizadas (node --test)
docs/                       contrato da API e relatório de testes
```

## Testes automatizados

```bash
npm test             # executa as 10 suítes (59 casos)
npm run test:report  # regenera docs/RELATORIO-TESTES.md e reports/test-results.json
```

Cobertura atual: contratos dos DTOs, regras de qualidade (RF05), RBAC e
isolamento das páginas (RF08/RNF10), renderização de **todas** as telas,
cliente HTTP (URLs, cabeçalhos, timeout, erros), camada de dados (API ×
demonstração × cache), autenticação/sessão, gestão de usuários, formatação pt-BR
e exportação CSV.

O relatório publicado em `reports/test-results.json` é exibido na tela
**Analista de Dados › Relatórios**, atendendo ao requisito de relatório de
execução de testes (RF11).

## Requisitos atendidos

**Funcionais:** RF01 ingestão via ESP32/ThingSpeak · RF02 consumo REST dos
*channel feeds* · RF03 dados de mercado · RF04 banco em nuvem · RF05 limpeza e
qualidade · RF06 previsão de janela de colheita/exportação · RF07 BI dashboard ·
RF08 autenticação e RBAC · RF09 alertas automáticos · RF10 histórico · RF11
relatórios de segurança/qualidade e de testes · RF12 gestão de usuários.

**Não funcionais:** RNF02 chaves fora do código e criptografia em trânsito
(HTTPS em produção) · RNF04 cache e consultas abaixo de 3 s · RNF05 testes
automatizados das funções críticas · RNF06 linguagem simples, contraste AA e
layout responsivo · RNF09 componentes reutilizáveis (`js/components`) · RNF10
verificação de permissão medida (`measurePermissionCost`) · RNF11 intervalo
mínimo de 15 s do plano gratuito do ThingSpeak · RNF08 LGPD/GDPR na trilha de
dados pessoais.
