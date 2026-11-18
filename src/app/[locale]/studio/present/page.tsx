import { redirect } from "next/navigation";
import { requireEditor } from "@/modules/editorial/access";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import { PresentationGuard } from "@/components/editorial/PresentationGuard";
import { DemoGallery } from "@/components/editorial/DemoGallery";
export const metadata = { robots: { index: false, follow: false } };
export default async function Present({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ frame?: string }>;
}) {
  const { locale } = await params;
  if (!(await requireEditor())) redirect(`/${locale}/login`);
  const { frame } = await searchParams;
  return (
    <>
      <MarketingPage locale={locale} draft />
      {frame !== "1" && <DemoGallery />}
      <PresentationGuard locale={locale} framed={frame === "1"} />
    </>
  );
}
