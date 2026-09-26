'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/update-password` })
    if (error) setError('Could not send the reset email. Check the address and try again.')
    setSent(true); setLoading(false)
  }

  if (sent) return (
    <AuthShell title="Email on its way" subtitle="If an account exists for that address, a reset link is on its way.">
      <div className="text-center py-4">
        <span className="grid place-items-center w-14 h-14 mx-auto rounded-2xl bg-primary-50 text-primary"><MailCheck size={26} /></span>
        <Link href="/login" className="btn-secondary w-full mt-6">Back to sign in</Link>
      </div>
    </AuthShell>
  )

  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we’ll send you a link.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? <Loader2 size={17} className="animate-spin" /> : 'Send reset link'}</button>
      </form>
      <p className="mt-5 text-sm text-center"><Link href="/login" className="text-primary font-semibold hover:underline">Back to sign in</Link></p>
    </AuthShell>
  )
}
