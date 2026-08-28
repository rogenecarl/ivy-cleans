import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie, getCookieCache } from "better-auth/cookies";
import { isMappedHost, resolveRewrite } from "@/content/resolve-rewrite";
import { resolveAdminRedirect } from "@/content/resolve-admin";
import { isUnder } from "@/lib/access";
import { ADMIN_BASE } from "@/lib/admin-routes";

/*
 * Host -> city rewrite. This is what makes ONE deployment serve every city:
 * the public URLs stay bare (/, /home, /deep-cleaning-minneapolis) while the
 * app tree lives under /[city], and this rewrite joins the two. Internal
 * /<cityKey>/... paths are left alone — they are the draft-city preview.
 *
 * NOTE ON THE FILENAME: Next.js 16 renamed the `middleware` file convention
 * to `proxy` (node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md: "the `middleware` file convention is
 * deprecated and has been renamed to `proxy`"), with the named export
 * renamed to match. The plan calls this file src/middleware.ts; same
 * mechanism, current name. All the decision logic is in the pure, unit-
 * tested resolveRewrite() — keep this adapter trivial.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  /*
   * Console paths, on the operator's own host only. The host test is not
   * incidental: it is the same scoping resolveRewrite applies to its own
   * admin passthrough, and hoisting this branch above it without the test
   * would put a login box on every customer's branded domain — exactly what
   * resolve-rewrite.ts's case-3 comment warns against. On a mapped host we
   * fall through to the rewrite, which turns /admin into /<city>/admin and
   * 404s, as it did before this branch existed.
   *
   * They are never city-rewritten either way, so doing the auth hop here
   * keeps resolveRewrite's contract unchanged.
   *
   * getSessionCookie is a presence check on a signed cookie, and
   * getCookieCache reads the role better-auth cached in it. Both are
   * client-held; see resolve-admin.ts for why that is acceptable here and
   * nowhere else.
   */
  if (!isMappedHost(host) && isUnder(pathname, ADMIN_BASE)) {
    const hasSession = !!getSessionCookie(req);
    const cached = hasSession ? await getCookieCache(req) : null;
    const target = resolveAdminRedirect(
      pathname,
      hasSession ? { role: cached?.user?.role } : null,
    );
    if (target) return NextResponse.redirect(new URL(target, req.url));
    return;
  }

  const target = resolveRewrite(host, pathname);
  if (target === null) return;
  const url = req.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

/*
 * Without a matcher the proxy runs on every request including /_next/static
 * and public/ assets. resolveRewrite() rejects those anyway, but the matcher
 * keeps them from paying for the hop at all. Matcher values must be static
 * literals — Next analyses them at build time.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|icons|.*\\..*).*)"],
};
