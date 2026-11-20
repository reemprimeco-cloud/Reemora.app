import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getWebsiteSettings } from "@/lib/data/settings";
import { getLibraryItems } from "@/lib/data/library";
import { LibraryCard } from "@/components/library-card";
import { getLang, getDict } from "@/lib/i18n/get-lang";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDict(await getLang());
  return {
    title: dict.libraryPage.metaTitle,
    description: dict.libraryPage.metaDescription,
    alternates: { canonical: "/library" },
  };
}

export const revalidate = 60;

export default async function LibraryPage() {
  const lang = await getLang();
  const [items, settings] = await Promise.all([getLibraryItems(lang), getWebsiteSettings(lang)]);
  const dict = getDict(lang);
  const t = dict.libraryPage;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 px-6 pb-[70px] pt-[150px] text-center text-white">
          <span className="mb-4.5 inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-[#cfe0f8]">{t.eyebrow}</span>
          <h1 className="mb-3 text-[30px] font-bold text-white sm:text-[46px]">{t.title}</h1>
          <p className="mx-auto max-w-[600px] text-[#c6d3ea]">{t.subtitle}</p>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            {items.length === 0 ? (
              <p className="rounded-[22px] border border-dashed border-border-c bg-surface px-6 py-16 text-center text-ink-soft">{t.empty}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <LibraryCard key={item.id} item={item} t={t} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
