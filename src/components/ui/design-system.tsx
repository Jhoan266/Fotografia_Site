import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function ActionLink({ href, children, secondary = false }: {
  href: string; children: ReactNode; secondary?: boolean;
}) {
  return <Link href={href} className={secondary ? "ds-button ds-button-secondary" : "ds-button"}>{children}</Link>;
}

export function Button({ className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`ds-button ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ds-card ${className}`}>{children}</div>;
}

export function PageHeading({ eyebrow, title, description, actions }: {
  eyebrow: string; title: string; description?: string; actions?: ReactNode;
}) {
  return <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0"><p className="section-label">{eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">{title}</h1>
      {description && <p className="mt-3 max-w-xl text-sm text-white/65">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
  </div>;
}

export function EmptyState({ title, description, children }: {
  title: string; description?: string; children?: ReactNode;
}) {
  return <div className="rounded-lg border border-dashed border-white/20 px-6 py-12 text-center">
    <h2 className="text-lg font-medium">{title}</h2>
    {description && <p className="mx-auto mt-2 max-w-md text-sm text-white/65">{description}</p>}
    {children && <div className="mt-5 flex justify-center">{children}</div>}
  </div>;
}

export function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return <Link href={href} className="ds-card ds-focus block p-6 transition hover:border-sand/60">
    <p className="text-sm text-white/65">{label}</p>
    <p className="mt-3 font-display text-4xl tabular-nums">{value}</p>
  </Link>;
}

export function StatusBadge({ status, children }: {
  status: "DRAFT" | "DELIVERED" | "ARCHIVED"; children: ReactNode;
}) {
  const tones = {
    DRAFT: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    DELIVERED: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    ARCHIVED: "border-white/20 bg-white/5 text-white/70",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[status]}`}>{children}</span>;
}

export function FormField({ label, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block space-y-2">
    <span className="text-sm text-white/75">{label}</span>
    <input className={`input-field ${className}`} {...props} />
  </label>;
}
