# Contrato da API — AgroClima Cloud

Documento de referência da integração entre o dashboard (este repositório) e o
back-end Python/FastAPI (`Backend-Py-Viticultura`). Tudo o que aparece aqui é o
que o front-end realmente consome: os normalizadores ficam em
`js/core/contracts.js` e a camada de dados em `js/services/data-service.js`.

> **Regra de ouro (RNF02):** nenhuma chave do ThingSpeak, senha ou token fica no
> código do front-end. A *Read API Key* vive apenas no `.env` do servidor.

## 1. Arquitetura do dado

```
ESP32 (campo)                      HTTP/MQTT, a cada ~15 s
   │
   ▼
Canal ThingSpeak  ──►  API REST /channels/{id}/feeds.json?results=100
                              │  (consumo feito apenas pelo back-end Python)
                              ▼
                    Validação e limpeza (RF05)
                    temperatura -10..60 °C · umidade 0..100 %
                              │
                              ▼
                 Banco em nuvem (PostgreSQL) — RF04
                              │
                              ▼
        Dashboard AgroClima Cloud (este projeto) — RF07
        · cache de 30 s por recurso (RNF04)
        · fallback demonstrativo quando a API não responde
```

O dashboard **nunca** conversa com o dispositivo nem com o ThingSpeak
diretamente (RF01/RF02): ele consome as rotas do FastAPI.

## 2. Endereço base e configuração

| Cenário | Base usada | Como |
| --- | --- | --- |
| Desenvolvimento com proxy | `http://localhost:4173/api/v1` | `npm start` → `tools/dev-server.mjs` encaminha `/api/v1/**` e `/health` para `http://localhost:8000` (sem CORS) |
| Arquivo local (`file://`) | `http://localhost:8000/api/v1` | padrão automático em `js/config/env.js` |
| Outro host | o valor salvo em `agroclima.apiBaseUrl` | tela **Administrador › Integrações** ou `?api=http://host:8000/api/v1` na URL |

Variáveis do back-end (arquivo `.env`, nunca versionado):

```ini
THINGSPEAK_CHANNEL_ID=1234567
THINGSPEAK_READ_API_KEY=xxxxxxxxxxxxxxxx
THINGSPEAK_RESULTS=100
```

## 3. Identidade e autorização

Autenticação, RBAC e gestão de usuários ficam no **gateway Java**, não no
FastAPI. O gateway injeta os cabeçalhos de identidade e a API Python os valida:

| Cabeçalho | Exemplo | Origem |
| --- | --- | --- |
| `X-User-Id` | `usr-4821` | sessão autenticada (gateway) |
| `X-User-Role` | `PRODUCER` \| `ANALYST` \| `ADMIN` | perfil do usuário |
| `Authorization` | `Bearer <jwt>` | token emitido pelo gateway |

Sem contexto autenticado a API responde `401 {"detail": "Contexto autenticado ausente"}`.
O cliente (`js/core/api-client.js`) classifica esse erro como `unauthorized` —
a API está no ar, mas a rota exige sessão válida.

No modo demonstração (gateway fora do ar) o front usa as contas locais
`produtor@agroclima.com`, `analista@agroclima.com` e `admin@agroclima.com`
(senha `agro123`), registrando o evento `LOGIN_FALLBACK` na trilha de segurança.

## 4. Rotas consumidas

Prefixo: `/api/v1` (exceto `health`, que fica na raiz).

| Método | Rota | Recurso interno (`data-service`) | Tela que consome |
| --- | --- | --- | --- |
| `GET` | `/health` | — (`probeApi`) | faixa de status, Admin › Integrações |
| `GET` | `/dashboard/overview?variety=Uva%20It%C3%A1lia` | `overview` | Produtor › Visão Geral, Analista › Dashboard |
| `GET` | `/readings/current` | `readings` | Monitoramento, Dados Climáticos, Histórico |
| `GET` | `/analytics/data-quality` | `quality` | Qualidade dos Dados, Relatórios |
| `GET` | `/alerts?category=CLIMATE` | `alerts` | Alertas, Visão Geral |
| `GET` | `/models` | `models` | Modelos Preditivos, Dashboard Analítico |
| `GET` | `/integrations/thingspeak/status` | `thingspeak` | Integrações, Monitoramento |
| `GET` | `/market/summary?variety=` | `market` | Mercado e Exportação, Dados de Mercado |
| `GET` | `/forecasts/latest?variety=` | `forecasts` | Previsões (produtor e analista) |
| `GET` | `/varieties/summary` | `varieties` | Comparação, Análise Comparativa |
| `GET` | `./reports/test-results.json` (estático) | `testReport` | Analista › Relatórios (RNF05/RF11) |

