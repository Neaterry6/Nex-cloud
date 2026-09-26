import { redirect } from 'next/navigation'
import { Users, FileStack, ShieldCheck, Share2, Lock, MailWarning, HardDrive } from 'lucide-react'
import { createClient, createServiceClient, getProfile } from '@/lib/supabase/server'
import { formatBytes } from '@/lib/utils'
import { AdminActions } from './AdminActions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const service = createServiceClient()
  const [{ count: totalUsers }, { data: filesAgg }, { count: totalShares }, { count: protectedCount }, { count: docCount }, { data: recentActivity }, { data: users }, { data: emailSettings }] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true }),
    service.from('files').select('size').is('deleted_at', null),
    service.from('shares').select('id', { count: 'exact', head: true }).eq('revoked', false),
    service.from('files').select('id', { count: 'exact', head: true }).eq('protected', true),
    service.from('files').select('id', { count: 'exact', head: true }).eq('is_document', true),
    service.from('activity_logs').select('action, created_at, user_id').order('created_at', { ascending: false }).limit(10),
    service.from('profiles').select('id, email, display_name, role, suspended, created_at').order('created_at', { ascending: false }).limit(50),
    service.from('admin_settings').select('value').eq('key', 'email').single(),
  ])

  const totalStorage = (filesAgg ?? []).reduce((a: number, f: any) => a + (f.size ?? 0), 0)
  const emailConfigured = !!process.env.RESEND_API_KEY || emailSettings?.value?.configured === true

  const stats = [
    { icon: Users, label: 'Total users', value: String(totalUsers ?? 0), tone: 'bg-primary-50 text-primary' },
    { icon: FileStack, label: 'Total files', value: String(filesAgg?.length ?? 0), tone: 'bg-sky-50 text-sky-600' },
    { icon: HardDrive, label: 'Storage used', value: formatBytes(totalStorage), tone: 'bg-emerald-50 text-emerald-600' },
    { icon: FileStack, label: 'Documents', value: String(docCount ?? 0), tone: 'bg-violet-50 text-violet-600' },
    { icon: Share2, label: 'Active shares', value: String(totalShares ?? 0), tone: 'bg-amber-50 text-amber-500' },
    { icon: Lock, label: 'Protected files', value: String(protectedCount ?? 0), tone: 'bg-rose-50 text-rose-500' },
  ]

  return (
    <div className="animate-fadeUp space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2"><ShieldCheck size={24} className="text-primary" /> Admin dashboard</h1>
          <p className="text-sm text-ink-secondary mt-1">Platform overview and management. Access is enforced server-side, not just in the UI.</p>
        </div>
        <span className={`flex items-center gap-2 text-xs font-bold rounded-full px-4 py-2 ${emailConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          <MailWarning size={14} /> Resend: {emailConfigured ? 'configured' : 'not configured — in-app notifications still work'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <span className={`grid place-items-center w-10 h-10 rounded-xl ${s.tone}`}><s.icon size={19} /></span>
            <p className="mt-3 text-xl font-extrabold text-ink truncate">{s.value}</p>
            <p className="text-xs text-ink-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-bold text-ink mb-4">Users</h2>
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {(users ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3">
                <span className="grid place-items-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xs font-bold shrink-0">{(u.display_name ?? u.email)[0].toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{u.display_name ?? '—'} {u.role === 'admin' && <span className="text-[10px] font-bold text-primary bg-primary-50 rounded-full px-2 py-0.5 ml-1">ADMIN</span>}</p>
                  <p className="text-xs text-ink-muted truncate">{u.email}</p>
                </div>
                <AdminActions userId={u.id} suspended={u.suspended} isSelf={u.id === profile.id} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-bold text-ink mb-4">Recent platform activity</h2>
            <div className="space-y-2.5">
              {(recentActivity ?? []).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="flex-1 text-ink-secondary font-mono text-xs">{a.action}</span>
                  <span className="text-xs text-ink-muted">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              ))}
              {recentActivity?.length === 0 && <p className="text-sm text-ink-muted">No activity yet.</p>}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-bold text-ink mb-2">Email configuration (Resend)</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Set <code className="bg-surface2 px-1.5 py-0.5 rounded text-xs">RESEND_API_KEY</code>,{' '}
              <code className="bg-surface2 px-1.5 py-0.5 rounded text-xs">RESEND_FROM_EMAIL</code> and{' '}
              <code className="bg-surface2 px-1.5 py-0.5 rounded text-xs">RESEND_FROM_NAME</code> in your Vercel environment variables,
              then redeploy. Until then the app runs normally with in-app notifications only.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
