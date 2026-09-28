import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * E2E do livro-caixa (TODO 4.2b): bate no backend real via proxy same-origin
 * (`app/api/*`) — nenhum fetch é mockado. Exige `docker compose up` dos
 * 2 lados: API C# em http://localhost:8080 e front com BACKEND_API_KEY.
 */

function balanceRegion(page: Page): Locator {
  return page.getByRole("region", { name: "Saldo da conta empresarial" });
}

/** Lê o saldo exibido (ex.: "R$ 1.234,56") e devolve centavos (int). */
async function readBalanceCents(page: Page): Promise<number> {
  const text = await balanceRegion(page).getByText(/R\$/).innerText();
  const match = text.match(/[\d.,]+/);
  if (!match) throw new Error(`saldo ilegível: "${text}"`);
  // pt-BR: milhar com ".", decimal com ",".
  const value = Number(match[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) throw new Error(`saldo ilegível: "${text}"`);
  return Math.round(value * 100);
}

/** Formata centavos para o campo "Valor (R$)" (aceita "1234,56"). */
function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

test("depósito de R$ 100 mostra toast de sucesso e soma ao saldo", async ({
  page,
}) => {
  await page.goto("/");
  await expect(balanceRegion(page).getByText(/R\$/)).toBeVisible();
  const before = await readBalanceCents(page);

  const deposit = page.getByRole("region", { name: "Depositar" });
  await deposit.getByLabel("Valor (R$)").fill("100");
  await deposit
    .getByLabel("Descrição")
    .fill(`E2E depósito ${Date.now()}`);
  await deposit.getByRole("button", { name: "Confirmar depósito" }).click();

  await expect(page.getByRole("status")).toContainText(
    /registrado com sucesso/,
  );
  await expect
    .poll(() => readBalanceCents(page), { timeout: 10_000 })
    .toBe(before + 10_000);
});

test("saque acima do saldo mostra erro de saldo insuficiente", async ({
  page,
}) => {
  await page.goto("/");
  await expect(balanceRegion(page).getByText(/R\$/)).toBeVisible();
  const balance = await readBalanceCents(page);

  const withdraw = page.getByRole("region", { name: "Sacar" });
  await withdraw.getByLabel("Valor (R$)").fill(centsToInput(balance + 10_000));
  await withdraw.getByLabel("Descrição").fill(`E2E saque ${Date.now()}`);
  await withdraw.getByRole("button", { name: "Confirmar saque" }).click();

  // Guarda do formulário (role=alert) ou 422 do backend via toast
  // (role=status) — ambos exibem "Saldo insuficiente".
  await expect(page.getByText(/Saldo insuficiente/i)).toBeVisible();
});
