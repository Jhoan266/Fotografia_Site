import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { routing } from "@/i18n/routing";
import { AppSessionData, sessionOptions } from "@/lib/session";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const { pathname } = request.nextUrl;

  const localeMatch = pathname.match(/^\/(es|en|fr)(\/|$)/);
  const locale = localeMatch?.[1] || "es";
  const pathWithoutLocale = pathname.replace(/^\/(es|en|fr)/, "") || "/";

  const needsAuth =
    pathWithoutLocale.startsWith("/app") ||
    pathWithoutLocale.startsWith("/admin");

  if (!needsAuth) {
    return response;
  }

  const session = await getIronSession<AppSessionData>(
    request,
    response,
    sessionOptions,
  );

  if (!session.user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (pathWithoutLocale.startsWith("/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL(`/${locale}/app`, request.url));
  }

  if (pathWithoutLocale.startsWith("/app") && session.user.role === "ADMIN") {
    // Admins can peek client area if needed — allow
  }

  return response;
}

export const config = {
  matcher: ["/", "/(es|en|fr)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
