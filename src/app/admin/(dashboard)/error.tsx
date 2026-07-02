"use client";

import * as React from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Admin panel error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-ink-soft">
        This section couldn&apos;t load. This is often temporary — try again in a moment.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        Try again
      </button>
    </div>
  );
}
