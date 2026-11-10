"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudioIcon } from "./StudioIcon";
export function StudioNavigation({
  locale,
  labels,
}: {
  locale: string;
  labels: { overview: string; projects: string; clients: string; vault: string };
}) {
  const path = usePathname();
  const base = `/${locale}/admin`;
  return (
    <nav aria-label={labels.overview} className="studio-navigation max-[700px]:!grid max-[700px]:grid-cols-2">
      {(
        [
          { href: base, label: labels.overview, icon: "overview" },
          {
            href: base + "/projects",
            label: labels.projects,
            icon: "projects",
          },
          { href: base + "/clients", label: labels.clients, icon: "clients" },
          { href: base + "/vault", label: labels.vault, icon: "lock" },
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
            prefetch={item.href.endsWith("/vault") ? false : undefined}
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
