import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveRewrite } from "@/content/resolve-rewrite";

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
export function proxy(req: NextRequest) {
  const target = resolveRewrite(req.headers.get("host") ?? "", req.nextUrl.pathname);
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
