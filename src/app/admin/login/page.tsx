import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { safeNext } from '@/lib/access'
import { LoginForm } from './login-form'

/*
 * The one path under /admin that is not session-gated, which is why it sits
 * outside the (console) route group — under (console)/layout.tsx's guard it
 * would redirect to itself forever.
 *
 * force-dynamic because it reads the session to bounce an operator who is
 * already signed in. Without it Next would try to prerender a page whose
 * whole job is to look at cookies.
 */
export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; signedout?: string }>
}) {
  const { next, signedout } = await searchParams
  const user = await getServerUser()
  if (user) redirect(safeNext(next, user.role))

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[26rem] rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/Logo.png"
            alt="Ivy Cleans"
            width={309}
            height={149}
            className="h-10 w-auto"
            priority
          />
        </div>

        <h1 className="mb-1 text-center text-[1.15rem] font-semibold tracking-tight">
          Sign in
        </h1>
        <p className="mb-8 text-center text-[0.8rem] text-muted-foreground">
          This console is for Ivy Cleans staff.
        </p>

        <LoginForm next={next ?? ''} signedOut={signedout === '1'} />
      </div>
    </div>
  )
}
