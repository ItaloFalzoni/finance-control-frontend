"use client";

import { memo } from "react";

interface WelcomeScreenProps {
  pending: boolean;
  error: string | null;
  onStart: () => void;
}

/**
 * First-run: banco vazio, nenhuma conta ainda. Somente o botão central
 * (fundo branco, botão preto), com loading e erro controlados pelo pai.
 */
function WelcomeScreenView({ pending, error, onStart }: WelcomeScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 px-4">
        {error ? (
          <p role="alert" className="text-sm font-medium text-rose-600">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onStart}
          disabled={pending}
          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {pending ? "Criando conta…" : "Começar"}
        </button>
      </div>
    </div>
  );
}

const WelcomeScreen = memo(WelcomeScreenView);
export default WelcomeScreen;
