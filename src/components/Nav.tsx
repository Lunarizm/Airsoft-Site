'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/auth/actions'

const LINKS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/games', label: 'Game log' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/friends', label: 'Friends' },
  { href: '/profile', label: 'Profile' },
]

export default function Nav({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const path = usePathname()

  return (
    <header className="border-b border-[var(--color-field-800)] bg-[var(--color-field-950)]/90 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="t-display text-base shrink-0">
          Airsoft<span className="text-[var(--color-tip)]">Log</span>
        </Link>

        <nav className="flex gap-5 text-sm flex-1 nav-scroll">
          {LINKS.map((l) => {
            const active = path === l.href || path.startsWith(l.href + '/')
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap py-4 border-b-2 -mb-px transition-colors ${
                  active
                    ? 'border-[var(--color-tip)] text-[var(--color-bone)]'
                    : 'border-transparent text-[var(--color-bone-dim)] hover:text-[var(--color-bone)]'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`whitespace-nowrap py-4 border-b-2 -mb-px transition-colors ${
                path.startsWith('/admin')
                  ? 'border-[var(--color-tip)] text-[var(--color-bone)]'
                  : 'border-transparent text-[var(--color-tip-dim)] hover:text-[var(--color-tip)]'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <span className="t-data text-xs text-[var(--color-bone-faint)] hidden sm:inline">
          {username}
        </span>

        <form action={signOut}>
          <button className="t-data text-xs text-[var(--color-bone-dim)] hover:text-[var(--color-hit)] transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}
