"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

export function SignOutButton() {
  const router = useRouter();
  const { dict } = useLanguage();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/lounge");
    router.refresh();
  }
  return (
    <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-border-c bg-surface px-5 py-2.5 text-sm font-semibold transition hover:border-red-300 hover:text-red-500">
      <LogOut size={15} aria-hidden="true" /> {dict.lounge.settings.signOut}
    </button>
  );
}
