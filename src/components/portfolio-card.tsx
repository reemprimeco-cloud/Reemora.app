"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { PortfolioItem } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";

export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const image = item.image_url || "/images/courses/placeholder.svg";
  const hasLink = Boolean(item.project_url);
  const { dict } = useLanguage();

  const CardBody = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-border-c bg-surface transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-blue-100">
        {item.category && (
          <span className="absolute left-3.5 top-3.5 z-10 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-600 shadow-sm">
            {item.category}
          </span>
        )}
        {hasLink && (
          <span className="absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-white shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
        )}
        <Image
          src={image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5.5">
        <h3 className="text-[19px] font-bold text-foreground">{item.title}</h3>
        {item.description && <p className="flex-1 text-sm text-ink-soft">{item.description}</p>}
        {hasLink && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
            {dict.portfolio.visitSite} <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );

  if (!hasLink) return CardBody;

  return (
    <a
      href={item.project_url!}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={interpolate(dict.portfolio.openInNewTab, { title: item.title })}
      className="block h-full"
    >
      {CardBody}
    </a>
  );
}
