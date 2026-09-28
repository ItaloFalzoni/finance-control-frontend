"use client";

import { memo } from "react";

interface WelcomeScreenProps {
  pending: boolean;
  error: string | null;
  onStart: () => void;
}

/**
 * First-run: banco vazio, nenhuma conta ainda. Título + explicação para
 * contexto (a11y/UX) e botão central, com loading e erro controlados pelo pai.
 */
function WelcomeScreenView({ pending, error, onStart }: WelcomeScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex max-w-sm flex-col items-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Conta empresarial
        </h1>
        <p className="text-sm text-zinc-500">
          Crie a conta única para registrar depósitos, saques e ver o histórico.
        </p>
        {error ? (
          <p role="alert" className="text-sm font-medium text-rose-600">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onStart}
          disabled={pending}
          aria-busy={pending || undefined}
          className="mt-1 inline-flex cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {pending ? "Criando conta…" : "Começar"}
        </button>
      </div>
    </div>
  );
}

const WelcomeScreen = memo(WelcomeScreenView);
export default WelcomeScreen;
