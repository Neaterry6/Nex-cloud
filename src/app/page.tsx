import Link from 'next/link'
import {
  Cloud, ShieldCheck, Share2, Users, FileText, Lock, Zap, HardDrive,
  Check, ArrowRight, Star, FolderOpen, Image, Film, Music, FileCode,
} from 'lucide-react'

const features = [
  { icon: Cloud, title: 'Cloud storage', desc: 'Store any file type with smart folders, search, and blazing-fast previews.' },
  { icon: Lock, title: 'Password-protected files', desc: 'Lock individual files and share links with real server-side password checks.' },
  { icon: Share2, title: 'Secure sharing', desc: 'Share with teammates or via expiring, revocable links with viewer and editor roles.' },
  { icon: FileText, title: 'Document workspace', desc: 'Create markdown-rich documents with autosave and full version history.' },
  { icon: Users, title: 'Collaboration', desc: 'Comments, mentions, and realtime activity keep everyone in sync.' },
  { icon: ShieldCheck, title: 'Enterprise security', desc: 'Row-level isolation, private storage buckets, and signed URLs by default.' },
]

const plans = [
  { name: 'Free', price: '$0', storage: '5 GB', features: ['5 GB storage', '100 MB max file size', 'Password-protected shares', 'Core document editor'], cta: 'Start free' },
  { name: 'Pro', price: '$9.99', storage: '1 TB', features: ['1 TB storage', '2 GB max file size', 'Unlimited protected shares', 'Version history', 'Priority support'], cta: 'Go Pro', highlight: true },
  { name: 'Business', price: '$29.99', storage: '5 TB', features: ['5 TB storage', '10 GB max file size', 'Admin dashboard', 'Advanced sharing controls'], cta: 'Contact sales' },
]

