import * as React from "react";
import Image from "next/image";
import { Download, FileText } from "lucide-react";
import type { LibraryItem } from "@/lib/data/library";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatFileSize } from "@/lib/library";

/** One downloadable guide on /library: A4 cover, title, description, file
 *  facts and a download button that goes through the counting route. */
export function LibraryCard({ item, t }: { item: LibraryItem; t: Dictionary["libraryPage"] }) {
  // Separate spans so Arabic pages and Latin sizes don't reorder each other.
  const meta = [t.pdf, item.page_count ? t.pages.replace("{count}", String(item.page_count)) : null, formatFileSize(item.file_size) || null].filter((v): v is string => Boolean(v));
  const href = `/library/${encodeURIComponent(item.slug)}/download`;
  return (
    <li className="group flex flex-col overflow-hidden rounded-[22px] border border-border-c bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <a href={href} className="relative block aspect-[210/297] overflow-hidden bg-navy-900" aria-label={`${t.download}: ${item.title}`} tabIndex={-1}>
        {item.cover_url ? (
          <Image src={item.cover_url} alt="" fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 p-8 text-center text-white">
            <FileText size={44} aria-hidden="true" className="opacity-80" />
            <span className="text-lg font-bold leading-snug">{item.title}</span>
          </div>
        )}
        <span className="absolute start-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white backdrop-blur">{t.pdf}</span>
      </a>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h2 className="mb-2 text-lg font-bold leading-snug">{item.title}</h2>
        {item.description && <p className="mb-4 line-clamp-4 text-sm leading-relaxed text-ink-soft">{item.description}</p>}
        <p className="mb-4 mt-auto flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-ink-soft">
          {meta.map((part, i) => (
            <React.Fragment key={part}>
              {i > 0 && <span aria-hidden="true">·</span>}
              <bdi>{part}</bdi>
            </React.Fragment>
          ))}
        </p>
        <a
          href={href}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
          <Download size={16} aria-hidden="true" />
          {t.download}
        </a>
      </div>
    </li>
  );
}
