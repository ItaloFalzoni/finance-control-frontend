import { memo, useMemo } from "react";
import type { Transaction } from "@/lib/api";
import { isCredit, toAmount } from "@/lib/api";
import { formatCentsBRL, formatDateTime } from "@/lib/format";

interface HistoryListProps {
  transactions: Transaction[];
  loading: boolean;
  /** Total no backend; quando > transactions.length mostra "Ver mais". */
  totalCount?: number;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
      <div className="ml-auto h-4 w-24 animate-pulse rounded bg-zinc-100" />
    </li>
  );
}

interface RowProps {
  transaction: Transaction;
}

function TransactionRowView({ transaction: t }: RowProps) {
  const credit = isCredit(t);
  const value = toAmount(t);
  const when = formatDateTime(t.createdAt);

  return (
    <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">
          {t.description}
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {when} · {credit ? "Entrada" : "Saída"}
        </p>
      </div>

      <p
        className={`shrink-0 text-sm font-medium tabular-nums ${
          credit ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {credit ? "+" : "-"}
        {formatCentsBRL(value).replace("-", "")}
      </p>
    </li>
  );
}

const TransactionRow = memo(TransactionRowView);

function HistoryListView({
  transactions,
  loading,
  totalCount,
  loadingMore = false,
  onLoadMore,
}: HistoryListProps) {
  const { hasMore, remaining } = useMemo(() => {
    const has =
      onLoadMore !== undefined &&
      totalCount !== undefined &&
      transactions.length < totalCount;
    return { hasMore: has, remaining: (totalCount ?? 0) - transactions.length };
  }, [onLoadMore, totalCount, transactions.length]);

  return (
    <section
      aria-label="Histórico de movimentações"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">
          Histórico de movimentações
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Da mais recente para a mais antiga.
        </p>
      </div>

      {loading ? (
        <ul role="status" aria-label="Carregando histórico" className="divide-y divide-zinc-100">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ul>
      ) : transactions.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">
          Nenhuma movimentação registrada ainda. Faça um depósito ou um saque
          para ver o histórico aqui.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-zinc-100">
            {transactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </ul>
          {hasMore && (
            <div className="border-t border-zinc-100 px-5 py-3">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Carregando…" : `Ver mais (${remaining} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const HistoryList = memo(HistoryListView);
export default HistoryList;
