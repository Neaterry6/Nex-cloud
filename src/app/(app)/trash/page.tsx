'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { FileExplorer } from '@/components/FileExplorer'
import { emptyTrash } from '@/lib/actions/files'
import { useToast } from '@/components/Toaster'

export default function TrashPage() {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Trash</h1>
          <p className="text-sm text-ink-secondary mt-0.5">Files stay here until you restore or permanently delete them.</p>
        </div>
        <button
          className="btn-danger"
          disabled={busy}
          onClick={async () => {
            if (!confirm('Empty trash? All items will be permanently deleted.')) return
            setBusy(true)
            try { await emptyTrash(); toast('Trash emptied') } catch (e: any) { toast(e.message, 'error') }
            finally { setBusy(false); location.reload() }
          }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Empty trash
        </button>
      </div>
      <FileExplorer mode="trash" />
    </div>
  )
}
