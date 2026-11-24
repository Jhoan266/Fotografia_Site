export type SubmittedPhoto = { id: string; filename: string };

export function parseConfirmation(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const b = input as Record<string, unknown>;
  if (!Number.isSafeInteger(b.version) || (b.version as number) < 0 ||
      !Array.isArray(b.photoIds) || b.photoIds.length < 1 || b.photoIds.length > 500 ||
      b.photoIds.some(id => typeof id !== "string" || !id || id.length > 128) ||
      new Set(b.photoIds).size !== b.photoIds.length) return null;
  return { version: b.version as number, photoIds: b.photoIds as string[] };
}

export function readSubmittedPhotos(input: unknown): SubmittedPhoto[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is SubmittedPhoto => item && typeof item.id === "string" && typeof item.filename === "string");
}

export function selectionCsv(items: SubmittedPhoto[]) {
  // Prevent spreadsheet formulas, including formulas hidden behind whitespace.
  const cell = (value: string) => '"' + (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
  return "\uFEFFphoto_id,filename\r\n" + items.map(p => [cell(p.id), cell(p.filename)].join(",")).join("\r\n") + "\r\n";
}

export function selectionText(items: SubmittedPhoto[]) {
  return items.map(p => p.filename.replace(/[\r\n\u0000]/g, "_")).join("\n") + "\n";
}
