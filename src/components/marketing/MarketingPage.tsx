import { NextIntlClientProvider } from "next-intl";
import { SiteHeader } from "./SiteHeader";
import { Hero } from "./Hero";
import { PortfolioMosaic } from "./PortfolioMosaic";
import {
  AboutSection,
  ContactSection,
  ProcessSection,
  ServicesSection,
  SiteFooter,
} from "./MarketingSections";
import { EditorialProvider } from "./EditorialContext";
import { readEditorialPage } from "@/modules/editorial/queries";

export async function MarketingPage({
  locale,
  draft = false,
}: {
  locale: string;
  draft?: boolean;
}) {
  const content = await readEditorialPage(locale, draft);
  if (!draft && content.launch.publicMode === "coming-soon") {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <h1 className="font-display text-5xl">{content.launch.comingSoon}</h1>
      </main>
    );
  }
  return (
    <NextIntlClientProvider messages={content.messages}>
      <EditorialProvider
        media={content.media}
        channels={content.channels}
        contactEnabled={content.launch.contactEnabled === "true"}
      >
        <main style={{ fontFamily: content.design.bodyFont }}>
          {content.design.displayFont !== "inherit" && <style>{`#editorial-page h1, #editorial-page h2, #editorial-page h3 { font-family: ${content.design.displayFont}; }`}</style>}
          <div id="editorial-page">
            <SiteHeader locale={locale} />
            <Hero />
            <ServicesSection />
            <PortfolioMosaic />
            <AboutSection />
            <ProcessSection />
            <ContactSection />
            <SiteFooter />
          </div>
        </main>
      </EditorialProvider>
    </NextIntlClientProvider>
  );
}
