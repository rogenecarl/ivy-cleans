/**
 * The console's URL prefix and section paths, as values.
 *
 * These exist because redirect(), the client components and the proxy all
 * need an absolute path (a relative "./generate/x" resolves against the
 * *action's* URL, not the page's, which is not the same thing), and because
 * hard-coding the segment in twenty places would guarantee one is missed.
 *
 * Lives in src/lib/, not next to the routes, for two reasons: the (console)
 * route group makes the relative depth from each console file different, so
 * an absolute "@/lib/admin-routes" is the only import specifier that works
 * everywhere; and src/lib/access.ts needs these constants, so keeping them
 * under src/app/ would have a lib module reaching into the app tree.
 */
export const ADMIN_BASE = '/admin'

/** The console's landing screen. Was ADMIN_BASE itself until the dashboard
 * got its own segment; ADMIN_BASE now only redirects here. */
export const ADMIN_DASHBOARD = `${ADMIN_BASE}/dashboard`

/** The Leads list. */
export const ADMIN_LEADS = `${ADMIN_BASE}/leads`

/** The Sites (cities) list. Every "back to cities" link points here. */
export const ADMIN_SITES = `${ADMIN_BASE}/sites`

/** The login screen. The one path under ADMIN_BASE that is NOT session-gated,
 * which is why it sits outside the (console) route group. */
export const ADMIN_LOGIN = `${ADMIN_BASE}/login`
