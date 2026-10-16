import Link from "next/link";
import { Rocket, MessagesSquare, Trophy, Swords } from "lucide-react";
import type { LoungeDict } from "@/lib/i18n/lounge-dict";

/** Public pitch for the Lounge, shown to signed-out visitors. */
export function LoungeLanding({ dict }: { dict: LoungeDict }) {
  const t = dict.landing;
  const features = [
    { icon: Rocket, title: t.feature1Title, desc: t.feature1Desc },
    { icon: MessagesSquare, title: t.feature2Title, desc: t.feature2Desc },
    { icon: Trophy, title: t.feature3Title, desc: t.feature3Desc },
    { icon: Swords, title: t.feature4Title, desc: t.feature4Desc },
  ];

  return (
    <div>
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 px-6 py-14 text-center text-white sm:px-10 sm:py-20">
        <div className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl animate-float" aria-hidden="true" />
        <span className="mb-4.5 inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-[#cfe0f8]">
          {t.eyebrow}
        </span>
        <h1 className="mx-auto mb-4 max-w-[720px] text-[30px] font-bold leading-tight text-white sm:text-[46px]">{t.title}</h1>
        <p className="mx-auto mb-8 max-w-[600px] text-[15.5px] text-[#c6d3ea] sm:text-[17px]">{t.subtitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/lounge/join" className="rounded-full border-2 border-transparent bg-white px-7 py-3.5 text-[15px] font-semibold text-navy-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100">
            {t.joinCta}
          </Link>
          <Link href="/lounge/login" className="rounded-full border-2 border-white/60 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10">
            {t.loginCta}
          </Link>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border-c bg-surface p-6">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <f.icon size={20} aria-hidden="true" />
            </span>
            <h2 className="mb-1.5 text-[16px] font-bold">{f.title}</h2>
            <p className="text-sm leading-relaxed text-ink-soft">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
