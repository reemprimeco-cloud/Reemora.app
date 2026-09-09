"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, CalendarClock, ClipboardList, LogOut, Tags, GraduationCap, Quote, Mail, Settings, Briefcase, HelpCircle, UserPlus, ListOrdered, CalendarPlus, Menu, X, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/schedule", label: "Scheduling", icon: CalendarClock },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/attendance", label: "Attendance Sheet", icon: Printer },
  { href: "/admin/reservations", label: "Seat Reservations", icon: UserPlus },
  { href: "/admin/waitlist", label: "Waitlist", icon: ListOrdered },
  { href: "/admin/inquiries", label: "Course Inquiries", icon: HelpCircle },
  { href: "/admin/private-sessions", label: "Private Session Requests", icon: CalendarPlus },
  { href: "/admin/trainer", label: "Trainer & Certificates", icon: GraduationCap },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { href: "/admin/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/admin/messages", label: "Contact Messages", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Close the mobile dropdown whenever the route changes (link tap, back
  // button, etc.) so it never lingers open over the next page.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const activeLink = LINKS.find((link) => link.href === pathname);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile: collapsed top bar with a dropdown menu instead of the full
          list rendered inline (which used to push page content down by an
          entire screen's worth of links). */}
      <div className="sticky top-0 z-40 bg-navy-900 text-[#b7c5e0] md:hidden print:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center">
            <Image src="/images/logo.png" alt="Reemora logo" width={100} height={25} className="h-6 w-auto brightness-0 invert" />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-mobile-nav"
            className="flex min-h-[40px] items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-sm font-semibold text-white active:scale-95 transition-transform"
          >
            {activeLink ? <activeLink.icon size={15} aria-hidden="true" /> : <Menu size={15} aria-hidden="true" />}
            {activeLink?.label ?? "Menu"}
            {open ? <X size={15} aria-hidden="true" /> : <Menu size={15} aria-hidden="true" />}
          </button>
        </div>

        {open && (
          <nav
            id="admin-mobile-nav"
            aria-label="Admin"
            className="max-h-[70vh] overflow-y-auto border-t border-white/10 px-4 pb-4 pt-2"
          >
            <div className="flex flex-col gap-1">
              {LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[44px] items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
                      active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <link.icon size={16} aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <LogOut size={15} /> Log Out
            </button>
          </nav>
        )}
      </div>

      {/* Desktop: full sidebar, unchanged. */}
      <aside className="hidden flex-col gap-1.5 bg-navy-900 p-5 text-[#b7c5e0] md:sticky md:top-0 md:flex md:h-screen print:hidden">
        <Link href="/" className="mb-6 block px-2.5 pt-1.5">
          <Image src="/images/logo.png" alt="Reemora logo" width={120} height={30} className="h-7 w-auto brightness-0 invert" />
        </Link>
        <nav aria-label="Admin" className="flex flex-col gap-1.5">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors",
                  active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                )}
              >
                <link.icon size={16} aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <LogOut size={15} /> Log Out
        </button>
      </aside>
    </>
  );
}
