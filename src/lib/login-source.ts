import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export function loginSource(headers: Pick<Headers, "get">, token: string | undefined, appUrl: string | undefined) {
  if (!token) {
    const url = URL.parse(appUrl || "http://localhost");
    const allowed = url?.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return { allowed, ip: null };
  }

  const provided = headers.get("x-studio-proxy-token") ?? "";
  const ip = headers.get("x-studio-client-ip")?.trim() ?? "";
  const expected = Buffer.from(token ?? "");
  const actual = Buffer.from(provided);

  if (expected.length < 32 || expected.length !== actual.length ||
      !timingSafeEqual(expected, actual) || ip.includes("%") || !isIP(ip)) {
    return { allowed: false, ip: null };
  }

  return { allowed: true, ip: isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname : ip };
}
