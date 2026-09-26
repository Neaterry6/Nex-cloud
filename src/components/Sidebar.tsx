'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Cloud, Home, FolderOpen, Clock, Star, Users, FileText, Image as ImageIcon,
  Film, Trash2, Settings, HardDrive, ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/files', label: 'My Files', icon: FolderOpen },
  { href: '/recent', label: 'Recent', icon: Clock },
  { href: '/favorites', label: 'Favorites', icon: Star },
  { href: '/shared', label: 'Shared with me', icon: Users },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/photos', label: 'Photos', icon: ImageIcon },
  { href: '/videos', label: 'Videos', icon: Film },
  { href: '/trash', label: 'Trash', icon: Trash2 },
]

export function Sidebar({ isAdmin, used, limit }: { isAdmin: boolean; used: number; limit: number }) {
  const pathname = usePathname()
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-line bg-white/70 backdrop-blur-xl sticky top-0 h-screen px-4 py-6 overflow-y-auto">
      <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-ink px-2 mb-8">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glass"><Cloud size={19} /></span>
        Nex Cloud
      </Link>
      <nav className="flex-1 space-y-1" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all',
                active ? 'bg-primary-50 text-primary-700' : 'text-ink-secondary hover:bg-surface2 hover:text-ink')}>
              <Icon size={18} className={active ? 'text-primary' : ''} /> {label}
            </Link>
          )
        })}
        {isAdmin && (
          <Link href="/admin"
            className={cn('flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all',
              pathname.startsWith('/admin') ? 'bg-primary-50 text-primary-700' : 'text-ink-secondary hover:bg-surface2 hover:text-ink')}>
            <ShieldCheck size={18} className={pathname.startsWith('/admin') ? 'text-primary' : ''} /> Admin
          </Link>
        )}
        <Link href="/settings"
          className={cn('flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all',
            pathname.startsWith('/settings') ? 'bg-primary-50 text-primary-700' : 'text-ink-secondary hover:bg-surface2 hover:text-ink')}>
          <Settings size={18} className={pathname.startsWith('/settings') ? 'text-primary' : ''} /> Settings
        </Link>
      </nav>
      <Link href="/storage" className="card p-4 mt-6 block hover:shadow-lift transition-shadow">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-ink-secondary"><HardDrive size={14} className="text-primary" /> Storage</span>
          <span className={cn(pct > 90 ? 'text-red-500' : 'text-ink-muted')}>{pct}%</span>
        </div>
        <div className="mt-2.5 h-2 rounded-full bg-surface2 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', pct > 90 ? 'bg-red-400' : 'bg-gradient-to-r from-primary-500 to-primary-400')} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">Manage storage →</p>
      </Link>
    </aside>
  )
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = NAV.slice(0, 4).concat([{ href: '/files', label: 'Files', icon: FolderOpen }])
  void isAdmin
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-line flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-label="Mobile">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link key={label + href} href={href} className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold', active ? 'text-primary-700' : 'text-ink-muted')}>
            <Icon size={21} /> {label}
          </Link>
        )
      })}
    </nav>
  )
}
