"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/design-system";
import { StudioIcon } from "./StudioIcon";
type Project = {
  id: string;
  title: string;
  client: string;
  status: "DRAFT" | "DELIVERED" | "ARCHIVED";
  count: number;
  thumbnail: string | null;
  date: string | null;
};
export function RecentProjects({
  projects,
  locale,
}: {
  projects: Project[];
  locale: string;
}) {
  const t = useTranslations("admin");
  const [filter, setFilter] = useState("all");
  const visible = projects.filter(
    (p) => filter === "all" || p.status === filter,
  );
  const statusLabels = {
    DRAFT: t("draft"),
    DELIVERED: t("delivered"),
    ARCHIVED: t("archived"),
  };
  return (
    <section id="studio-recent" className="studio-panel">
      <div className="studio-panel-heading">
        <div>
          <h2>{t("recentProjects")}</h2>
          <p>{t("studio.recentDescription")}</p>
        </div>
        <Link
          href={`/${locale}/admin/projects`}
          className="studio-text-link ds-focus"
        >
          {t("viewAll")} <StudioIcon name="arrow" width="16" />
        </Link>
      </div>
      <div
        className="studio-filters"
        role="group"
        aria-label={t("studio.projectFilters")}
      >
        {[
          ["all", t("studio.all")],
          ["DRAFT", t("draft")],
          ["DELIVERED", t("delivered")],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`ds-focus ${filter === value ? "is-active" : ""}`}
          >
            {label}
            <span>
              {
                projects.filter((p) => value === "all" || p.status === value)
                  .length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="studio-table-labels" aria-hidden="true">
        <span>{t("studio.projectClient")}</span>
        <span>{t("photos")}</span>
        <span>{t("sessionDate")}</span>
        <span>{t("status")}</span>
      </div>
      <ul className="studio-project-list">
        {visible.map((project) => (
          <li key={project.id}>
            <Link
              href={`/${locale}/admin/projects/${project.id}`}
              className="studio-project-row ds-focus"
            >
              <div className="studio-project-identity">
                <div className="studio-project-thumb">
                  {project.thumbnail ? (
                    <Image
                      src={project.thumbnail}
                      alt=""
                      width={43}
                      height={49}
                      unoptimized
                    />
                  ) : (
                    <StudioIcon name="camera" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3>{project.title}</h3>
                  <p>{project.client}</p>
                </div>
              </div>
              <span className="studio-project-count">
                {new Intl.NumberFormat(locale).format(project.count)}
                <span className="sr-only"> {t("photos")}</span>
              </span>
              <span className="studio-project-date">
                {project.date
                  ? new Intl.DateTimeFormat(locale, {
                      day: "2-digit",
                      month: "short",
                      timeZone: "Europe/Madrid",
                    }).format(new Date(project.date))
                  : t("studio.noDate")}
              </span>
              <span className="studio-project-status">
                <StatusBadge status={project.status}>
                  {statusLabels[project.status]}
                </StatusBadge>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 && (
        <div className="studio-empty">
          <StudioIcon name="projects" width="28" height="28" />
          <p>
            {projects.length ? t("studio.emptyFilter") : t("emptyProjects")}
          </p>
          <Link
            className="studio-text-link ds-focus"
            href={`/${locale}/admin/projects/new`}
          >
            {t("newProject")} <StudioIcon name="plus" width="16" />
          </Link>
        </div>
      )}
    </section>
  );
}
