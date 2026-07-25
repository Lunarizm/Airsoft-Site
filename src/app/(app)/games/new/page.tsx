import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import GameForm from '@/components/GameForm'

export const dynamic = 'force-dynamic'

export default async function NewGamePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fields this player has used before, most recent first.
  const { data: past } = await supabase
    .from('games')
    .select('field_name, played_on')
    .eq('user_id', user!.id)
    .not('field_name', 'is', null)
    .order('played_on', { ascending: false })
    .limit(60)

  const seen = new Set<string>()
  const fields: string[] = []
  for (const row of past ?? []) {
    const name = (row.field_name ?? '').trim()
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      fields.push(name)
    }
  }

  return (
    <div className="max-w-xl">
      <Link href="/games" className="t-eyebrow hover:text-[var(--color-tip)]">
        ← Game log
      </Link>
      <h1 className="t-display text-3xl mt-4 mb-8">Log a game</h1>
      <GameForm fields={fields.slice(0, 12)} />
    </div>
  )
}
