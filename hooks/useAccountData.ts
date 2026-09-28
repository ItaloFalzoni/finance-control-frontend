"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  getAccount,
  type AccountSnapshot,
} from "@/lib/api";

interface UseAccountDataParams {
  initialSnapshot: AccountSnapshot | null;
  initialError: string | null;
  initialNoAccount: boolean;
  /** Usado para sinalizar erro de "Ver mais" sem derrubar o snapshot. */
  notifyError: (message: string) => void;
}

function toErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE;
}

/** Mescla páginas preservando a ordem de inserção e sem duplicar ids. */
function mergeTransactions(
  base: AccountSnapshot["transactions"],
  extra: AccountSnapshot["transactions"],
): AccountSnapshot["transactions"] {
  const merged = new Map(base.map((t) => [t.id, t]));
  for (const t of extra) merged.set(t.id, t);
  return [...merged.values()];
}

/**
 * Query da conta: snapshot, carga inicial, refresh silencioso e paginação.
 * Mantém o snapshot anterior visível em caso de erro (só o banner muda).
 */
export function useAccountData({
  initialSnapshot,
  initialError,
  initialNoAccount,
  notifyError,
}: UseAccountDataParams) {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(
    initialSnapshot === null && !initialNoAccount && initialError === null,
  );
  // Refresh silencioso pós-operação: não pisca skeleton nem trava os forms.
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [noAccount, setNoAccount] = useState(initialNoAccount);
  const [loadingMore, setLoadingMore] = useState(false);

  // Carga inicial no cliente só quando o SSR não entregou nada decidível.
  useEffect(() => {
    if (initialSnapshot !== null || initialNoAccount || initialError !== null) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getAccount();
        if (cancelled) return;
        setSnapshot(data);
        setLoadError(null);
        setNoAccount(false);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNoAccount(true);
          setSnapshot(null);
          setLoadError(null);
        } else {
          setLoadError(toErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSnapshot, initialNoAccount, initialError]);

  const snapshotPage = snapshot?.page ?? 1;
  const snapshotPageSize = snapshot?.pageSize ?? 50;

  /** Recarrega as páginas já visitadas para não perder o "Ver mais". */
  const refresh = useCallback(async (): Promise<boolean> => {
    setRefreshing(true);
    try {
      const first = await getAccount(1, snapshotPageSize);
      const merged = new Map(first.transactions.map((t) => [t.id, t]));
      for (let p = 2; p <= snapshotPage; p++) {
        const next = await getAccount(p, snapshotPageSize);
        for (const t of next.transactions) merged.set(t.id, t);
      }
      setSnapshot({
        ...first,
        transactions: [...merged.values()],
        page: snapshotPage,
      });
      setLoadError(null);
      setNoAccount(false);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNoAccount(true);
        setSnapshot(null);
        setLoadError(null);
        return false;
      }
      setLoadError(toErrorMessage(err));
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [snapshotPage, snapshotPageSize]);

  /** Anexa a próxima página do extrato (botão "Ver mais"). */
  const loadMore = useCallback(async (): Promise<void> => {
    if (snapshot === null || loadingMore) return;
    if (snapshot.transactions.length >= snapshot.totalCount) return;
    const base = snapshot;
    setLoadingMore(true);
    try {
      const next = await getAccount(base.page + 1, base.pageSize);
      setSnapshot({
        ...next,
        balance: next.balance,
        transactions: mergeTransactions(base.transactions, next.transactions),
      });
    } catch (err) {
      notifyError(toErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, notifyError, snapshot]);

  return {
    snapshot,
    loading,
    refreshing,
    loadError,
    noAccount,
    loadingMore,
    refresh,
    loadMore,
  };
}
