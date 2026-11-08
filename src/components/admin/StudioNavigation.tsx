"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudioIcon } from "./StudioIcon";
export function StudioNavigation({
  locale,
  labels,
}: {
  locale: string;
  labels: { overview: string; projects: string; clients: string };
}) {
  const path = usePathname();
  const base = `/${locale}/admin`;
  return (
    <nav aria-label={labels.overview} className="studio-navigation">
      {(
        [
          { href: base, label: labels.overview, icon: "overview" },
          {
            href: base + "/projects",
            label: labels.projects,
            icon: "projects",
          },
          { href: base + "/clients", label: labels.clients, icon: "clients" },
        ] as const
      ).map((item) => {
        const active =
          item.href === base
            ? path === base
            : path === item.href || path.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`studio-nav-link ds-focus ${active ? "is-active" : ""}`}
          >
            <StudioIcon name={item.icon} />
            <span>{item.label}</span>
            {active && <span className="studio-nav-dot" />}
          </Link>
        );
      })}
    </nav>
  );
}
