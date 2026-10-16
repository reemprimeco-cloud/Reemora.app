import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Blue check shown next to the names of official / certified members.
 *  `label` is what the admin set ("Reemora Team", "Certified Trainer"). */
export function VerifiedBadge({ verified, label, size = "sm", showLabel = false, className }: { verified: boolean | null | undefined; label?: string | null; size?: "xs" | "sm" | "md"; showLabel?: boolean; className?: string }) {
  if (!verified) return null;
  const text = label || "Verified";
  const px = size === "xs" ? 13 : size === "sm" ? 15 : 20;
  return (
    <span
      title={text}
      aria-label={text}
      className={cn("inline-flex shrink-0 items-center gap-1 align-middle text-blue-500", showLabel && "rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-600", className)}
    >
      <BadgeCheck size={px} className="fill-blue-500 text-white" aria-hidden="true" />
      {showLabel && text}
    </span>
  );
}
