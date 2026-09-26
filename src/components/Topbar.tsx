'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Bell, Plus, ChevronDown, LogOut, User as UserIcon, FileText, FolderPlus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createFolder } from '@/lib/actions/files'
import { createDocument } from '@/lib/actions/docs'
import { useToast } from './Toaster'
import { timeAgo, cn } from '@/lib/utils'

type Profile = { id: string; email: string; display_name: string | null; avatar_path: string | null; role: string }

export function Topbar({ profile, children }: { profile: Profile; children?: React.ReactNode }) {
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(15)
      .then(({ data }) => { setNotifs(data ?? []); setUnread((data ?? []).filter((n) => !n.read).length) })
    const channel = supabase.channel('notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (p) => {
        setNotifs((n) => [p.new, ...n].slice(0, 15)); setUnread((u) => u + 1)
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.id])

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    setUnread(0); setNotifs((n) => n.map((x) => ({ ...x, read: true })))
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login'); router.refresh()
  }

  const initials = (profile.display_name ?? profile.email).slice(0, 1).toUpperCase()

  return (
    <header className="sticky top-0 z-30 glass border-b border-line">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
        <form className="relative flex-1 max-w-md" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`) }} role="search">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files, folders, documents…"
            className="input pl-10 bg-surface/60" aria-label="Search" />
        </form>
        <div className="flex-1" />
        {children}
        <div className="relative">
          <button onClick={() => setCreateOpen((v) => !v)} className="btn-primary !px-3.5" aria-label="Create new" aria-expanded={createOpen}>
            <Plus size={18} />
            <span className="hidden sm:inline">Create</span>
          </button>
          {createOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCreateOpen(false)} />
              <div className="absolute right-0 top-12 z-50 card p-2 w-52 animate-pop shadow-lift">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-ink-secondary hover:bg-primary-50 hover:text-primary-700"
                  onClick={async () => { setCreateOpen(false); const name = prompt('Folder name'); if (name) { await createFolder(name, null); toast('Folder created'); router.refresh() } }}>
                  <FolderPlus size={17} /> New folder
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-ink-secondary hover:bg-primary-50 hover:text-primary-700"
                  onClick={async () => { setCreateOpen(false); const id = await createDocument('Untitled document'); toast('Document created'); router.push(`/documents/${id}`) }}>
                  <FileText size={17} /> New document
                </button>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button onClick={() => { setShowNotifs((v) => !v); if (!showNotifs && unread) markAllRead() }} className="relative btn-ghost !px-3" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
            <Bell size={19} />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-primary text-white text-[10px] font-bold">{unread > 9 ? '9+' : unread}</span>}
          </button>
          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 top-12 z-50 card w-80 animate-pop shadow-lift overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">Notifications</span>
                  <button onClick={markAllRead} className="text-xs font-semibold text-primary flex items-center gap-1"><Check size={13} /> Mark read</button>
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifs.length === 0 && <p className="px-4 py-8 text-sm text-ink-muted text-center">No notifications yet.</p>}
                  {notifs.map((n) => (
                    <div key={n.id} className={cn('px-4 py-3 border-b border-line last:border-0', !n.read && 'bg-primary-50/50')}>
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                      {n.body && <p className="text-xs text-ink-secondary mt-0.5">{n.body}</p>}
                      <p className="text-[11px] text-ink-muted mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2.5 rounded-xl pl-1.5 pr-2.5 py-1.5 hover:bg-surface2 transition-colors" aria-label="Account menu" aria-expanded={menu}>
            {profile.avatar_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_path}`} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="grid place-items-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-sm font-bold">{initials}</span>
            )}
            <span className="hidden sm:block text-sm font-semibold text-ink max-w-[140px] truncate">{profile.display_name ?? profile.email}</span>
            <ChevronDown size={15} className="text-ink-muted" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-12 z-50 card w-56 p-2 animate-pop shadow-lift">
                <Link href="/settings" onClick={() => setMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-ink-secondary hover:bg-primary-50 hover:text-primary-700"><UserIcon size={16} /> Profile & settings</Link>
                <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={16} /> Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
