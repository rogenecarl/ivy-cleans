'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '../submit-button'
import { signInAction, type SignInState } from './actions'

/*
 * No react-hook-form and no zodResolver, unlike peaktransport's version of
 * this form: neither library is in this project, and adding one to validate
 * two required fields is not worth the dependency. The pattern here is the
 * one every other form in this console uses.
 *
 * TOASTS, and why this differs from peaktransport's version. peaktransport
 * signs in CLIENT-side (authClient.signIn.email() then router.push()), so it
 * can raise a success toast while still mounted. This form posts to a server
 * action that ends in redirect(), so on success the page is already
 * navigating -- a success toast would either never paint or flash. The
 * feedback for success is landing on the dashboard. What IS worth toasting:
 *
 *   - the wait. A cold Neon connection plus scrypt has been measured at ~8s
 *     on this project; eight seconds of nothing reads as broken.
 *   - the failure, which is easy to miss as inline text alone. The inline
 *     message below stays too -- it survives after the toast auto-dismisses,
 *     which matters while someone is still retyping.
 */
export function LoginForm({ next, signedOut }: { next: string; signedOut?: boolean }) {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    signInAction,
    null,
  )

  /*
   * Holds the loading toast so the result can replace it in place rather than
   * stacking a second toast on top of it (sonner's `id` option), and so the
   * unmount cleanup below can dismiss it.
   */
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

  /*
   * On SUCCESS the action redirects, this component unmounts, and nothing
   * ever resolves the loading toast -- and because the Toaster now lives in
   * the outer /admin layout, that orphan would follow the operator onto the
   * dashboard and sit there indefinitely. Dismissing on unmount is what
   * closes it; do not remove this thinking the toast is self-limiting.
   */
  useEffect(() => {
    return () => {
      if (loadingToast.current !== null) toast.dismiss(loadingToast.current)
    }
  }, [])

  /*
   * Sign-out redirects here with ?signedout=1 rather than carrying a flash
   * message, because sign-out always lands on this one page -- a query param
   * costs nothing where a cookie-backed flash would be machinery. The param
   * is stripped with replaceState so a refresh does not re-announce it, and
   * because history.replaceState does not re-render, this cannot loop.
   */
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
