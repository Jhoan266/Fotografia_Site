"use client";
import Link from "next/link";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {LocaleSwitcher} from "@/components/ui/LocaleSwitcher";
export function SiteHeader({locale}:{locale:string}){
 const t=useTranslations("nav"), hero=useTranslations("hero"), ui=useTranslations("visualRefresh");
 const [open,setOpen]=useState(false);
 const links=[["#servicios",t("services")],["#portafolio",t("portfolio")],["#sobre-mi",t("about")],["#proceso",t("process")],["#contacto",t("contact")]];
 return <header className="public-header" onKeyDown={e=>{if(e.key==="Escape")setOpen(false);}}>
  <div className="public-header-inner">
   <Link href={`/${locale}`} className="public-brand" aria-label={hero("brand")}><span>{hero("brand")}</span><small>{hero("specialty")}</small></Link>
   <nav className="public-desktop-nav" aria-label={ui("navigation")}>{links.map(([href,label])=><a key={href} href={href}>{label}</a>)}</nav>
   <div className="public-header-actions"><LocaleSwitcher current={locale} appearance="light"/>
    <Link href={`/${locale}/login`} className="public-client-link">{t("clientArea")}<span aria-hidden>↗</span></Link>
    <button type="button" className="public-menu-toggle" aria-controls="public-mobile-menu" aria-expanded={open} aria-label={open?ui("closeMenu"):ui("menu")} onClick={()=>setOpen(!open)}><span aria-hidden>{open?"×":"☰"}</span></button>
   </div>
  </div>
  {open&&<nav id="public-mobile-menu" className="public-mobile-nav" aria-label={ui("navigation")}>{links.map(([href,label])=><a key={href} href={href} onClick={()=>setOpen(false)}>{label}<span aria-hidden>↗</span></a>)}<Link href={`/${locale}/login`}>{t("clientArea")}<span aria-hidden>↗</span></Link></nav>}
 </header>;
}
