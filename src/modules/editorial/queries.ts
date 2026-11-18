import { prisma } from "@/lib/prisma";
import {
  defaults,
  expand,
  modules,
  type ModuleKey,
  type Values,
  validateValues,
} from "./schema";

export async function readEditorialModule(
  locale: string,
  module: ModuleKey,
  draft = false,
) {
  const fallback = defaults(locale, module);
  let row;
  try {
    row = await prisma.editorialModule.findUnique({
      where: { id: locale + "/" + module },
    });
  } catch (error) {
    if (draft) throw error;
    console.error("Published editorial content unavailable");
    return { values: fallback, revision: 0 };
  }
  const content = draft ? row?.draft : row?.published;
  return {
    values: validateValues(locale, module, content) ? content : fallback,
    revision: row?.revision ?? 0,
  };
}

export async function readEditorialPage(locale: string, draft = false) {
  const entries = await Promise.all(
    modules.map(
      async ([key]) =>
        [key, await readEditorialModule(locale, key, draft)] as const,
    ),
  );
  const records = Object.fromEntries(entries);
  const messages = Object.fromEntries(
    entries
      .filter(
        ([key]) => !["media", "channels", "design", "launch"].includes(key),
      )
      .map(([key, row]) => [key, expand(row.values)]),
  );
  return {
    messages,
    media: records.media.values as Values,
    channels: records.channels.values as Values,
    launch: records.launch.values as Values,
    design: records.design.values as Values,
  };
}
