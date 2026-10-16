/** Instant skeleton while a Lounge page renders on the server. Next.js
 *  prefetches this boundary for every tab link, so switching tabs paints
 *  immediately instead of waiting for the data round trip. */
export default function LoungeLoading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-surface" />
      <div className="h-4 w-72 max-w-full rounded bg-surface" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border-c bg-surface p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-surface-alt" />
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-surface-alt" />
              <div className="h-2.5 w-20 rounded bg-surface-alt" />
            </div>
          </div>
          <div className="h-44 w-full rounded-xl bg-surface-alt" />
          <div className="mt-4 h-3 w-3/4 rounded bg-surface-alt" />
          <div className="mt-2 h-3 w-1/2 rounded bg-surface-alt" />
        </div>
      ))}
    </div>
  );
}
