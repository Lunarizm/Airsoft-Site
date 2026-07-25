# Airsoft Log

Log airsoft games, track kills/deaths, get a K/D ratio. Next.js 15 + Supabase.

This is **v1**: accounts, game log, K/D stats. Friends, teams, leaderboards,
clips and the gun locker already have database tables and security policies —
they just don't have screens yet. Build them one at a time.

---

## Setup — about 30 minutes

You need [Node.js 18.18+](https://nodejs.org) installed.

### 1. Make a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine).
2. Create a new project. **Save the database password somewhere safe** — you
   can't recover it, only reset it.
3. Wait ~2 minutes for it to finish provisioning.

### 2. Create the database

1. In your Supabase project, open **SQL Editor** in the left sidebar.
2. Open `supabase/schema.sql` from this project, copy the entire file.
3. Paste it into the SQL Editor and hit **Run**.
4. You should see "Success. No rows returned." That's correct.

### 3. Lock down auth settings

In Supabase, go to **Authentication → Providers → Email**:

- **Confirm email: ON.** Without it, anyone can sign up with an email they
  don't own, including yours.
- Minimum password length: 10.

Then **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` while developing. Change it to your real
  domain when you deploy.
- Redirect URLs: add `http://localhost:3000/auth/callback` and later
  `https://yourdomain.com/auth/callback`.

### 4. Connect the app

1. Copy `.env.example` to `.env.local`.
2. In Supabase go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

**The service_role key bypasses every security rule in the database.** If it
ends up in a public GitHub repo, someone will find it — there are bots that
scan for exactly this — and they can read and delete everything. It must never
have `NEXT_PUBLIC_` in front of it, and `.env.local` is already gitignored.
Leave it that way.

### 5. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 6. Make yourself an admin

1. Sign up through the website first, normally.
2. Confirm your email.
3. Back in the Supabase SQL Editor, run this with your own callsign:

```sql
update public.profiles set role = 'admin' where username = 'YOUR_CALLSIGN';
```

There's no "create admin" button on purpose. A form that grants admin is a
form someone will eventually find a way to submit.

---

## Deploying

1. Push to a GitHub repo. Check `.env.local` is **not** in it before you push.
2. Import the repo at [vercel.com](https://vercel.com).
3. Add all three environment variables in the Vercel project settings.
4. Deploy.
5. Point a subdomain at it (Vercel gives you the DNS records to add in
   Cloudflare — `airsoft.halfbaked.uk` would work).
6. Go back to Supabase → Authentication → URL Configuration and update the
   Site URL and Redirect URLs to your real domain. Auth emails break if you skip this.

---

## How the security actually works

Worth understanding, because if you add features without following the same
pattern you'll open a hole.

**Row Level Security (RLS).** Every table has it on. The database itself
refuses to return rows you're not allowed to see — not the app code. So even
if you write a buggy query that forgets a `WHERE user_id = ...`, Postgres
still won't hand over other people's rows. This is why RLS matters more than
careful frontend code.

**Column grants.** RLS controls which *rows* you can update, not which
*columns*. Without the `revoke update ... grant update (username, ...)` block
at the bottom of the schema, any user could run `update profiles set
role='admin'` on their own row and RLS would allow it, because it genuinely is
their row. That block is the fix.

**`getUser()` not `getSession()`.** `getSession()` reads the cookie, and the
browser controls cookies. `getUser()` revalidates the token against Supabase.
Only the second one proves who someone is.

**Server-side validation.** Every form is re-validated in the server action
with zod. The HTML `required` and `max` attributes are there so users get
useful errors — they're not security. Anyone can POST directly to a server
action with whatever they want.

**Identity comes from the session.** `user_id` on a new game is taken from the
verified session, never from the form. If it came from the form, anyone could
log fake games onto your account.

---

## What to build next, in this order

1. **Friends** — `friendships` table is ready. Search users, send/accept requests.
2. **Teams** — `teams` + `team_members` are ready.
3. **Leaderboard** — the `player_stats` view already computes it. This one is
   mostly just a page.
4. **Clips** — `clips` table only accepts YouTube/Streamable/Medal URLs. Store
   links, embed them. Never host video; bandwidth is the one thing that will
   actually cost you money.
5. **Gun locker** — `guns` table has a `parts` JSONB column for custom builds.

On the "paste an Amazon link and it fills in the gun" idea: Amazon blocks
scrapers and their real API needs an affiliate account with sales history you
won't have. Lancer Tactical has no API at all. What's actually achievable is
fetching the page server-side, reading the OpenGraph tags (`og:title`,
`og:image`, `product:price`) if they exist, and showing a **pre-filled form the
user can correct**. Treat it as a shortcut that fails half the time, not magic.

## What I'd think hard about before building

**DMs and public chat.** Two real costs. First, you become the moderator — when
two users get in a fight at 11pm, that's your problem, at whatever hour it
happens. Second, with open signup and a mostly-teenage userbase, you're
handling private messages between minors, which is a category of
responsibility most adults don't want. An invite-only Discord already does
this for free, better, with moderation tools you don't have to write. The
`reports` table is there so you can act on problems in the features you *do*
ship.

**Before you take real signups:** write a privacy policy and terms page saying
what you collect and how someone deletes their account. With open worldwide
signup this isn't optional paperwork — GDPR and similar laws apply based on
where your *users* are, not where you are.
