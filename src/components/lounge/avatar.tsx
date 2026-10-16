import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/lounge/utils";

const SIZES = { xs: "h-7 w-7 text-[11px]", sm: "h-9 w-9 text-xs", md: "h-12 w-12 text-sm", lg: "h-20 w-20 text-xl", xl: "h-28 w-28 text-3xl" };

/** Member avatar: uploaded picture, or initials on the brand gradient.
 *  Plain <img> rather than next/image so any Supabase public URL works
 *  without remotePatterns churn. */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} loading="lazy" className={cn("shrink-0 rounded-full object-cover ring-2 ring-surface", SIZES[size], className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy-800 to-blue-500 font-bold text-white ring-2 ring-surface",
        SIZES[size],
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
