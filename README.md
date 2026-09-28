# finance-control-app (front-end)

Interface web do livro-caixa empresarial: consulta saldo, registra entradas/saídas e exibe o histórico de movimentações. Desenvolvida em **Next.js 16 (App Router) + React 19 + TypeScript 5 (`strict`) + Tailwind CSS 4**.

---

## Sumário

- [Sobre](#sobre)
- [Dependência obrigatória: back-end rodando](#dependência-obrigatória-back-end-rodando)
- [Pré-requisitos](#pré-requisitos)
- [Passo a passo para rodar o projeto](#passo-a-passo-para-rodar-o-projeto)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Como funciona (arquitetura)](#como-funciona-arquitetura)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Testes](#testes)
- [Solução de problemas](#solução-de-problemas)

---

## Sobre

- Conta **única**: o primeiro acesso exibe a tela **"Começar"** (first-run) que cria a conta via `POST /api/account`.
- Tela principal (`Dashboard`): saldo + formulários de depósito/saque + extrato paginado (botão "Ver mais").
- Valores trafegados em **centavos (`int`)**; conversão para R$ acontece só na exibição (`lib/format.ts` → `formatCentsBRL`, único ponto com `/100`).
- Sem login, sessão ou cookie; nada é persistido no cliente.
- Textos de UI e comentários em **pt-BR**; identificadores em inglês.

---

## Dependência obrigatória: back-end rodando

> **O front não funciona sozinho.** Sem a API C# no ar, a tela abre mas exibe erro de rede (`502` / "Não foi possível conectar ao servidor") e nenhuma operação (saldo, depósito, saque, criar conta) funciona.

O back-end esperado é o projeto (C# / .NET 10 + PostgreSQL 18):

| Item | Valor |
|------|-------|
| URL padrão esperada pelo front | `http://localhost:8080` (via `docker compose up --build` no back-end) |
| Alternativa (`dotnet run`) | `http://localhost:5000` / `https://localhost:5001` — nesse caso ajuste `BACKEND_URL` (ver abaixo) |
| Autenticação | Toda rota `/api/*` exige header **`X-Api-Key`**; sem a chave a API responde `401` (o front exibe como erro de configuração) |
| Conta | Banco vazio responde `404` até `POST /api/accounts` — o front trata isso como first-run ("Começar"), não como erro |
| Chave compartilhada | `BACKEND_API_KEY` (front, `.env.local`) **=** `API_KEY` (back-end, `.env`) |

Como o browser **nunca** chama a API C# diretamente — as chamadas saem same-origin para o proxy `app/api/*`, que injeta a `X-Api-Key` no servidor (evita CORS e nunca expõe a chave ao browser) — o proxy é a **única** saída para o back-end:

| Rota do front | Repassa para (back-end) | Observação |
|---------------|-------------------------|------------|
| `GET /api/account?page=&pageSize=` | `GET /api/transactions?page=&pageSize=` | Saldo + histórico numa única requisição; `404` vira first-run |
| `POST /api/account` | `POST /api/accounts` | Corpo vazio; `409` (já existe) é tratado como sucesso |
| `POST /api/deposit` | `POST /api/deposit` | Corpo `{amount, description}` — `amount` em centavos |
| `POST /api/withdraw` | `POST /api/withdraw` | Idem; `422` vira "Saldo insuficiente…" |

---

## Pré-requisitos

- **Node.js LTS (20+)** e npm.
- **Back-end rodando** (ver seção acima): PostgreSQL + API C# acessível.
- PowerShell com execution policy restritiva (Windows): use **`npm.cmd` / `npx.cmd`** em vez de `npm`/`npx`.

---

## Passo a passo para rodar o projeto (só o front)

> Premissa: o back-end já está acessível (ver [Dependência obrigatória](#dependência-obrigatória-back-end-rodando)). Abaixo só há comandos deste projeto (`finance-control-app`).

### 1. Configure as variáveis do front

Na raiz deste projeto, crie o arquivo `.env.local` (gitignored, nunca committado):

```bash
BACKEND_URL=http://localhost:8080
BACKEND_API_KEY=<mesmo-valor-de-API_KEY-do-.env-do-backend>
```

Regras:

- `BACKEND_URL` tem default `http://localhost:8080` (os route handlers e `app/page.tsx` usam `||`), mas prefira definir explicitamente.
- `BACKEND_API_KEY` **deve ser idêntica** a `API_KEY` do back-end — ela é injetada como header `X-Api-Key` só no servidor (route handlers + `app/page.tsx`). Nunca use prefixo `NEXT_PUBLIC_*` nem coloque a chave em componente `use client`.

### 2. Instale as dependências

```bash
npm.cmd install
```

### 3. Rode em desenvolvimento

```bash
npm.cmd run dev
```

Abra `http://localhost:3000`:

- **Primeiro acesso (banco vazio):** tela "Começar" → clique para criar a conta única.
- **Acessos seguintes:** saldo + extrato carregados no servidor em uma única requisição.

### 4. Build de produção (opcional)

```bash
npm.cmd run build
npm.cmd start
```

---

## Variáveis de ambiente

| Variável | Onde | Obrigatória | Default | Descrição |
|----------|------|-------------|---------|-----------|
| `BACKEND_URL` | `.env.local` (servidor) | Recomendada | `http://localhost:8080` | Origem da API C# consumida pelo proxy `app/api/*` e pelo SSR de `app/page.tsx` |
| `BACKEND_API_KEY` | `.env.local` (servidor) | **Sim** | — (string vazia → `401` do back-end) | Enviada como `X-Api-Key`; igual a `API_KEY` do back-end |

---

## Scripts disponíveis

```bash
npm.cmd run dev       # next dev → http://localhost:3000
npm.cmd run build     # next build (com type-check)
npm.cmd start         # next start (após build)
npm.cmd run lint      # eslint
npm.cmd run test      # vitest run (lib + Dashboard + OperationForm + WelcomeScreen)
npm.cmd run test:e2e  # playwright (exige back-end em :8080 + front com BACKEND_API_KEY; usa dev server próprio)
npx.cmd tsc --noEmit  # type-check rápido
```

---

## Como funciona (arquitetura)

```
app/page.tsx (server component)
  └─ busca saldo + histórico direto da API C# (1 requisição) → <Dashboard/>
       └─ components/Dashboard.tsx ("use client", dono de todo o estado)
            ├─ lib/api.ts ──fetch same-origin──▶ app/api/* (proxy, server-only)
            │                                        └─ injeta X-Api-Key ─▶ API C# (../FinanceControl)
            ├─ BalanceCard.tsx / HistoryList.tsx (exibição; skeletons com role=status)
            ├─ OperationForm.tsx (deposit|withdraw, validação no cliente)
            ├─ WelcomeScreen.tsx (first-run: só botão Começar)
            └─ Toast.tsx (fila de success|error, auto-dismiss 6s)
```

- Carga inicial é SSR (`app/page.tsx` chama o back-end direto com a key do servidor); depois disso, o cliente só fala com o proxy same-origin (`lib/api.ts`, timeout 10s).
- Erros viram mensagem amigável em `lib/api.ts`: `401` = configuração (API key), `422` = saldo insuficiente, `502` = rede/back-end fora do ar.

---

## Estrutura do projeto

```
app/
  layout.tsx            # Root layout: fontes Geist, metadata, lang="pt-BR"
  page.tsx              # Server component: carga inicial → <Dashboard/> (404 vira first-run)
  globals.css           # Tailwind 4
  api/                  # Proxy same-origin — ÚNICA saída para a API C#
    account/route.ts    # GET saldo+histórico | POST cria conta
    deposit/route.ts    # POST repassa {amount, description}
    withdraw/route.ts   # POST repassa {amount, description}
components/
  Dashboard.tsx         # Dono do estado; refresh silencioso, toasts em fila, first-run
  WelcomeScreen.tsx     # First-run: botão Começar, loading + erro
  OperationForm.tsx     # Formulário deposit|withdraw com validação no cliente
  BalanceCard.tsx       # Saldo (skeleton com role=status)
  HistoryList.tsx       # Extrato; "Ver mais" pagina
  Toast.tsx             # success|error, auto-dismiss 6s
lib/
  api.ts                # Tipos, fetch 10s, ApiError, mensagens por status
  format.ts             # formatCentsBRL (único /100), formatDateTime, parseAmountInputToCents
e2e/                    # Playwright contra o back-end real (não mocka o proxy)
```

---

## Testes

- **Unitários + componente (Vitest):** `npm.cmd run test` — cobre `lib/format`, `lib/api` e `components/Dashboard|OperationForm|WelcomeScreen`. Não criam banco nem chamam o back-end (mock de `fetch`).
- **E2E (Playwright):** `npm.cmd run test:e2e` — sobe o dev server próprio e testa contra o **back-end real** em `http://localhost:8080` com `BACKEND_API_KEY` configurada; workers em série (conta única global).

---

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---------|----------------|-------------|
| "Não foi possível conectar ao servidor" (`502`) | Back-end desligado ou `BACKEND_URL` errada | Suba o back-end (`docker compose up --build` em `../FinanceControl`); confira `BACKEND_URL` e `http://localhost:8080/health` |
| "Falha de configuração do servidor (autenticação)" (`401`) | `BACKEND_API_KEY` ausente/divergente | Iguale `BACKEND_API_KEY` (front) a `API_KEY` (back-end) e reinicie o `next dev` |
| Tela "Começar" em todo acesso | Conta ainda não criada (`404` do back-end) | Clique em Começar uma vez; se persistir, verifique se o banco foi resetado (`down -v` apaga o volume) |
| `EADDRINUSE` na porta 3000 | Outro `next dev` rodando | Encerre o processo anterior ou rode com `--port` alternativo |
| Mudou `.env.local` e nada mudou | Env lida no boot do servidor | Reinicie o `next dev` após qualquer mudança em `.env.local` |
