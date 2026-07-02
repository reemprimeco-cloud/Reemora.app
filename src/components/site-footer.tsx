import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 py-16 text-[#b7c5e0]">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Image src="/images/logo.png" alt="Reemora logo" width={120} height={30} className="mb-3.5 h-7 w-auto brightness-0 invert" />
            <p className="max-w-[280px] text-sm">
              Reemora trains founders, developers and teams to design, build and launch AI-powered applications.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-[14.5px] font-semibold text-white">Explore</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Link href="/" className="hover:text-blue-400">Home</Link></li>
              <li><Link href="/courses" className="hover:text-blue-400">Courses</Link></li>
              <li><Link href="/#about" className="hover:text-blue-400">About &amp; CV</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[14.5px] font-semibold text-white">Company</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><a href="#" className="hover:text-blue-400">Contact</a></li>
              <li><Link href="/admin" className="hover:text-blue-400">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[14.5px] font-semibold text-white">Contact</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>hello@reemora.app</li>
              <li>Kuwait</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[13px]">
          <span>© {new Date().getFullYear()} Reemora. All rights reserved.</span>
          <span>Build Apps with AI</span>
        </div>
      </div>
    </footer>
  );
}
