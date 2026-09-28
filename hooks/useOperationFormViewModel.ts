"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { OperationKind } from "@/lib/api";
import { formatCentsBRL, parseAmountInputToCents } from "@/lib/format";

interface UseOperationFormParams {
  kind: OperationKind;
  /** Saldo em centavos. */
  balance: number;
  disabled: boolean;
  busy: boolean;
  /** amount em centavos. */
  onSubmit: (amount: number, description: string) => Promise<boolean>;
}

const CONFIG = {
  deposit: {
    title: "Depositar",
    submitLabel: "Confirmar depósito",
    busyLabel: "Registrando depósito…",
  },
  withdraw: {
    title: "Sacar",
    submitLabel: "Confirmar saque",
    busyLabel: "Registrando saque…",
  },
} as const;

/**
 * ViewModel do formulário de operação: estado dos campos, validação
 * cliente e submit. Expõe handlers estáveis para inputs controlados.
 */
export function useOperationFormViewModel({
  kind,
  balance,
  disabled,
  busy,
  onSubmit,
}: UseOperationFormParams) {
  const config = useMemo(() => CONFIG[kind], [kind]);
  const amountId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const blocked = disabled || busy;

  const handleAmountChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(event.target.value);
      setFormError(null);
    },
    [],
  );

  const handleDescriptionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(event.target.value);
      setFormError(null);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy || disabled) return;

      const parsed = parseAmountInputToCents(amount);
      if (parsed === null || parsed <= 0) {
        setFormError("Informe um valor maior que zero.");
        return;
      }

      const trimmed = description.trim();
      if (trimmed.length === 0) {
        setFormError("Informe uma descrição para a operação.");
        return;
      }

      if (kind === "withdraw" && parsed > balance) {
        setFormError(
          `Saldo insuficiente para este saque. Seu saldo atual é ${formatCentsBRL(balance)}.`,
        );
        return;
      }

      setFormError(null);
      const ok = await onSubmit(parsed, trimmed);
      if (ok) {
        setAmount("");
        setDescription("");
      }
    },
    [amount, balance, busy, description, disabled, kind, onSubmit],
  );

  return {
    config,
    amountId,
    descriptionId,
    errorId,
    amount,
    description,
    formError,
    blocked,
    handleAmountChange,
    handleDescriptionChange,
    handleSubmit,
  };
}

export type OperationFormViewModel = ReturnType<
  typeof useOperationFormViewModel
>;
