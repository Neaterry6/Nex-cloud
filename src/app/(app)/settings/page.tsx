'use client'

import { useEffect, useRef, useState } from 'react'
import { User, KeyRound, Bell, Palette, Loader2, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toaster'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const supabase = createClient()
  const toast = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [tab, setTab] = useState<'profile' | 'security' | 'notifications' | 'appearance'>('profile')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [prefs, setPrefs] = useState({ emailNotifications: true, inAppNotifications: true, compact: false })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('profiles').select('*').single().then(({ data }) => {
      if (!data) return
      setProfile(data); setDisplayName(data.display_name ?? ''); setUsername(data.username ?? '')
      setPrefs((p) => ({ ...p, ...(data.preferences ?? {}) }))
    })
  }, [])

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ display_name: displayName, username: username || null }).eq('id', profile.id)
    setSaving(false)
    if (error) { toast('Could not save profile. Username may be taken.', 'error'); return }
    toast('Profile updated')
  }

  async function changePassword() {
    if (pw.next.length < 8) { toast('New password must be at least 8 characters', 'error'); return }
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    if (error) { toast(error.message, 'error'); return }
    setPw({ current: '', next: '' }); toast('Password updated')
  }

  async function uploadAvatar(file: File) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`
    const { error: up } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (up) { toast('Avatar upload failed', 'error'); return }
    await supabase.from('profiles').update({ avatar_path: path }).eq('id', user.id)
    toast('Avatar updated'); location.reload()
  }

  async function savePrefs(next: typeof prefs) {
    setPrefs(next)
    await supabase.from('profiles').update({ preferences: next }).eq('id', profile.id)
  }

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: KeyRound },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ] as const

  if (!profile) return <div className="space-y-4 max-w-3xl">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>

  return (
    <div className="animate-fadeUp max-w-3xl">
      <h1 className="text-2xl font-bold text-ink mb-5">Settings</h1>
      <div className="flex gap-2 mb-6 overflow-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('btn !py-2 whitespace-nowrap', tab === t.id ? 'bg-primary-50 text-primary-700' : 'text-ink-secondary hover:bg-surface2')}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-5">
            <button onClick={() => fileRef.current?.click()} className="relative group" aria-label="Change avatar">
              {profile.avatar_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_path}`} alt="Avatar" className="w-20 h-20 rounded-3xl object-cover" />
              ) : (
                <span className="grid place-items-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-2xl font-bold">{(displayName || profile.email)[0].toUpperCase()}</span>
              )}
              <span className="absolute inset-0 rounded-3xl bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white"><Camera size={20} /></span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            <div>
              <p className="font-bold text-ink">{displayName || 'Your name'}</p>
              <p className="text-sm text-ink-muted">{profile.email}</p>
              <p className="text-xs text-ink-muted mt-1">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div><label className="label" htmlFor="dn">Display name</label>
            <input id="dn" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
          <div><label className="label" htmlFor="un">Username</label>
            <input id="un" className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. ada-l" /></div>
          <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : 'Save changes'}</button>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6 space-y-5">
          <div><label className="label" htmlFor="pw">New password</label>
            <input id="pw" type="password" className="input" placeholder="At least 8 characters" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <button className="btn-primary" onClick={changePassword}>Update password</button>
          <p className="text-xs text-ink-muted pt-3 border-t border-line">Password-protected files are managed from the file menu (right-click → Protect with password) and are verified server-side only.</p>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card p-6 space-y-4">
          {([
            ['emailNotifications', 'Email notifications', 'Shares, mentions, and security alerts via Resend (when configured by an admin).'],
            ['inAppNotifications', 'In-app notifications', 'Realtime notifications inside Nex Cloud.'],
          ] as const).map(([key, title, desc]) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={(prefs as any)[key]} onChange={(e) => savePrefs({ ...prefs, [key]: e.target.checked })} className="w-5 h-5 mt-0.5 accent-primary-600" />
              <span><span className="block font-semibold text-ink text-sm">{title}</span><span className="block text-xs text-ink-muted mt-0.5">{desc}</span></span>
            </label>
          ))}
        </div>
      )}

      {tab === 'appearance' && (
        <div className="card p-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={prefs.compact} onChange={(e) => savePrefs({ ...prefs, compact: e.target.checked })} className="w-5 h-5 mt-0.5 accent-primary-600" />
            <span><span className="block font-semibold text-ink text-sm">Compact lists</span><span className="block text-xs text-ink-muted mt-0.5">Denser spacing in list view. Light mode is the default Nex Cloud experience.</span></span>
          </label>
        </div>
      )}
    </div>
  )
}
