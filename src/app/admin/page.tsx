import { redirect } from 'next/navigation'
import { ADMIN_DASHBOARD } from '@/lib/admin-routes'

// /admin redirects to the dashboard, which has its own segment
export default function AdminIndex() {
  redirect(ADMIN_DASHBOARD)
}
