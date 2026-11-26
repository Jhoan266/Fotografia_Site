"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {useTranslations} from "next-intl";
import {gallery,GalleryItem} from "@/lib/content";
import {useEditorial} from "./EditorialContext";
export function PortfolioMosaic(){
 const {media}=useEditorial(),t=useTranslations("portfolio"),ui=useTranslations("visualRefresh");
 const editableGallery=useMemo(()=>gallery.map(item=>({...item,src:media[item.id+"Image"]??item.src,alt:media[item.id+"Alt"]??item.alt})),[media]);
 const [filter,setFilter]=useState<"all"|GalleryItem["category"]>("all"),[active,setActive]=useState<GalleryItem|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLButtonElement|null>(null);
 const open=Boolean(active),items=useMemo(()=>filter==="all"?editableGallery:editableGallery.filter(g=>g.category===filter),[filter,editableGallery]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";
  dialog.current?.showModal();closeButton.current?.focus();
  return()=>{document.body.style.overflow=previous;};
 },[open]);
 function close(){dialog.current?.close();setActive(null);trigger.current?.focus();}
 function move(direction:number){if(!active)return;const i=items.findIndex(item=>item.id===active.id);setActive(items[(i+direction+items.length)%items.length]);}
 const filters=[{id:"all" as const,label:t("all")},{id:"bodas" as const,label:t("weddings")},{id:"sesiones" as const,label:t("sessions")},{id:"book" as const,label:t("book")}];
 return <section id="portafolio" className="public-section public-portfolio">
  <div className="public-portfolio-heading"><div className="public-section-heading"><p className="public-eyebrow">{t("label")}</p><h2>{t("title")}</h2></div>
   <div className="public-portfolio-filters" role="group" aria-label={t("label")}>{filters.map(f=><button key={f.id} type="button" aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}>{f.label}</button>)}</div>
  </div>
  <div className="public-portfolio-grid">{items.map(item=><button key={item.id} type="button" className={`public-portfolio-photo ${item.span==="tall"?"mosaic-tall":""} ${item.span==="wide"?"mosaic-wide":""}`} onClick={e=>{trigger.current=e.currentTarget;setActive(item);}} aria-label={item.alt}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={item.src} alt={item.alt} loading="lazy"/><span><b>{item.alt}</b><b aria-hidden>↗</b></span>
  </button>)}</div>
  <dialog ref={dialog} className="public-lightbox" aria-label={active?.alt??t("title")} onCancel={close} onClose={()=>{setActive(null);trigger.current?.focus();}}
   onClick={e=>{if(e.target===e.currentTarget)close();}} onKeyDown={e=>{if(e.key==="ArrowRight"){e.preventDefault();move(1);}if(e.key==="ArrowLeft"){e.preventDefault();move(-1);}}}>
   {active&&<>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="public-lightbox-image" src={active.src} alt={active.alt}/>
    <div className="public-lightbox-footer"><p>{active.alt}</p><div className="public-lightbox-controls">
     <button type="button" onClick={()=>move(-1)} aria-label={ui("previous")}>←</button><button type="button" onClick={()=>move(1)} aria-label={ui("next")}>→</button>
     <button ref={closeButton} type="button" onClick={close} aria-label={ui("close")}>×</button>
    </div></div>
   </>}
  </dialog>
 </section>;
}
