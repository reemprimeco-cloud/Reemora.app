"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Course detail hero image with an optional thumbnail strip underneath.
 *  Clicking a thumbnail swaps the main image. Falls back to a single,
 *  non-interactive image when there's nothing else to preview. */
export function CourseGallery({ images, alt }: { images: string[]; alt: string }) {
  const [selected, setSelected] = React.useState(0);
  const safeImages = images.length ? images : ["/images/courses/placeholder.svg"];
  const current = safeImages[Math.min(selected, safeImages.length - 1)];

  return (
    <div className="mb-7.5">
      <div className="relative aspect-square overflow-hidden rounded-[22px] shadow-lg">
        <Image src={current} alt={alt} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
      </div>
      {safeImages.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {safeImages.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`Show image ${i + 1} of ${safeImages.length}`}
              aria-current={i === selected}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition",
                i === selected ? "border-blue-500" : "border-border-c hover:border-blue-300"
              )}
            >
              <Image src={img} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
