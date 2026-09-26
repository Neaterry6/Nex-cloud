// Resend-backed email sender. OPTIONAL: without RESEND_API_KEY this returns
// { configured: false } and the app continues with in-app notifications only.
// Callable only from the server (requires X-Edge-Secret shared secret).
// deno-lint-ignore-file no-explicit-any
import { json } from '../_shared/crypto.ts'

const BRAND = `
  <div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,Segoe UI,Inter,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
      <div style="padding:28px 32px;background:linear-gradient(135deg,#2563eb,#3b82f6);">
        <span style="color:#ffffff;font-size:20px;font-weight:700;">Nex Cloud</span>
      </div>
      <div style="padding:32px;color:#0f172a;font-size:15px;line-height:1.6;">{{CONTENT}}</div>
      <div style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
        © Nex Cloud — Your files. Your cloud. Your control.
      </div>
    </div>
  </div>`

function wrap(content: string): string {
  return BRAND.replace('{{CONTENT}}', content)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204)
  try {
    if (req.headers.get('X-Edge-Secret') !== Deno.env.get('EDGE_FUNCTION_SECRET')) {
      return json({ error: 'Forbidden' }, 403)
    }
    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) return json({ configured: false, ok: false })

    const { to, subject, content, type } = await req.json()
    if (!to || !subject) return json({ error: 'Missing fields' }, 400)

    const templates: Record<string, string> = {
      welcome: wrap(`<h2 style="margin:0 0 12px;">Welcome to Nex Cloud</h2><p>Your secure cloud workspace is ready. Store, protect, and share your files from anywhere.</p><a href="${Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? ''}/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">Open your dashboard</a>`),
      share: wrap(`<h2 style="margin:0 0 12px;">A file was shared with you</h2><p>${content ?? 'Someone shared a file with you on Nex Cloud.'}</p>`),
      mention: wrap(`<h2 style="margin:0 0 12px;">You were mentioned</h2><p>${content ?? ''}</p>`),
      security: wrap(`<h2 style="margin:0 0 12px;">Security alert</h2><p>${content ?? 'We noticed activity on your account.'}</p>`),
      storage: wrap(`<h2 style="margin:0 0 12px;">Storage warning</h2><p>${content ?? 'You are running low on storage.'}</p>`),
    }
    const html = content && !templates[type] ? wrap(content) : (templates[type ?? ''] ?? templates.security)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'Nex Cloud <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    })
    if (!res.ok) return json({ ok: false, error: 'Email delivery failed' }, 502)
    return json({ ok: true, configured: true })
  } catch {
    return json({ error: 'Server error' }, 500)
  }
})
