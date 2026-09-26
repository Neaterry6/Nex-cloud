'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/dashboard'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message)
      setLoading(false)
      return
    }
    router.push(next); router.refresh()
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Nex Cloud workspace">
      <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 animate-pop">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? <Loader2 size={17} className="animate-spin" /> : 'Sign in'}</button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-primary font-semibold hover:underline">Forgot password?</Link>
        <Link href="/signup" className="text-ink-secondary hover:text-ink">Create account</Link>
      </div>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Welcome back" subtitle="Sign in to your Nex Cloud workspace"><div className="h-40 animate-pulse rounded-xl bg-surface2" /></AuthShell>}>
      <LoginForm />
    </Suspense>
  )
}
