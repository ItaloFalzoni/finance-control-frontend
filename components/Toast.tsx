"use client";

import { memo } from "react";

export interface ToastData {
  id: number;
  kind: "success" | "error";
  message: string;
}

function ToastView({
  toast,
  onClose,
}: {
  toast: ToastData | null;
  onClose: () => void;
}) {
  if (!toast) return null;

  const accent =
    toast.kind === "success" ? "border-l-emerald-500" : "border-l-rose-500";

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      className={`flex items-start justify-between gap-4 rounded-lg border border-l-4 border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 ${accent}`}
    >
      <p>{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar mensagem"
        className="cursor-pointer rounded p-2 -m-2 min-h-6 min-w-6 text-xs font-medium text-zinc-500 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none"
      >
        Fechar
      </button>
    </div>
  );
}

const Toast = memo(ToastView);
export default Toast;
