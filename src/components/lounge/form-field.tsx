import * as React from "react";
import { cn } from "@/lib/utils";

/** Same input styling the registration and contact forms use, so Lounge
 *  forms look native. */
export function inputClass(error?: boolean, extra?: string) {
  return cn(
    "block w-full rounded-xl border bg-surface-alt px-4 py-3 text-[15px] outline-none transition focus:bg-surface focus:ring-4 focus:ring-blue-400/15",
    error ? "border-red-400" : "border-border-c focus:border-blue-400",
    extra
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export function Banner({ type, children }: { type: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 rounded-xl border px-4.5 py-3.5 text-sm",
        type === "error" && "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
        type === "info" && "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
        type === "success" && "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
      )}
    >
      {children}
    </div>
  );
}
