import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { verifyPin } from '../services/index.ts'
import { useAppStore } from '../store/appStore.ts'

const LOCKOUT_DURATION = 30
const MAX_ATTEMPTS = 5

interface ManagerPinModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ManagerPinModal({ isOpen, onClose }: ManagerPinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutSeconds, setLockoutSeconds] = useState(LOCKOUT_DURATION)

  const setIsManager = useAppStore((s) => s.setIsManager)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const resetState = useCallback(() => {
    clearTimer()
    setPin('')
    setError(null)
    setAttempts(0)
    setIsLocked(false)
    setLockoutSeconds(LOCKOUT_DURATION)
  }, [clearTimer])

  useEffect(() => {
    if (isOpen) {
      resetState()
    }
  }, [isOpen, resetState])

  useEffect(() => {
    if (!isOpen) return

    if (isLocked) {
      timerRef.current = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            clearTimer()
            setIsLocked(false)
            setAttempts(0)
            setLockoutSeconds(LOCKOUT_DURATION)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return clearTimer
  }, [isOpen, isLocked, clearTimer])

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleEscape])

  const pinMutation = useMutation({
    mutationFn: (pin: string) => verifyPin({ pin }),
    onSuccess: (data) => {
      if (data.valid) {
        setIsManager(true)
        onClose()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setError('Invalid PIN')
        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true)
          setLockoutSeconds(LOCKOUT_DURATION)
        }
        setTimeout(() => setError(null), 2000)
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4 || isLocked) return
    pinMutation.mutate(pin)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val)
    setError(null)
  }

  const isShaking = error !== null && !isLocked
  const inputDisabled = isLocked || pinMutation.isPending

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Enter manager PIN"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manager PIN</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={handleChange}
              disabled={inputDisabled}
              className={`w-full text-center text-3xl tracking-[0.5em] min-h-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isShaking
                  ? 'border-red-400 shake animate-shake'
                  : 'border-gray-300'
              } ${inputDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="4-digit PIN"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            {isLocked && (
              <p className="mt-2 text-sm text-red-600">
                Too many attempts. Try again in {lockoutSeconds}s
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pin.length !== 4 || inputDisabled}
              className="min-h-12 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pinMutation.isPending ? 'Verifying...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
