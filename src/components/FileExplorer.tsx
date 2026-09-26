'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Folder, FolderPlus, LayoutGrid, List, Star, Lock, MoreVertical,
  Trash2, Pencil, Download, Share2, Copy, FolderInput, ShieldCheck, Eye, X,
  CheckCircle2, Loader2, FileQuestion, RotateCcw, Link2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  createFolder, renameFile, renameFolder, moveFile, moveFolder, copyFile, toggleStar,
  trashFile, trashFolder, restoreFile, restoreFolder, deleteFileForever, deleteFolderForever, getSignedUrl,
} from '@/lib/actions/files'
import { createShare, revokeShare, listShares } from '@/lib/actions/shares'
import { useUploader } from './UploadButton'
import { PreviewModal } from './PreviewModal'
import { useToast } from './Toaster'
import { fileIcon, formatBytes, timeAgo, isPreviewable, cn } from '@/lib/utils'

type Row = {
  id: string
  name: string
  mime_type?: string
  size?: number
  updated_at: string
  protected?: boolean
  starred?: boolean
  is_document?: boolean
  deleted_at?: string | null
}
type Mode = 'files' | 'recent' | 'favorites' | 'shared' | 'trash' | 'photos' | 'videos' | 'search' | 'documents'

const EMPTY: Record<Mode, [string, string]> = {
  files: ['No files yet', 'Upload your first file or create a folder to get started.'],
  recent: ['No recent files', 'Files you open will appear here.'],
  favorites: ['No favorites', 'Star important files to find them quickly.'],
  shared: ['No shared files', 'Files shared with you will appear here.'],
  trash: ['Trash is empty', 'Deleted files will appear here before permanent removal.'],
  photos: ['No photos yet', 'Upload images and they’ll show up here.'],
  videos: ['No videos yet', 'Upload videos and they’ll show up here.'],
  search: ['No results', 'Try a different search or filter.'],
  documents: ['No documents', 'Create your first document.'],
}

