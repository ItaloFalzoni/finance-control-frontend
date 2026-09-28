"use client";

import { memo } from "react";
import BalanceCard from "@/components/BalanceCard";
import HistoryList from "@/components/HistoryList";
import OperationForm from "@/components/OperationForm";
import Toast from "@/components/Toast";
import WelcomeScreen from "@/components/WelcomeScreen";
import { useDashboardViewModel } from "@/hooks/useDashboardViewModel";
import type { AccountSnapshot } from "@/lib/api";

interface DashboardProps {
  initialSnapshot: AccountSnapshot | null;
  initialError: string | null;
  initialNoAccount: boolean;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-rose-200 border-l-4 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-medium text-zinc-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Tentar novamente
      </button>
    </div>
  );
}

const MemoErrorBanner = memo(ErrorBanner);

/**
 * View do Dashboard: só composição JSX. Todo estado e efeito colateral
 * vivem em `useDashboardViewModel` (toasts + query + ações).
 */
export default function Dashboard({
  initialSnapshot,
  initialError,
  initialNoAccount,
}: DashboardProps) {
  const vm = useDashboardViewModel({
    initialSnapshot,
    initialError,
    initialNoAccount,
  });

  if (vm.showWelcome) {
    return (
      <WelcomeScreen
        pending={vm.creating}
        error={vm.createError}
        onStart={vm.handleStart}
      />
    );
  }

  return (
    <div className="min-h-full bg-white" aria-busy={vm.refreshing || undefined}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Conta empresarial
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Saldo, depósitos, saques e histórico em uma só tela.
          </p>
        </header>

        <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
          {vm.toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={() => vm.dismissToast(t.id)} />
          ))}
        </div>

        {vm.loadError && (
          <MemoErrorBanner message={vm.loadError} onRetry={vm.handleRetry} />
        )}

        {vm.hasSnapshot || vm.loading ? (
          <>
            <BalanceCard
              balance={vm.snapshot?.balance ?? null}
              loading={vm.loading}
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <OperationForm
                kind="deposit"
                balance={vm.balance}
                disabled={vm.formsDisabled}
                busy={vm.pending === "deposit"}
                onSubmit={vm.submitDeposit}
              />
              <OperationForm
                kind="withdraw"
                balance={vm.balance}
                disabled={vm.formsDisabled}
                busy={vm.pending === "withdraw"}
                onSubmit={vm.submitWithdraw}
              />
            </div>

            <HistoryList
              transactions={vm.snapshot?.transactions ?? []}
              loading={vm.loading}
              totalCount={vm.snapshot?.totalCount}
              loadingMore={vm.loadingMore}
              onLoadMore={vm.handleLoadMore}
            />
          </>
        ) : (
          !vm.loadError && (
            <p className="py-10 text-center text-sm text-zinc-500">
              Nenhum dado para exibir.
            </p>
          )
        )}
      </div>
    </div>
  );
}
