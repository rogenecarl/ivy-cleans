'use client'

import { useActionState } from 'react'
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
 * The error is rendered inline rather than toasted. A toast for a failed
 * sign-in disappears while the operator is still retyping.
 */
export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signInAction, null)

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
