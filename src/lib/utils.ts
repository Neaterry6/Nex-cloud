import {
  FileText, FileImage, FileVideo, FileAudio, FileArchive,
  FileCode2, FileSpreadsheet, File, FileJson, FileType2, Lock, type LucideIcon,
} from 'lucide-react'

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return formatDate(iso)
}

export function fileIcon(mime: string): LucideIcon {
  if (mime.startsWith('image/')) return FileImage
  if (mime.startsWith('video/')) return FileVideo
  if (mime.startsWith('audio/')) return FileAudio
  if (mime === 'application/pdf') return FileType2
  if (mime.includes('zip') || mime.includes('compressed') || mime === 'application/x-tar') return FileArchive
  if (mime.includes('json')) return FileJson
  if (mime.includes('sheet') || mime.includes('csv') || mime.includes('excel')) return FileSpreadsheet
  if (mime.startsWith('text/') || mime.includes('word') || mime.includes('document')) return FileText
  if (mime.includes('javascript') || mime.includes('html') || mime.includes('code') || mime.includes('xml')) return FileCode2
  return File
}

export const FILE_TYPE_GROUPS: Record<string, string[]> = {
  images: ['image/'],
  videos: ['video/'],
  audio: ['audio/'],
  pdfs: ['application/pdf'],
  archives: ['zip', 'compressed', 'x-tar', 'x-7z', 'x-rar'],
  documents: ['text/', 'word', 'document', 'opendocument'],
}

export function matchesGroup(mime: string, group: string): boolean {
  const pats = FILE_TYPE_GROUPS[group]
  if (!pats) return false
  return pats.some((p) => mime.includes(p))
}

export function isPreviewable(mime: string): boolean {
  return (
    mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') ||
    mime === 'application/pdf' || mime.startsWith('text/') ||
    ['application/json', 'application/xml', 'application/javascript', 'application/x-sh'].includes(mime)
  )
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function safeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 180)
}

export function randomToken(): string {
  const arr = new Uint8Array(18)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const LockBadge = Lock
