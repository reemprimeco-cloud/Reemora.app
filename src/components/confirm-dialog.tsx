"use client";

import * as React from "react";
import { useCloseOnEscape } from "@/lib/use-close-on-escape";

type ConfirmOptions = { confirmLabel?: string; destructive?: boolean };
type ConfirmState = { title: string; message: string; confirmLabel: string; destructive: boolean; resolve: (value: boolean) => void };
type ConfirmFn = (message: string, title?: string, options?: ConfirmOptions) => Promise<boolean>;

const DEFAULT_TITLE = "Are you sure?";
const DESTRUCTIVE = /delete|remove|suspend|revoke|reject|hide|withdraw|حذف|إزالة|سحب|إيقاف/i;

/** The confirm button says what it does: an explicit label, else the
 *  dialog's own title ("Send invitations", "Suspend member"), else
 *  "Delete" for the untitled delete prompts. Red only when destructive. */
function resolveButton(title: string | undefined, options?: ConfirmOptions) {
  const confirmLabel = options?.confirmLabel ?? (title && title !== DEFAULT_TITLE ? title : "Delete");
  const destructive = options?.destructive ?? DESTRUCTIVE.test(confirmLabel);
  return { confirmLabel, destructive };
}

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState | null>(null);

  const confirmFn = React.useCallback<ConfirmFn>((message, title, options) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, title: title ?? DEFAULT_TITLE, ...resolveButton(title, options), resolve });
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
            <p id="confirm-dialog-message" className="mb-6 max-h-[50vh] overflow-y-auto whitespace-pre-line text-sm text-ink-soft">{state.message}</p>
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
                className={`rounded-full border-2 border-transparent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 ${state.destructive ? "bg-red-500" : "bg-blue-500"}`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
