'use client'

import { LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AdminUser } from '@/lib/auth-server'
import { signOutAction } from './sign-out-action'

/*
 * Replaces the hardcoded "A / Admin / Administrator" chip this header carried
 * while the console had no authentication. That version came with a long
 * comment explaining it was a label rather than an account, and that a Sign
 * Out ending no session would be worse than none — both true then, neither
 * true now.
 */

/** First letters of the first two words, for the avatar circle. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export function IdentityChip({ user }: { user: AdminUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-auto flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground ring-2 ring-border"
        >
          {initials(user.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[0.8rem] leading-tight font-medium">{user.name}</span>
          <span className="block text-[0.7rem] leading-tight text-muted-foreground capitalize">
            {user.role}
          </span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-[0.8rem] font-medium">{user.name}</span>
          <span className="block truncate text-[0.7rem] text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
