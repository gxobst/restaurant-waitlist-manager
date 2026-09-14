import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/appStore.ts'
import { undoAction } from '../services/index.ts'

export default function UndoBar() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)
  const queryClient = useQueryClient()

  return (
    <div
      data-testid="undo-bar"
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-2 p-4 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
          onUndo={async () => {
            await undoAction(toast.partyId)
            queryClient.invalidateQueries({ queryKey: ['waitlist'] })
            removeToast(toast.id)
          }}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: { id: string; message: string; partyId: string; actionType: string }
  onDismiss: () => void
  onUndo: () => void
}

export function ToastItem({ toast, onDismiss, onUndo }: ToastItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 8000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  return (
    <div
      data-testid={`toast-${toast.actionType}`}
      className="pointer-events-auto flex items-center justify-between gap-3 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg"
    >
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={() => {
          if (timerRef.current) clearTimeout(timerRef.current)
          onUndo()
        }}
        className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 whitespace-nowrap"
      >
        Undo
      </button>
    </div>
  )
}
