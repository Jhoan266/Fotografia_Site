import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Hero } from "@/components/marketing/Hero";
import { PortfolioMosaic } from "@/components/marketing/PortfolioMosaic";
import {
  AboutSection,
  ContactSection,
  ProcessSection,
  ServicesSection,
  SiteFooter,
} from "@/components/marketing/MarketingSections";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <SiteHeader locale={locale} />
      <Hero />
      <ServicesSection />
      <PortfolioMosaic />
      <AboutSection />
      <ProcessSection />
      <ContactSection />
      <SiteFooter />
    </main>
  );
}
