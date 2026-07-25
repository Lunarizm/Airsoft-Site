import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-dvh flex flex-col">
      <div className="max-w-5xl w-full mx-auto px-5 py-6 flex items-center justify-between">
        <span className="t-display text-base">
          Airsoft<span className="text-[var(--color-tip)]">Log</span>
        </span>
        <Link href="/login" className="t-data text-xs text-[var(--color-bone-dim)] hover:text-[var(--color-bone)]">
          Sign in
        </Link>
      </div>

      <div className="max-w-5xl w-full mx-auto px-5 flex-1 flex items-center">
        <div className="py-16 w-full">
          {params.deleted && (
            <p className="notice notice-ok mb-7 max-w-lg">
              Your account and everything in it has been deleted.
            </p>
          )}

          <p className="t-eyebrow mb-5">Kills · Deaths · K/D · every game you play</p>

          <h1 className="t-display text-5xl sm:text-7xl max-w-3xl mb-6">
            Stop arguing about
            <br />
            <span className="text-[var(--color-tip)]">who actually won.</span>
          </h1>

          <p className="text-[var(--color-bone-dim)] max-w-lg mb-9 leading-relaxed">
            Log every game after you walk off the field. Airsoft Log keeps the
            numbers so the debate in the car ride home has an answer.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">Create free account</Link>
            <Link href="/login" className="btn btn-ghost">Sign in</Link>
          </div>

          <p className="t-data text-xs text-[var(--color-bone-faint)] mt-8">
            You must be 13 or older to sign up.
          </p>
        </div>
      </div>

      <footer className="border-t border-[var(--color-field-800)]">
        <div className="max-w-5xl mx-auto px-5 py-5 t-data text-xs text-[var(--color-bone-faint)]">
          Airsoft Log — a place to log games, not to buy or sell anything.
        </div>
      </footer>
    </main>
  )
}
