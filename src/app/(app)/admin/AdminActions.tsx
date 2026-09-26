'use client'

import { useState } from 'react'
import { Ban, RotateCcw, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toaster'
import { cn } from '@/lib/utils'

export function AdminActions({ userId, suspended, isSelf }: { userId: string; suspended: boolean; isSelf: boolean }) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function toggle() {
    setBusy(true)
    const supabase = createClient()
    // RLS admin policy + server-side role check enforce this.
    const { error } = await supabase.from('profiles').update({ suspended: !suspended }).eq('id', userId)
    setBusy(false)
    if (error) { toast('Action denied — admin rights are verified server-side.', 'error'); return }
    toast(suspended ? 'Account restored' : 'Account suspended')
    location.reload()
  }

  if (isSelf) return <span className="text-xs font-bold text-ink-muted">You</span>

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn('btn !py-1.5 !px-3 !text-xs', suspended ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100')}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : suspended ? <><RotateCcw size={13} /> Restore</> : <><Ban size={13} /> Suspend</>}
    </button>
  )
}
