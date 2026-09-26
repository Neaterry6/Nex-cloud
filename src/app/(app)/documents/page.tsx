'use client'

import { useRouter } from 'next/navigation'
import { FilePlus2, Loader2 } from 'lucide-react'
import { FileExplorer } from '@/components/FileExplorer'
import { createDocument } from '@/lib/actions/docs'
import { useToast } from '@/components/Toaster'
import { useState } from 'react'

export default function DocumentsPage() {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Documents</h1>
          <p className="text-sm text-ink-secondary mt-0.5">Markdown documents with autosave and version history.</p>
        </div>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const id = await createDocument('Untitled document')
              toast('Document created')
              router.push(`/documents/${id}`)
            } catch (e: any) { toast(e.message, 'error'); setBusy(false) }
          }}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />} New document
        </button>
      </div>
      <FileExplorer mode="documents" />
    </div>
  )
}
