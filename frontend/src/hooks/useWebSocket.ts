import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore.ts'
import { useQueryClient } from '@tanstack/react-query'

const BACKOFF_INITIAL_MS = 1000
const BACKOFF_MULTIPLIER = 2
const BACKOFF_MAX_MS = 30000

export function useWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)

  useEffect(() => {
    const mockMode = import.meta.env.VITE_USE_MOCK === 'true'
    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:51737'

    if (mockMode) {
      useAppStore.getState().setWsConnected(false)
      return
    }

    let dead = false

    function open() {
      if (dead) return
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (dead) { ws.close(); return }
        retryCountRef.current = 0
        useAppStore.getState().setWsConnected(true)
      }

      ws.onmessage = (event: MessageEvent) => {
        if (dead) return
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'waitlist_update') {
            queryClient.invalidateQueries({ queryKey: ['waitlist'] })
            useAppStore.getState().setWsConnected(true)
          }
        } catch {}
      }

      ws.onclose = () => {
        if (dead) return
        useAppStore.getState().setWsConnected(false)
        if (mockMode) return
        const delay = Math.min(
          BACKOFF_INITIAL_MS * Math.pow(BACKOFF_MULTIPLIER, retryCountRef.current),
          BACKOFF_MAX_MS,
        )
        retryCountRef.current += 1
        timerRef.current = setTimeout(open, delay)
      }

      ws.onerror = () => {
        // close handler will fire after error
      }
    }

    open()

    return () => {
      dead = true
      if (timerRef.current) clearTimeout(timerRef.current)
      const ws = wsRef.current
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onclose = null
        ws.onerror = null
        ws.close()
      }
      wsRef.current = null
    }
  }, [])
}
