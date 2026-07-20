"use client";

import * as React from "react";
import { Search } from "lucide-react";
import type { CourseWithRelations } from "@/lib/types";
import { CourseCard } from "@/components/course-card";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";

export function CourseCatalog({ courses }: { courses: CourseWithRelations[] }) {
  const [term, setTerm] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [level, setLevel] = React.useState("");
  const { dict } = useLanguage();

  const categories = React.useMemo(
    () => Array.from(new Set(courses.map((c) => c.category?.name).filter((n): n is string => Boolean(n)))).sort(),
    [courses]
  );

  const filtered = courses.filter((c) => {
    const q = term.trim().toLowerCase();
    const categoryName = c.category?.name ?? "";
    const matchesTerm =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.short_description.toLowerCase().includes(q) ||
      categoryName.toLowerCase().includes(q);
    const matchesCategory = !category || categoryName === category;
    const matchesLevel = !level || c.level === level;
    return matchesTerm && matchesCategory && matchesLevel;
  });

  const foundText =
    filtered.length === 1
      ? interpolate(dict.coursesPage.coursesFoundOne, { n: filtered.length })
      : interpolate(dict.coursesPage.coursesFoundMany, { n: filtered.length });

  return (
    <>
      <div className="relative z-10 -mt-[46px] mb-12 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-border-c bg-surface p-4.5 shadow-lg">
        <div className="flex flex-1 flex-wrap gap-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              placeholder={dict.coursesPage.search}
              aria-label={dict.coursesPage.searchLabel}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-full border border-border-c bg-surface-alt py-3 pl-10 pr-4 text-[15px] text-foreground outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={dict.coursesPage.filterCategory}
            className="min-h-[44px] min-w-[150px] rounded-full border border-border-c bg-surface-alt px-4 py-2.5 text-[15px] text-foreground outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
          >
            <option value="">{dict.coursesPage.allCategories}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label={dict.coursesPage.filterLevel}
            className="min-h-[44px] min-w-[150px] rounded-full border border-border-c bg-surface-alt px-4 py-2.5 text-[15px] text-foreground outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
          >
            <option value="">{dict.coursesPage.allLevels}</option>
            <option value="Beginner">{dict.coursesPage.beginner}</option>
            <option value="Intermediate">{dict.coursesPage.intermediate}</option>
            <option value="Advanced">{dict.coursesPage.advanced}</option>
          </select>
        </div>
        <span className="text-[13.5px] font-semibold text-ink-soft">{foundText}</span>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-ink-soft">{dict.coursesPage.empty}</div>
      )}
    </>
  );
}
