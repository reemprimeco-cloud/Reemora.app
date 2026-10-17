import { describe, expect, it } from "vitest";
import { COURSE_FIELDS, INSTRUCTOR_FIELDS, localizeRow } from "./localize";

describe("localizeRow", () => {
  const course = {
    title: "Packaging workshop",
    title_ar: "ورشة التغليف",
    short_description: "One day",
    short_description_ar: "",
    description: "Long text",
    description_ar: null,
    curriculum: ["a", "b"],
    curriculum_ar: [] as string[],
  };

  it("returns the row untouched in English", () => {
    expect(localizeRow(course, "en", COURSE_FIELDS)).toBe(course);
  });

  it("swaps only the filled Arabic twins", () => {
    const ar = localizeRow(course, "ar", COURSE_FIELDS);
    expect(ar.title).toBe("ورشة التغليف");
    expect(ar.short_description).toBe("One day");
    expect(ar.description).toBe("Long text");
    expect(ar.curriculum).toEqual(["a", "b"]);
    expect(ar.title_ar).toBe("ورشة التغليف");
  });

  it("handles jsonb arrays and text[] twins", () => {
    const row = {
      full_name: "Reem", full_name_ar: "ريم",
      title: "Trainer", title_ar: null,
      bio: "Bio", bio_ar: "   ",
      timeline: [{ date: "2012", title: "CEO", desc: "" }], timeline_ar: [{ date: "2012 – حتى الآن", title: "الرئيسة التنفيذية", desc: "" }],
      skills: ["Web"], skills_ar: [],
    };
    const ar = localizeRow(row, "ar", INSTRUCTOR_FIELDS);
    expect(ar.full_name).toBe("ريم");
    expect(ar.title).toBe("Trainer");
    expect(ar.bio).toBe("Bio");
    expect(ar.timeline[0].title).toBe("الرئيسة التنفيذية");
    expect(ar.skills).toEqual(["Web"]);
  });
});
