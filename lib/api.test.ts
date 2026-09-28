import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  CONFIG_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  createAccount,
  deposit,
  getAccount,
  isCredit,
  toAmount,
  toIntCentsStrict,
  withdraw,
  type Transaction,
} from "@/lib/api";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function mockFetchOnce(response: Response | Promise<Response>) {
  const mock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    amount: 10000,
    type: 1,
    description: "Vendas",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("toIntCentsStrict", () => {
  it("normaliza número e string numérica", () => {
    expect(toIntCentsStrict(70000)).toBe(70000);
    expect(toIntCentsStrict("10050")).toBe(10050);
  });

  it("retorna null para lixo em vez de mascarar como zero", () => {
    expect(toIntCentsStrict("abc")).toBeNull();
    expect(toIntCentsStrict(undefined)).toBeNull();
    expect(toIntCentsStrict(Number.NaN)).toBeNull();
  });
});

describe("deposit / withdraw", () => {
  it("envia POST com corpo JSON em centavos e resolve quando ok", async () => {
    const mock = mockFetchOnce(jsonResponse(201, tx()));

    await deposit(10000, "Vendas");

    expect(mock).toHaveBeenCalledOnce();
    const [url, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/deposit");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      amount: 10000,
      description: "Vendas",
    });
    // Timeout de 10s: request sempre passa um signal de AbortController.
    expect((init as { signal?: AbortSignal }).signal).toBeDefined();
  });

  it("traduz 422 em mensagem de saldo insuficiente", async () => {
    mockFetchOnce(jsonResponse(422, { error: "Insufficient funds" }));

    const err = await withdraw(6000, "Fornecedor").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
    expect((err as ApiError).message).toBe(
      "Saldo insuficiente para realizar este saque.",
    );
  });

  it("traduz 422 Domain error (overflow) em mensagem genérica", async () => {
    mockFetchOnce(jsonResponse(422, { error: "Domain error" }));

    const err = await deposit(1, "Overflow").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe(
      "Não foi possível concluir a operação. Verifique os dados e tente novamente.",
    );
  });

  it("traduz 401 em mensagem de configuração", async () => {
    mockFetchOnce(jsonResponse(401, { error: "Unauthorized" }));

    const err = await getAccount().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe(CONFIG_ERROR_MESSAGE);
  });

  it("traduz 400 em mensagem de validação", async () => {
    mockFetchOnce(jsonResponse(400, { error: "Validation failed" }));

    const err = await deposit(0, "").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe(
      "Verifique o valor e a descrição informados e tente novamente.",
    );
  });

  it("traduz 404 em conta não encontrada", async () => {
    mockFetchOnce(jsonResponse(404, { error: "Account not found" }));

    const err = await getAccount().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe(
      "Conta não encontrada. Tente novamente mais tarde.",
    );
  });

  it("traduz 500 em mensagem genérica", async () => {
    mockFetchOnce(jsonResponse(500, { error: "Unexpected error" }));

    const err = await getAccount().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  });

  it("falha de rede vira mensagem de conexão", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    const err = await getAccount().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe(NETWORK_ERROR_MESSAGE);
  });
});

describe("getAccount", () => {
  it("lê balance em centavos do proxy (contrato único)", async () => {
    mockFetchOnce(
      jsonResponse(200, {
        accountId: "a1",
        balance: 70000,
        transactions: [tx()],
      }),
    );

    const snapshot = await getAccount();

    expect(snapshot.accountId).toBe("a1");
    expect(snapshot.balance).toBe(70000);
    expect(snapshot.transactions).toHaveLength(1);
  });

  it("aceita balance como string e lista ausente como vazia", async () => {
    mockFetchOnce(
      jsonResponse(200, { accountId: "a1", balance: "10050" }),
    );

    const snapshot = await getAccount();

    expect(snapshot.balance).toBe(10050);
    expect(snapshot.transactions).toEqual([]);
  });

  it("rejeita corpo com balance inválido em vez de mostrar zero", async () => {
    mockFetchOnce(jsonResponse(200, { accountId: "a1", balance: "lixo" }));

    const err = await getAccount().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("filtra transações malformadas sem quebrar a tela", async () => {
    mockFetchOnce(
      jsonResponse(200, {
        accountId: "a1",
        balance: 100,
        transactions: [tx(), { id: 123 }],
      }),
    );

    const snapshot = await getAccount();

    expect(snapshot.transactions).toHaveLength(1);
  });

  it("filtra transação com amount inválido ou type desconhecido", async () => {
    mockFetchOnce(
      jsonResponse(200, {
        accountId: "a1",
        balance: 100,
        transactions: [
          tx(),
          tx({ id: "bad-amount", amount: "abc" }),
          tx({ id: "bad-type", type: 0 }),
        ],
      }),
    );

    const snapshot = await getAccount();

    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0].id).toBe("t1");
  });

  it("repasse de paginação: envia page/pageSize e lê o meta", async () => {
    const mock = mockFetchOnce(
      jsonResponse(200, {
        accountId: "a1",
        balance: 100,
        transactions: [],
        page: 2,
        pageSize: 10,
        totalCount: 25,
      }),
    );

    const snapshot = await getAccount(2, 10);

    const [url] = mock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
    expect(snapshot.page).toBe(2);
    expect(snapshot.pageSize).toBe(10);
    expect(snapshot.totalCount).toBe(25);
  });
});

describe("createAccount", () => {
  it("envia POST sem corpo e resolve quando 201", async () => {
    const mock = mockFetchOnce(jsonResponse(201, { accountId: "a1" }));

    await createAccount();

    expect(mock).toHaveBeenCalledOnce();
    const [url, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/account");
    expect(init.method).toBe("POST");
  });

  it("trata 409 (corrida de duplo clique) como sucesso", async () => {
    mockFetchOnce(jsonResponse(409, { error: "Account already exists" }));

    await expect(createAccount()).resolves.toBeUndefined();
  });

  it("propaga 500 como erro genérico", async () => {
    mockFetchOnce(jsonResponse(500, { error: "Unexpected error" }));

    const err = await createAccount().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("isCredit / toAmount", () => {
  it("usa type numérico (1 = crédito)", () => {
    expect(isCredit(tx({ type: 1 }))).toBe(true);
    expect(isCredit(tx({ type: 2 }))).toBe(false);
  });

  it("converte amount string em centavos e invalido em 0", () => {
    expect(toAmount(tx({ amount: "25050" }))).toBe(25050);
    expect(toAmount(tx({ amount: "abc" }))).toBe(0);
  });
});
