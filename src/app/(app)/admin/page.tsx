import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminUserCard from '@/components/AdminUserCard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Server-side gate. The hidden nav link is cosmetic; this is the lock.
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, role, is_banned, ban_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: reports } = await supabase
    .from('reports')
    .select('id, reason, details, status, created_at, reporter_id, reported_id')
    .order('created_at', { ascending: false })
    .limit(50)

  const openReports = reports?.filter((r) => r.status === 'open') ?? []
  const banned = users?.filter((u) => u.is_banned).length ?? 0

  return (
    <div className="space-y-12">
      <div>
        <p className="t-eyebrow mb-1.5">Moderation</p>
        <h1 className="t-display text-3xl">Admin</h1>
      </div>

      <dl className="grid grid-cols-3 gap-px bg-[var(--color-field-800)] border border-[var(--color-field-800)]">
        {[
          ['Players', users?.length ?? 0],
          ['Banned', banned],
          ['Open reports', openReports.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[var(--color-field-900)] px-4 py-4">
            <dt className="t-eyebrow mb-1.5">{label}</dt>
            <dd className="t-data text-xl">{value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <p className="t-eyebrow mb-3">Reports</p>
        {openReports.length === 0 ? (
          <p className="text-sm text-[var(--color-bone-dim)] border border-dashed border-[var(--color-field-700)] px-5 py-8 text-center">
            No open reports.
          </p>
        ) : (
          <ul className="space-y-2">
            {openReports.map((r) => (
              <li key={r.id} className="stub pl-5 pr-4 py-4">
                <p className="t-data text-xs uppercase tracking-widest text-[var(--color-hit)]">
                  {r.reason}
                </p>
                {r.details && (
                  <p className="text-sm text-[var(--color-bone-dim)] mt-2">{r.details}</p>
                )}
                <p className="t-data text-xs text-[var(--color-bone-faint)] mt-2">
                  {r.created_at?.slice(0, 10)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="t-eyebrow mb-3">All players</p>
        <ul className="space-y-2">
          {users?.map((u) => (
            <AdminUserCard key={u.id} user={u} isMe={u.id === user.id} />
          ))}
        </ul>
      </section>
    </div>
  )
}
