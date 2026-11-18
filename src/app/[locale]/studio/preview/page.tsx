import { redirect } from "next/navigation";
import { requireEditor } from "@/modules/editorial/access";
import { PreviewFrame } from "@/components/editorial/PreviewFrame";
export default async function Preview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(await requireEditor())) redirect(`/${locale}/login`);
  return (
    <main className="space-y-5 p-5">
      <a href={`/${locale}/studio`}>← Volver al estudio</a>
      <h1 className="font-display text-3xl">Vista previa</h1>
      <PreviewFrame locale={locale} />
    </main>
  );
}
