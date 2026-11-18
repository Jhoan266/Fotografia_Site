"use server";

import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "./access";
import { isModule, locales, validateValues } from "./schema";

export async function changeEditorial(input: {
  locale: string;
  module: string;
  revision: number;
  action: string;
  values?: unknown;
  historyId?: string;
}) {
  const user = await requireEditor();
  if (!user)
    return {
      ok: false,
      error:
        "Tu sesión caducó. Conserva o descarga tus cambios e inicia sesión.",
    };
  if (
    !input ||
    typeof input !== "object" ||
    !locales.includes(input.locale as (typeof locales)[number]) ||
    !isModule(input.module) ||
    !Number.isSafeInteger(input.revision) ||
    input.revision < 0 ||
    !["save", "publish", "restore"].includes(input.action)
  )
    return { ok: false, error: "Solicitud inválida." };
  if (input.action !== "save" && user.role !== "ADMIN")
    return {
      ok: false,
      error: "Solo el propietario puede publicar o recuperar versiones.",
    };
  if (!(await rateLimit("editorial-write:" + user.id, 60, 60_000)).ok)
    return { ok: false, error: "Espera un minuto antes de volver a guardar." };
  const moduleKey = input.module;
  const id = input.locale + "/" + moduleKey;
  let values: unknown = input.values;
  if (input.action === "restore") {
    if (typeof input.historyId !== "string" || !input.historyId || input.historyId.length > 128) {
      return { ok: false, error: "Selecciona una revisión del historial." };
    }
    const historical = await prisma.editorialRevision.findFirst({
      where: { id: input.historyId, moduleId: id },
    });
    values = historical?.content;
  }
  if (
    input.action !== "publish" &&
    !validateValues(input.locale, moduleKey, values)
  ) {
    return {
      ok: false,
      error: "Revisa los campos, las direcciones y los tamaños permitidos.",
    };
  }
  const result = await prisma.$transaction(async (tx) => {
    await tx.editorialModule.createMany({
      data: [{ id, draft: {}, revision: 0 }],
      skipDuplicates: true,
    });
    const row = await tx.editorialModule.findUniqueOrThrow({ where: { id } });
    if (row.revision !== input.revision) return null;
    const content = input.action === "publish" ? row.draft : values;
    if (!validateValues(input.locale, moduleKey, content)) return null;
    const update = await tx.editorialModule.updateMany({
      where: { id, revision: input.revision },
      data: {
        revision: { increment: 1 },
        ...(input.action === "publish"
          ? { published: content }
          : { draft: content }),
      },
    });
    if (update.count !== 1) return null;
    await tx.editorialRevision.create({
      data: {
        moduleId: id,
        revision: input.revision + 1,
        action: input.action,
        actorId: user.id,
        content,
      },
    });
    return input.revision + 1;
  });
  return result === null
    ? {
        ok: false,
        error:
          "Otra persona actualizó este módulo. Tus cambios siguen aquí. Descárgalos antes de recargar.",
      }
    : { ok: true, revision: result };
}