Rotas marcadas com `*` abaixo já têm DTO previsto no back-end, mas podem ainda
não estar implementadas. Quando a API responde `404`, o dashboard **mantém o
dado demonstrativo** e exibe a origem como `demo` — sem marcar a API como fora
do ar (o `404` prova que o servidor respondeu).

### 4.1 `GET /dashboard/overview`

```json
{
  "variety": "Uva Itália",
  "period": { "start": "2026-09-08T00:00:00Z", "end": "2026-10-08T00:00:00Z" },
  "metrics": [{ "label": "Temperatura média", "value": 28.4, "unit": "°C", "trend": "+0,6 °C" }],
  "temperature_series": [{ "timestamp": "2026-10-07T12:00:00Z", "value": 28.1 }],
  "humidity_series": [{ "timestamp": "2026-10-07T12:00:00Z", "value": 64 }],
  "recommendations": [
    {
      "title": "Antecipar a colheita do lote 12",
      "recommendation_type": "HARVEST",
      "description": "Janela curta: 4 dias com umidade dentro do ideal.",
      "confidence": 0.87,
      "created_at": "2026-10-07T09:00:00Z"
    }
  ],
  "risk_level": "MEDIUM"
}
```

Observações de contrato:

- `metrics` pode conter itens `null` (a API monta a lista condicionalmente) — eles
  são descartados pelo normalizador.
- `risk_level` pode vir `"UNKNOWN"` quando não há leituras; a interface mostra
  *"Sem avaliação"* e o aviso *"Sem leituras persistidas para o período."*.
- `confidence` é razão `0–1`; a interface exibe em porcentagem.

### 4.2 `GET /readings/current`

A rota devolve a lista crua de leituras (o `sensor_code` vem do cadastro do
dispositivo):

```json
[
  { "timestamp": "2026-10-07T12:00:00Z", "temperature": 28.4, "humidity": 64 },
  { "timestamp": "2026-10-07T11:45:00Z", "temperature": 36.2, "humidity": 30 }
]
```

O front enriquece cada item (`js/core/contracts.js` → `normalizeReadings`):

| Campo | Regra |
| --- | --- |
| `id` | `reading_id` ou `timestamp + sensor_code` |
| `sensorCode` | `sensor_code` do payload; padrão `THS-ESP32-04` |
| `status` | classificação local (`js/core/data-quality.js`), espelhando o `ReadingStatus` do back-end |
| `statusLabel` / `statusTone` | rótulo e tom usados nos selos das tabelas |

### 4.3 `GET /analytics/data-quality`

```json
{ "completeness": 0.987, "consistency": 0.941, "valid_count": 1184, "invalid_count": 9, "missing_count": 5, "outlier_count": 3 }
```

`completeness` e `consistency` chegam como **razão (0–1)**. As telas exibem
porcentagem (`ratioToPercent`) e a mesma regra é recalculada no navegador para
auditoria independente (tela Qualidade dos Dados).

### 4.4 `GET /alerts`

```json
[
  {
    "id": "alt-91",
    "category": "CLIMATE",
    "level": "CRITICAL",
    "title": "Temperatura acima de 35 °C",
    "message": "Parreiral Norte registrou 36,2 °C às 11h45.",
    "created_at": "2026-10-07T11:46:00Z"
  }
]
```

Alertas sem `title` são descartados. A categoria define ícone e tom; o nível
(`INFO`/`WARNING`/`CRITICAL`) define a severidade exibida e o filtro da tela.

### 4.5 `GET /models`

```json
[{ "name": "AC-Predict", "version": "3.2", "accuracy": 0.914, "mae": 1.28, "rmse": 1.74, "status": "ACTIVE" }]
```

`accuracy` é razão `0–1` (a interface converte para `91,4%`).

### 4.6 `GET /integrations/thingspeak/status`

```json
{ "provider": "ThingSpeak", "configured": true, "channel_id": "1234567" }
```

Nunca devolve a *Read Key* — apenas o fato de o canal estar configurado.
O intervalo mínimo de 15 s entre mensagens (RNF11) é assumido em
`ENV.thingspeakMinIntervalSeconds` e nas configurações do administrador.

### 4.7 DTOs previstos (rotas ainda não publicadas)

| Rota | DTO | Uso na interface |
| --- | --- | --- |
| `/market/summary?variety=` | `MarketResponse` `{ variety, price, price_history[], demand_level }` | preço atual, série de 30 dias, demanda (LOW/MEDIUM/HIGH) |
| `/forecasts/latest?variety=` | `ForecastResponse` `{ variety, generated_at, predictions[], risk_level, recommendations[], model_version }` | janela de colheita, risco e recomendações |
| `/varieties/summary` | `VarietySummaryDto[]` `{ name, score, temperature, humidity, market_price, risk }` | ranking e comparativo multicritério |
| `/monitoring/current?variety=` | `MonitoringResponse` `{ sensors[], latest_readings[], temperature_series[], humidity_series[], recent_alerts[] }` | visão consolidada do monitoramento |

