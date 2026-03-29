import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /admin (admin panel — outside i18n)
    // - /icons, /favicon.ico, /manifest.json (static files)
    "/((?!api|_next|admin|icons|favicon\\.ico|manifest\\.json|sw\\.js).*)",
  ],
};
