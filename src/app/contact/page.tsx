import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ContactForm } from "@/components/contact-form";
import { getWebsiteSettings } from "@/lib/data/settings";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { interpolate } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Reemora team.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [lang, settings] = await Promise.all([getLang(), getWebsiteSettings()]);
  const dict = getDict(lang);

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[720px] px-6">
          <div className="mb-10 text-center">
            <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{dict.contactPage.eyebrow}</span>
            <h1 className="mb-3 text-[28px] font-bold sm:text-4xl">{dict.contactPage.title}</h1>
            <p className="text-ink-soft">
              {interpolate(dict.contactPage.subtitleTemplate, { email: settings.contact_email })}
            </p>
          </div>
          <ContactForm />
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
