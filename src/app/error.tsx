"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <Image src="/images/logo.png" alt="Reemora logo" width={120} height={30} className="h-7 w-auto dark:brightness-0 dark:invert" />
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-ink-soft">
        We hit an unexpected error loading this page. You can try again, or head back to the homepage.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full border-2 border-transparent bg-blue-500 px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-navy-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border-2 border-border-c px-7 py-3 text-[15px] font-semibold text-foreground transition hover:border-blue-400 hover:text-blue-600"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
