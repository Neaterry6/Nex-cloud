'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { randomToken } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

type ShareSettings = {
  permission: 'viewer' | 'editor'
  password?: string | null
  expiresInDays?: number | null
  allowDownload: boolean
  allowPreview: boolean
}

export async function createShare(opts: {
  fileId?: string
  folderId?: string
  targetUserEmail?: string | null
} & ShareSettings) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Your session has expired.')

  let targetUserId: string | null = null
  if (opts.targetUserEmail) {
    const { data: target } = await supabase.from('profiles').select('id').eq('email', opts.targetUserEmail).single()
    if (!target) throw new Error('No Nex Cloud account found with that email.')
    targetUserId = target.id
  }

  let passwordHash: string | null = null
  if (opts.password) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/protect-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Edge-Secret': process.env.EDGE_FUNCTION_SECRET ?? '' },
      body: JSON.stringify({ action: 'hash-only', password: opts.password }),
    }).catch(() => null)
    // Hash via edge function to avoid duplicating PBKDF2 in two runtimes.
    const body = res ? await res.json().catch(() => null) : null
    if (body?.hash) passwordHash = body.hash
  }

  const token = randomToken()
  const { data: share, error } = await supabase.from('shares').insert({
    token,
    file_id: opts.fileId ?? null,
    folder_id: opts.folderId ?? null,
    created_by: user.id,
    target_user_id: targetUserId,
    permission: opts.permission,
    password_hash: passwordHash,
    expires_at: opts.expiresInDays ? new Date(Date.now() + opts.expiresInDays * 864e5).toISOString() : null,
    allow_download: opts.allowDownload,
    allow_preview: opts.allowPreview,
  }).select('id, token').single()
  if (error) throw new Error('Could not create the share link.')

  // Notify target user in-app (and via Resend if configured).
  if (targetUserId) {
    await supabase.from('notifications').insert({
      user_id: targetUserId, type: 'share', title: 'A file was shared with you',
      body: `Shared by ${user.email}`, link: opts.fileId ? '/shared' : '/shared',
    })
    const { data: target } = await supabase.from('profiles').select('email').eq('id', targetUserId).single()
    if (target) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Edge-Secret': process.env.EDGE_FUNCTION_SECRET ?? '' },
        body: JSON.stringify({ to: target.email, type: 'share', subject: 'A file was shared with you on Nex Cloud' }),
      }).catch(() => {}) // email is best-effort / optional
    }
  }

  revalidatePath('/shared')
  return { token: share.token, url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/share/${share.token}` }
}

export async function listShares(fileId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let q = supabase.from('shares').select('id, token, permission, expires_at, revoked, allow_download, allow_preview, created_at, target_user_id, file_id, folder_id').eq('created_by', user.id)
  if (fileId) q = q.eq('file_id', fileId)
  const { data } = await q.order('created_at', { ascending: false })
  return (data ?? []).map((s) => ({ ...s, password_hash: undefined }))
}

export async function revokeShare(shareId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { error } = await supabase.from('shares').update({ revoked: true }).eq('id', shareId).eq('created_by', user.id)
  if (error) throw new Error('Could not revoke the link.')
  revalidatePath('/shared')
}

// ── Comments ─────────────────────────────────────────────────────────
export async function addComment(fileId: string, body: string, parentId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to comment.')
  const mentionIds = [...body.matchAll(/@([a-z0-9._-]+)/gi)].map(() => null) // mentions resolved client-side
  const { error } = await supabase.from('comments').insert({ file_id: fileId, author_id: user.id, body, parent_id: parentId ?? null })
  if (error) throw new Error('Could not post the comment.')
  await supabase.from('activity_logs').insert({ user_id: user.id, action: 'comment.add', target_type: 'file', target_id: fileId })
  revalidatePath('/files')
  void mentionIds
}
