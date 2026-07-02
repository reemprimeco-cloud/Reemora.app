import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ContactForm } from "@/components/contact-form";
import { getWebsiteSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Reemora team.",
};

export default async function ContactPage() {
  const settings = await getWebsiteSettings();

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[720px] px-6">
          <div className="mb-10 text-center">
            <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">Contact</span>
            <h1 className="mb-3 text-[28px] font-bold sm:text-4xl">Get in touch</h1>
            <p className="text-ink-soft">
              Questions about a course or want to bring Reemora training to your team? Send us a message — or reach us directly at {settings.contact_email}.
            </p>
          </div>
          <ContactForm />
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
