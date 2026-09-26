'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Cloud, Lock, Download, FileWarning, ShieldCheck, FolderOpen } from 'lucide-react'
import { fileIcon, formatBytes, cn } from '@/lib/utils'

const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/share-access`

type Info = { kind: 'file' | 'folder'; name: string; mimeType?: string; size?: number; needsPassword: boolean; allowDownload: boolean; allowPreview: boolean; expiresAt: string | null }

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [granted, setGranted] = useState<{ url?: string; items?: any[] } | null>(null)

  useEffect(() => {
    fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'info', token }) })
      .then(async (r) => {
        const b = await r.json()
        if (!r.ok) throw new Error(b.error ?? 'Link unavailable')
        setInfo(b)
        if (!b.needsPassword) verify('')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  async function verify(pw: string) {
    setUnlocking(true); setPwError('')
    try {
      const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', token, password: pw }) })
      const b = await r.json()
      if (!r.ok) throw new Error(b.error ?? 'Could not unlock')
      setGranted({ url: b.url, items: b.items })
    } catch (e: any) {
      if (pw) setPwError(e.message)
      else setError(e.message)
    } finally { setUnlocking(false) }
  }

  const Icon = info?.mimeType ? fileIcon(info.mimeType) : FolderOpen

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 font-bold text-xl text-ink mb-8">
          <span className="grid place-items-center w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glass"><Cloud size={20} /></span>
          Nex Cloud
        </div>

        {loading ? (
          <div className="card p-8 space-y-4">
            <div className="skeleton h-16 w-16 mx-auto rounded-2xl" />
            <div className="skeleton h-5 w-2/3 mx-auto" />
            <div className="skeleton h-4 w-1/2 mx-auto" />
          </div>
        ) : error ? (
          <div className="card p-10 text-center animate-pop">
            <FileWarning size={44} className="mx-auto text-amber-500" />
            <h1 className="mt-4 font-bold text-lg text-ink">Link unavailable</h1>
            <p className="mt-2 text-sm text-ink-secondary">{error}</p>
          </div>
        ) : (
          <div className="card p-8 animate-pop">
            <div className="flex flex-col items-center text-center">
              <span className="relative grid place-items-center w-20 h-20 rounded-3xl bg-primary-50 text-primary">
                <Icon size={36} />
                {info!.needsPassword && !granted && (
                  <span className="absolute -bottom-1.5 -right-1.5 grid place-items-center w-8 h-8 rounded-full bg-white border border-line shadow-soft"><Lock size={14} className="text-amber-500" /></span>
                )}
              </span>
              <h1 className="mt-5 font-bold text-xl text-ink break-all">{info!.name}</h1>
              <p className="mt-1.5 text-sm text-ink-muted">
                {info!.kind === 'file' ? `${info!.mimeType} · ${formatBytes(info!.size ?? 0)}` : 'Shared folder'}
                {info!.expiresAt && <span className="block mt-1">Expires {new Date(info!.expiresAt).toLocaleDateString()}</span>}
              </p>
            </div>

            {granted ? (
              <div className="mt-7 space-y-3">
                {granted.url && info!.allowPreview && (
                  <a href={granted.url} target="_blank" rel="noreferrer" className="btn-primary w-full">Open preview</a>
                )}
                {granted.url && info!.allowDownload && (
                  <a href={granted.url} download={info!.name} className="btn-secondary w-full"><Download size={16} /> Download</a>
                )}
                {granted.items && (
                  <div className="border border-line rounded-2xl divide-y divide-line max-h-64 overflow-auto">
                    {granted.items.map((it) => (
                      <a key={it.id} href={it.url} download={it.name} className="flex items-center gap-3 px-4 py-3 hover:bg-surface text-sm">
                        <span className="text-primary">{(() => { const I = fileIcon(it.mimeType); return <I size={18} /> })()}</span>
                        <span className="flex-1 truncate text-ink-secondary">{it.name}</span>
                        <span className="text-xs text-ink-muted">{formatBytes(it.size)}</span>
                      </a>
                    ))}
                  </div>
                )}
                <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted pt-2"><ShieldCheck size={13} className="text-emerald-500" /> Access granted · links expire in 30 minutes</p>
              </div>
            ) : info!.needsPassword ? (
              <form className="mt-7 space-y-3" onSubmit={(e) => { e.preventDefault(); verify(password) }}>
                <div>
                  <label htmlFor="pw" className="label sr-only">Password</label>
                  <input id="pw" type="password" className={cn('input text-center tracking-widest', pwError && 'border-red-300 ring-4 ring-red-50')} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                  {pwError && <p className="mt-2 text-sm text-red-600 text-center animate-pop">{pwError}</p>}
                </div>
                <button type="submit" disabled={unlocking || !password} className="btn-primary w-full">{unlocking ? 'Verifying…' : 'Unlock'}</button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
