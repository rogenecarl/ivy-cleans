// The console's URL prefix and section paths. In src/lib so access.ts and the (console) group can both import them.
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
