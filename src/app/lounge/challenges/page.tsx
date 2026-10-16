import type { Metadata } from "next";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { loadChallenges } from "@/lib/lounge/challenges";
import { ChallengeCard } from "@/components/lounge/challenge-card";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "Lounge Challenges" };

export default async function ChallengesPage() {
  await requireApprovedPage("/lounge/challenges");
  const lang = await getLang();
  const dict = getDict(lang).lounge;
  const t = dict.challenges;
  const { active, past } = await loadChallenges();

  return (
    <div>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      {active.length === 0 && past.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-ink-soft">{t.empty}</p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {active.map((c) => (
                <ChallengeCard key={c.id} challenge={c} dict={dict} lang={lang} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{t.pastChallenges}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {past.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} dict={dict} lang={lang} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
