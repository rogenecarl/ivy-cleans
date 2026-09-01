'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { Role } from '@/lib/access'

/*
 * The success half of the sign-in feedback, and the reason it is shaped like
 * this rather than living in the login form.
 *
 * signInAction ends in redirect(), so by the time sign-in has succeeded the
 * login form is already unmounting -- a toast raised there would never paint.
 * The toast therefore has to be raised at the DESTINATION. Sign-out can use a
 * plain ?signedout=1 on the login page because it has exactly one
 * destination; sign-in lands wherever safeNext() sends it, so this component
 * sits in the console layout, which every one of those destinations shares.
 *
 * It reads the marker with useSearchParams rather than taking a server prop
 * because a layout does not receive searchParams -- only pages do. Stripping
 * the param with history.replaceState (not router.replace) is deliberate: it
 * rewrites the URL without a re-render, so a refresh will not re-announce the
 * sign-in and this cannot feed back into its own effect.
 */
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
