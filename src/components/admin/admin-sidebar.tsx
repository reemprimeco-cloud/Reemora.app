"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, CalendarClock, ClipboardList, LogOut, Tags, GraduationCap, Quote, Mail, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/schedule", label: "Scheduling", icon: CalendarClock },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/trainer", label: "Trainer & Certificates", icon: GraduationCap },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { href: "/admin/messages", label: "Contact Messages", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col gap-1.5 bg-navy-900 p-5 text-[#b7c5e0] md:sticky md:top-0 md:h-screen">
      <Link href="/" className="mb-6 block px-2.5 pt-1.5">
        <Image src="/images/logo.png" alt="Reemora logo" width={120} height={30} className="h-7 w-auto brightness-0 invert" />
      </Link>
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors",
              active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
            )}
          >
            <link.icon size={16} />
            {link.label}
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        className="mt-auto flex items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <LogOut size={15} /> Log Out
      </button>
    </aside>
  );
}
