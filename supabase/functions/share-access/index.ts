// Public share-link endpoint. Anyone with the token can call `info`.
// If the share is password protected, `verify` checks the password
// (rate-limited) and returns signed URLs. No auth required for public links.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hashPassword, json, lockStatus, nextLock, verifyPassword } from '../_shared/crypto.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204)
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const { action, token, password } = await req.json()
    if (!token || typeof token !== 'string' || !/^[A-Za-z0-9_-]+$/.test(token)) {
      return json({ error: 'Invalid share link' }, 400)
    }

    const { data: share, error } = await supabase
      .from('shares').select('*').eq('token', token).single()
    if (error || !share) return json({ error: 'Share link not found' }, 404)
    if (share.revoked) return json({ error: 'This share link has been revoked' }, 410)
    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
      return json({ error: 'This share link has expired' }, 410)
    }

    const isFile = !!share.file_id
    const { data: file } = isFile
      ? await supabase.from('files').select('id, name, mime_type, size, updated_at, owner_id').eq('id', share.file_id).single()
      : { data: null }
    const { data: folder } = !isFile
      ? await supabase.from('folders').select('id, name, owner_id').eq('id', share.folder_id).single()
      : { data: null }
    if (!file && !folder) return json({ error: 'Shared item no longer exists' }, 404)

    const meta = isFile
      ? { kind: 'file', name: file!.name, mimeType: file!.mime_type, size: file!.size, updatedAt: file!.updated_at }
      : { kind: 'folder', name: folder!.name }

    if (action === 'info') {
      const needsPassword = !!share.password_hash
      return json({
        ...meta,
        needsPassword,
        allowDownload: share.allow_download,
        allowPreview: share.allow_preview,
        expiresAt: share.expires_at,
      })
    }

    if (action === 'verify') {
      if (lockStatus(share)) return json({ error: 'Too many attempts. Try again later.', locked: true }, 429)
      const ok = share.password_hash ? await verifyPassword(String(password ?? ''), share.password_hash) : true
      if (!ok) {
        await supabase.from('shares').update(nextLock(share)).eq('id', share.id)
        return json({ error: 'Incorrect password' }, 401)
      }
      await supabase.from('shares').update({ failed_attempts: 0, locked_until: null }).eq('id', share.id)

      if (isFile) {
        const { data: row } = await supabase.from('files').select('storage_path').eq('id', file!.id).single()
        const { data: signed, error: signError } = await supabase.storage
          .from('files').createSignedUrl(row!.storage_path, 60 * 30)
        if (signError || !signed) return json({ error: 'Could not create access link' }, 500)
        return json({ ok: true, url: signed.signedUrl, ...meta })
      }

      // Folder: sign every non-deleted file inside (single level + nested).
      const { data: files } = await supabase
        .from('files').select('id, name, mime_type, size, storage_path, folder_id')
        .eq('owner_id', folder!.owner_id).is('deleted_at', null)
      const entries = (files ?? []).filter((f: any) => true) // folder subtree walk below
      const collect = async (folderId: string): Promise<string[]> => {
        const { data: kids } = await supabase.from('folders').select('id').eq('parent_id', folderId)
        const ids = [folderId, ...((kids ?? []).map((k: any) => k.id))]
        for (const k of kids ?? []) ids.push(...await collect(k.id))
        return ids
      }
      const folderIds = await collect(folder!.id)
      const items = entries.filter((f: any) => folderIds.includes(f.folder_id))
      const signedItems = await Promise.all(items.map(async (f: any) => {
        const { data } = await supabase.storage.from('files').createSignedUrl(f.storage_path, 60 * 30)
        return { id: f.id, name: f.name, mimeType: f.mime_type, size: f.size, url: data?.signedUrl ?? null }
      }))
      return json({ ok: true, kind: 'folder', name: folder!.name, items: signedItems })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch {
    return json({ error: 'Server error' }, 500)
  }
})

// Password hashing re-exported so admins can create protected shares from
// server actions without duplicating crypto code.
export { hashPassword }
