"use client";

import { useCallback, useMemo } from "react";
import type { AccountSnapshot, OperationKind } from "@/lib/api";
import { useAccountActions } from "@/hooks/useAccountActions";
import { useAccountData } from "@/hooks/useAccountData";
import { useToasts } from "@/hooks/useToasts";

export interface DashboardViewModelParams {
  initialSnapshot: AccountSnapshot | null;
  initialError: string | null;
  initialNoAccount: boolean;
}

/**
 * Fachada do Dashboard (MVVM): compõe toasts + query + ações e expõe
 * callbacks estáveis e derivados memorizados para a View.
 */
export function useDashboardViewModel({
  initialSnapshot,
  initialError,
  initialNoAccount,
}: DashboardViewModelParams) {
  const { toasts, showToast, dismissToast } = useToasts();

  const notifyError = useCallback(
    (message: string) => showToast("error", message),
    [showToast],
  );
  const notifySuccess = useCallback(
    (message: string) => showToast("success", message),
    [showToast],
  );

  const {
    snapshot,
    loading,
    refreshing,
    loadError,
    noAccount,
    loadingMore,
    refresh,
    loadMore,
  } = useAccountData({
    initialSnapshot,
    initialError,
    initialNoAccount,
    notifyError,
  });

  const { creating, createError, pending, handleStart, handleOperation } =
    useAccountActions({ refresh, notifySuccess, notifyError, noAccount });

  // Callbacks por operação estáveis: evitam recriar closures no JSX e
  // invalidar o `memo` dos forms a cada render do Dashboard.
  const submitDeposit = useCallback(
    (amount: number, description: string): Promise<boolean> =>
      handleOperation("deposit", amount, description),
    [handleOperation],
  );
  const submitWithdraw = useCallback(
    (amount: number, description: string): Promise<boolean> =>
      handleOperation("withdraw", amount, description),
    [handleOperation],
  );

  const handleRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  const handleStartCb = useCallback(() => {
    void handleStart();
  }, [handleStart]);

  const dismissToastCb = useCallback(
    (id: number) => dismissToast(id),
    [dismissToast],
  );

  // Derivados: recalculados só quando as entradas mudam.
  const derived = useMemo(() => {
    const balance = snapshot?.balance ?? 0;
    // Forms travam no carregamento inicial, sem snapshot ou com qualquer
    // operação em voo (evita envio concorrente: duplo clique cruzado).
    const formsDisabled = loading || snapshot === null || pending !== null;
    const hasSnapshot = snapshot !== null;
    const showWelcome = noAccount && !hasSnapshot && loadError === null;
    return { balance, formsDisabled, hasSnapshot, showWelcome };
  }, [loading, loadError, noAccount, pending, snapshot]);

  return {
    snapshot,
    loading,
    refreshing,
    loadError,
    noAccount,
    loadingMore,
    creating,
    createError,
    pending: pending as OperationKind | null,
    toasts,
    ...derived,
    submitDeposit,
    submitWithdraw,
    handleRetry,
    handleLoadMore,
    handleStart: handleStartCb,
    dismissToast: dismissToastCb,
  };
}

export type DashboardViewModel = ReturnType<typeof useDashboardViewModel>;
