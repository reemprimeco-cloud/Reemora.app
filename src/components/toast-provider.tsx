"use client";

import * as React from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error";
type Toast = { id: number; type: ToastType; message: string };
type ToastContextValue = { showToast: (type: ToastType, message: string) => void };

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="fixed bottom-5 right-5 z-[2000] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "flex min-w-[280px] max-w-[360px] items-start gap-2.5 rounded-xl border bg-surface px-4 py-3.5 text-sm shadow-lg",
              t.type === "success"
                ? "border-green-200 text-green-700 dark:border-green-900 dark:text-green-300"
                : "border-red-200 text-red-600 dark:border-red-900 dark:text-red-300"
            )}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1 text-foreground">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="shrink-0 text-ink-soft hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
