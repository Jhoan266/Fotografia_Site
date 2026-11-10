"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNavigation({ locale, labels }: {
  locale: string; labels: { panel: string; clients: string; projects: string };
}) {
  const pathname = usePathname();
  const base = `/${locale}/admin`;
  return <nav aria-label={labels.panel} className="flex flex-wrap gap-1">
    {([{ href: base, label: labels.panel }, { href: `${base}/clients`, label: labels.clients },
      { href: `${base}/projects`, label: labels.projects }]).map(({ href, label }) => {
        const active = href === base ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}
          className={`ds-focus rounded-md px-3 py-2 text-sm transition ${active ? "bg-sand/15 text-sand" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
          {label}
        </Link>;
      })}
  </nav>;
}
