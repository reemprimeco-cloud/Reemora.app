"use client";

import * as React from "react";
import { Search } from "lucide-react";
import type { CourseWithRelations } from "@/lib/types";
import { CourseCard } from "@/components/course-card";

export function CourseCatalog({ courses }: { courses: CourseWithRelations[] }) {
  const [term, setTerm] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [level, setLevel] = React.useState("");

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

  return (
    <>
      <div className="relative z-10 -mt-[46px] mb-12 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-border-c bg-surface p-4.5 shadow-lg">
        <div className="flex flex-1 flex-wrap gap-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              placeholder="Search courses..."
              aria-label="Search courses"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-full border border-border-c bg-surface-alt py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-blue-400"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="min-w-[150px] rounded-full border border-border-c bg-surface-alt px-4 py-2.5 text-sm text-foreground outline-none focus:border-blue-400"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Filter by level"
            className="min-w-[150px] rounded-full border border-border-c bg-surface-alt px-4 py-2.5 text-sm text-foreground outline-none focus:border-blue-400"
          >
            <option value="">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
        <span className="text-[13.5px] font-semibold text-ink-soft">
          {filtered.length} course{filtered.length === 1 ? "" : "s"} found
        </span>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-ink-soft">No courses match your filters. Try adjusting your search.</div>
      )}
    </>
  );
}
