import Link from "next/link";
import { Clock, XCircle, Ban, MailCheck } from "lucide-react";
import type { LoungeDict } from "@/lib/i18n/lounge-dict";
import type { LoungeMemberStatus } from "@/lib/supabase/lounge.types";
import { cn } from "@/lib/utils";

const STYLES: Record<string, { icon: typeof Clock; tone: string }> = {
  pending: { icon: Clock, tone: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  rejected: { icon: XCircle, tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" },
  suspended: { icon: Ban, tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" },
  unconfirmed: { icon: MailCheck, tone: "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300" },
};

/** Shown on /lounge to anyone signed in without approved access. */
export function StatusCard({ status, dict }: { status: Exclude<LoungeMemberStatus, "approved"> | "unconfirmed"; dict: LoungeDict }) {
  const t = dict.status;
  const copy = {
    pending: [t.pendingTitle, t.pendingBody],
    rejected: [t.rejectedTitle, t.rejectedBody],
    suspended: [t.suspendedTitle, t.suspendedBody],
    unconfirmed: [t.emailUnconfirmedTitle, t.emailUnconfirmedBody],
  }[status];
  const { icon: Icon, tone } = STYLES[status];

  return (
    <div className="mx-auto max-w-[560px]">
      <div className={cn("rounded-[22px] border p-7 text-center sm:p-10", tone)}>
        <Icon className="mx-auto mb-4" size={44} aria-hidden="true" />
        <h1 className="mb-3 text-[26px] font-bold sm:text-3xl">{copy[0]}</h1>
        <p className="mb-6 text-[15px] leading-relaxed">{copy[1]}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="rounded-full border-2 border-current px-5 py-2.5 text-sm font-semibold transition hover:opacity-80">
            {t.contact}
          </Link>
          <Link href="/" className="rounded-full px-5 py-2.5 text-sm font-semibold underline-offset-4 hover:underline">
            {t.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
