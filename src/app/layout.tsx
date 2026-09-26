import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Nex Cloud — Your files. Your cloud. Your control.', template: '%s · Nex Cloud' },
  description:
    'Nex Cloud is a premium cloud storage and document management platform. Securely store, organize, protect, share, and collaborate on your files from anywhere.',
  applicationName: 'Nex Cloud',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Nex Cloud' },
}

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
