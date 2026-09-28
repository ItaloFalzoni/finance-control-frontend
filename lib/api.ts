export interface Transaction {
  id: string;
  /** Valor em centavos (int). O backend trafega long em centavos. */
  amount: number | string;
  /** 1 = Credit (entrada), 2 = Debit (saída). Sem typeLabel (removido no backend). */
  type: number;
  description: string;
  createdAt: string;
}

export interface AccountSnapshot {
  accountId: string;
  /** Saldo em centavos (int). Conversão p/ R$ só em formatCentsBRL. */
  balance: number;
  transactions: Transaction[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export type OperationKind = "deposit" | "withdraw";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Tente novamente.";

export const CONFIG_ERROR_MESSAGE =
  "Falha de configuração do servidor (autenticação). Verifique a API key e tente novamente.";

const TIMEOUT_MS = 10_000;

/**
 * Normaliza um valor do fio para centavos (int).
 * Estrito: retorna null quando o fio manda lixo (NaN, não-inteiro
 * inseguro) em vez de mascarar como R$ 0,00 — o chamador decide o erro.
 */
export function toIntCentsStrict(
  value: number | string | undefined,
): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n);
  return Number.isSafeInteger(cents) ? cents : null;
}

function friendlyMessage(status: number | undefined, body: unknown): string {
  const code =
    typeof body === "object" && body !== null
      ? String((body as { error?: unknown }).error ?? "")
      : "";

  if (status === 401 || code === "Unauthorized") {
    return CONFIG_ERROR_MESSAGE;
  }
  if (code === "Insufficient funds") {
    return "Saldo insuficiente para realizar este saque.";
  }
  if (code === "Domain error") {
    return "Não foi possível concluir a operação. Verifique os dados e tente novamente.";
  }
  if (status === 422) {
    return "Saldo insuficiente para realizar este saque.";
  }
  if (status === 400 || code === "Validation failed") {
    return "Verifique o valor e a descrição informados e tente novamente.";
  }
  if (status === 404) {
    return "Conta não encontrada. Tente novamente mais tarde.";
  }
  if (status === 502 || code === "upstream_unavailable") {
    return NETWORK_ERROR_MESSAGE;
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(path, { ...init, signal: controller.signal });
    const body: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      throw new ApiError(friendlyMessage(res.status, body), res.status);
    }

    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(NETWORK_ERROR_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}

interface RawHistory {
  accountId: unknown;
  balance: unknown;
  transactions?: unknown;
  page?: unknown;
  pageSize?: unknown;
  totalCount?: unknown;
}

function isValidTransaction(value: unknown): value is Transaction {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  if (
    typeof t.id !== "string" ||
    typeof t.description !== "string" ||
    typeof t.createdAt !== "string"
  )
    return false;
  if (t.type !== 1 && t.type !== 2) return false;
  // amount precisa ser centavos válidos — lixo não vira R$ 0,00 na tela.
  if (toIntCentsStrict(t.amount as number | string) === null) return false;
  return true;
}

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export async function getAccount(
  page = 1,
  pageSize = 50,
): Promise<AccountSnapshot> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const raw = await request<RawHistory>(`/api/account?${params.toString()}`, {
    cache: "no-store",
  });

  if (typeof raw.accountId !== "string" || raw.accountId.length === 0) {
    throw new ApiError(NETWORK_ERROR_MESSAGE);
  }
  const balance = toIntCentsStrict(raw.balance as number | string);
  if (balance === null) {
    throw new ApiError(NETWORK_ERROR_MESSAGE);
  }

  return {
    accountId: raw.accountId,
    balance,
    transactions: Array.isArray(raw.transactions)
      ? raw.transactions.filter(isValidTransaction)
      : [],
    page: toInt(raw.page, page),
    pageSize: toInt(raw.pageSize, pageSize),
    totalCount: toInt(raw.totalCount, 0),
  };
}

/** amount em centavos (int). */
export async function deposit(
  amount: number,
  description: string,
): Promise<void> {
  await request("/api/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, description }),
  });
}

export async function withdraw(
  amount: number,
  description: string,
): Promise<void> {
  await request("/api/withdraw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, description }),
  });
}

/**
 * Cria a conta única (first-run). Conta já existente (409 — corrida de
 * duplo clique/retry) é tratada como sucesso: o chamador segue para
 * `getAccount()` normalmente.
 */
export async function createAccount(): Promise<void> {
  try {
    await request("/api/account", { method: "POST" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return;
    throw err;
  }
}

export function isCredit(t: Transaction): boolean {
  return t.type === 1;
}

export function toAmount(t: Transaction): number {
  return toIntCentsStrict(t.amount) ?? 0;
}
