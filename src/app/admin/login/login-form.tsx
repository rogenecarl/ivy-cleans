'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '../submit-button'
import { signInAction, type SignInState } from './actions'

// No form library for two fields. Success is the redirect itself (a toast would never paint); what's worth toasting
// is the wait (~8s on a cold Neon + scrypt) and the failure.
export function LoginForm({ next, signedOut }: { next: string; signedOut?: boolean }) {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    signInAction,
    null,
  )

  // holds the loading toast so the result replaces it in place and unmount can dismiss it
  const loadingToast = useRef<string | number | null>(null)

  useEffect(() => {
    if (isPending) loadingToast.current = toast.loading('Signing in…')
  }, [isPending])

  useEffect(() => {
    if (!state?.error) return
    if (loadingToast.current !== null) {
      toast.error(state.error, { id: loadingToast.current })
      loadingToast.current = null
    } else {
      toast.error(state.error)
    }
  }, [state])

  // on success the action redirects and this unmounts; dismiss the loading toast or it follows the operator onto the dashboard
  useEffect(() => {
    return () => {
      if (loadingToast.current !== null) toast.dismiss(loadingToast.current)
    }
  }, [])

  // sign-out lands here with ?signedout=1; stripped with replaceState so a refresh doesn't re-announce it
  useEffect(() => {
    if (!signedOut) return
    toast.success('Signed out.')
    const url = new URL(window.location.href)
    url.searchParams.delete('signedout')
    window.history.replaceState(null, '', url.toString())
  }, [signedOut])

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[0.85rem]">
          Email
        </Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[0.85rem]">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-[0.8rem] text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Signing in" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  )
}
