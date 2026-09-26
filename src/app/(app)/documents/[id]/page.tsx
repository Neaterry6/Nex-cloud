'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code,
  Link2, Save, History, Download, Trash2, Eye, PencilLine, Loader2, MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveDocument, getDocumentVersions, exportDocument, createDocument } from '@/lib/actions/docs'
import { addComment } from '@/lib/actions/shares'
import { useToast } from '@/components/Toaster'
import { timeAgo, cn } from '@/lib/utils'

type DocFile = { id: string; name: string; version: number; owner_id: string; updated_at: string }

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()
  const [doc, setDoc] = useState<DocFile | null>(null)
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [saving, setSaving] = useState<'saved' | 'saving' | 'dirty'>('saved')
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [me, setMe] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setMe(user?.id ?? '')
      const { data } = await supabase.from('files').select('*').eq('id', id).single()
      if (!data) { router.push('/documents'); return }
      setDoc(data)
      const { data: v } = await supabase.from('document_versions').select('content').eq('file_id', id).order('version', { ascending: false }).limit(1).single()
      setContent(v?.content ?? ''); setSavedContent(v?.content ?? '')
      const { data: c } = await supabase.from('comments').select('*, profiles:author_id(display_name)').eq('file_id', id).order('created_at')
      setComments(c ?? [])
      supabase.channel(`doc-comments-${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `file_id=eq.${id}` },
        () => supabase.from('comments').select('*, profiles:author_id(display_name)').eq('file_id', id).order('created_at').then(({ data }) => setComments(data ?? []))
      ).subscribe()
    })()
  }, [id])

  const autosave = useCallback((value: string) => {
    setSaving('dirty')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSaving('saving')
      try {
        await saveDocument(id, value)
        setSavedContent(value); setSaving('saved')
        if (doc) setDoc({ ...doc, updated_at: new Date().toISOString() })
      } catch (e: any) { toast(e.message, 'error'); setSaving('dirty') }
    }, 1200)
  }, [id, doc, toast])

  function insert(before: string, after = '', placeholder = '') {
    const ta = document.getElementById('doc-editor') as HTMLTextAreaElement
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = content.slice(start, end) || placeholder
    const next = content.slice(0, start) + before + sel + after + content.slice(end)
    setContent(next); autosave(next)
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length) })
  }

  const TOOLS = [
    { icon: Bold, label: 'Bold', run: () => insert('**', '**', 'bold text') },
    { icon: Italic, label: 'Italic', run: () => insert('*', '*', 'italic') },
    { icon: Heading1, label: 'Heading 1', run: () => insert('\n# ', '\n', 'Heading') },
    { icon: Heading2, label: 'Heading 2', run: () => insert('\n## ', '\n', 'Heading') },
    { icon: List, label: 'Bullet list', run: () => insert('\n- ', '\n', 'Item') },
    { icon: ListOrdered, label: 'Numbered list', run: () => insert('\n1. ', '\n', 'Item') },
    { icon: Quote, label: 'Quote', run: () => insert('\n> ', '\n', 'Quote') },
    { icon: Code, label: 'Code block', run: () => insert('\n```\n', '\n```\n', 'code') },
    { icon: Link2, label: 'Link', run: () => insert('[', '](https://)', 'link text') },
  ]

  async function exportAs(fmt: 'md' | 'txt' | 'html') {
    const { content: out, mime, ext } = await exportDocument(id, fmt)
    const blob = new Blob([out], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${doc?.name ?? 'document'}.${ext}`; a.click()
    URL.revokeObjectURL(a.href)
    toast('Export downloaded')
  }

  async function postComment() {
    if (!commentBody.trim()) return
    try {
      await addComment(id, commentBody.trim())
      setCommentBody('')
      const { data } = await supabase.from('comments').select('*, profiles:author_id(display_name)').eq('file_id', id).order('created_at')
      setComments(data ?? [])
    } catch (e: any) { toast(e.message, 'error') }
  }

  async function openHistory() {
    setShowHistory(true)
    setVersions(await getDocumentVersions(id))
  }

  if (!doc) return <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-8" />)}</div>

  return (
    <div className="animate-fadeUp max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={doc.name}
          onChange={(e) => setDoc({ ...doc, name: e.target.value })}
          onBlur={async (e) => { await supabase.from('files').update({ name: e.target.value }).eq('id', id); toast('Renamed') }}
          className="text-2xl font-bold text-ink bg-transparent outline-none border-b-2 border-transparent focus:border-primary rounded-none px-1 min-w-0 flex-1"
          aria-label="Document title"
        />
        <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5',
          saving === 'saved' ? 'bg-emerald-50 text-emerald-600' : saving === 'saving' ? 'bg-primary-50 text-primary' : 'bg-amber-50 text-amber-600')}>
          {saving === 'saving' && <Loader2 size={12} className="animate-spin" />}
          {saving === 'saved' ? 'Saved' : saving === 'saving' ? 'Saving…' : 'Unsaved changes'}
        </span>
        <button className="btn-ghost !px-3" onClick={openHistory}><History size={16} /> History</button>
        <div className="relative group">
          <button className="btn-ghost !px-3"><Download size={16} /> Export</button>
          <div className="absolute right-0 top-10 hidden group-hover:block card p-2 w-36 z-30 shadow-lift">
            {(['md', 'txt', 'html'] as const).map((f) => (
              <button key={f} className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-ink-secondary hover:bg-primary-50 hover:text-primary-700 uppercase" onClick={() => exportAs(f)}>.{f}</button>
            ))}
          </div>
        </div>
        <button className="btn-ghost !px-3" onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}>
          {view === 'edit' ? <><Eye size={16} /> Preview</> : <><PencilLine size={16} /> Edit</>}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TOOLS.map((t) => (
          <button key={t.label} onClick={t.run} title={t.label} aria-label={t.label} className="btn-ghost !p-2.5 !rounded-lg border border-line bg-white hover:border-primary-200"><t.icon size={16} /></button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <div className="card overflow-hidden">
          {view === 'edit' ? (
            <textarea
              id="doc-editor"
              value={content}
              onChange={(e) => { setContent(e.target.value); autosave(e.target.value) }}
              className="w-full h-[60vh] p-6 outline-none resize-none text-[15px] leading-relaxed text-ink placeholder:text-ink-muted font-mono bg-white"
              placeholder="Start writing… Markdown supported."
              aria-label="Document content"
            />
          ) : (
            <div className="p-8 prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml(content) }} />
          )}
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-bold text-ink flex items-center gap-2 mb-4"><MessageSquare size={16} className="text-primary" /> Comments</h3>
          <div className="space-y-4 max-h-[42vh] overflow-auto pr-1">
            {comments.length === 0 && <p className="text-sm text-ink-muted">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <span className="grid place-items-center w-7 h-7 rounded-full bg-primary-50 text-primary text-xs font-bold shrink-0">{(c.profiles?.display_name ?? 'U')[0].toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="text-xs"><span className="font-bold text-ink">{c.profiles?.display_name ?? 'User'}</span> <span className="text-ink-muted">{timeAgo(c.created_at)}</span></p>
                  <p className="text-sm text-ink-secondary mt-0.5 break-words">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <input className="input !py-2 text-sm" placeholder="Add a comment…" value={commentBody} onChange={(e) => setCommentBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postComment()} />
            <button className="btn-primary !px-3" onClick={postComment} aria-label="Post comment"><Save size={15} /></button>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 animate-pop" role="dialog" aria-modal="true" aria-label="Version history">
          <div className="glass-strong rounded-3xl p-6 w-full max-w-lg shadow-lift max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-ink">Version history</h2>
              <button className="btn-ghost !p-2" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-3 bg-white border border-line rounded-xl px-4 py-3">
                  <span className="text-xs font-bold bg-primary-50 text-primary rounded-full px-2.5 py-1">v{v.version}</span>
                  <span className="flex-1 text-sm text-ink-secondary">{timeAgo(v.created_at)}</span>
                  <button className="text-xs font-bold text-primary hover:underline" onClick={() => { setContent(v.content); autosave(v.content); setShowHistory(false); toast(`Restored v${v.version}`) }}>Restore</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function previewHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return md.split(/\n{2,}/).map((b) => {
    const t = b.trim()
    if (t.startsWith('### ')) return `<h3 class="text-lg font-bold mt-4">${esc(t.slice(4))}</h3>`
    if (t.startsWith('## ')) return `<h2 class="text-xl font-bold mt-5">${esc(t.slice(3))}</h2>`
    if (t.startsWith('# ')) return `<h1 class="text-2xl font-extrabold mt-6">${esc(t.slice(2))}</h1>`
    if (t.startsWith('> ')) return `<blockquote class="border-l-4 border-primary-200 pl-4 text-ink-secondary italic my-3">${esc(t.slice(2))}</blockquote>`
    if (t.startsWith('- ') || t.startsWith('* ')) return `<ul class="list-disc pl-6 my-3 space-y-1">${t.split('\n').map((l) => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>`
    if (/^\d+\. /.test(t)) return `<ol class="list-decimal pl-6 my-3 space-y-1">${t.split('\n').map((l) => `<li>${esc(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`
    if (t.startsWith('```')) return `<pre class="bg-surface2 rounded-xl p-4 my-3 text-sm overflow-auto"><code>${esc(t.replace(/```\w*\n?/g, ''))}</code></pre>`
    return `<p class="my-2 leading-relaxed text-ink-secondary">${esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\[(.+?)\]\((.+?)\)/g, '<a class="text-primary underline" href="$2">$1</a>')}</p>`
  }).join('')
}

export { createDocument }
