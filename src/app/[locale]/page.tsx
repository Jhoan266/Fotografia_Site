import { MarketingPage } from "@/components/marketing/MarketingPage";
import { readEditorialModule } from "@/modules/editorial/queries";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { values } = await readEditorialModule(locale, "meta");
  return { title: values.title, description: values.description };
}
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <MarketingPage locale={locale} />;
}
