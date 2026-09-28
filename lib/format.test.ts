import { describe, expect, it } from "vitest";
import {
  formatCentsBRL,
  formatCentsToAmountInput,
  formatDateTime,
  maskAmountInput,
  parseAmountInputToCents,
} from "@/lib/format";

describe("formatCentsBRL", () => {
  it("formata centavos no padrão brasileiro", () => {
    // Evita igualdade exata: o Intl usa NBSP (\u00A0) após "R$".
    expect(formatCentsBRL(123456)).toContain("1.234,56");
    expect(formatCentsBRL(123456)).toContain("R$");
  });

  it("formata zero centavos com duas casas decimais", () => {
    expect(formatCentsBRL(0)).toContain("0,00");
  });

  it("formata centavos negativos com sinal de menos", () => {
    const formatted = formatCentsBRL(-10000);
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

describe("parseAmountInputToCents", () => {
  it("converte vírgula decimal para centavos (1234,56 → 123456)", () => {
    expect(parseAmountInputToCents("1234,56")).toBe(123456);
  });

  it("converte milhar com ponto e decimal com vírgula (1.234,56 → 123456)", () => {
    expect(parseAmountInputToCents("1.234,56")).toBe(123456);
  });

  it("converte ponto decimal para centavos (1234.56 → 123456)", () => {
    expect(parseAmountInputToCents("1234.56")).toBe(123456);
  });

  it("remove espaços nas pontas e no meio", () => {
    expect(parseAmountInputToCents("  100  ")).toBe(10000);
    expect(parseAmountInputToCents("1 000,50")).toBe(100050);
  });

  it("rejeita mais de 2 casas decimais (fração de centavo)", () => {
    expect(parseAmountInputToCents("10,999")).toBeNull();
    expect(parseAmountInputToCents("1,005")).toBeNull();
    expect(parseAmountInputToCents("1.234,567")).toBeNull();
  });

  it("rejeita entrada vazia", () => {
    expect(parseAmountInputToCents("")).toBeNull();
    expect(parseAmountInputToCents("   ")).toBeNull();
  });

  it("rejeita texto que não é número", () => {
    expect(parseAmountInputToCents("abc")).toBeNull();
    expect(parseAmountInputToCents("12abc")).toBeNull();
    expect(parseAmountInputToCents("-5")).toBeNull();
    expect(parseAmountInputToCents("1,2,3")).toBeNull();
  });
});

describe("maskAmountInput", () => {
  it("preenche da direita para a esquerda (primeiro centavos)", () => {
    expect(maskAmountInput("")).toBe("");
    expect(maskAmountInput("1")).toBe("0,01");
    expect(maskAmountInput("12")).toBe("0,12");
    expect(maskAmountInput("123")).toBe("1,23");
    expect(maskAmountInput("1234")).toBe("12,34");
    expect(maskAmountInput("123456")).toBe("1.234,56");
  });

  it("ignora formatação existente e reaplica a máscara", () => {
    expect(maskAmountInput("1.234,56")).toBe("1.234,56");
    expect(maskAmountInput("0,01")).toBe("0,01");
  });

  it("campo vazio continua vazio e zero vira 0,00", () => {
    expect(maskAmountInput("abc")).toBe("");
    expect(maskAmountInput("0")).toBe("0,00");
  });
});

describe("formatCentsToAmountInput", () => {
  it("formata centavos sem símbolo para o campo", () => {
    expect(formatCentsToAmountInput(1)).toBe("0,01");
    expect(formatCentsToAmountInput(123456)).toBe("1.234,56");
  });
});