Enquanto essas rotas não existirem, o `data-service` mantém o dado
demonstrativo equivalente (mesmos normalizadores) e a faixa de status informa
**"Dados demonstrativos"**.

## 5. Enums do back-end e tradução na interface

| Enum | Valores | Rótulos/tons na interface |
| --- | --- | --- |
| `ReadingStatus` | `NORMAL`, `WARNING`, `CRITICAL`, `INVALID`, `UNKNOWN` | Normal · Atenção · Crítico · Inválida · Não avaliado |
| `RiskLevel` | `LOW`, `MEDIUM`, `HIGH`, `UNKNOWN` | Risco baixo · moderado · alto · Sem avaliação |
| `DemandLevel` | `LOW`, `MEDIUM`, `HIGH`, `UNKNOWN` | Demanda baixa · média · alta · Demanda não informada |
| `AlertCategory` | `CLIMATE`, `HARVEST`, `MARKET`, `SYSTEM` | Clima · Colheita · Mercado · Sistema |
| `AlertLevel` | `INFO`, `WARNING`, `CRITICAL` | Informativo · Atenção · Crítico |
| `ModelStatus` | `ACTIVE`, `AVAILABLE`, `TRAINING`, `FAILED` | Em produção · Disponível · Em treinamento · Falha |

## 6. Regras de qualidade e limites de alerta

| Regra | Valor | Onde é aplicada |
| --- | --- | --- |
| Faixa plausível de temperatura | `-10 °C … 60 °C` | `js/core/data-quality.js` (`LIMITS`) e `DataQualityService` |
| Faixa plausível de umidade | `0 % … 100 %` | idem |
| Alerta crítico de temperatura | `≥ 35 °C` | `ALERT_THRESHOLDS.temperatureHigh` |
| Alerta de umidade baixa | `< 35 %` | `ALERT_THRESHOLDS.humidityLow` |
| Faixa ideal (conforto da videira) | `24–30 °C` e `60–72 %` | `IDEAL` — usado nas métricas de janela ideal |

Limites configuráveis em **Administrador › Configurações › Notificações** são
gravados em `agroclima.settings` e usados pela interface; a decisão final de
gerar alertas continua sendo do back-end.

## 7. Tratamento de falhas

| Situação | `ApiError.kind` | Comportamento do dashboard |
| --- | --- | --- |
| Rede indisponível / DNS | `offline` | fallback demonstrativo + evento `DATA_SOURCE_FALLBACK` |
| `AbortController` estourou o tempo (6 s; health 2,5 s) | `timeout` | idem |
| `401`/`403` | `unauthorized` | mantém dado demonstrativo, marca a API como *no ar* |
| `404` | `not-found` | mantém dado demonstrativo (rota ainda não publicada) |
| `502`/`503`/`504` | `offline` | proxy/gateway não alcançou o back-end: fallback demonstrativo |
| Outro `4xx`/`5xx` | `http` | mantém dado demonstrativo e mostra a mensagem do `detail` |
| Corpo que não é JSON | `parse` | mantém dado demonstrativo e registra o problema |

A origem de cada recurso (`api` \| `demo`) fica em `state.sources` e é exibida
na faixa de status de cada tela — nunca escondemos que o dado é demonstrativo.

## 8. Mapa de perfis × telas (RF08)

| Perfil | Telas |
| --- | --- |
| `PRODUCER` | Visão Geral · Monitoramento · Previsões · Mercado e Exportação · Comparação · Alertas · Histórico · Relatórios |
| `ANALYST` | Dashboard Analítico · Dados Climáticos · Dados de Mercado · Análise Comparativa · Qualidade dos Dados · Modelos Preditivos · Previsões · Histórico · Relatórios |
| `ADMIN` | Dashboard Admin · Usuários · Permissões e RBAC · Segurança · Logs do Sistema · Integrações · Configurações · Design System |

O registro canônico está em `js/config/pages.js`; a verificação de acesso
(`canAccessPage`) roda **antes** de montar a tela e a tentativa fora de escopo é
registrada como `ACCESS_DENIED`.

## 9. Como executar a integração completa

```bash
# 1. Back-end (repositório Backend-Py-Viticultura)
uvicorn app.main:app --reload --port 8000

# 2. Front-end (este repositório)
npm start                     # http://localhost:4173 com proxy para :8000

# 3. Conferir a integração
#    Administrador › Integrações → "Testar conexão"
```

Sem back-end no ar, o dashboard continua funcional em **modo demonstração** —
útil na apresentação do Projeto Integrador.
