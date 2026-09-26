'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDocument(title: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to create documents.')
  const { data: file, error } = await supabase.from('files').insert({
    owner_id: user.id,
    name: title.trim() || 'Untitled document',
    mime_type: 'application/vnd.nexcloud.document',
    size: 0,
    storage_path: `docs/${crypto.randomUUID()}`,
    is_document: true,
  }).select('id').single()
  if (error || !file) throw new Error('Could not create the document.')
  await supabase.from('document_versions').insert({ file_id: file.id, author_id: user.id, content: '', version: 1 })
  await supabase.from('activity_logs').insert({ user_id: user.id, action: 'doc.create', target_type: 'file', target_id: file.id })
  revalidatePath('/documents')
  return file.id as string
}

export async function saveDocument(fileId: string, content: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to save.')
  const { data: file } = await supabase.from('files').select('id, version, owner_id').eq('id', fileId).single()
  if (!file || file.owner_id !== user.id) throw new Error('Not allowed to edit this document.')
  const nextVersion = file.version + 1
  await supabase.from('document_versions').insert({ file_id: fileId, author_id: user.id, content, version: nextVersion })
  await supabase.from('files').update({ version: nextVersion, size: content.length, updated_at: new Date().toISOString() }).eq('id', fileId)
  return nextVersion
}

export async function getDocumentVersions(fileId: string) {
  const supabase = createClient()
  const { data } = await supabase.from('document_versions')
    .select('id, version, created_at, author_id, content')
    .eq('file_id', fileId).order('version', { ascending: false }).limit(50)
  return data ?? []
}

export async function exportDocument(fileId: string, format: 'md' | 'txt' | 'html') {
  const supabase = createClient()
  const { data } = await supabase.from('document_versions').select('content').eq('file_id', fileId)
    .order('version', { ascending: false }).limit(1).single()
  let content = data?.content ?? ''
  if (format === 'html') content = mdToHtml(content)
  return { content, mime: format === 'html' ? 'text/html' : 'text/plain', ext: format }
}

function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return md.split(/\n{2,}/).map((block) => {
    const b = block.trim()
    if (b.startsWith('### ')) return `<h3>${esc(b.slice(4))}</h3>`
    if (b.startsWith('## ')) return `<h2>${esc(b.slice(3))}</h2>`
    if (b.startsWith('# ')) return `<h1>${esc(b.slice(2))}</h1>`
    if (b.startsWith('> ')) return `<blockquote>${esc(b.slice(2))}</blockquote>`
    if (b.startsWith('- ') || b.startsWith('* ')) return `<ul>${b.split('\n').map((l) => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>`
    if (/^\d+\. /.test(b)) return `<ol>${b.split('\n').map((l) => `<li>${esc(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`
    if (b.startsWith('```')) return `<pre><code>${esc(b.replace(/```\w*\n?/g, ''))}</code></pre>`
    return `<p>${esc(b).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')}</p>`
  }).join('\n')
}
