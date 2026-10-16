import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLoungeViewer } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { ProfileEditor } from "@/components/lounge/profile-editor";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "My Profile" };

export default async function LoungeMePage() {
  const [viewer, lang] = await Promise.all([getLoungeViewer(), getLang()]);
  if (!viewer.user) redirect("/lounge/login?next=/lounge/me");
  if (!viewer.member) redirect("/lounge/join");
  const t = getDict(lang).lounge.profile;

  const supabase = await createClient();
  const { data: me } = await supabase.from("users").select("email, phone").eq("id", viewer.user.id).maybeSingle();

  return (
    <div>
      <PageHeader
        title={t.editTitle}
        subtitle={t.editSubtitle}
        action={
          viewer.isApproved ? (
            <Link href={`/lounge/members/${viewer.user.id}`} className="rounded-full border border-border-c bg-surface px-4 py-2 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600">
              {t.postsBy} →
            </Link>
          ) : null
        }
      />
      <ProfileEditor member={viewer.member} email={me?.email ?? null} phone={me?.phone ?? null} />
    </div>
  );
}
