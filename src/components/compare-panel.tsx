"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared pieces for the homepage "old way vs prompt" comparisons: a
 *  panel with a header, footer row, optional progress bar and chips, and
 *  a Block that eases content in when `show` turns true. */

export function Panel({
  icon: Icon,
  title,
  hint,
  tone,
  footer,
  progress,
  chips,
  children,
}: {
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" }>;
  title: string;
  hint: string;
  tone: "code" | "prompt";
  footer: React.ReactNode;
  progress?: { value: number; label: string };
  chips?: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-[22px] border border-border-c bg-surface p-4 text-foreground sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone === "code" ? "bg-surface-alt text-ink-soft" : "bg-blue-100 text-blue-600"
          )}
          aria-hidden="true"
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-bold leading-tight">{title}</p>
          <p className="truncate text-[12.5px] text-ink-soft">{hint}</p>
        </div>
      </div>
      {children}
      <div className="mt-4 flex items-center gap-2">{footer}</div>
      {progress && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt" aria-hidden="true">
            <div className="h-full rounded-full bg-amber-400 transition-[width] duration-300" style={{ width: `${progress.value}%` }} />
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-soft">{progress.label}</p>
        </div>
      )}
      {chips && (
        <div className="mt-3 flex min-h-[28px] flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span
              key={c}
              className="rounded-full bg-surface-alt px-2.5 py-1 text-[11.5px] font-semibold text-ink-soft animate-fade-up"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Block({ show, className, children }: { show: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "transition-all duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none",
        show ? "translate-y-0 opacity-100 blur-0" : "translate-y-2 opacity-0 blur-[3px]",
        className
      )}
    >
      {children}
    </div>
  );
}