export function FileExplorer({ mode, folderId, searchQuery = '', typeFilter }: { mode: Mode; folderId?: string | null; searchQuery?: string; typeFilter?: string }) {
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()
  const [folders, setFolders] = useState<Row[]>([])
  const [files, setFiles] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState<'name' | 'size' | 'updated'>('updated')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<{ x: number; y: number; row: Row; kind: 'file' | 'folder' } | null>(null)
  const [preview, setPreview] = useState<{ row: Row; url: string } | null>(null)
  const [shareFor, setShareFor] = useState<Row | null>(null)
  const [protectFor, setProtectFor] = useState<Row | null>(null)
  const [unlockFor, setUnlockFor] = useState<{ row: Row; intent: 'preview' | 'download' } | null>(null)
  const [crumbs, setCrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Files' }])
  const [dragOver, setDragOver] = useState(false)
  const { inputRef, queue, handle } = useUploader(mode === 'files' ? folderId ?? null : null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id
      let fQ = supabase.from('files').select('id, name, mime_type, size, updated_at, protected, starred, is_document, deleted_at, storage_path')
      let dQ = supabase.from('folders').select('id, name, updated_at, deleted_at')

      if (mode === 'files') {
        fQ = folderId ? fQ.eq('folder_id', folderId) : fQ.is('folder_id', null)
        dQ = folderId ? dQ.eq('parent_id', folderId) : dQ.is('parent_id', null)
        fQ = fQ.is('deleted_at', null)
        dQ = dQ.is('deleted_at', null)
      } else if (mode === 'recent') {
        fQ = fQ.is('deleted_at', null).order('updated_at', { ascending: false }).limit(50)
        dQ = dQ.limit(0)
      } else if (mode === 'favorites') {
        fQ = fQ.eq('starred', true).is('deleted_at', null)
        dQ = dQ.limit(0)
      } else if (mode === 'documents') {
        fQ = fQ.eq('is_document', true).is('deleted_at', null)
        dQ = dQ.limit(0)
      } else if (mode === 'photos') {
        fQ = fQ.like('mime_type', 'image/%').is('deleted_at', null)
        dQ = dQ.limit(0)
      } else if (mode === 'videos') {
        fQ = fQ.like('mime_type', 'video/%').is('deleted_at', null)
        dQ = dQ.limit(0)
      } else if (mode === 'trash') {
        fQ = fQ.not('deleted_at', 'is', null)
        dQ = dQ.not('deleted_at', 'is', null)
      } else if (mode === 'shared') {
        const { data: shares } = await supabase
          .from('shares')
          .select('file_id, folder_id')
          .or(`target_user_id.eq.${uid},target_user_id.is.null`)
          .eq('revoked', false)

        const fIds = (shares ?? []).map((s) => s.file_id).filter(Boolean)
        const dIds = (shares ?? []).map((s) => s.folder_id).filter(Boolean)
        fQ = fQ.in('id', fIds.length ? fIds : ['00000000-0000-0000-0000-000000000000'])
        dQ = dQ.in('id', dIds.length ? dIds : ['00000000-0000-0000-0000-000000000000'])
      } else if (mode === 'search') {
        const q = searchQuery.trim()
        if (q) {
          fQ = fQ.or(`name.ilike.%${q}%`).is('deleted_at', null)
          dQ = dQ.ilike('name', `%${q}%`).is('deleted_at', null)
        } else {
          fQ = fQ.limit(0)
          dQ = dQ.limit(0)
        }
      }

      if (typeFilter) {
        fQ = fQ.filter('mime_type', 'in', `(${typeFilter})`)
      }

      const [{ data: fs }, { data: ds }] = await Promise.all([fQ, dQ])
      setFiles((fs as Row[]) ?? [])
      setFolders(((ds as Row[]) ?? []).map((d) => ({ ...d, mime_type: 'folder' as const })))
      setSelected(new Set())

      if (mode === 'files' && folderId) {
        const { data: cur } = await supabase.from('folders').select('id, name, parent_id').eq('id', folderId).single()
        const chain: { id: string | null; name: string }[] = [{ id: null, name: 'My Files' }]
        let cur2 = cur as { id: string; name: string; parent_id: string | null } | null
        const stack: { id: string; name: string }[] = []

        while (cur2) {
          stack.unshift({ id: cur2.id, name: cur2.name })
          if (!cur2.parent_id) break
          const { data } = await supabase.from('folders').select('id, name, parent_id').eq('id', cur2.parent_id).single()
          cur2 = data as typeof cur2
        }

        setCrumbs(chain.concat(stack))
      } else {
        setCrumbs([{ id: null, name: 'My Files' }])
      }
    } finally {
      setLoading(false)
    }
  }, [folderId, mode, searchQuery, supabase, typeFilter])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => {
    const arr = [...files]
    arr.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'size') return (b.size ?? 0) - (a.size ?? 0)
      return b.updated_at.localeCompare(a.updated_at)
    })
    return arr
  }, [files, sort])

  function openRow(row: Row) {
    if (row.mime_type === 'folder') {
      if (mode === 'files') router.push(`/files?folder=${row.id}`)
      return
    }
    if (row.is_document) {
      router.push(`/documents/${row.id}`)
      return
    }
    void openPreview(row)
  }

  async function openPreview(row: Row, intent: 'preview' | 'download' = 'preview') {
    if (row.protected) {
      setUnlockFor({ row, intent })
      return
    }
    try {
      const url = await getSignedUrl(row.id, intent === 'download')
      if (intent === 'download') {
        window.open(url, '_blank')
        toast('Download started')
        return
      }
      if (isPreviewable(row.mime_type ?? '')) {
        setPreview({ row, url })
      } else {
        window.open(url, '_blank')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  async function ctxAction(action: string, row: Row, kind: 'file' | 'folder') {
    setMenu(null)
    try {
      if (action === 'rename') {
        const name = prompt('Rename to:', row.name)
        if (!name || name === row.name) return
        if (kind === 'file') {
          await renameFile(row.id, name)
        } else {
          await renameFolder(row.id, name)
        }
        toast('Renamed')
        void load()
      } else if (action === 'download') {
        await openPreview(row, 'download')
      } else if (action === 'preview') {
        await openPreview(row)
      } else if (action === 'copy' && kind === 'file') {
        await copyFile(row.id)
        toast('Copied')
        void load()
      } else if (action === 'star') {
        const next = !row.starred
        await toggleStar(row.id, next)
        toast(next ? 'Added to favorites' : 'Removed from favorites')
        void load()
      } else if (action === 'protect' && kind === 'file') {
        setProtectFor(row)
      } else if (action === 'share') {
        setShareFor(row)
      } else if (action === 'move') {
        const { data: allFolders } = await supabase.from('folders').select('id, name').is('deleted_at', null).limit(100)
        const opts = ['— Root —', ...((allFolders ?? []) as any[]).filter((f) => f.id !== row.id).map((f) => f.name)]
        const pick = prompt(`Move "${row.name}" to:\n${opts.map((o, i) => `${i}: ${o}`).join('\n')}`, '0')
        if (pick === null) return
        const idx = Number(pick)
        const target = idx === 0 ? null : (allFolders as any[])[idx - 1]?.id ?? null
        if (kind === 'file') {
          await moveFile(row.id, target)
        } else {
          await moveFolder(row.id, target)
        }
        toast('Moved')
        void load()
      } else if (action === 'delete') {
        if (!confirm(`Move "${row.name}" to trash?`)) return
        if (kind === 'file') {
          await trashFile(row.id)
        } else {
          await trashFolder(row.id)
        }
        toast('Moved to trash')
        void load()
      } else if (action === 'restore') {
        if (kind === 'file') {
          await restoreFile(row.id)
        } else {
          await restoreFolder(row.id)
        }
        toast('Restored')
        void load()
      } else if (action === 'destroy') {
        if (!confirm(`Permanently delete "${row.name}"? This cannot be undone.`)) return
        if (kind === 'file') {
          await deleteFileForever(row.id)
        } else {
          await deleteFolderForever(row.id)
        }
        toast('Permanently deleted')
        void load()
      }
    } catch (e: any) {
      toast(e.message ?? 'Something went wrong', 'error')
    }
  }

  const MENU_ITEMS = (row: Row, kind: 'file' | 'folder') => [
    ...(mode === 'trash'
      ? [
          { a: 'restore', label: 'Restore', icon: RotateCcw },
          { a: 'destroy', label: 'Delete permanently', icon: Trash2, danger: true },
        ]
      : [
          { a: 'preview', label: 'Preview', icon: Eye, hide: kind === 'folder' || !isPreviewable(row.mime_type ?? '') },
          { a: 'download', label: 'Download', icon: Download, hide: kind === 'folder' },
          { a: 'share', label: 'Share', icon: Share2 },
          { a: 'protect', label: row.protected ? 'Change password…' : 'Protect with password', icon: ShieldCheck, hide: kind === 'folder' },
          { a: 'rename', label: 'Rename', icon: Pencil },
          { a: 'move', label: 'Move to…', icon: FolderInput },
          { a: 'copy', label: 'Make a copy', icon: Copy, hide: kind === 'folder' },
          { a: 'star', label: row.starred ? 'Remove from favorites' : 'Add to favorites', icon: Star },
          { a: 'delete', label: 'Move to trash', icon: Trash2, danger: true },
        ]).filter((i) => !i.hide),
  ]

  const [emptyTitle, emptyBody] = EMPTY[mode]

  return (
    <div
      className={cn('relative rounded-3xl transition-colors', dragOver && 'dropzone-active')}
      onDragOver={(e) => {
        if (mode === 'files') {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (mode === 'files') {
          e.preventDefault()
          setDragOver(false)
          void handle(e.dataTransfer.files)
        }
      }}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { void handle(e.target.files); e.target.value = '' }} />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        {mode === 'files' && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm min-w-0">
            {crumbs.map((c, i) => (
              <span key={c.id ?? 'root'} className="flex items-center gap-1 min-w-0">
                {i > 0 && <span className="text-ink-muted mx-0.5">/</span>}
                <button
                  onClick={() => router.push(c.id ? `/files?folder=${c.id}` : '/files')}
                  className={cn('truncate font-semibold hover:text-primary transition-colors', i === crumbs.length - 1 ? 'text-ink' : 'text-ink-muted')}
                >
                  {c.name}
                </button>
              </span>
            ))}
          </nav>
        )}
        <div className="flex-1" />
        {selected.size > 0 && mode !== 'trash' && (
          <button
            className="btn-danger !py-2"
            onClick={async () => {
              for (const id of selected) {
                const match = files.find((x) => x.id === id)
                if (match) await trashFile(id)
              }
              toast(`${selected.size} item${selected.size > 1 ? 's' : ''} moved to trash`)
              void load()
            }}
          >
            <Trash2 size={15} /> Trash ({selected.size})
          </button>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="input !w-auto !py-2 text-sm font-semibold" aria-label="Sort files">
          <option value="updated">Recently modified</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
        <div className="flex rounded-xl border border-line overflow-hidden" role="group" aria-label="View">
          <button onClick={() => setView('grid')} className={cn('p-2.5', view === 'grid' ? 'bg-primary-50 text-primary' : 'text-ink-muted hover:bg-surface2')} aria-label="Grid view"><LayoutGrid size={16} /></button>
          <button onClick={() => setView('list')} className={cn('p-2.5', view === 'list' ? 'bg-primary-50 text-primary' : 'text-ink-muted hover:bg-surface2')} aria-label="List view"><List size={16} /></button>
        </div>
        {mode === 'files' && (
          <button
            className="btn-secondary !py-2"
            onClick={async () => {
              const name = prompt('Folder name')
              if (name) {
                await createFolder(name, folderId ?? null)
                toast('Folder created')
                void load()
              }
            }}
          >
            <FolderPlus size={16} /> Folder
          </button>
        )}
      </div>

      {queue.length > 0 && (
        <div className="card p-4 mb-5 space-y-2 animate-pop">
          {queue.map((i) => (
            <div key={i.id} className="flex items-center gap-3 text-sm">
              <Loader2 size={15} className="animate-spin text-primary shrink-0" />
              <span className="flex-1 truncate text-ink-secondary">{i.name}</span>
              <div className="w-32 h-1.5 rounded-full bg-surface2 overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${i.progress}%` }} /></div>
              <span className="text-xs font-semibold text-ink-muted w-9 text-right">{i.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' : 'space-y-2'}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={cn('skeleton', view === 'grid' ? 'h-40' : 'h-14')} />)}
        </div>
      ) : folders.length === 0 && sorted.length === 0 ? (
        <div className="card p-14 text-center">
          <span className="grid place-items-center w-16 h-16 mx-auto rounded-3xl bg-primary-50 text-primary"><FileQuestion size={30} /></span>
          <h3 className="mt-5 font-bold text-lg text-ink">{emptyTitle}</h3>
          <p className="mt-1.5 text-sm text-ink-secondary">{emptyBody}</p>
          {mode === 'files' && (
            <button className="btn-primary mt-6" onClick={() => inputRef.current?.click()}>Upload files</button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {folders.map((d) => (
            <GridCard key={d.id} row={d} kind="folder" selected={selected} onSelect={(id, add) => setSelected((s) => { const n = new Set(s); if (add) n.add(id); else n.delete(id); return n })} onOpen={() => router.push(`/files?folder=${d.id}`)} onMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, row: d, kind: 'folder' }) }} />
          ))}
          {sorted.map((f) => (
            <GridCard key={f.id} row={f} kind="file" selected={selected} onSelect={(id, add) => setSelected((s) => { const n = new Set(s); if (add) n.add(id); else n.delete(id); return n })} onOpen={() => void openRow(f)} onMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, row: f, kind: 'file' }) }} />
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {folders.map((d) => (
            <ListRow key={d.id} row={d} kind="folder" selected={selected} onSelect={(id, add) => setSelected((s) => { const n = new Set(s); if (add) n.add(id); else n.delete(id); return n })} onOpen={() => router.push(`/files?folder=${d.id}`)} onMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, row: d, kind: 'folder' }) }} />
          ))}
          {sorted.map((f) => (
            <ListRow key={f.id} row={f} kind="file" selected={selected} onSelect={(id, add) => setSelected((s) => { const n = new Set(s); if (add) n.add(id); else n.delete(id); return n })} onOpen={() => void openRow(f)} onMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, row: f, kind: 'file' }) }} />
          ))}
        </div>
      )}

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }} />
          <div className="fixed z-50 card p-2 w-56 animate-pop shadow-lift" style={{ top: Math.min(menu.y, window.innerHeight - 340), left: Math.min(menu.x, window.innerWidth - 240) }} role="menu" aria-label="File actions">
            {MENU_ITEMS(menu.row, menu.kind).map(({ a, label, icon: Icon, danger }) => (
              <button
                key={a}
                role="menuitem"
                onClick={() => void ctxAction(a, menu.row, menu.kind)}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold', danger ? 'text-red-600 hover:bg-red-50' : 'text-ink-secondary hover:bg-primary-50 hover:text-primary')}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </>
      )}

      {shareFor && <ShareDialog row={shareFor} onClose={() => setShareFor(null)} />}
      {protectFor && <ProtectDialog row={protectFor} onClose={() => { setProtectFor(null); void load() }} />}
      {unlockFor && (
        <UnlockDialog
          row={unlockFor.row}
          intent={unlockFor.intent}
          onClose={() => setUnlockFor(null)}
          onDone={async (url, row, intent) => {
            setUnlockFor(null)
            if (intent === 'download') {
              window.open(url, '_blank')
              toast('Download started')
            } else if (isPreviewable(row.mime_type ?? '')) {
              setPreview({ row, url })
            } else {
              window.open(url, '_blank')
            }
          }}
        />
      )}
      {preview && <PreviewModal file={preview.row as any} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  )
}

