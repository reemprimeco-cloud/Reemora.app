import Link from "next/link";
import Image from "next/image";
import type { WebsiteSettings } from "@/lib/types";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { interpolate } from "@/lib/i18n/dictionaries";

export async function SiteFooter({ settings }: { settings: WebsiteSettings }) {
  const lang = await getLang();
  const dict = getDict(lang);
  return (
    <footer className="bg-navy-900 py-16 text-[#b7c5e0]">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Image src="/images/logo.png" alt="Reemora logo" width={120} height={30} className="mb-3.5 h-7 w-auto brightness-0 invert" />
            <p className="max-w-[280px] text-sm">
              {interpolate(dict.footer.description, { siteName: settings.site_name })}
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-[14.5px] font-semibold text-white">{dict.footer.exploreHeading}</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Link href="/" className="hover:text-blue-400">{dict.footer.home}</Link></li>
              <li><Link href="/courses" className="hover:text-blue-400">{dict.footer.courses}</Link></li>
              <li><Link href="/#about" className="hover:text-blue-400">{dict.footer.aboutCv}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[14.5px] font-semibold text-white">{dict.footer.companyHeading}</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Link href="/contact" className="hover:text-blue-400">{dict.footer.contact}</Link></li>
              <li><Link href="/admin" className="hover:text-blue-400">{dict.footer.admin}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[14.5px] font-semibold text-white">{dict.footer.contactHeading}</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>{settings.contact_email}</li>
              <li>{settings.contact_phone}</li>
              <li>{settings.address}</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[13px]">
          <span>© {new Date().getFullYear()} {settings.site_name}. {dict.footer.rights}</span>
          <span>{settings.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
