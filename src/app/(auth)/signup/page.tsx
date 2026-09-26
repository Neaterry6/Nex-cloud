'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '../login/page'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${location.origin}/auth/callback`, data: { display_name: name } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, type: 'welcome', subject: 'Welcome to Nex Cloud' }),
    }).catch(() => {})
    setSent(true)
  }

  if (sent) return (
    <AuthShell title="Check your inbox" subtitle="We sent a verification link to your email.">
      <div className="text-center py-4">
        <span className="grid place-items-center w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-500"><Check size={26} /></span>
        <p className="mt-4 text-sm text-ink-secondary">Click the link in the email to verify your account, then sign in.</p>
        <Link href="/login" className="btn-primary w-full mt-6">Go to sign in</Link>
      </div>
    </AuthShell>
  )

  return (
    <AuthShell title="Create your cloud" subtitle="Free forever. 5 GB of secure storage.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="label" htmlFor="name">Display name</label>
          <input id="name" className="input" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} className="input" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 animate-pop">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? <Loader2 size={17} className="animate-spin" /> : 'Create account'}</button>
      </form>
      <p className="mt-5 text-sm text-ink-secondary text-center">Already have an account? <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link></p>
    </AuthShell>
  )
}
