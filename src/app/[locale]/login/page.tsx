import {setRequestLocale,getTranslations} from "next-intl/server";
import {BrandMark} from "@/components/ui/BrandMark";
import {LocaleSwitcher} from "@/components/ui/LocaleSwitcher";
import {LoginForm} from "@/components/auth/LoginForm";
import {readEditorialModule} from "@/modules/editorial/queries";
import Link from "next/link";
export const dynamic="force-dynamic";
export default async function LoginPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;setRequestLocale(locale);
 const t=await getTranslations("nav"),hero=await getTranslations("hero");
 const {values:media}=await readEditorialModule(locale,"media");
 return <main className="login-page">
  <header className="mx-auto flex items-center justify-between"><BrandMark locale={locale}/><div className="flex items-center gap-4"><LocaleSwitcher current={locale} appearance="light"/><Link href={`/${locale}`} className="text-sm text-white/70">{t("portfolio")} ↗</Link></div></header>
  <div className="login-layout"><aside className="login-art" aria-label={hero("specialty")}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={media.heroImage} alt={media.heroAlt}/><div className="login-art-copy"><p>{hero("tagline")}</p><small>{hero("brand")} · {hero("location")}</small></div>
  </aside><div className="login-form-area"><LoginForm locale={locale}/></div></div>
 </main>;
}
