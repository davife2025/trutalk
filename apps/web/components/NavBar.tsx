"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/chat", label: "Chat" },
  { href: "/checkin", label: "Check-in" },
  { href: "/journal", label: "Journal" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 flex justify-around border-t border-calm-100 bg-white/95 py-2 backdrop-blur">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1 text-sm ${active ? "font-semibold text-calm-900" : "text-calm-600"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
