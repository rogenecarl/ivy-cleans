/**
 * The admin's own URL prefix, as a value.
 *
 * The unguessable segment IS the folder name, so this constant must be kept
 * in step with it by hand — renaming the folder means editing this line, and
 * nothing else. It exists because redirect() and the client components need an
 * absolute path (a relative "./generate/x" is resolved against the *action's*
 * URL, not the page's, which is not the same thing), and hard-coding the
 * segment in five places would guarantee one of them is missed at rename time.
 *
 * A separate module from actions.ts on purpose: a 'use server' file may only
 * export async functions, so a plain string constant cannot live there.
 */
export const ADMIN_BASE = '/admin-x7kq92mpfw4rt8vz'

/** The Sites (cities) list. Was the admin root until the Dashboard took that
 * slot; every "back to cities" link points here, not at ADMIN_BASE. */
export const ADMIN_SITES = `${ADMIN_BASE}/sites`

/** The Leads list. */
export const ADMIN_LEADS = `${ADMIN_BASE}/leads`
