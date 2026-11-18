import { redirect } from "next/navigation";
import { requireEditor } from "@/modules/editorial/access";
export const dynamic = "force-dynamic";
export default async function StudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(await requireEditor())) redirect(`/${locale}/login`);
  return children;
}
