"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { Avatar } from "@/components/lounge/avatar";
import { AwardBadges, type AwardBadge } from "@/components/lounge/award-badge";
import { memberHref } from "@/lib/lounge/utils";
import { cn } from "@/lib/utils";

export interface DirectoryMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  points_total: number;
  followers_count: number;
  created_at: string;
  badges: AwardBadge[];
}

export function MembersDirectory({ members }: { members: DirectoryMember[] }) {
  const { dict } = useLanguage();
  const t = dict.lounge.members;
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"points" | "newest">("points");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members.filter((m) => !q || m.display_name.toLowerCase().includes(q) || m.skills.some((s) => s.toLowerCase().includes(q)));
    return list.sort((a, b) => (sort === "points" ? b.points_total - a.points_total : b.created_at.localeCompare(a.created_at)));
  }, [members, query, sort]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute top-1/2 ms-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="w-full rounded-full border border-border-c bg-surface py-2.5 pe-4 ps-10 text-sm outline-none focus:border-blue-400" />
        </label>
        <div className="flex gap-1 rounded-full border border-border-c bg-surface p-1">
          {(["points", "newest"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSort(s)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold transition", sort === s ? "bg-blue-100 text-blue-600" : "text-ink-soft hover:text-foreground")}>
              {s === "points" ? t.sortPoints : t.sortNewest}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border-c bg-surface p-8 text-center text-ink-soft">{t.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.user_id} href={memberHref(m.user_id)} className="flex gap-3.5 rounded-2xl border border-border-c bg-surface p-4 transition hover:-translate-y-0.5 hover:border-blue-400">
              <Avatar name={m.display_name} src={m.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-[15px] font-bold">{m.display_name}</span>
                  <AwardBadges badges={m.badges} size="xs" />
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{m.bio || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.skills.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-600">{s}</span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  {m.points_total} {dict.lounge.profile.points} · {m.followers_count} {dict.lounge.profile.followers}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
