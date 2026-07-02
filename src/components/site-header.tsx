"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/#about", label: "About & CV" },
  { href: "/#certificates", label: "Certificates" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "bg-surface/95 border-b border-border-c shadow-sm"
          : "bg-surface/90"
      )}
    >
      <div className="mx-auto flex h-[78px] max-w-[1180px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logo.png" alt="Reemora logo" width={130} height={34} priority className="h-8 w-auto dark:brightness-0 dark:invert" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2.5 text-[14.5px] font-semibold transition-colors",
                pathname === link.href
                  ? "bg-blue-100 text-blue-600"
                  : "text-foreground hover:bg-blue-100 hover:text-blue-600"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/courses"
            className="hidden rounded-full border-2 border-transparent bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 sm:inline-flex"
          >
            Browse Courses
          </Link>
          <button
            aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-c md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border-c bg-surface px-6 pb-6 pt-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-[15px] font-semibold text-foreground hover:bg-blue-100 hover:text-blue-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
