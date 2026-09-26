import Link from 'next/link'
import { FileText, Star, Users, FolderOpen, HardDrive, ArrowRight, Lock } from 'lucide-react'
import { createClient, getProfile } from '@/lib/supabase/server'
import { getStorageStats } from '@/lib/actions/files'
import { formatBytes, timeAgo, fileIcon } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = createClient()
  const profile = await getProfile()
  const userId = profile!.id
  const stats = await getStorageStats()

  const [{ data: recent }, { data: docs }, { data: shared }, { data: starred }, { data: protectedFiles }] = await Promise.all([
    supabase.from('files').select('id, name, mime_type, size, updated_at, protected').is('deleted_at', null).order('updated_at', { ascending: false }).limit(6),
    supabase.from('files').select('id, name, updated_at').eq('is_document', true).is('deleted_at', null).order('updated_at', { ascending: false }).limit(4),
    supabase.from('shares').select('id, created_at, file_id, folder_id').eq('created_by', userId).eq('revoked', false).order('created_at', { ascending: false }).limit(4),
    supabase.from('files').select('id, name, mime_type').eq('starred', true).is('deleted_at', null).limit(4),
    supabase.from('files').select('id', { count: 'exact', head: true }).eq('protected', true).is('deleted_at', null),
  ])

  const pct = Math.min(100, Math.round((stats.used / Math.max(1, stats.limit)) * 100))

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">Good to see you, {profile!.display_name?.split(' ')[0] ?? 'there'}</h1>
        <p className="text-ink-secondary mt-1 text-sm">Here’s what’s happening in your cloud.</p>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary-50 text-primary"><HardDrive size={19} /></span>
            <span className="text-xs font-bold text-ink-muted">{pct}% USED</span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-ink">{formatBytes(stats.used)}</p>
          <p className="text-xs text-ink-muted">of {formatBytes(stats.limit)} · <Link href="/storage" className="text-primary font-semibold">Manage</Link></p>
          <div className="mt-3 h-2 rounded-full bg-surface2 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-400' : 'bg-gradient-to-r from-primary-500 to-primary-400'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <StatCard icon={FolderOpen} label="Files stored" value={String(stats.fileCount)} href="/files" tone="bg-sky-50 text-sky-600" />
        <StatCard icon={Lock} label="Protected files" value={String(protectedFiles?.length ?? 0)} href="/search?filter=protected" tone="bg-amber-50 text-amber-500" />
        <StatCard icon={Users} label="Active shares" value={String(shared?.length ?? 0)} href="/shared" tone="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent files */}
        <div className="card p-6 lg:col-span-2">
          <SectionHead title="Recent files" href="/recent" />
          {recent?.length ? (
            <div className="divide-y divide-line">
              {recent.map((f) => { const I = fileIcon(f.mime_type); return (
                <Link key={f.id} href={f.mime_type === 'application/vnd.nexcloud.document' ? `/documents/${f.id}` : `/files`} className="flex items-center gap-3 py-3 group">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface2 text-primary group-hover:bg-primary group-hover:text-white transition-colors"><I size={17} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink truncate">{f.name}{f.protected && <Lock size={12} className="text-amber-500" />}</span>
                    <span className="text-xs text-ink-muted">{formatBytes(f.size)} · {timeAgo(f.updated_at)}</span>
                  </span>
                  <ArrowRight size={15} className="text-ink-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              ) })}
            </div>
          ) : <EmptyLine text="No files yet — upload your first file." />}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <SectionHead title="Recent documents" href="/documents" />
            {docs?.length ? docs.map((d) => (
              <Link key={d.id} href={`/documents/${d.id}`} className="flex items-center gap-3 py-2.5 group">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary-50 text-primary"><FileText size={15} /></span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">{d.name}</span>
                <span className="text-xs text-ink-muted">{timeAgo(d.updated_at)}</span>
              </Link>
            )) : <EmptyLine text="Create your first document." />}
          </div>
          <div className="card p-6">
            <SectionHead title="Favorites" href="/favorites" />
            {starred?.length ? starred.map((f) => { const I = fileIcon(f.mime_type); return (
              <div key={f.id} className="flex items-center gap-3 py-2.5">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-amber-50 text-amber-500"><I size={15} /></span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{f.name}</span>
              </div>
            ) }) : <EmptyLine text="Star important files to find them quickly." />}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, href, tone }: { icon: any; label: string; value: string; href: string; tone: string }) {
  return (
    <Link href={href} className="card p-5 hover:shadow-lift hover:-translate-y-0.5 transition-all block">
      <span className={`grid place-items-center w-10 h-10 rounded-xl ${tone}`}><Icon size={19} /></span>
      <p className="mt-3 text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </Link>
  )
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="font-bold text-ink">{title}</h2>
      <Link href={href} className="text-xs font-bold text-primary hover:underline">View all</Link>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-ink-muted py-6 text-center">{text}</p>
}
