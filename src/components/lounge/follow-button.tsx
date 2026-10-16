"use client";

import * as React from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

export function FollowButton({ userId, initialFollowing, initialCount }: { userId: string; initialFollowing: boolean; initialCount: number }) {
  const { dict } = useLanguage();
  const t = dict.lounge.profile;
  const { showToast } = useToast();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [count, setCount] = React.useState(initialCount);
  const [busy, setBusy] = React.useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch("/api/lounge/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, follow: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFollowing(data.following);
      setCount(data.followersCount);
    } catch (err) {
      setFollowing(!next);
      setCount(initialCount);
      showToast("error", err instanceof Error && err.message ? err.message : dict.lounge.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60",
        following ? "border-border-c bg-surface text-foreground hover:border-red-300 hover:text-red-500" : "border-transparent bg-blue-500 text-white hover:bg-navy-800"
      )}
    >
      {following ? <UserCheck size={15} aria-hidden="true" /> : <UserPlus size={15} aria-hidden="true" />}
      {following ? t.unfollow : t.follow}
      <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">{count}</span>
    </button>
  );
}
