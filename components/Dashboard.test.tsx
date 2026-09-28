import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "@/components/Dashboard";
import type { AccountSnapshot } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getAccount: vi.fn(),
    deposit: vi.fn(),
    withdraw: vi.fn(),
    createAccount: vi.fn(),
  };
});

const { getAccount, deposit } = await import("@/lib/api");
const mockedGetAccount = getAccount as ReturnType<typeof vi.fn>;
const mockedDeposit = deposit as ReturnType<typeof vi.fn>;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function snapshot(overrides: Partial<AccountSnapshot> = {}): AccountSnapshot {
  return {
    accountId: "a1",
    balance: 70000,
    transactions: [
      {
        id: "t1",
        amount: 70000,
        type: 1,
        description: "Vendas",
        createdAt: new Date().toISOString(),
      },
    ],
    page: 1,
    pageSize: 50,
    totalCount: 1,
    ...overrides,
  };
}

describe("Dashboard", () => {
  it("mostra first-run quando ainda não há conta", () => {
    render(
      <Dashboard initialSnapshot={null} initialError={null} initialNoAccount />,
    );

    const button = screen.getByRole("button", { name: "Começar" });
    expect(button.textContent).toBe("Começar");
  });

  it("renderiza saldo e histórico a partir do snapshot", () => {
    render(
      <Dashboard
        initialSnapshot={snapshot()}
        initialError={null}
        initialNoAccount={false}
      />,
    );

    expect(screen.getByText("Conta empresarial").textContent).toBe(
      "Conta empresarial",
    );
    expect(screen.getByText("Vendas").textContent).toBe("Vendas");
  });

  it("mantém o snapshot visível quando há erro de recarga", () => {
    render(
      <Dashboard
        initialSnapshot={snapshot()}
        initialError="Falha ao recarregar."
        initialNoAccount={false}
      />,
    );

    // Banner de erro + conteúdo anterior preservado.
    expect(screen.getByRole("alert").textContent).toContain(
      "Falha ao recarregar.",
    );
    expect(screen.getByText("Vendas").textContent).toBe("Vendas");
    expect(
      screen.getByRole("button", { name: /tentar novamente/i }).textContent,
    ).toContain("Tentar novamente");
  });

  it("tela cheia de erro com retry quando não há snapshot", async () => {
    const user = userEvent.setup();
    mockedGetAccount.mockResolvedValueOnce(snapshot({ balance: 5000 }));

    render(
      <Dashboard
        initialSnapshot={null}
        initialError="Servidor fora do ar."
        initialNoAccount={false}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Servidor fora do ar.",
    );
    // Sem snapshot, o extrato não aparece.
    expect(screen.queryByText("Vendas")).toBeNull();

    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(mockedGetAccount).toHaveBeenCalledOnce();
    expect((await screen.findByText("Vendas")).textContent).toBe("Vendas");
  });

  it("Ver mais anexa a próxima página sem perder a atual", async () => {
    const user = userEvent.setup();
    mockedGetAccount.mockResolvedValueOnce(
      snapshot({
        accountId: "a1",
        balance: 80000,
        transactions: [
          {
            id: "t2",
            amount: 10000,
            type: 1,
            description: "Aporte",
            createdAt: new Date().toISOString(),
          },
        ],
        page: 2,
        pageSize: 1,
        totalCount: 2,
      }),
    );

    render(
      <Dashboard
        initialSnapshot={snapshot({
          page: 1,
          pageSize: 1,
          totalCount: 2,
        })}
        initialError={null}
        initialNoAccount={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /ver mais/i }));

    expect(mockedGetAccount).toHaveBeenCalledOnce();
    expect((await screen.findByText("Aporte")).textContent).toBe("Aporte");
    // Página atual preservada.
    expect(screen.getByText("Vendas").textContent).toBe("Vendas");
  });

  it("trava os dois forms enquanto uma operação está em voo", async () => {
    const user = userEvent.setup();
    let resolveDeposit!: () => void;
    mockedDeposit.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveDeposit = res; }),
    );
    mockedGetAccount.mockResolvedValue(snapshot());

    render(
      <Dashboard
        initialSnapshot={snapshot()}
        initialError={null}
        initialNoAccount={false}
      />,
    );

    const depositForm = within(screen.getByRole("region", { name: "Depositar" }));
    const withdrawForm = within(screen.getByRole("region", { name: "Sacar" }));

    await user.type(depositForm.getByLabelText(/valor/i), "50");
    await user.type(depositForm.getByLabelText(/descrição/i), "Aporte");
    await user.click(depositForm.getByRole("button"));

    // Envio pendente: o outro form também trava (não só o que enviou).
    expect(
      (withdrawForm.getByLabelText(/valor/i) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (withdrawForm.getByRole("button") as HTMLButtonElement).disabled,
    ).toBe(true);

    resolveDeposit();
    await screen.findByText(/registrado com sucesso/);

    // Destrava após concluir.
    expect(
      (withdrawForm.getByLabelText(/valor/i) as HTMLInputElement).disabled,
    ).toBe(false);
  });
});