const faqs = [
  { q: 'Is my data private?', a: 'Yes. Every file lives in a private storage bucket and is isolated by Row Level Security. No other user — and no public URL — can ever reach your files.' },
  { q: 'How do password-protected files work?', a: 'Passwords are hashed with PBKDF2-SHA256 (210,000 iterations) and verified only in secure server-side edge functions. Hashes are never readable from the client, and repeated failed attempts are rate-limited.' },
  { q: 'What can I preview in the browser?', a: 'Images, video, audio, PDF, text, JSON, CSV, and code files all open in a polished built-in viewer with zoom, fullscreen, and download controls.' },
  { q: 'Can I collaborate with my team?', a: 'Share files with viewer or editor permissions, comment and mention teammates, and watch activity update in realtime.' },
  { q: 'What happens when I delete a file?', a: 'Deleted files move to Trash first. You can restore them anytime, permanently delete individual items, or empty the entire trash.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 glass">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-ink">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glass">
              <Cloud size={20} />
            </span>
            Nex Cloud
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-secondary">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#security" className="hover:text-ink transition-colors">Security</a>
            <a href="#collaboration" className="hover:text-ink transition-colors">Collaboration</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
            <Link href="/signup" className="btn-primary">Get started <ArrowRight size={16} /></Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#eff6ff_0%,transparent_55%)]" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[700px] h-[500px] -z-10 bg-primary-100/40 blur-3xl rounded-full" />
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-semibold text-primary-700 animate-fadeUp">
            <Zap size={14} /> Secure by design · Powered by Supabase
          </div>
          <h1 className="mt-6 text-5xl sm:text-7xl font-extrabold tracking-tight text-ink animate-fadeUp-1">
            Your files. Your cloud.<br />
            <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 bg-clip-text text-transparent">Your control.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-secondary max-w-2xl mx-auto animate-fadeUp-2">
            Nex Cloud lets you securely store, organize, access, protect, share, and collaborate
            on files from anywhere — with premium previews, documents, and real password protection.
          </p>
          <div className="mt-9 flex items-center justify-center gap-4 animate-fadeUp-3">
            <Link href="/signup" className="btn-primary text-base px-7 py-3.5">Start storing free <ArrowRight size={18} /></Link>
            <a href="#features" className="btn-secondary text-base px-7 py-3.5">Explore features</a>
          </div>

          {/* Interactive cloud visual */}
          <div className="relative mt-20 mx-auto max-w-3xl h-72 animate-fadeUp-3">
            <div className="absolute inset-x-8 top-6 h-56 glass rounded-3xl shadow-glass animate-floaty grid place-items-center">
              <div className="flex flex-col items-center gap-3">
                <Cloud size={64} className="text-primary" strokeWidth={1.5} />
                <div className="flex gap-2">
                  {[Image, Film, Music, FileCode, FileText].map((Icon, i) => (
                    <span key={i} className="grid place-items-center w-11 h-11 rounded-2xl bg-white border border-line shadow-soft animate-floaty" style={{ animationDelay: `${i * 0.35}s` }}>
                      <Icon size={20} className="text-primary" />
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                  <ShieldCheck size={14} className="text-emerald-500" /> End-to-end isolation · Signed URLs · Encrypted at rest
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-surface">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-ink">Everything your files need</h2>
          <p className="text-center text-ink-secondary mt-3 max-w-xl mx-auto">One premium workspace for storage, documents, sharing, and collaboration.</p>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card p-7 hover:shadow-lift hover:-translate-y-1 transition-all duration-300 group">
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <f.icon size={22} />
                </span>
                <h3 className="mt-5 font-bold text-lg text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm"><ShieldCheck size={16} /> Security</div>
            <h2 className="mt-3 text-4xl font-bold text-ink">Built so your private files stay private</h2>
            <ul className="mt-8 space-y-4">
              {[
                'Row Level Security isolates every user’s data at the database layer',
                'Private storage buckets — files are served only via short-lived signed URLs',
                'PBKDF2-hashed file passwords verified in server-side edge functions',
                'Rate-limited password attempts with automatic lockouts',
                'Opaque share tokens, expiring links, instant revocation',
              ].map((t) => (
                <li key={t} className="flex gap-3 text-ink-secondary">
                  <Check size={20} className="text-emerald-500 shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-8 bg-gradient-to-b from-white to-primary-50/40">
            <div className="flex items-center gap-3 pb-5 border-b border-line">
              <Lock size={20} className="text-primary" />
              <span className="font-semibold text-ink">Protected file</span>
              <span className="ml-auto text-xs font-bold bg-primary-100 text-primary-700 rounded-full px-3 py-1">LOCKED</span>
            </div>
            <div className="pt-5 space-y-3 text-sm">
              {['pbkdf2$210000$kR9…$aF31…', 'Signed URL · expires in 10:00', 'Failed attempts: 0 / 5'].map((row) => (
                <div key={row} className="flex items-center gap-2 text-ink-secondary bg-white border border-line rounded-xl px-4 py-3 font-mono text-xs">
                  <ShieldCheck size={14} className="text-emerald-500" /> {row}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <div className="input flex-1 text-ink-muted">••••••••</div>
                <button className="btn-primary" tabIndex={-1}>Unlock</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration */}
      <section id="collaboration" className="py-24 px-6 bg-surface">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div className="card p-8 order-2 lg:order-1">
            {[
              { who: 'Ava', text: 'Can we lock the contract before sharing it externally?', time: '2m', color: 'bg-primary' },
              { who: 'You', text: 'Done — password protection is on and the link expires Friday.', time: '1m', color: 'bg-emerald-500' },
              { who: 'Sam', text: '@ava added the final figures to the Q3 doc ✨', time: 'just now', color: 'bg-amber-500' },
            ].map((c, i) => (
              <div key={i} className="flex gap-3 mb-5 last:mb-0">
                <span className={`grid place-items-center w-9 h-9 rounded-full ${c.color} text-white text-xs font-bold shrink-0`}>{c.who[0]}</span>
                <div className="bg-surface border border-line rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
                  <div className="flex justify-between text-xs"><span className="font-bold text-ink">{c.who}</span><span className="text-ink-muted">{c.time}</span></div>
                  <p className="text-sm text-ink-secondary mt-1">{c.text}</p>
                </div>
              </div>
            ))}
            <div className="mt-5 flex gap-2">
              <div className="input flex-1 text-ink-muted">Write a comment…</div>
              <button className="btn-primary" tabIndex={-1}>Send</button>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm"><Users size={16} /> Collaboration</div>
            <h2 className="mt-3 text-4xl font-bold text-ink">Work together, in realtime</h2>
            <p className="mt-4 text-ink-secondary leading-relaxed">Comment on files, mention teammates, track every change in the activity feed, and see who has access — all synced live with Supabase Realtime.</p>
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm"><HardDrive size={16} /> Storage</div>
            <h2 className="mt-3 text-4xl font-bold text-ink">Know exactly where your space goes</h2>
            <p className="mt-4 text-ink-secondary leading-relaxed">A beautiful storage dashboard shows usage by type, your largest files, and one-click cleanup — so you never run out of room unexpectedly.</p>
          </div>
          <div className="card p-8">
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 120 120" className="w-40 h-40 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="url(#sg)" strokeWidth="14" strokeLinecap="round" strokeDasharray="326.7" strokeDashoffset="98" className="transition-all duration-700" />
                <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs>
              </svg>
              <div>
                <div className="text-3xl font-extrabold text-ink">70% <span className="text-base font-semibold text-ink-muted">used</span></div>
                <div className="text-sm text-ink-secondary mt-1">3.5 GB of 5 GB</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Images 1.2 GB', 'Video 980 MB', 'Docs 410 MB'].map((t) => (
                    <span key={t} className="text-xs font-semibold bg-surface2 text-ink-secondary rounded-full px-3 py-1.5">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-line space-y-2">
              {['Annual-report.pdf · 84 MB', 'Launch-video.mp4 · 620 MB'].map((t) => (
                <div key={t} className="flex justify-between items-center text-sm">
                  <span className="text-ink-secondary flex items-center gap-2"><FolderOpen size={14} className="text-primary" /> {t}</span>
                  <button className="text-primary font-semibold text-xs" tabIndex={-1}>Review</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-surface">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-ink">Simple, honest pricing</h2>
          <p className="text-center text-ink-secondary mt-3">Start free. Upgrade when you need more room.</p>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div key={p.name} className={`card p-8 relative ${p.highlight ? 'ring-2 ring-primary shadow-glass scale-[1.02]' : ''}`}>
                {p.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold rounded-full px-4 py-1">Most popular</span>}
                <h3 className="font-bold text-lg text-ink">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1"><span className="text-4xl font-extrabold text-ink">{p.price}</span><span className="text-ink-muted text-sm">/month</span></div>
                <div className="mt-2 text-sm font-semibold text-primary">{p.storage} storage</div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm text-ink-secondary"><Check size={17} className="text-emerald-500 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Link href="/signup" className={`mt-8 w-full ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-ink">Frequently asked questions</h2>
          <div className="mt-12 space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="card group overflow-hidden">
                <summary className="cursor-pointer list-none px-6 py-5 font-semibold text-ink flex items-center justify-between">
                  {f.q}
                  <ArrowRight size={18} className="text-ink-muted transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-6 pb-5 text-sm text-ink-secondary leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto card p-12 text-center bg-gradient-to-br from-primary-600 to-primary-500 border-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
          <h2 className="relative text-4xl font-extrabold text-white">Take control of your files today</h2>
          <p className="relative mt-3 text-primary-100">Free forever plan. No credit card required.</p>
          <Link href="/signup" className="relative mt-8 btn bg-white text-primary-700 hover:bg-primary-50 text-base px-8 py-3.5 inline-flex">
            Create your cloud <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-ink">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white"><Cloud size={16} /></span>
            Nex Cloud
          </div>
          <div className="flex gap-6 text-sm text-ink-secondary">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#security" className="hover:text-ink">Security</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </div>
          <p className="text-xs text-ink-muted flex items-center gap-1.5"><Star size={12} /> © 2026 Nex Cloud. Your files. Your cloud. Your control.</p>
        </div>
      </footer>
    </div>
  )
}
