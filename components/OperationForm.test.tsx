import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OperationForm from "@/components/OperationForm";

afterEach(() => cleanup());

function renderForm(props?: {
  kind?: "deposit" | "withdraw";
  balance?: number;
  onSubmit?: (amount: number, description: string) => Promise<boolean>;
}) {
  const onSubmit = props?.onSubmit ?? vi.fn().mockResolvedValue(true);
  const view = render(
    <OperationForm
      kind={props?.kind ?? "deposit"}
      balance={props?.balance ?? 10000}
      disabled={false}
      busy={false}
      onSubmit={onSubmit}
    />,
  );
  // Escopo: o componente usa useId, mas os labels se repetem entre testes
  // sem cleanup global — limita as queries a este render.
  const form = within(view.container);
  return { onSubmit: onSubmit as ReturnType<typeof vi.fn>, form };
}

describe("OperationForm", () => {
  it("bloqueia valor zerado e não chama onSubmit", async () => {
    const user = userEvent.setup();
    const { onSubmit, form } = renderForm();

    await user.type(form.getByLabelText(/valor/i), "0");
    await user.type(form.getByLabelText(/descrição/i), "Vendas");
    await user.click(form.getByRole("button"));

    expect(form.getByRole("alert").textContent).toContain(
      "Informe um valor maior que zero.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("bloqueia descrição vazia e não chama onSubmit", async () => {
    const user = userEvent.setup();
    const { onSubmit, form } = renderForm();

    await user.type(form.getByLabelText(/valor/i), "50");
    await user.click(form.getByRole("button"));

    expect(form.getByRole("alert").textContent).toContain(
      "Informe uma descrição para a operação.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("bloqueia saque acima do saldo no cliente", async () => {
    const user = userEvent.setup();
    const { onSubmit, form } = renderForm({
      kind: "withdraw",
      balance: 5000,
    });

    // Máscara bancária: dígitos viram centavos, então "10000" = R$ 100,00.
    await user.type(form.getByLabelText(/valor/i), "10000");
    await user.type(form.getByLabelText(/descrição/i), "Fornecedor");
    await user.click(form.getByRole("button"));

    expect(form.getByRole("alert").textContent).toContain(
      "Saldo insuficiente para este saque.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submit válido chama onSubmit com valor parseado e limpa o form", async () => {
    const user = userEvent.setup();
    const { onSubmit, form } = renderForm({ balance: 0 });

    // Máscara bancária: dígitos "123456" = R$ 1.234,56.
    await user.type(form.getByLabelText(/valor/i), "123456");
    await user.type(form.getByLabelText(/descrição/i), "  Aporte  ");
    await user.click(form.getByRole("button"));

    expect(onSubmit).toHaveBeenCalledWith(123456, "Aporte");
    expect((form.getByLabelText(/valor/i) as HTMLInputElement).value).toBe(
      "",
    );
    expect(
      (form.getByLabelText(/descrição/i) as HTMLInputElement).value,
    ).toBe("");
  });

  it("máscara bancária preenche da direita para a esquerda", async () => {
    const user = userEvent.setup();
    const { form } = renderForm();
    const input = form.getByLabelText(/valor/i) as HTMLInputElement;

    await user.type(input, "1234");
    expect(input.value).toBe("12,34");
  });

  it("limpa o erro ao digitar novamente", async () => {
    const user = userEvent.setup();
    const { form } = renderForm();

    await user.type(form.getByLabelText(/valor/i), "0");
    await user.click(form.getByRole("button"));
    expect(form.getByRole("alert")).toBeDefined();

    await user.type(form.getByLabelText(/valor/i), "5");

    expect(form.queryByRole("alert")).toBeNull();
  });
});
