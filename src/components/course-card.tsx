"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, CalendarDays, Users } from "lucide-react";
import type { CourseWithRelations } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { courseImageSrc, formatDuration, primarySchedule } from "@/lib/course-utils";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";

const LEVEL_KEY: Record<string, "beginner" | "intermediate" | "advanced"> = {
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
};

export function CourseCard({ course }: { course: CourseWithRelations }) {
  const image = courseImageSrc(course);
  const schedule = primarySchedule(course);
  const { dict, lang } = useLanguage();
  const levelKey = LEVEL_KEY[course.level];
  const levelLabel = levelKey ? dict.coursesPage[levelKey] : course.level;

  return (
    <div className="group flex flex-col overflow-hidden rounded-[22px] border border-border-c bg-surface transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-blue-100">
        <span className="absolute left-3.5 top-3.5 z-10 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-600 shadow-sm">
          {levelLabel}
        </span>
        <span className="absolute right-3.5 top-3.5 z-10 rounded-full bg-navy-800 px-3.5 py-1.5 text-[13px] font-bold text-white">
          {formatMoney(course.price, course.currency)}
        </span>
        <Image
          src={image}
          alt={course.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5.5">
        <div className="flex flex-wrap gap-3.5 text-[12.5px] font-semibold text-ink-soft">
          <span className="flex items-center gap-1.5">
            <Clock size={13} /> {formatDuration(course.duration_days ?? 0, course.duration_hours ?? 0, {
              day: dict.courseCard.day,
              days: dict.courseCard.days,
              hour: dict.courseCard.hour,
              hours: dict.courseCard.hours,
              tba: dict.courseCard.tba,
            })}
          </span>
          {schedule && (
            <>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} /> {formatDate(schedule.start_date, lang)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} /> {interpolate(dict.courseCard.seatsTemplate, { available: schedule.seats_available, total: schedule.seats_total })}
              </span>
            </>
          )}
        </div>
        <h3 className="text-[19px] font-bold text-foreground">{course.title}</h3>
        <p className="flex-1 text-sm text-ink-soft">{course.short_description}</p>
        <div className="mt-2 flex gap-2.5">
          <Link
            href={`/courses/${course.slug}`}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-full border-2 border-border-c px-4 py-2.5 text-center text-sm font-semibold text-foreground transition active:scale-[0.98] hover:border-blue-400 hover:text-blue-600"
          >
            {dict.courseCard.details}
          </Link>
          {course.registration_open ? (
            <Link
              href={`/register/${course.slug}`}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-full border-2 border-transparent bg-blue-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800"
            >
              {dict.courseCard.register}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="flex min-h-[44px] flex-1 cursor-not-allowed items-center justify-center rounded-full border-2 border-border-c bg-surface-alt px-4 py-2.5 text-center text-sm font-semibold text-ink-soft"
            >
              {dict.courseCard.registrationLocked}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
