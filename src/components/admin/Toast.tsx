import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: string; kind: ToastKind; message: string }

const ToastContext = createContext<{
  push: (message: string, kind?: ToastKind) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = crypto.randomUUID()
    setItems((list) => [...list, { id, kind, message }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4200)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md px-4 py-3 text-sm font-medium shadow-lg ${
              t.kind === 'error' ? 'bg-red-800 text-white' : t.kind === 'info' ? 'bg-brand text-white' : 'bg-brand text-white'
            }`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
