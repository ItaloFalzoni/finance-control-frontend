const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Formata centavos (unidade menor) como BRL.
 * ÚNICO ponto de conversão centavos → reais na exibição:
 * o fio, o domínio e o banco trafegam só inteiros.
 */
export function formatCentsBRL(cents: number): string {
  return brl.format(cents / 100);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTime.format(d);
}

/**
 * Converte o texto digitado em R$ ("1.234,56") direto para centavos (int).
 * Mais de 2 casas decimais é rejeitado (null) — fração de centavo nunca
 * entra no sistema; a validação de "> zero" fica no formulário.
 */
export function parseAmountInputToCents(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "");
  if (text.length === 0) return null;

  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const fraction = normalized.split(".")[1] ?? "";
  if (fraction.length > 2) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}
