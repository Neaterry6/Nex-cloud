'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './Toaster'
import { safeFileName } from '@/lib/utils'

export function UploadButton({ folderId, label }: { folderId: string | null; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const router = useRouter()

  async function handle(files: FileList | null) {
    if (!files?.length) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setBusy(true)
    let failed = 0
    for (const file of Array.from(files)) {
      const name = safeFileName(file.name)
      const path = `${user.id}/${folderId ?? 'root'}/${crypto.randomUUID()}_${name}`
      const { error: upErr } = await supabase.storage.from('files').upload(path, file, { upsert: false })
      if (upErr) { failed++; continue }
      const { error: dbErr } = await supabase.from('files').insert({
        owner_id: user.id, folder_id: folderId, name, mime_type: file.type || 'application/octet-stream',
        size: file.size, storage_path: path,
      })
      if (dbErr) { await supabase.storage.from('files').remove([path]); failed++ }
    }
    setBusy(false)
    if (failed) toast(`${files.length - failed} uploaded, ${failed} failed.`, 'error')
    else toast(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`)
    router.refresh()
  }

  return (
    <>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { handle(e.target.files); e.target.value = '' }} aria-hidden />
      <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-secondary !px-3.5" aria-label="Upload files">
        {busy ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />}
        <span className="hidden sm:inline">{label ?? 'Upload'}</span>
      </button>
    </>
  )
}

export function useUploader(folderId: string | null) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const router = useRouter()
  const [queue, setQueue] = useState<{ name: string; progress: number }[]>([])

  async function handle(files: FileList | File[] | null) {
    if (!files?.length) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of Array.from(files)) {
      const name = safeFileName(file.name)
      setQueue((q) => [...q, { name, progress: 0 }])
      const path = `${user.id}/${folderId ?? 'root'}/${crypto.randomUUID()}_${name}`
      const { error: upErr } = await supabase.storage.from('files').upload(path, file, {
        upsert: false,
        onUploadProgress: (e) => setQueue((q) => q.map((i) => (i.name === name ? { ...i, progress: Math.round((e.loaded / e.total) * 100) : i))),
      })
      if (upErr) { setQueue((q) => q.filter((i) => i.name !== name)); toast(`Upload failed: ${name}`, 'error'); continue }
      const { error: dbErr } = await supabase.from('files').insert({
        owner_id: user.id, folder_id: folderId, name, mime_type: file.type || 'application/octet-stream', size: file.size, storage_path: path,
      })
      setQueue((q) => q.filter((i) => i.name !== name))
      if (dbErr) { await supabase.storage.from('files').remove([path]); toast(`Could not save: ${name}`, 'error') }
      else toast(`Uploaded ${name}`)
    }
    router.refresh()
  }

  return { inputRef, queue, handle }
}
