"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
export function PortalNavigation({
  locale,
  labels,
}: {
  locale: string;
  labels: { home: string; sessions: string; guide: string };
}) {
  const pathname = usePathname();
  const base = `/${locale}/app`;
  return (
    <nav
      aria-label={labels.home}
      className="studio-navigation portal-sidebar-navigation"
    >
      {(
        [
          {
            href: base,
            label: labels.home,
            icon: "overview",
            active: pathname === base,
          },
          {
            href: base + "#portal-sessions",
            label: labels.sessions,
            icon: "camera",
            active: pathname.startsWith(base + "/projects/"),
          },
          {
            href: base + "#portal-guide",
            label: labels.guide,
            icon: "heart",
            active: false,
          },
        ] as const
      ).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`studio-nav-link ds-focus ${item.active ? "is-active" : ""}`}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {item.active && <span className="studio-nav-dot" />}
        </Link>
      ))}
    </nav>
  );
}
