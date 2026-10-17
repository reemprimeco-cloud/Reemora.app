"use client";

import * as React from "react";
import { track, toMetaValue } from "@/lib/meta";

/** Fires ViewContent once per course detail page view. The course page is
 *  a server component, so this tiny client island carries the event. */
export function MetaViewContent({
  courseId,
  courseTitle,
  price,
  currency,
}: {
  courseId: string;
  courseTitle: string;
  price: number;
  currency: string;
}) {
  const sentFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Guards against React strict-mode double effects in development.
    if (sentFor.current === courseId) return;
    sentFor.current = courseId;
    track("ViewContent", {
      content_name: courseTitle,
      content_ids: [courseId],
      content_type: "product",
      value: toMetaValue(price),
      currency: currency || "KWD",
    });
  }, [courseId, courseTitle, price, currency]);

  return null;
}
