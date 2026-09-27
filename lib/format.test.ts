import { describe, expect, it } from "vitest";
import { formatBRL, formatDateTime, parseAmountInput } from "@/lib/format";

describe("formatBRL", () => {
  it("formata valor decimal no padrão brasileiro", () => {
    // Evita igualdade exata: o Intl usa NBSP (\u00A0) após "R$".
    expect(formatBRL(1234.56)).toContain("1.234,56");
    expect(formatBRL(1234.56)).toContain("R$");
  });

  it("formata zero com duas casas decimais", () => {
    expect(formatBRL(0)).toContain("0,00");
  });

  it("formata valor negativo com sinal de menos", () => {
    const formatted = formatBRL(-100);
    expect(formatted).toContain("-");
    expect(formatted).toContain("100,00");
  });
});

describe("formatDateTime", () => {
  it("formata ISO válida como dd/mm/aaaa hh:mm", () => {
    const formatted = formatDateTime("2026-09-27T14:30:00.000Z");
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}$/);
  });

  it("devolve a entrada crua quando a data é inválida", () => {
    expect(formatDateTime("não é data")).toBe("não é data");
    expect(formatDateTime("")).toBe("");
  });
});

describe("parseAmountInput", () => {
  it("aceita vírgula decimal (1234,56)", () => {
    expect(parseAmountInput("1234,56")).toBe(1234.56);
  });

  it("aceita milhar com ponto e decimal com vírgula (1.234,56)", () => {
    expect(parseAmountInput("1.234,56")).toBe(1234.56);
  });

  it("aceita ponto decimal (1234.56)", () => {
    expect(parseAmountInput("1234.56")).toBe(1234.56);
  });

  it("remove espaços nas pontas e no meio", () => {
    expect(parseAmountInput("  100  ")).toBe(100);
    expect(parseAmountInput("1 000,50")).toBe(1000.5);
  });

  it("rejeita entrada vazia", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("   ")).toBeNull();
  });

  it("rejeita texto que não é número", () => {
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("12abc")).toBeNull();
    expect(parseAmountInput("-5")).toBeNull();
    expect(parseAmountInput("1,2,3")).toBeNull();
  });
});
