'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Your session has expired. Please sign in again.')
  return { supabase, user }
}

function log(userId: string, action: string, targetType: string, targetId?: string, meta?: object) {
  createClient().from('activity_logs').insert({ user_id: userId, action, target_type: targetType, target_id: targetId, meta }).then(() => {})
}

// ── Folders ──────────────────────────────────────────────────────────
export async function createFolder(name: string, parentId: string | null) {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('folders').insert({ owner_id: user.id, name: name.trim(), parent_id: parentId })
  if (error) throw new Error('Could not create folder. Try a different name.')
  log(user.id, 'folder.create', 'folder', parentId ?? undefined)
  revalidatePath('/files')
}

export async function renameFolder(folderId: string, name: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('folders').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', folderId)
  if (error) throw new Error('Could not rename folder.')
  revalidatePath('/files')
}

export async function moveFolder(folderId: string, parentId: string | null) {
  const { supabase, user } = await requireUser()
  if (parentId === folderId) throw new Error('Cannot move a folder into itself.')
  const { error } = await supabase.from('folders').update({ parent_id: parentId }).eq('id', folderId).eq('owner_id', user.id)
  if (error) throw new Error('Could not move folder.')
  revalidatePath('/files')
}

// ── Files ────────────────────────────────────────────────────────────
export async function renameFile(fileId: string, name: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('files').update({ name: name.trim() }).eq('id', fileId)
  if (error) throw new Error('Could not rename file.')
  revalidatePath('/files')
}

export async function moveFile(fileId: string, folderId: string | null) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('files').update({ folder_id: folderId }).eq('id', fileId)
  if (error) throw new Error('Could not move file.')
  revalidatePath('/files')
}

export async function copyFile(fileId: string) {
  const { supabase, user } = await requireUser()
  const { data: file } = await supabase.from('files').select('*').eq('id', fileId).single()
  if (!file) throw new Error('File not found.')
  const { data: bytes } = await supabase.storage.from('files').download(file.storage_path)
  if (!bytes) throw new Error('Could not read the original file.')
  const copyPath = `${user.id}/${crypto.randomUUID()}_copy_${file.name}`
  const { error: upErr } = await supabase.storage.from('files').upload(copyPath, bytes)
  if (upErr) throw new Error('Copy failed during upload.')
  const { error } = await supabase.from('files').insert({
    owner_id: user.id, folder_id: file.folder_id, name: `Copy of ${file.name}`,
    mime_type: file.mime_type, size: file.size, storage_path: copyPath, is_document: file.is_document,
  })
  if (error) throw new Error('Could not save the copy.')
  log(user.id, 'file.copy', 'file', fileId)
  revalidatePath('/files')
}

export async function toggleStar(fileId: string, starred: boolean) {
  const { supabase } = await requireUser()
  await supabase.from('files').update({ starred }).eq('id', fileId)
  revalidatePath('/favorites')
}

// ── Signed URLs (server-only, ownership checked) ─────────────────────
export async function getSignedUrl(fileId: string, download = false, ttlSeconds = 600) {
  const { supabase, user } = await requireUser()
  const { data: file } = await supabase.from('files').select('id, storage_path, protected, owner_id').eq('id', fileId).single()
  if (!file) throw new Error('File not found.')
  // Protected files require password verification via the Edge Function.
  if (file.protected && file.owner_id !== user.id) throw new Error('This file is password protected.')
  const service = createServiceClient()
  const { data, error } = await service.storage.from('files').createSignedUrl(file.storage_path, ttlSeconds, download ? { download: true } : undefined)
  if (error || !data) throw new Error('Could not generate a secure link to this file.')
  return data.signedUrl
}

// ── Trash ────────────────────────────────────────────────────────────
export async function trashFile(fileId: string) {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('files').update({ deleted_at: new Date().toISOString() }).eq('id', fileId)
  if (error) throw new Error('Could not move file to trash.')
  log(user.id, 'file.trash', 'file', fileId)
  revalidatePath('/files'); revalidatePath('/trash')
}

export async function trashFolder(folderId: string) {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('folders').update({ deleted_at: new Date().toISOString() }).eq('id', folderId)
  if (error) throw new Error('Could not move folder to trash.')
  log(user.id, 'folder.trash', 'folder', folderId)
  revalidatePath('/files'); revalidatePath('/trash')
}

export async function restoreFile(fileId: string) {
  const { supabase } = await requireUser()
  await supabase.from('files').update({ deleted_at: null }).eq('id', fileId)
  revalidatePath('/trash'); revalidatePath('/files')
}

export async function restoreFolder(folderId: string) {
  const { supabase } = await requireUser()
  await supabase.from('folders').update({ deleted_at: null }).eq('id', folderId)
  revalidatePath('/trash'); revalidatePath('/files')
}

export async function deleteFileForever(fileId: string) {
  const { supabase, user } = await requireUser()
  const { data: file } = await supabase.from('files').select('storage_path').eq('id', fileId).single()
  if (file) await createServiceClient().storage.from('files').remove([file.storage_path])
  await supabase.from('files').delete().eq('id', fileId)
  log(user.id, 'file.delete_forever', 'file', fileId)
  revalidatePath('/trash')
}

export async function deleteFolderForever(folderId: string) {
  const { supabase, user } = await requireUser()
  // Remove storage objects under this folder's files first.
  const service = createServiceClient()
  const { data: files } = await supabase.from('files').select('storage_path').eq('folder_id', folderId)
  if (files?.length) await service.storage.from('files').remove(files.map((f) => f.storage_path))
  await supabase.from('folders').delete().eq('id', folderId)
  log(user.id, 'folder.delete_forever', 'folder', folderId)
  revalidatePath('/trash')
}

export async function emptyTrash() {
  const { supabase, user } = await requireUser()
  const { data: files } = await supabase.from('files').select('id, storage_path').not('deleted_at', 'is', null)
  if (files?.length) {
    await createServiceClient().storage.from('files').remove(files.map((f) => f.storage_path))
    await supabase.from('files').delete().in('id', files.map((f) => f.id))
  }
  await supabase.from('folders').delete().not('deleted_at', 'is', null)
  log(user.id, 'trash.empty', 'trash')
  revalidatePath('/trash')
}

// ── Storage stats ────────────────────────────────────────────────────
export async function getStorageStats() {
  const { supabase, user } = await requireUser()
  const [{ data: usage }, { data: profile }] = await Promise.all([
    supabase.from('storage_usage').select('*').eq('user_id', user.id).single(),
    supabase.from('profiles').select('storage_limit_bytes').eq('id', user.id).single(),
  ])
  const used = usage?.used_bytes ?? 0
  const limit = profile?.storage_limit_bytes ?? 5 * 1024 ** 3
  return { used, limit, available: Math.max(0, limit - used), fileCount: usage?.file_count ?? 0 }
}

export async function getLargestFiles() {
  const { supabase } = await requireUser()
  const { data } = await supabase.from('files').select('id, name, size, mime_type, updated_at')
    .is('deleted_at', null).order('size', { ascending: false }).limit(20)
  return data ?? []
}
