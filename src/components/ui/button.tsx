import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "navy" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 whitespace-nowrap border-2 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-blue-500 text-white border-transparent shadow-sm hover:bg-navy-800 hover:-translate-y-0.5",
  outline:
    "bg-transparent text-white border-white hover:bg-white hover:text-navy-800 hover:-translate-y-0.5",
  navy: "bg-navy-800 text-white border-transparent hover:bg-blue-600 hover:-translate-y-0.5",
  ghost:
    "bg-surface text-foreground border-border-c hover:border-blue-400 hover:text-blue-600",
  danger: "bg-red-500 text-white border-transparent hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "px-4.5 py-2 text-sm",
  md: "px-7 py-3.5 text-[15px]",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}
