# Relatório de testes automatizados (RNF05)

Gerado por `npm run test:report` em 07/10/2026, 15:50:59.

- **Casos executados:** 60
- **Aprovados:** 60
- **Falhas:** 0
- **Aproveitamento:** 100%
- **Duração total:** 5752 ms

| Suíte | Descrição | Casos | Aprovados | Falhas | Duração |
| --- | --- | ---: | ---: | ---: | ---: |
| `tests/api-client.test.mjs` | Cliente HTTP | 8 | 8 | 0 | 86 ms |
| `tests/auth-users.test.mjs` | auth-users.test.mjs | 5 | 5 | 0 | 4297 ms |
| `tests/contracts.test.mjs` | Contrato com o back-end | 6 | 6 | 0 | 96 ms |
| `tests/csv.test.mjs` | csv.test.mjs | 4 | 4 | 0 | 103 ms |
| `tests/data-quality.test.mjs` | Qualidade dos dados (RF05) | 8 | 8 | 0 | 108 ms |
| `tests/data-service.test.mjs` | data-service.test.mjs | 5 | 5 | 0 | 183 ms |
| `tests/format.test.mjs` | format.test.mjs | 6 | 6 | 0 | 95 ms |
| `tests/navigation.test.mjs` | navigation.test.mjs | 7 | 7 | 0 | 105 ms |
| `tests/pages.test.mjs` | Renderização das páginas | 4 | 4 | 0 | 602 ms |
| `tests/rbac.test.mjs` | RBAC e isolamento de páginas | 7 | 7 | 0 | 77 ms |

## Casos por suíte

### Cliente HTTP — `tests/api-client.test.mjs`

Confere URL, cabeçalhos de identidade, timeout e classificação de erros.

- ✅ monta a URL a partir da base configurada + endpoint
- ✅ 401 e 404 são tratados como API no ar com rota/permissão pendente
- ✅ 502/503/504 do proxy contam como API indisponível
- ✅ falha de rede vira "offline" e resposta não-JSON vira "parse"
- ✅ tempo esgotado vira "timeout"
- ✅ health mede a latência da resposta
- ✅ a base da API pode ser trocada em tempo de execução
- ✅ cabeçalhos de identidade só entram quando solicitados

### auth-users.test.mjs — `tests/auth-users.test.mjs`

Suíte automatizada do front-end.

- ✅ validação de credenciais cobre e-mail e senha (RF08)
- ✅ login nas contas de demonstração abre a sessão com o perfil correto
- ✅ senha incorreta não autentica e fica na trilha de segurança
- ✅ sessão é restaurada e alimenta os cabeçalhos de identidade da API
- ✅ gestão de usuários: criar, aprovar, bloquear e resumir (RF12)

### Contrato com o back-end — `tests/contracts.test.mjs`

Valida a tradução dos DTOs/enums do FastAPI e o tratamento de respostas vazias.

- ✅ DashboardOverviewResponse vira o formato das telas
- ✅ payload inválido lança ContractError identificando o endpoint
- ✅ ReadingsResponse aplica a classificação local (RF05)
- ✅ DataQualityResponse preserva as razões 0–1 da API
- ✅ Alertas usam o enum AlertLevel e a categoria do back-end
- ✅ Modelos, ThingSpeak, mercado, variedades e previsões

### csv.test.mjs — `tests/csv.test.mjs`

Suíte automatizada do front-end.

- ✅ gera CSV com cabeçalho, separador ponto e vírgula e números pt-BR
- ✅ valores com ponto e vírgula, aspas ou quebra de linha são citados
- ✅ valores ausentes viram campo vazio e listas vazias geram só o cabeçalho
- ✅ nome do arquivo ganha data e hora

### Qualidade dos dados (RF05) — `tests/data-quality.test.mjs`

Reproduz as regras do DataQualityService do back-end Python.

- ✅ faixas plausíveis do back-end: -10..60 °C e 0..100 %
- ✅ validateReading devolve os mesmos códigos de erro do servidor
- ✅ classificação nos quatro estados do enum ReadingStatus
- ✅ calculateQuality conta válidos, inválidos, ausentes e outliers
- ✅ cleanSeries remove leituras sem valor e ordena por tempo
- ✅ movingAverage suaviza preservando o tamanho da série
- ✅ idealRangeShare usa a faixa agronômica de conforto (RF06)
- ✅ evaluateReadings roda o pipeline completo (RF05/RF11)

### data-service.test.mjs — `tests/data-service.test.mjs`

Suíte automatizada do front-end.

- ✅ primeData preenche a tela na primeira pintura com dado demonstrativo
- ✅ API fora do ar: cai para o dado demonstrativo e registra o fallback
- ✅ API respondendo: os dados vêm do back-end e a origem muda para "api"
- ✅ 404 em rota prevista no contrato mantém o dado demonstrativo sem marcar queda
- ✅ todos os recursos do contrato têm demonstração válida

### format.test.mjs — `tests/format.test.mjs`

Suíte automatizada do front-end.

- ✅ números formatados em pt-BR
- ✅ valores ausentes viram travessão em vez de NaN
- ✅ razões 0–1 são convertidas sem duplicar a escala
- ✅ datas e janelas do período
- ✅ tempo relativo em linguagem natural
- ✅ utilidades de série, tom e texto

### navigation.test.mjs — `tests/navigation.test.mjs`

Suíte automatizada do front-end.

- ✅ toda página registrada tem renderizador e vice-versa
- ✅ os modais globais têm renderizador
- ✅ cada página declara apenas recursos de dados existentes
- ✅ o menu de cada perfil só lista páginas dentro do seu escopo (RF08)
- ✅ a navegação declarada em roles.js cobre exatamente as páginas liberadas
- ✅ todos os ícones usados no registro de páginas existem
- ✅ a página inicial de cada perfil é acessível

### Renderização das páginas — `tests/pages.test.mjs`

Renderiza todas as telas de todos os perfis com dados da API e demonstrativos.

- ✅ todas as páginas renderizam com dados demonstrativos
- ✅ nenhuma tela vaza valor inválido para o usuário
- ✅ as telas com recorte de período respondem às três janelas
- ✅ o HTML é escapado: o conteúdo dinâmico não vira markup

### RBAC e isolamento de páginas — `tests/rbac.test.mjs`

Garante que cada perfil acesse apenas as suas telas e que revogações valham.

- ✅ cada página pertence a um único escopo (produtor, analista ou administrador)
- ✅ páginas compartilhadas são liberadas somente para os perfis declarados
- ✅ perfil desconhecido não acessa nada e não recebe página inicial
- ✅ a revogação do administrador remove o acesso e pode ser desfeita
- ✅ a matriz de permissões exibe base, revogação e perfil não previsto
- ✅ capacidades restringem ações dentro das telas
- ✅ RNF10: a verificação de acesso é barata o suficiente

## Como reproduzir

```bash
npm install --no-package-lock   # nada a instalar: o projeto não tem dependências
npm test                        # executa as suítes com node --test
npm run test:report             # regenera este relatório + reports/test-results.json
```

O JSON publicado em `reports/test-results.json` é lido pela tela **Analista de Dados › Relatórios** (recurso `testReport`), atendendo ao requisito de relatório de execução de testes do RF11.
