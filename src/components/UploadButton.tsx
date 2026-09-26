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
    if (!files?.length || busy) return

    setBusy(true)
    let failed = 0

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast('Please sign in to upload files.', 'error')
        return
      }

      for (const file of Array.from(files)) {
        const name = safeFileName(file.name)
        const path = `${user.id}/${folderId ?? 'root'}/${crypto.randomUUID()}_${name}`
        const { error: upErr } = await supabase.storage.from('files').upload(path, file, { upsert: false })

        if (upErr) {
          failed++
          continue
        }

        const { error: dbErr } = await supabase.from('files').insert({
          owner_id: user.id,
          folder_id: folderId,
          name,
          mime_type: file.type || 'application/octet-stream',
          size: file.size,
          storage_path: path,
        })

        if (dbErr) {
          await supabase.storage.from('files').remove([path])
          failed++
        }
      }

      if (failed) {
        toast(`${files.length - failed} uploaded, ${failed} failed.`, 'error')
      } else {
        toast(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`)
      }

      router.refresh()
    } catch {
      toast('An unexpected error occurred while uploading.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void handle(e.target.files)
          e.target.value = ''
        }}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="btn-secondary !px-3.5"
        aria-label="Upload files"
      >
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
  const [queue, setQueue] = useState<{ id: string; name: string; progress: number }[]>([])

  async function handle(files: FileList | File[] | null) {
    if (!files?.length) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast('Please sign in to upload files.', 'error')
      return
    }

    for (const file of Array.from(files)) {
      const name = safeFileName(file.name)
      const id = crypto.randomUUID()
      setQueue((q) => [...q, { id, name, progress: 0 }])

      const path = `${user.id}/${folderId ?? 'root'}/${crypto.randomUUID()}_${name}`
      const { error: upErr } = await supabase.storage.from('files').upload(path, file, { upsert: false })

      if (upErr) {
        setQueue((q) => q.filter((item) => item.id !== id))
        toast(`Upload failed: ${name}`, 'error')
        continue
      }

      setQueue((q) => q.map((item) => item.id === id ? { ...item, progress: 100 } : item))
      const { error: dbErr } = await supabase.from('files').insert({
        owner_id: user.id,
        folder_id: folderId,
        name,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
        storage_path: path,
      })

      setQueue((q) => q.filter((item) => item.id !== id))
      if (dbErr) {
        await supabase.storage.from('files').remove([path])
        toast(`Could not save: ${name}`, 'error')
      } else {
        toast(`Uploaded ${name}`)
      }
    }

    router.refresh()
  }

  return { inputRef, queue, handle }
}
