import { getLoungeViewer } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { LoungeLanding } from "@/components/lounge/landing";
import { StatusCard } from "@/components/lounge/status-card";
import { SiteFooter } from "@/components/site-footer";
import { getWebsiteSettings } from "@/lib/data/settings";
import { Feed } from "@/components/lounge/feed";
import { PageHeader } from "@/components/lounge/page-header";
import { loadFeedPage, loadRecentBuilders } from "@/lib/lounge/feed";
import Link from "next/link";
import { PenSquare } from "lucide-react";
import { AdminProfileSetup } from "@/components/lounge/admin-profile-setup";

interface Props {
  searchParams: Promise<{ filter?: string }>;
}

/** /lounge is three pages in one: the public pitch, a status screen for
 *  applicants without access, and the community feed for members. */
export default async function LoungeHome({ searchParams }: Props) {
  const [viewer, lang, params] = await Promise.all([getLoungeViewer(), getLang(), searchParams]);
  const dict = getDict(lang).lounge;

  if (!viewer.user) {
    const settings = await getWebsiteSettings();
    return (
      <>
        <LoungeLanding dict={dict} />
        <div className="-mx-5 mt-16 sm:-mx-6">
          <SiteFooter settings={settings} />
        </div>
      </>
    );
  }

  if (!viewer.member && viewer.isAdmin) {
    return <AdminProfileSetup />;
  }

  if (!viewer.member) {
    // Signed in (e.g. a course student) but never applied.
    return (
      <div className="mx-auto max-w-[560px] text-center">
        <LoungeLanding dict={dict} />
      </div>
    );
  }

  if (viewer.member.status !== "approved") {
    return <StatusCard status={viewer.member.status} dict={dict} />;
  }

  const filter = params.filter ?? "recent";
  const [page, builders] = await Promise.all([loadFeedPage({ filter, viewerId: viewer.user.id }), loadRecentBuilders()]);

  return (
    <div>
      <PageHeader
        title={dict.feed.title}
        subtitle={dict.feed.subtitle}
        action={
          <Link href="/lounge/new" className="inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 md:hidden">
            <PenSquare size={15} aria-hidden="true" /> {dict.nav.newPost}
          </Link>
        }
      />
      <Feed initialPosts={page.posts} initialCursor={page.nextCursor} filter={filter} viewerId={viewer.user.id} isAdmin={viewer.isAdmin} builders={builders} />
    </div>
  );
}