function GridCard({ row, kind, selected, onSelect, onOpen, onMenu }: { row: Row; kind: 'file' | 'folder'; selected: Set<string>; onSelect: (id: string, add: boolean) => void; onOpen: () => void; onMenu: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void }) {
  const Icon = kind === 'folder' ? Folder : fileIcon(row.mime_type ?? '')
  const isSel = selected.has(row.id)

  return (
    <div
      className={cn('card p-4 cursor-pointer group relative transition-all hover:shadow-lift hover:-translate-y-0.5', isSel && 'ring-2 ring-primary')}
      onClick={onOpen}
      onContextMenu={onMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      aria-label={row.name}
    >
      <div className="absolute top-2.5 left-2.5 z-10" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={isSel} onChange={(e) => onSelect(row.id, e.target.checked)} aria-label={`Select ${row.name}`} className="w-4 h-4 rounded accent-primary-600" />
      </div>
      <button className="absolute top-2 right-2 z-10 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface2 text-ink-muted" onClick={(e) => { e.stopPropagation(); onMenu(e) }} aria-label={`More actions for ${row.name}`}>
        <MoreVertical size={16} />
      </button>
      <div className="flex flex-col items-center text-center pt-3">
        {row.mime_type?.startsWith('image/') ? (
          <ImageThumb id={row.id} />
        ) : (
          <span className={cn('grid place-items-center w-14 h-14 rounded-2xl', kind === 'folder' ? 'bg-amber-50 text-amber-500' : 'bg-primary-50 text-primary')}>
            <Icon size={26} />
          </span>
        )}
        <p className="mt-3 text-sm font-semibold text-ink truncate w-full">{row.name}</p>
        <p className="mt-0.5 text-xs text-ink-muted flex items-center gap-1.5">
          {row.protected && <Lock size={11} className="text-amber-500" />}
          {row.starred && <Star size={11} className="text-amber-400 fill-amber-400" />}
          {kind === 'folder' ? 'Folder' : `${formatBytes(row.size ?? 0)} · ${timeAgo(row.updated_at)}`}
        </p>
      </div>
    </div>
  )
}

function ImageThumb({ id }: { id: string }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let alive = true
    getSignedUrl(id, false, 300)
      .then((u) => {
        if (alive) setUrl(u)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [id])

  if (!url) {
    return <span className="grid place-items-center w-14 h-14 rounded-2xl bg-primary-50 text-primary"><Loader2 size={22} className="animate-spin" /></span>
  }

  return <img src={url} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-soft" loading="lazy" />
}

function ListRow({ row, kind, selected, onSelect, onOpen, onMenu }: { row: Row; kind: 'file' | 'folder'; selected: Set<string>; onSelect: (id: string, add: boolean) => void; onOpen: () => void; onMenu: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void }) {
  const Icon = kind === 'folder' ? Folder : fileIcon(row.mime_type ?? '')
  const isSel = selected.has(row.id)

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary-50/40 transition-colors', isSel && 'bg-primary-50/60')} onClick={onOpen} onContextMenu={onMenu} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <input type="checkbox" checked={isSel} onChange={(e) => { e.stopPropagation(); onSelect(row.id, e.target.checked) }} onClick={(e) => e.stopPropagation()} aria-label={`Select ${row.name}`} className="w-4 h-4 rounded accent-primary-600" />
      <span className={cn('grid place-items-center w-9 h-9 rounded-xl shrink-0', kind === 'folder' ? 'bg-amber-50 text-amber-500' : 'bg-primary-50 text-primary')}><Icon size={17} /></span>
      <span className="flex-1 min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{row.name}</span>
        <span className="block text-xs text-ink-muted">{kind === 'folder' ? 'Folder' : row.mime_type}</span>
      </span>
      <span className="hidden sm:flex items-center gap-1.5 text-xs text-ink-muted">
        {row.protected && <Lock size={12} className="text-amber-500" aria-label="Password protected" />}
        {row.starred && <Star size={12} className="text-amber-400 fill-amber-400" />}
      </span>
      <span className="hidden md:block w-20 text-right text-xs text-ink-muted">{kind === 'folder' ? '—' : formatBytes(row.size ?? 0)}</span>
      <span className="hidden lg:block w-24 text-right text-xs text-ink-muted">{timeAgo(row.updated_at)}</span>
      <button className="p-1.5 rounded-lg hover:bg-surface2 text-ink-muted" onClick={(e) => { e.stopPropagation(); onMenu(e) }} aria-label={`More actions for ${row.name}`}><MoreVertical size={16} /></button>
    </div>
  )
}

function ShareDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const toast = useToast()
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [expires, setExpires] = useState('0')
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPreview, setAllowPreview] = useState(true)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ url: string; token: string } | null>(null)
  const [existing, setExisting] = useState<any[]>([])
  const isFolder = row.mime_type === 'folder'

  useEffect(() => {
    void listShares(row.id).then(setExisting).catch(() => {})
  }, [row.id])

  async function create() {
    setBusy(true)
    try {
      const result = await createShare({
        fileId: isFolder ? undefined : row.id,
        folderId: isFolder ? row.id : undefined,
        targetUserEmail: email.trim() || null,
        permission,
        password: password || null,
        expiresInDays: expires === '0' ? null : Number(expires),
        allowDownload,
        allowPreview,
      })
      setCreated(result)
      toast(email ? 'Shared with user' : 'Share link created')
      setExisting((s) => [{ token: result.token, permission, revoked: false, expires_at: null, allow_download: allowDownload, allow_preview: allowPreview, created_at: new Date().toISOString(), target_user_email: email || null, id: result.token }, ...s])
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell title={`Share "${row.name}"`} onClose={onClose} wide>
      {created ? (
        <div className="text-center py-2">
          <span className="grid place-items-center w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-500"><CheckCircle2 size={26} /></span>
          <p className="mt-4 font-semibold text-ink">Link ready</p>
          <div className="mt-4 flex gap-2">
            <input readOnly value={created.url} className="input text-xs font-mono" onFocus={(e) => e.target.select()} aria-label="Share link" />
            <button className="btn-primary shrink-0" onClick={() => { navigator.clipboard.writeText(created.url); toast('Link copied') }}><Link2 size={15} /> Copy</button>
          </div>
          <button className="btn-ghost w-full mt-3" onClick={() => setCreated(null)}>Create another</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="share-email">Share with a user (optional — leave empty for a public link)</label>
            <input id="share-email" type="email" className="input" placeholder="teammate@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="share-perm">Permission</label>
              <select id="share-perm" className="input" value={permission} onChange={(e) => setPermission(e.target.value as any)}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="share-exp">Link expires</label>
              <select id="share-exp" className="input" value={expires} onChange={(e) => setExpires(e.target.value)}>
                <option value="0">Never</option>
                <option value="1">In 1 day</option>
                <option value="7">In 7 days</option>
                <option value="30">In 30 days</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="share-pw">Link password (optional)</label>
            <input id="share-pw" type="password" className="input" placeholder="Leave empty for no password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-secondary"><input type="checkbox" checked={allowPreview} onChange={(e) => setAllowPreview(e.target.checked)} className="rounded accent-primary" /> Preview</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-secondary"><input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="rounded accent-primary" /> Download</label>
          </div>
          <button className="btn-primary w-full py-3" onClick={() => void create()} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : 'Create share link'}</button>
        </div>
      )}
      {existing.length > 0 && (
        <div className="mt-6 pt-5 border-t border-line">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Active links</p>
          <div className="space-y-2 max-h-40 overflow-auto pr-1">
            {existing.filter((s) => !s.revoked).map((s) => (
              <div key={s.id ?? s.token} className="flex items-center gap-2 text-sm bg-surface rounded-xl px-3 py-2.5">
                <span className="font-mono text-xs text-ink-secondary truncate flex-1">/share/{s.token.slice(0, 10)}…</span>
                <span className="text-xs font-semibold text-primary">{s.permission}</span>
                {s.expires_at && <span className="text-xs text-ink-muted hidden sm:inline">exp {new Date(s.expires_at).toLocaleDateString()}</span>}
                <button className="text-xs font-bold text-red-500 hover:underline" onClick={async () => { await revokeShare(s.id); setExisting((x) => x.map((y) => y.id === s.id ? { ...y, revoked: true } : y)) }}>Revoke</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </DialogShell>
  )
}

function ProtectDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [forPreview, setForPreview] = useState(true)
  const [forDownload, setForDownload] = useState(true)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function call(action: 'enable' | 'change' | 'disable') {
    setBusy(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/protect-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ fileId: row.id, action, password, requireForPreview: forPreview, requireForDownload: forDownload }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not update protection')
      toast(action === 'disable' ? 'Password protection removed' : 'File protected')
      onClose()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
      setRemoving(false)
    }
  }

  return (
    <DialogShell title={row.protected ? 'Change file password' : 'Protect with password'} onClose={onClose}>
      <div className="flex items-center gap-3 pb-4 border-b border-line">
        <span className="grid place-items-center w-11 h-11 rounded-2xl bg-amber-50 text-amber-500"><ShieldCheck size={20} /></span>
        <div>
          <p className="font-semibold text-ink text-sm truncate max-w-[260px]">{row.name}</p>
          <p className="text-xs text-ink-muted">Passwords are hashed server-side with PBKDF2-SHA256. The hash is never stored where clients can read it.</p>
        </div>
      </div>
      <div className="space-y-4 pt-4">
        <div>
          <label className="label" htmlFor="pw1">{row.protected ? 'New password' : 'Password'}</label>
          <input id="pw1" type="password" className="input" placeholder="4–128 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pw2">Confirm password</label>
          <input id="pw2" type="password" className="input" placeholder="Repeat it" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-secondary"><input type="checkbox" checked={forPreview} onChange={(e) => setForPreview(e.target.checked)} className="rounded accent-primary" /> Preview</label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-secondary"><input type="checkbox" checked={forDownload} onChange={(e) => setForDownload(e.target.checked)} className="rounded accent-primary" /> Download</label>
        </div>
        {password && password !== confirm && <p className="text-sm text-red-600">Passwords don’t match.</p>}
        <div className="flex gap-3">
          <button className="btn-primary flex-1" disabled={busy || password.length < 4 || password !== confirm} onClick={() => void call(row.protected ? 'change' : 'enable')}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : row.protected ? 'Update password' : 'Enable protection'}
          </button>
          {row.protected && (
            <button className="btn-danger" disabled={busy || removing} onClick={async () => { if (confirm('Remove password protection?')) { setRemoving(true); await call('disable') } }}>
              Remove
            </button>
          )}
        </div>
      </div>
    </DialogShell>
  )
}

function UnlockDialog({ row, intent, onClose, onDone }: { row: Row; intent: 'preview' | 'download'; onClose: () => void; onDone: (url: string, row: Row, intent: 'preview' | 'download') => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function unlock() {
    setBusy(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-file-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ fileId: row.id, password, intent }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not verify password')
      onDone(body.url, row, intent)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell title="Protected file" onClose={onClose}>
      <div className="flex flex-col items-center text-center pb-2">
        <span className="grid place-items-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-500"><Lock size={24} /></span>
        <p className="mt-3 font-bold text-ink">{row.name}</p>
        <p className="text-sm text-ink-secondary mt-1">Enter the file password to {intent === 'download' ? 'download' : 'preview'}.</p>
      </div>
      <form className="space-y-3 mt-4" onSubmit={(e) => { e.preventDefault(); void unlock() }}>
        <input type="password" className={cn('input text-center tracking-widest', error && 'border-red-300 ring-4 ring-red-50')} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600 text-center animate-pop">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !password}>{busy ? <Loader2 size={16} className="animate-spin" /> : 'Unlock'}</button>
      </form>
    </DialogShell>
  )
}

function DialogShell({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 animate-pop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn('glass-strong rounded-3xl p-6 w-full shadow-lift max-h-[90vh] overflow-auto', wide ? 'max-w-lg' : 'max-w-md')}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-ink">{title}</h2>
          <button onClick={onClose} className="btn-ghost !p-2" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
