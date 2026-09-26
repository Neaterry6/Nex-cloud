'use client'

import Link from 'next/link'
import { Cloud } from 'lucide-react'

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fadeUp">
        <Link href="/" className="flex items-center justify-center gap-2.5 font-bold text-xl text-ink mb-8">
          <span className="grid place-items-center w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glass"><Cloud size={20} /></span>
          Nex Cloud
        </Link>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-secondary mb-7">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
