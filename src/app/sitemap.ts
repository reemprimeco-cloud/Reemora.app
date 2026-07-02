import type { MetadataRoute } from "next";
import { getCourses } from "@/lib/data/courses";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://reemora.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await getCourses();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${siteUrl}/courses/${course.slug}`,
    lastModified: course.updated_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...courseRoutes];
}
