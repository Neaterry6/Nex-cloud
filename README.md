# Nex Cloud

Premium cloud storage & document management — white/blue, iOS-liquid-glass UI.
Next.js App Router + Supabase (Auth, Postgres, Storage, Realtime, Edge Functions).
Resend-ready email; fully functional without it. Deploys to Vercel.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

## 1. Supabase setup (5 minutes)

1. Create a project at supabase.com → **Project Settings → API**: copy `URL`, `anon key`, `service_role key`.
2. Apply the schema: paste `supabase/migrations/0001_nexcloud_schema.sql` into the **SQL Editor** (or `supabase db push`).
3. Deploy the Edge Functions (Dashboard → Edge Functions → Create, or CLI):
   - `protect-file` (from `supabase/functions/protect-file/index.ts`)
   - `verify-file-password`
   - `share-access`
   - `send-email`
   Set the secrets: `SUPABASE_SERVICE_ROLE_KEY`, `EDGE_FUNCTION_SECRET`, and optionally
   `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` (Edge Function → Secrets).
4. **Auth → Providers**: enable Email. **Auth → URL Configuration**: set Site URL to your Vercel
   domain and add `https://yourdomain/auth/callback` to redirect URLs.

## 2. Vercel deploy

1. Push this folder to GitHub/GitLab.
2. Vercel → **New Project** → import repo (framework auto-detected: Next.js).
3. Add Environment Variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key (server-only) |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain` |
| `EDGE_FUNCTION_SECRET` | long random string (same as Edge Function secret) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` | optional |

4. Deploy. Done — no other config needed (`vercel.json` is included).

## 3. Make yourself admin

SQL Editor: `update profiles set role='admin' where email='you@example.com';`

## Security notes

- RLS isolates every user's data; the `files` bucket is private, served only via signed URLs.
- File/share passwords use PBKDF2-SHA256 (210k iterations), verified only in Edge Functions;
  `protected_files.password_hash` and `shares.password_hash` are unreadable to clients (RLS + column REVOKE).
- Failed password attempts are rate-limited (5 tries → 15-min lockout).
- The service-role key and Resend key never appear in client code.
