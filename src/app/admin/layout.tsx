import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import './admin.css'

// Outer shell for everything under /admin, login included: the admin CSS root and metadata only. The session guard
// lives in (console)/layout.tsx (here it would loop on /admin/login). No site components: this route must never
// contribute a byte to a customer page. <Toaster/> is here so the login screen has one too.
export const metadata: Metadata = {
  title: 'Ivy Cleans: Site Manager',
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div data-admin-root className="min-h-screen bg-background text-foreground">
      {children}
      <Toaster />
    </div>
  )
}
