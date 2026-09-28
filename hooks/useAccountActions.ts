"use client";

import { useCallback, useRef, useState } from "react";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  createAccount,
  deposit,
  withdraw,
  type OperationKind,
} from "@/lib/api";
import { formatCentsBRL } from "@/lib/format";

interface UseAccountActionsParams {
  refresh: () => Promise<boolean>;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}

function toErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE;
}

/**
 * Escritas da conta: criação (first-run) e operações depósito/saque.
 * Trava (`pending`/`creating`) para evitar envio concorrente/duplo clique.
 */
export function useAccountActions({
  refresh,
  notifySuccess,
  notifyError,
}: UseAccountActionsParams) {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, setPending] = useState<OperationKind | null>(null);
  // Guarda de reentrância lido/escrito só em handlers (fora do render).
  const busyRef = useRef(false);

  const handleStart = useCallback(async (): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setCreating(true);
    setCreateError(null);
    try {
      await createAccount();
      const ok = await refresh();
      if (!ok) {
        setCreateError(
          "Não foi possível carregar a conta após a criação. Recarregue a tela.",
        );
      }
    } catch (err) {
      setCreateError(toErrorMessage(err));
    } finally {
      setCreating(false);
      busyRef.current = false;
    }
  }, [refresh]);

  const handleOperation = useCallback(
    async (
      kind: OperationKind,
      amount: number,
      description: string,
    ): Promise<boolean> => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setPending(kind);
      try {
        if (kind === "deposit") {
          await deposit(amount, description);
        } else {
          await withdraw(amount, description);
        }
        const ok = await refresh();
        notifySuccess(
          ok
            ? kind === "deposit"
              ? `Depósito de ${formatCentsBRL(amount)} registrado com sucesso.`
              : `Saque de ${formatCentsBRL(amount)} registrado com sucesso.`
            : "Operação registrada, mas não foi possível recarregar a tela. Use o botão Tentar novamente acima — não repita a operação.",
        );
        // Só limpa o form quando a tela refletiu a operação.
        return ok;
      } catch (err) {
        notifyError(toErrorMessage(err));
        return false;
      } finally {
        setPending(null);
        busyRef.current = false;
      }
    },
    [notifyError, notifySuccess, refresh],
  );

  return { creating, createError, pending, handleStart, handleOperation };
}
