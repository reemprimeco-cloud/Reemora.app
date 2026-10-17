"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** A password field with a show/hide toggle. The toggle is a 44px target
 *  that never submits the form, and the field itself keeps every prop a
 *  plain input takes (autoComplete, minLength, placeholder, aria-*). */
export function PasswordInput({
  className,
  showLabel = "Show password",
  hideLabel = "Hide password",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { showLabel?: string; hideLabel?: string }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={cn(className, "pe-12")} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        title={visible ? hideLabel : showLabel}
        className="absolute end-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/30"
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
