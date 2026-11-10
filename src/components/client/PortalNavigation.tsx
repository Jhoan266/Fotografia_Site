"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

export function PortalNavigation({
  locale,
  labels,
}: {
  locale: string;
  labels: { home: string; sessions: string; guide: string };
}) {
  const pathname = usePathname();
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  const base = `/${locale}/app`;
  const onDashboard = pathname === base;

  function navigate(event: MouseEvent<HTMLAnchorElement>, section?: string) {
    if (
      !onDashboard ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = document.getElementById(section ?? "portal-content");
    if (!target) return;
    event.preventDefault();
    const href = base + (section ? `#${section}` : "");
    if (
      window.location.pathname +
        window.location.search +
        window.location.hash !==
      href
    ) {
      const oldURL = window.location.href;
      window.history.pushState(null, "", href);
      window.dispatchEvent(
        new HashChangeEvent("hashchange", {
          oldURL,
          newURL: window.location.href,
        }),
      );
    }
    target.focus({ preventScroll: true });
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "instant"
      : "smooth";
    if (section) target.scrollIntoView({ behavior, block: "start" });
    else window.scrollTo({ top: 0, behavior });
  }

  const items = [
    {
      href: base,
      label: labels.home,
      icon: "overview",
      section: undefined,
      active:
        onDashboard && hash !== "#portal-sessions" && hash !== "#portal-guide",
    },
    {
      href: base + "#portal-sessions",
      label: labels.sessions,
      icon: "camera",
      section: "portal-sessions",
      active: onDashboard
        ? hash === "#portal-sessions"
        : pathname.startsWith(base + "/projects/"),
    },
    {
      href: base + "#portal-guide",
      label: labels.guide,
      icon: "heart",
      section: "portal-guide",
      active: onDashboard && hash === "#portal-guide",
    },
  ] as const;

  // Native anchors also honor fragment targets when returning from a gallery.
  return (
    <nav
      aria-label={labels.home}
      className="studio-navigation portal-sidebar-navigation"
    >
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={(event) => navigate(event, item.section)}
          aria-current={
            item.active
              ? onDashboard && item.section
                ? "location"
                : "page"
              : undefined
          }
          className={`studio-nav-link ds-focus ${item.active ? "is-active" : ""}`}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {item.active && <span className="studio-nav-dot" />}
        </a>
      ))}
    </nav>
  );
}
