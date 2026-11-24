import { createHmac } from "node:crypto";

export function previewCode(userId: string, projectId: string) {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("Preview identity requires a session secret");
  const code = createHmac("sha256", secret).update(JSON.stringify(["photo-preview-v1", userId, projectId])).digest("hex").slice(0, 12).toUpperCase();
  return code.match(/.{4}/g)!.join("-");
}
