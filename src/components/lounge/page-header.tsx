import * as React from "react";

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="mb-3 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider text-blue-600">{eyebrow}</span>
        )}
        <h1 className="text-[26px] font-bold leading-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-[620px] text-[15px] text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
