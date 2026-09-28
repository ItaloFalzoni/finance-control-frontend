"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastData } from "@/components/Toast";

const MAX_TOASTS = 3;
const TOAST_TTL_MS = 6000;

/**
 * Fila de toasts com auto-dismiss. Dono dos timers — o chamador só
 * recebe `toasts`, `showToast` e `dismissToast` estáveis.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const seq = useRef(0);

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (kind: ToastData["kind"], message: string) => {
      seq.current += 1;
      const id = seq.current;
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, kind, message }]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, TOAST_TTL_MS);
      timers.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((t) => clearTimeout(t));
      active.clear();
    };
  }, []);

  return { toasts, showToast, dismissToast };
}
