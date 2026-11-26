"use client";
import { useTranslations } from "next-intl";
import { useEditorial } from "./EditorialContext";
export function Hero() {
 const t=useTranslations("hero"), s=useTranslations("services");
 const {media,channels,contactEnabled}=useEditorial();
 const wa=`https://wa.me/${channels.whatsapp}?text=${encodeURIComponent(channels.whatsappMessage)}`;
 return <section className="public-hero" aria-labelledby="public-hero-title">
  <div className="public-hero-copy">
   <p className="public-eyebrow"><span />{t("brand")} · {t("location")}</p>
   <h1 id="public-hero-title">{t("tagline")}</h1>
   <p className="public-hero-description">{t("subtitle")}</p>
   <div className="public-actions">
    {contactEnabled&&<a className="public-button" href={wa} target="_blank" rel="noreferrer">{t("ctaWhatsapp")}<span aria-hidden>↗</span></a>}
    <a className="public-text-link" href="#portafolio">{t("ctaPortfolio")}<span aria-hidden>↓</span></a>
   </div>
  </div>
  <div className="public-hero-gallery">
   <figure className="public-hero-side">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={media.g1Image||media.heroImage} alt={media.g1Alt||media.heroAlt}/>
    <figcaption><span>01</span>{s("items.weddings.title")}</figcaption>
   </figure>
   <figure className="public-hero-main">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={media.heroImage} alt={media.heroAlt} fetchPriority="high"/>
    <figcaption><span>{t("specialty")}</span><span>{t("brand")}</span></figcaption>
   </figure>
   <figure className="public-hero-side public-hero-last">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={media.g5Image||media.aboutImage} alt={media.g5Alt||media.aboutAlt}/>
    <figcaption><span>02</span>{s("items.book.title")}</figcaption>
   </figure>
  </div>
 </section>;
}
