'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' }
const ToastCtx = createContext<{ push: (message: string, type?: Toast['type']) => void }>({ push: () => {} })

export function useToast() {
  const { push } = useContext(ToastCtx)
  return push
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info }
  const colors = { success: 'text-emerald-500', error: 'text-red-500', info: 'text-primary' }

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-[100] space-y-2 w-[calc(100%-2.5rem)] sm:w-80">
        {toasts.map((t) => {
          const I = icons[t.type]
          return (
            <div key={t.id} className={cn('glass-strong rounded-2xl px-4 py-3.5 shadow-lift flex items-start gap-3 animate-pop', t.type === 'error' && 'border-red-100')}>
              <I size={19} className={colors[t.type]} />
              <p className="text-sm font-medium text-ink">{t.message}</p>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
