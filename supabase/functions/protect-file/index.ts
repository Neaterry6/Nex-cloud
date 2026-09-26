// Manage password protection on a file (enable / change / disable).
// Auth required. Ownership verified server-side. Hash never leaves the server.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hashPassword, json } from '../_shared/crypto.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204)
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })

    // Server-to-server helper: hash a share-link password. Requires the
    // shared edge secret — never callable from browsers.
    const body = await req.json()
    if (body?.action === 'hash-only') {
      if (req.headers.get('X-Edge-Secret') !== Deno.env.get('EDGE_FUNCTION_SECRET')) {
        return json({ error: 'Forbidden' }, 403)
      }
      if (typeof body.password !== 'string' || body.password.length < 4) {
        return json({ error: 'Password must be at least 4 characters' }, 400)
      }
      return json({ hash: await hashPassword(body.password) })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { fileId, action, password, requireForPreview = true, requireForDownload = true } = await req.json()
    if (!fileId || !['enable', 'change', 'disable'].includes(action)) {
      return json({ error: 'Invalid request' }, 400)
    }

    const { data: file, error: fileError } = await supabase
      .from('files').select('id, owner_id, protected').eq('id', fileId).single()
    if (fileError || !file) return json({ error: 'File not found' }, 404)
    if (file.owner_id !== user.id) return json({ error: 'Forbidden' }, 403)

    if (action === 'disable') {
      await supabase.from('protected_files').delete().eq('file_id', fileId)
      await supabase.from('files').update({ protected: false }).eq('id', fileId)
      await supabase.from('activity_logs').insert({
        user_id: user.id, action: 'file.unprotect', target_type: 'file', target_id: fileId,
      })
      return json({ ok: true })
    }

    if (typeof password !== 'string' || password.length < 4 || password.length > 128) {
      return json({ error: 'Password must be 4–128 characters' }, 400)
    }

    if (action === 'change') {
      const { data: existing } = await supabase.from('protected_files').select('file_id').eq('file_id', fileId).single()
      if (!existing) return json({ error: 'File is not protected' }, 400)
    }

    const passwordHash = await hashPassword(password)
    await supabase.from('protected_files').upsert({
      file_id: fileId,
      password_hash: passwordHash,
      require_for_preview: requireForPreview,
      require_for_download: requireForDownload,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    await supabase.from('files').update({ protected: true }).eq('id', fileId)
    await supabase.from('activity_logs').insert({
      user_id: user.id, action: `file.${action === 'change' ? 'password_change' : 'protect'}`, target_type: 'file', target_id: fileId,
    })
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Server error' }, 500)
  }
})
