'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/AuthShell'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await createClient().auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Almost done — set a fresh password for your account.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="label" htmlFor="password">New password</label>
          <input id="password" type="password" required minLength={8} className="input" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? <Loader2 size={17} className="animate-spin" /> : 'Update password'}</button>
      </form>
    </AuthShell>
  )
}
