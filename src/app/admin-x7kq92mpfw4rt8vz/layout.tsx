import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ADMIN_BASE } from './base'
import './admin.css'

/*
 * The operator console's shell. NO site chrome and no fidelity components:
 * this route sits outside (sites)/[city] precisely so it can never contribute
 * a byte to a customer page, and importing a site component would tie the two
 * together again through the shared CSS scan.
 *
 * `data-admin-root` is the hook admin.css uses to reset the root font-size
 * ladder for these pages — see the comment there.
 */

export const metadata: Metadata = {
  title: 'Ivy Cleans — Site Manager',
  // Belt and braces on top of the unguessable URL: nothing here should ever
  // reach an index, and the admin is linked from no public page.
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-admin-root className="min-h-screen bg-[#f6f7f8] text-[#1b1f23]">
      <header className="border-b border-[#d8dde2] bg-white">
        <div className="mx-auto flex max-w-[64rem] items-center justify-between px-6 py-4">
          <Link href={ADMIN_BASE} className="text-[1.05rem] font-semibold tracking-tight">
            Ivy Cleans — Site Manager
          </Link>
          <span className="text-[0.8rem] text-[#6b7680]">internal</span>
        </div>
      </header>
      <main className="mx-auto max-w-[64rem] px-6 py-8">{children}</main>
    </div>
  )
}
