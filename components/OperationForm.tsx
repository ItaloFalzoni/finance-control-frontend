"use client";

import { memo } from "react";
import type { OperationKind } from "@/lib/api";
import { useOperationFormViewModel } from "@/hooks/useOperationFormViewModel";

interface OperationFormProps {
  kind: OperationKind;
  /** Saldo em centavos. */
  balance: number;
  disabled: boolean;
  busy: boolean;
  /** amount em centavos. */
  onSubmit: (amount: number, description: string) => Promise<boolean>;
}

/**
 * View do formulário: só JSX + acessibilidade. Estado e validação
 * vivem em `useOperationFormViewModel`.
 */
function OperationFormView({
  kind,
  balance,
  disabled,
  busy,
  onSubmit,
}: OperationFormProps) {
  const vm = useOperationFormViewModel({
    kind,
    balance,
    disabled,
    busy,
    onSubmit,
  });

  return (
    <section
      aria-label={vm.config.title}
      className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-base font-semibold text-zinc-900">{vm.config.title}</h2>

      <form onSubmit={vm.handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <div>
          <label
            htmlFor={vm.amountId}
            className="mb-1 block text-sm font-medium text-zinc-600"
          >
            Valor (R$)
          </label>
          <input
            id={vm.amountId}
            name="amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0,00"
            value={vm.amount}
            disabled={vm.blocked}
            onChange={vm.handleAmountChange}
            aria-describedby={vm.formError ? vm.errorId : undefined}
            aria-invalid={vm.formError ? true : undefined}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 tabular-nums placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
          />
        </div>

        <div>
          <label
            htmlFor={vm.descriptionId}
            className="mb-1 block text-sm font-medium text-zinc-600"
          >
            Descrição
          </label>
          <input
            id={vm.descriptionId}
            name="description"
            type="text"
            autoComplete="off"
            maxLength={500}
            placeholder={
              kind === "deposit" ? "Ex.: aporte de capital" : "Ex.: pagamento de fornecedor"
            }
            value={vm.description}
            disabled={vm.blocked}
            onChange={vm.handleDescriptionChange}
            aria-describedby={vm.formError ? vm.errorId : undefined}
            aria-invalid={vm.formError ? true : undefined}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
          />
        </div>

        {vm.formError && (
          <p id={vm.errorId} role="alert" className="text-sm font-medium text-rose-700">
            {vm.formError}
          </p>
        )}

        <button
          type="submit"
          disabled={vm.blocked}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {busy ? vm.config.busyLabel : vm.config.submitLabel}
        </button>
      </form>
    </section>
  );
}

const OperationForm = memo(OperationFormView);
export default OperationForm;
