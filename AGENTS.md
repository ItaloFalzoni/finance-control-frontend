<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — finance-control-app (front-end)

Contexto para agentes de IA. **Leia este arquivo inteiro antes de qualquer tarefa.** Carregue os demais arquivos só quando a tabela [Carregamento por tarefa](#carregamento-por-tarefa) indicar.

## Visão em 30 segundos

- **Next.js 16.3.6 (App Router) + React 19.2 + TypeScript 5 (`strict`) + Tailwind 4 (PostCSS)**. Runtime = 3 pacotes: `next`, `react`, `react-dom`. Sem estado global, sem lib de UI. Testes: Vitest + Testing Library (`npm.cmd run test`: `lib/format`, `lib/api`, `components/Dashboard|OperationForm|WelcomeScreen`).
- Fluxo: `app/page.tsx` (server component) busca **saldo + histórico numa única requisição** (RNF-05) e passa a `components/Dashboard.tsx`, que é dono de **todo** o estado (`useState`: snapshot, loading, refreshing, loadError, noAccount, creating, pending, toasts em fila).
- O browser **nunca** chama a API C#: as chamadas saem same-origin para o proxy `app/api/*` (evita CORS e esconde a API key). Contrato em [Integração](#integração--contrato-com-o-backend).
- Sem login, sessão ou cookie; nada é persistido no cliente.
- Textos de UI e comentários em **pt-BR**; identificadores em inglês.
- O bloco `<!-- BEGIN:nextjs-agent-rules -->` é **gerenciado pelo `next dev`** — não edite nem apague (ver "Manutenção destes arquivos").

## Golden Rules (anti-alucinação)

| # | Regra |
|---|-------|
| G1 | **O código é a única verdade.** Confirme lendo o arquivo antes de afirmar comportamento; docs e este arquivo podem estar defasados. |
| G2 | **Nunca invente caminhos, símbolos, props, pacotes ou endpoints.** Confirme com `grep`/`glob`/leitura antes de editar ou citar. |
| G3 | **Não suponha contexto não lido.** Tarefa toca um arquivo? Leia-o antes de alterá-lo. |
| G4 | **Escopo mínimo.** Sem refatoração, renomeio ou "melhoria" fora do pedido. |
| G5 | **Não quebre contratos** sem pedido explícito: rotas/status/shape do proxy `app/api/*`, props de `Dashboard.tsx` e tipos de `lib/api.ts`. |
| G6 | **Sem pacote novo** (npm, plugin, config) sem necessidade real — justifique antes de implementar. |
| G7 | **Nada de código quebrado entregue.** Fim da tarefa = [Validação](#validação-obrigatória-definition-of-done) verde; se falhar e não der para corrigir, declare o que está quebrado. |
| G8 | **Next.js só pela doc versionada** em `node_modules/next/dist/docs/` — não use API decorada de memória (o bloco gerenciado explica). |
| G9 | **Idioma:** UI e comentários em **pt-BR**; identificadores em inglês; fala com o usuário em português. |
| G10 | Requisito ambíguo ou ausente? **Pergunte** em vez de escolher sozinho. |

## Carregamento por tarefa

| Tarefa | Leia antes (além deste arquivo) |
|--------|--------------------------------|
| Rota, layout, Server/Client Component, `next.config.ts`, build | `node_modules/next/dist/docs/01-app/` (doc da versão instalada) |
| Dados, erros, loading, toast | `lib/api.ts` + `app/api/*/route.ts` |
| Valor monetário, data, parse do campo "Valor" | `lib/format.ts` |
| Aparência/comportamento de um bloco da tela | o componente em `components/` |
| Rotas, status codes ou erros da API C# | `../FinanceControl/README.md` → *Endpoints da API* |
| Domínio/regras do backend (ou mexer no .NET) | `../FinanceControl/AGENTS.md` |

Fora da tabela, **não leia mais nada** — use `grep` para localizar trechos. Não há documento de requisitos no workspace: siglas como `RNF-05` existem só em comentários no código.

## Mapa do repositório

```
app/
  layout.tsx            # Root layout: fontes Geist, metadata, lang="pt-BR"
  page.tsx              # Server component: carga inicial → <Dashboard/> (404 vira first-run)
  globals.css           # Tailwind 4
  api/                  # Proxy same-origin — ÚNICA saída para a API C#
    account/route.ts    # GET  → saldo + histórico (uma requisição) | POST → cria conta
    deposit/route.ts    # POST → repassa {amount, description}
    withdraw/route.ts   # POST → repassa {amount, description}
components/
  Dashboard.tsx         # "use client" — dono do estado; refresh silencioso, snapshot preservado em erro, toasts em fila, trava ambos os forms durante envio, first-run
  Dashboard.test.tsx     # First-run, snapshot+erro, retry sem snapshot
  WelcomeScreen.tsx     # "use client" — first-run: só botão Começar, loading + erro
  WelcomeScreen.test.tsx # Botão, loading, erro + retry
  OperationForm.tsx     # "use client" — formulário deposit|withdraw, valida no cliente (aria-invalid)
  OperationForm.test.tsx # Validação cliente: valor, descrição, saldo, submit válido
  BalanceCard.tsx       # Saldo (props do servidor; skeleton com role=status)
  HistoryList.tsx       # Extrato; crédito/débito via type (1=entrada); skeleton com role=status; "Ver mais" pagina
  Toast.tsx             # "use client" — success|error, auto-dismiss 6s (pai renderiza fila com key)
lib/
  api.ts                # Tipos (sem typeLabel), toIntCentsStrict (null em lixo), fetch 10s, ApiError, mensagens (401=config, 422=saldo, 502=rede)
  api.test.ts           # Contrato: 401/422-conflict/400/404/500/409, getAccount estrito, isCredit por type, chaves únicas
  format.ts             # formatCentsBRL (único /100), formatDateTime, parseAmountInputToCents
  format.test.ts        # Testes de formatação/parse (sem legados)
next.config.ts          # Sem opções customizadas
eslint.config.mjs       # eslint-config-next (core-web-vitals + typescript)
tsconfig.json           # strict; alias "@/*" → raiz deste projeto
```

## Integração — contrato com o backend

Backend esperado: **`../FinanceControl`** (C#/.NET 10, compose em `http://localhost:8080`). Ele **exige `X-Api-Key` em toda rota `/api/*`** (`ApiKeyMiddleware`; config `Authentication:ApiKey`, env `Authentication__ApiKey`, valor no `.env` da raiz → `API_KEY`) e responde `401` sem a chave. Publica `POST /api/accounts` (corpo vazio; `201 {accountId}`, `409` se já existe), `GET /api/transactions?page=1&pageSize=50` (devolve `{accountId, currentBalance, page, pageSize, totalCount, transactions}` — valores em **centavos**, ex: `100000` = R$ 1.000,00, ver ADR-004 em `../FinanceControl/docs/adr`; `404` sem conta; sem `TypeLabel` — crédito = `type:1`), `POST /api/deposit` e `POST /api/withdraw` (`201`; `422` = saldo insuficiente / overflow; `400` = validação com `Errors[]`; `404` = sem conta). O front trabalha internamente só com centavos (`int`); conversão p/ R$ acontece só na exibição (`formatCentsBRL` em `lib/format.ts` — único ponto com `/100`).

O browser **nunca** chama a API C# (exceção: `app/page.tsx` faz SSR direto com a key do servidor); no cliente, as chamadas saem same-origin para o proxy `app/api/*` (evita CORS e esconde a API key).

| Rota do front | Método | Repassa para | Observação |
|---------------|--------|--------------|------------|
| `/api/account` | GET | `GET {BACKEND_URL}/api/transactions?page=&pageSize=` | Repassa `?page/?pageSize` (valida: page ≥ 1, 1 ≤ pageSize ≤ 200); normaliza `currentBalance` → `balance` + `page/pageSize/totalCount` (estrito: lixo vira `502`, nunca `0`); valida shape; sanitiza erro upstream; `404` vira first-run ("Começar") |
| `/api/account` | POST | `POST {BACKEND_URL}/api/accounts` | Corpo vazio; `409` vira sucesso em `lib/api.ts` (segue para `GET`) |
| `/api/deposit` | POST | `POST {BACKEND_URL}/api/deposit` | Corpo `{amount, description}` — `amount` int em **centavos** + `description` 1-500 (proxy rejeita com `400`); responde `201`; erro upstream sanitizado (só `error/detail/errors`) |
| `/api/withdraw` | POST | `POST {BACKEND_URL}/api/withdraw` | Idem; `422` vira "Saldo insuficiente…" em `lib/api.ts` |

Regras do contrato:

- **A API key existe só no servidor** (route handlers e `app/page.tsx`). Nunca em componente `use client`, em `NEXT_PUBLIC_*` ou numa resposta do proxy.
- Config em `.env.local` (gitignored, nunca committado): `BACKEND_URL` (default `http://localhost:8080`; os 4 arquivos usam `||`, então uma env vazia cai no default) e `BACKEND_API_KEY` (mesmo valor de `API_KEY` no `.env` da raiz; injetada como header `X-Api-Key` pelos mesmos 4 arquivos — sem ela a API responde `401`, que o front mostra como erro de configuração).
- O proxy valida input (amount, description) e sanitiza o erro upstream; `lib/api.ts` vira status em mensagem ao usuário (`401`=config, `502`=rede).
- ⚠️ Idempotência de escritas é **futura** (ver `../FinanceControl/docs/adr/005-idempotencia.md`): hoje retries/duplo clique **duplicam lançamentos** — só `POST /api/accounts` é idempotente (via `409`). Não prometer proteção no front até implementar.

## Comandos (verificados nesta máquina)

> PowerShell com execution policy restritiva: use **`npm.cmd` / `npx.cmd`** — `npm`/`npx` disparam `*.ps1` bloqueado.

```bash
npm.cmd run dev       # next dev → http://localhost:3000 (pid/porta em .next/dev/lock)
npm.cmd run build     # next build (faz type-check)
npm.cmd run lint      # eslint
npm.cmd run test      # vitest run (lib + Dashboard + OperationForm + WelcomeScreen)
npx.cmd tsc --noEmit  # type-check rápido (verificado: exit 0)
npm.cmd start         # next start (após build)
```

**Suíte Vitest ativa** (`npm.cmd run test`). Não crie script de teste novo sem pedido.

## Validação obrigatória (Definition of Done)

Execute **nesta ordem** e só declare concluído com tudo verde:

1. [ ] `npx.cmd tsc --noEmit` → **0 erros**.
2. [ ] `npm.cmd run lint` → **0 erros / 0 warnings novos**.
3. [ ] `npm.cmd run test` → **todos os testes passando**.
4. [ ] `npm.cmd run build` → build concluído **sem erro**.
5. [ ] Mudou UI ou fluxo? `npm.cmd run dev` e **confira a tela** — erro de runtime só aparece aí (o `next dev` espelha o console do browser no terminal; MCP em `/_next/mcp`).
6. [ ] Bloco `<!-- BEGIN:nextjs-agent-rules --> … <!-- END -->` intacto (texto e markers idênticos).
7. [ ] Nada novo de dependência (G6) e nenhum arquivo fora do escopo alterado.

**Relato final padrão:** arquivos alterados (caminho + por quê), comandos executados e resultado resumido (ex.: `tsc` 0 erros, `lint` 0 erros, `build` ok). Se algum passo falhou e não pôde ser corrigido, diga **claramente** o que está quebrado.

## Manutenção destes arquivos

- Mudou fluxo, contrato HTTP ou comandos? **Atualize `AGENTS.md` e o trecho afetado na mesma tarefa.**
- Mantenha `AGENTS.md` enxuto (**< 150 linhas**): detalhe demais aqui vira ruído de contexto carregado em toda sessão.
- O bloco Next é gerenciado: edite só **fora** das markers. `next dev` recria o bloco se faltar — apagá-lo só gera diff novo; commit-o junto com seu trabalho.
