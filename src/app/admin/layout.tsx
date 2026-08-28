import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './admin.css'

/*
 * The outer shell for everything under /admin, INCLUDING the login screen.
 *
 * It carries only the two things both the login screen and the console need:
 * the admin CSS root, and metadata. The session guard and the visible console
 * chrome live one level down in (console)/layout.tsx — putting them here
 * would gate /admin/login on having a session, which is a redirect loop.
 *
 * `data-admin-root` is the hook admin.css uses to reset the root font-size
 * ladder for these pages, and the hook the shadcn base-layer resets key off.
 *
 * NO site chrome and no fidelity components: this route sits outside
 * (sites)/[city] precisely so it can never contribute a byte to a customer
 * page, and importing a site component would tie the two together again
 * through the shared CSS scan.
 */
export const metadata: Metadata = {
  title: 'Ivy Cleans: Site Manager',
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div data-admin-root className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
