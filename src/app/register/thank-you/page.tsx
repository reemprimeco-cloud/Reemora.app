import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getWebsiteSettings } from "@/lib/data/settings";
import { getLang, getDict } from "@/lib/i18n/get-lang";

export const metadata: Metadata = {
  title: "Thank You",
  robots: { index: false, follow: true },
};

interface Props {
  searchParams: Promise<{ course?: string; total?: string; ref?: string }>;
}

export default async function RegisterThankYouPage({ searchParams }: Props) {
  const [lang, settings, params] = await Promise.all([getLang(), getWebsiteSettings(), searchParams]);
  const dict = getDict(lang);
  const t = dict.thankYouPage;

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[560px] px-6">
          <div className="rounded-[22px] border border-green-200 bg-green-50 p-7 text-center dark:border-green-900 dark:bg-green-950 sm:p-10">
            <CheckCircle2 className="mx-auto mb-4 text-green-600 dark:text-green-400" size={44} aria-hidden="true" />
            <h1 className="mb-3 text-[26px] font-bold text-green-700 dark:text-green-300 sm:text-3xl">{t.title}</h1>
            <p className="mb-6 text-[15px] text-green-700 dark:text-green-300">{t.whatsappBody}</p>

            {(params.course || params.total || params.ref) && (
              <div className="mb-6 space-y-2 rounded-xl border border-green-200 bg-surface p-4 text-start dark:border-green-900">
                {params.course && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-soft">{t.course}</span>
                    <span className="font-semibold text-foreground">{params.course}</span>
                  </div>
                )}
                {params.total && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-soft">{t.total}</span>
                    <span className="font-semibold text-foreground">{params.total}</span>
                  </div>
                )}
                {params.ref && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-soft">{t.referenceLabel}</span>
                    <span className="font-mono font-semibold text-foreground">{params.ref}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/courses"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-blue-500 px-7 py-3 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800"
              >
                {t.browseCourses}
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-border-c bg-surface px-7 py-3 text-[15px] font-semibold text-foreground transition active:scale-[0.98] hover:border-blue-400 hover:text-blue-600"
              >
                {t.backHome}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
