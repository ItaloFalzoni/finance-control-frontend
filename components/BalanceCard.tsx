import { memo } from "react";
import { formatCentsBRL } from "@/lib/format";

interface BalanceCardProps {
  /** Saldo em centavos. */
  balance: number | null;
  loading: boolean;
}

function BalanceCardView({ balance, loading }: BalanceCardProps) {
  return (
    <section
      aria-label="Saldo da conta empresarial"
      className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8"
    >
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Saldo disponível
      </p>
      {loading ? (
        <div
          role="status"
          aria-label="Carregando saldo"
          className="mt-4 h-11 w-52 animate-pulse rounded bg-zinc-100"
        />
      ) : (
        <p
          aria-live="polite"
          className="mt-2 text-4xl font-medium tracking-tight text-zinc-900 tabular-nums sm:text-5xl"
        >
          {formatCentsBRL(balance ?? 0)}
        </p>
      )}
      <p className="mt-3 text-sm text-zinc-500">
        Conta empresarial única — atualiza automaticamente após cada operação.
      </p>
    </section>
  );
}

const BalanceCard = memo(BalanceCardView);
export default BalanceCard;
