'use client'

import { useEffect, useState } from 'react'
import { HardDrive, Trash2, ArrowRight } from 'lucide-react'
import { getStorageStats, getLargestFiles } from '@/lib/actions/files'
import { fileIcon, formatBytes, timeAgo } from '@/lib/utils'
import Link from 'next/link'

export default function StoragePage() {
  const [stats, setStats] = useState<{ used: number; limit: number; available: number; fileCount: number } | null>(null)
  const [largest, setLargest] = useState<any[]>([])

  useEffect(() => {
    getStorageStats().then(setStats).catch(() => {})
    getLargestFiles().then(setLargest).catch(() => {})
  }, [])

  if (!stats) return <div className="space-y-4 max-w-3xl">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>

  const pct = Math.min(100, Math.round((stats.used / Math.max(1, stats.limit)) * 100))
  const R = 52, C = 2 * Math.PI * R

  return (
    <div className="animate-fadeUp max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Storage</h1>

      <div className="card p-8 flex flex-col sm:flex-row items-center gap-8">
        <svg viewBox="0 0 120 120" className="w-44 h-44 -rotate-90 shrink-0" role="img" aria-label={`${pct}% storage used`}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f5f9" strokeWidth="14" />
          <circle cx="60" cy="60" r={R} fill="none" stroke="url(#g1)" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} className="transition-all duration-700" />
          <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs>
        </svg>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-4xl font-extrabold text-ink">{formatBytes(stats.used)}</p>
          <p className="text-ink-secondary mt-1">of {formatBytes(stats.limit)} used · {formatBytes(stats.available)} available</p>
          <p className="text-sm text-ink-muted mt-1">{stats.fileCount} files</p>
          {pct > 85 && (
            <p className="mt-4 text-sm font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 inline-flex items-center gap-2">
              <HardDrive size={15} /> You’re almost full — review large files below.
            </p>
          )}
          <div className="mt-5 flex gap-3 justify-center sm:justify-start">
            <Link href="/trash" className="btn-secondary"><Trash2 size={15} /> Clean up trash</Link>
            <Link href="/dashboard" className="btn-ghost">Back to dashboard <ArrowRight size={15} /></Link>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-ink mb-4">Largest files</h2>
        {largest.length === 0 && <p className="text-sm text-ink-muted">No files yet.</p>}
        <div className="divide-y divide-line">
          {largest.map((f) => { const I = fileIcon(f.mime_type); return (
            <div key={f.id} className="flex items-center gap-3 py-3">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary-50 text-primary shrink-0"><I size={17} /></span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{f.name}</span>
                <span className="block text-xs text-ink-muted">{timeAgo(f.updated_at)}</span>
              </span>
              <span className="text-sm font-bold text-ink shrink-0">{formatBytes(f.size)}</span>
            </div>
          ) })}
        </div>
      </div>
    </div>
  )
}
