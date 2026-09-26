// Verify a file password (owner unlocking their own protected file) and
// return a short-lived signed URL on success. Rate-limited per file.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, lockStatus, nextLock, verifyPassword } from '../_shared/crypto.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204)
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { fileId, password, intent = 'preview' } = await req.json()
    if (!fileId || typeof password !== 'string') return json({ error: 'Invalid request' }, 400)

    const [{ data: file }, { data: prot }] = await Promise.all([
      supabase.from('files').select('id, owner_id, name, storage_path, mime_type').eq('id', fileId).single(),
      supabase.from('protected_files').select('*').eq('file_id', fileId).single(),
    ])
    if (!file || !prot) return json({ error: 'File not found' }, 404)

    const isOwner = file.owner_id === user.id
    const { data: share } = await supabase.from('shares')
      .select('id, permission, allow_download, allow_preview')
      .eq('file_id', fileId).eq('revoked', false)
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .maybeSingle()
    if (!isOwner && !share) return json({ error: 'Forbidden' }, 403)

    if (lockStatus(prot)) {
      return json({ error: 'Too many attempts. Try again later.', locked: true }, 429)
    }
    if (intent === 'download' && !isOwner && share && !share.allow_download) {
      return json({ error: 'Downloads are disabled for this share' }, 403)
    }

    const ok = await verifyPassword(password, prot.password_hash)
    if (!ok) {
      await supabase.from('protected_files').update(nextLock(prot)).eq('file_id', fileId)
      return json({ error: 'Incorrect password' }, 401)
    }
    await supabase.from('protected_files').update({ failed_attempts: 0, locked_until: null }).eq('file_id', fileId)

    const { data: signed, error: signError } = await supabase.storage
      .from('files').createSignedUrl(file.storage_path, 60 * 10, { download: intent === 'download' })
    if (signError || !signed) return json({ error: 'Could not create access link' }, 500)

    return json({ ok: true, url: signed.signedUrl, name: file.name, mimeType: file.mime_type })
  } catch {
    return json({ error: 'Server error' }, 500)
  }
})
