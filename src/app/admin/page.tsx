import { redirect } from 'next/navigation'
import { ADMIN_DASHBOARD } from '@/lib/admin-routes'

/*
 * /admin itself renders nothing. The dashboard used to live here; it now has
 * its own segment so that "Dashboard" is a real destination rather than the
 * console root, which is what let nav.tsx drop its special case.
 *
 * Kept as a redirect rather than deleted so a bookmark or a typed /admin
 * still lands somewhere useful.
 */
export default function AdminIndex() {
  redirect(ADMIN_DASHBOARD)
}
