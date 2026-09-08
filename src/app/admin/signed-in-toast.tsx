'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { Role } from '@/lib/access'

// Sign-in success toast, raised at the DESTINATION: the login form is unmounting by then. Reads ?signedin=1 with
// useSearchParams (layouts don't get searchParams) and strips it with history.replaceState so it can't loop.
export function SignedInToast({ role }: { role: Role }) {
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('signedin') !== '1') return

    // Names the role because this console has two, and "which account am I
    // in?" is the question a shared machine actually raises.
    toast.success(`Signed in as ${role}.`)

    const url = new URL(window.location.href)
    url.searchParams.delete('signedin')
    window.history.replaceState(null, '', url.toString())
  }, [params, role])

  return null
}
