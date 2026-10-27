import { redirect } from 'next/navigation'
import { ADMIN_DASHBOARD } from '@/server/auth/admin-routes'

// /admin redirects to the dashboard, which has its own segment
export default function AdminIndex() {
  redirect(ADMIN_DASHBOARD)
}
