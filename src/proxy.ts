import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie, getCookieCache } from "better-auth/cookies";
import { isMappedHost, loadRouting, resolveRewrite } from "@/content/resolve-rewrite";
import { resolveAdminRedirect } from "@/content/resolve-admin";
import { isUnder } from "@/lib/access";
import { ADMIN_BASE } from "@/lib/admin-routes";

// Host -> city rewrite: public URLs stay bare, the app tree lives under /[city]. Internal /<cityKey>/... paths are
// the draft preview and are left alone. Next 16 calls this file `proxy`, not `middleware`. Logic is in resolveRewrite().
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  // host map from Global Config with the build-time JSON as fallback; read once for both pure functions
  const { domains, cityKeys } = await loadRouting();

  // console paths, on the operator's own host only — on a mapped customer domain /admin falls through and 404s.
  // Cookie and cached role are client-held; see resolve-admin.ts for why that is acceptable here and nowhere else.
  if (!isMappedHost(host, domains) && isUnder(pathname, ADMIN_BASE)) {
    const hasSession = !!getSessionCookie(req);
    let cached = null;
    if (hasSession) {
      try {
        cached = await getCookieCache(req);
      } catch {
        // a malformed session_data cookie makes getCookieCache throw; treat it as no cached role rather than 500 /admin/login
        cached = null;
      }
    }
    const target = resolveAdminRedirect(
      pathname,
      hasSession ? { role: cached?.user?.role } : null,
    );
    if (target) return NextResponse.redirect(new URL(target, req.url));
    return;
  }

  const target = resolveRewrite(host, pathname, domains, cityKeys);
  if (target === null) return;
  const url = req.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

// keep static assets from paying for the hop; matcher values must be literals
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|icons|.*\\..*).*)"],
};
