'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { FileExplorer } from '@/components/FileExplorer'

function Results() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const filter = params.get('filter') ?? ''
  return (
    <>
      <h1 className="text-2xl font-bold text-ink mb-1">Search</h1>
      {q && <p className="text-sm text-ink-secondary mb-5">Results for “{q}”</p>}
      {!q && filter === 'protected' && <p className="text-sm text-ink-secondary mb-5">Password-protected files</p>}
      <FileExplorer mode="search" searchQuery={q} />
    </>
  )
}

export default function SearchPage() {
  return (
    <div className="animate-fadeUp">
      <Suspense fallback={<div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14" />)}</div>}>
        <Results />
      </Suspense>
    </div>
  )
}
