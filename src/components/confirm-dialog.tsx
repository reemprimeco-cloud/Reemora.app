"use client";

import * as React from "react";
import { useCloseOnEscape } from "@/lib/use-close-on-escape";

type ConfirmState = { title: string; message: string; resolve: (value: boolean) => void };
type ConfirmFn = (message: string, title?: string) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState | null>(null);

  const confirmFn = React.useCallback<ConfirmFn>((message, title = "Are you sure?") => {
    return new Promise<boolean>((resolve) => {
      setState({ message, title, resolve });
    });
  }, []);

  function handle(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  useCloseOnEscape(() => handle(false));

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-navy-900/55 p-5"
          onClick={(e) => e.target === e.currentTarget && handle(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="w-full max-w-[400px] rounded-[22px] bg-surface p-7 shadow-2xl"
          >
            <h2 id="confirm-dialog-title" className="mb-2 text-lg font-bold">{state.title}</h2>
            <p id="confirm-dialog-message" className="mb-6 text-sm text-ink-soft">{state.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handle(false)}
                className="rounded-full border-2 border-border-c px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-blue-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handle(true)}
                autoFocus
                className="rounded-full border-2 border-transparent bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
