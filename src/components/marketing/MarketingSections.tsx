"use client";
import Link from "next/link";
import {useLocale,useTranslations} from "next-intl";
import {useEditorial} from "./EditorialContext";
export function ServicesSection(){
 const t=useTranslations("services"),{media}=useEditorial();
 const items=[["weddings","g1"],["sessions","g3"],["book","g5"]] as const;
 return <section id="servicios" className="public-section public-services">
  <div className="public-section-heading"><p className="public-eyebrow">{t("label")}</p><h2>{t("title")}</h2></div>
  <div className="public-service-grid">{items.map(([key,image],i)=><a href="#contacto" className="public-service" key={key}>
   <div className="public-service-image">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={media[image+"Image"]} alt={media[image+"Alt"]} loading="lazy"/><span className="public-service-index">0{i+1}</span>
   </div><div className="public-service-copy"><h3>{t(`items.${key}.title`)}</h3><span aria-hidden>↗</span><p>{t(`items.${key}.body`)}</p></div>
  </a>)}</div>
 </section>;
}
export function GalleryExperience(){
 const t=useTranslations("visualRefresh"),nav=useTranslations("nav"),locale=useLocale(),{media}=useEditorial();
 return <section className="public-experience"><div className="public-section public-experience-inner">
  <div className="public-experience-copy"><p className="public-eyebrow">{t("privateLabel")}</p><h2>{t("privateTitle")}</h2><p>{t("privateBody")}</p>
   <ul>{["private","proofing","delivery"].map((key,i)=><li key={key}><span aria-hidden>0{i+1}</span>{t(key)}</li>)}</ul>
   <Link className="public-button" href={`/${locale}/login`}>{nav("clientArea")}<span aria-hidden>↗</span></Link>
  </div>
  <div className="public-gallery-illustration" aria-hidden="true">
   <div className="public-gallery-browser"><span/><span/><span/><small>{t("privateLabel")}</small><span>⌁</span></div>
   <div className="public-gallery-illustration-cover">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={media.g1Image||media.heroImage} alt="" loading="lazy"/><div><span>{t("privateLabel")}</span><strong>{t("yourStory")}</strong></div>
   </div>
   <div className="public-gallery-illustration-grid">{["g3","g5","g4"].map((id,i)=><div key={id}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={media[id+"Image"]||media.heroImage} alt="" loading="lazy"/><span>{i===1?"♥":"♡"}</span>
   </div>)}</div>
   <div className="public-gallery-note"><span>✓</span>{t("private")}</div>
  </div>
 </div></section>;
}
export function AboutSection(){
 const t=useTranslations("about"),hero=useTranslations("hero"),{media}=useEditorial();
 return <section id="sobre-mi" className="public-section public-about">
  <div className="public-about-photo">
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={media.aboutImage} alt={media.aboutAlt} loading="lazy"/><span className="public-about-monogram" aria-hidden>{hero("brand").split(" ").map(w=>w[0]).slice(0,2).join("")}</span>
  </div><div className="public-about-copy"><p className="public-eyebrow">{t("label")}</p><h2>{t("title")}</h2><p>{t("body")}</p>
   <div className="public-signature">{hero("brand")}<small>{hero("specialty")} · {hero("location")}</small></div>
  </div>
 </section>;
}
export function ProcessSection(){
 const t=useTranslations("process");
 return <section id="proceso" className="public-section public-process"><div className="public-section-heading"><p className="public-eyebrow">{t("label")}</p><h2>{t("title")}</h2></div>
  <ol className="public-process-grid">{["1","2","3","4"].map(step=><li key={step}><span className="public-process-number">{step.padStart(2,"0")}</span><h3>{t(`steps.${step}.title`)}</h3><p>{t(`steps.${step}.body`)}</p></li>)}</ol>
 </section>;
}
export function ContactSection(){
 const t=useTranslations("contact"),{media,channels,contactEnabled}=useEditorial();
 const wa=`https://wa.me/${channels.whatsapp}?text=${encodeURIComponent(channels.whatsappMessage)}`;
 return <section id="contacto" className="public-contact">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img className="public-contact-image" src={media.g4Image||media.heroImage} alt="" loading="lazy"/><div className="public-contact-shade"/>
  <div className="public-section public-contact-inner"><p className="public-eyebrow">{t("label")}</p><h2>{t("title")}</h2><p>{t("body")}</p>
   {contactEnabled&&<div className="public-actions"><a className="public-button" href={wa} target="_blank" rel="noreferrer">{t("cta")}<span aria-hidden>↗</span></a><a className="public-contact-email" href={`mailto:${channels.email}`}>{channels.email}</a></div>}
  </div>
 </section>;
}
export function SiteFooter(){
 const t=useTranslations("footer"),nav=useTranslations("nav"),hero=useTranslations("hero"),locale=useLocale();
 return <footer className="public-footer"><div className="public-section">
  <div className="public-footer-top"><Link className="public-brand" href={`/${locale}`}><span>{hero("brand")}</span><small>{hero("specialty")}</small></Link><nav aria-label={hero("brand")}><a href="#portafolio">{nav("portfolio")}</a><a href="#contacto">{nav("contact")}</a><Link href={`/${locale}/login`}>{nav("clientArea")} ↗</Link></nav></div>
  <div className="public-footer-bottom"><p>© {new Date().getFullYear()} {hero("brand")}. {t("rights")}</p><p>{t("placeholder")}</p></div>
 </div></footer>;
}
