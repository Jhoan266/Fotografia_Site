import type { SVGProps } from "react";

const paths = {
  overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  projects: "M3 7h7l2-3h9v15H3z",
  clients:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  camera: "M14 4h-4L8 7H3v13h18V7h-5zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  arrow: "M5 12h14M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  calendar: "M4 5h16v16H4zM8 3v4M16 3v4M4 11h16",
  check: "m5 12 4 4L19 6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8",
  message:
    "M21 15a3 3 0 0 1-3 3H7l-4 3V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3zM7 7h10M7 12h6",
  external: "M14 3h7v7M21 3 10 14M10 3H3v18h18v-7",
  logout: "M9 3H3v18h6M8 12h13M17 8l4 4-4 4",
};
export function StudioIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
