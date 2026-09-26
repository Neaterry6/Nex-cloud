'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Download, Maximize2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileWarning } from 'lucide-react'
import { fileIcon, formatBytes, formatDate, cn } from '@/lib/utils'

type FileRow = { id: string; name: string; mime_type: string; size: number; storage_path: string; updated_at: string }

export function PreviewModal({ file, url, onClose }: { file: FileRow; url: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1)
  const [page, setPage] = useState(1)
  const [text, setText] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const mime = file.mime_type
  const isImage = mime.startsWith('image/')
  const isVideo = mime.startsWith('video/')
  const isAudio = mime.startsWith('audio/')
  const isPdf = mime === 'application/pdf'
  const isText = mime.startsWith('text/') || ['application/json', 'application/xml', 'application/javascript'].includes(mime)
  const Icon = fileIcon(mime)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    if (isText) fetch(url).then((r) => r.text()).then(setText).catch(() => setText('Could not load preview.'))
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [url, isText, onClose])

  return (
    <div className="fixed inset-0 z-[90] bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 animate-pop" role="dialog" aria-modal="true" aria-label={`Preview ${file.name}`}>
      <div className="glass-strong rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-lift overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line">
          <span className="text-primary"><Icon size={20} /></span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm truncate">{file.name}</p>
            <p className="text-xs text-ink-muted">{formatBytes(file.size)} · {formatDate(file.updated_at)}</p>
          </div>
          {isImage && (
            <div className="flex items-center gap-1">
              <button className="btn-ghost !p-2" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} aria-label="Zoom out"><ZoomOut size={17} /></button>
              <span className="text-xs font-semibold text-ink-secondary w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button className="btn-ghost !p-2" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} aria-label="Zoom in"><ZoomIn size={17} /></button>
            </div>
          )}
          {isPdf && (
            <div className="flex items-center gap-1">
              <button className="btn-ghost !p-2" onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page"><ChevronLeft size={17} /></button>
              <span className="text-xs font-semibold text-ink-secondary">Page {page}</span>
              <button className="btn-ghost !p-2" onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight size={17} /></button>
            </div>
          )}
          <a href={url} download={file.name} className="btn-ghost !p-2" aria-label="Download" target="_blank" rel="noreferrer"><Download size={17} /></a>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label="Close preview"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto bg-surface grid place-items-center p-4 min-h-[320px]">
          {isImage && (
            <img src={url} alt={file.name} className="max-w-full max-h-[68vh] rounded-xl shadow-lift transition-transform duration-200" style={{ transform: `scale(${zoom})` }} />
          )}
          {isVideo && <video src={url} controls autoPlay className="max-w-full max-h-[68vh] rounded-xl bg-black" />}
          {isAudio && (
            <div className="w-full max-w-md">
              <div className="card p-8 text-center">
                <span className="grid place-items-center w-16 h-16 mx-auto rounded-2xl bg-primary-50 text-primary"><Icon size={30} /></span>
                <p className="mt-4 font-bold text-ink">{file.name}</p>
                <audio ref={audioRef} src={url} controls autoPlay className="w-full mt-5" />
              </div>
            </div>
          )}
          {isPdf && <iframe src={url} title={file.name} className="w-full h-[68vh] rounded-xl bg-white border border-line" />}
          {isText && (
            <pre className="w-full h-[68vh] overflow-auto bg-white border border-line rounded-2xl p-6 text-sm text-ink-secondary font-mono whitespace-pre-wrap">{text ?? 'Loading…'}</pre>
          )}
          {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
            <div className="text-center">
              <FileWarning size={44} className="mx-auto text-amber-500" />
              <p className="mt-4 font-bold text-ink">No preview for this file type</p>
              <p className="text-sm text-ink-secondary mt-1">{file.mime_type} · {formatBytes(file.size)}</p>
              <a href={url} download={file.name} className="btn-primary mt-6"><Download size={16} /> Download file</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function UnsupportedCard({ file }: { file: FileRow }) {
  const Icon = fileIcon(file.mime_type)
  return (
    <div className={cn('card p-10 text-center')}>
      <span className="grid place-items-center w-16 h-16 mx-auto rounded-2xl bg-surface2 text-ink-muted"><Icon size={30} /></span>
      <p className="mt-4 font-bold text-ink">{file.name}</p>
      <p className="text-sm text-ink-secondary mt-1">{file.mime_type} · {formatBytes(file.size)} · uploaded {formatDate(file.updated_at)}</p>
    </div>
  )
}
