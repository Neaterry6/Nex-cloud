import { redirect } from 'next/navigation'
import { createClient, getProfile } from '@/lib/supabase/server'
import { Sidebar, MobileNav } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { ToasterProvider } from '@/components/Toaster'
import { getStorageStats } from '@/lib/actions/files'
import { UploadButton } from '@/components/UploadButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.suspended) redirect('/login?error=suspended')

  const stats = await getStorageStats().catch(() => ({ used: 0, limit: 5 * 1024 ** 3, available: 0, fileCount: 0 }))

  return (
    <ToasterProvider>
      <div className="flex min-h-screen bg-surface">
        <Sidebar isAdmin={profile.role === 'admin'} used={stats.used} limit={stats.limit} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar profile={profile}>
            <UploadButton folderId={null} />
          </Topbar>
          <main className="flex-1 px-4 sm:px-6 py-6 pb-24 lg:pb-8 max-w-[1400px] w-full mx-auto">{children}</main>
        </div>
        <MobileNav isAdmin={profile.role === 'admin'} />
      </div>
    </ToasterProvider>
  )
}
