import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from '../store/appStore'
import { useWebSocket } from './useWebSocket'

vi.mock('../services/index.ts', () => ({}))

class MockWebSocket {
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  closeCalls: number = 0

  constructor(url: string) {
    this.url = url
  }

  close() {
    this.closeCalls++
    this.onclose?.()
  }

  send() {
    // no-op
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({ wsConnected: false })
  vi.stubEnv('VITE_USE_MOCK', 'false')
  vi.stubEnv('VITE_WS_URL', 'ws://localhost:51737')
  ;(globalThis as any).WebSocket = MockWebSocket
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

function renderWithQuery(client: QueryClient) {
  return renderHook(() => useWebSocket(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}

describe('useWebSocket', () => {
  it('mock-mode skips connection and sets wsConnected=false', () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    renderWithQuery(queryClient)
    expect(useAppStore.getState().wsConnected).toBe(false)
  })

  it('calls invalidateQueries on waitlist_update message', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    renderWithQuery(queryClient)

    capturedWs!.onopen!()
    capturedWs!.onmessage!({ data: JSON.stringify({ type: 'waitlist_update' }) } as MessageEvent)

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['waitlist'] })
  })

  it('wsConnected becomes true on open and false on close', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    renderWithQuery(queryClient)

    capturedWs!.onopen!()
    expect(useAppStore.getState().wsConnected).toBe(true)

    capturedWs!.onclose!()
    expect(useAppStore.getState().wsConnected).toBe(false)
  })

  it('exponential backoff delays increase across reconnection attempts', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    renderWithQuery(queryClient)

    capturedWs!.onclose!()
    await new Promise((r) => setTimeout(r, 0))

    capturedWs!.onclose!()
    await new Promise((r) => setTimeout(r, 0))

    capturedWs!.onclose!()
    await new Promise((r) => setTimeout(r, 0))

    const reconnectDelays = setTimeoutSpy.mock.calls
      .filter((call: any[]) => typeof call[1] === 'number' && call[1] >= 1000)
      .map((call: any[]) => call[1])

    expect(reconnectDelays[0]).toBe(1000)
    expect(reconnectDelays[1]).toBe(2000)
    expect(reconnectDelays[2]).toBe(4000)

    setTimeoutSpy.mockRestore()
  })

  it('unmount cleans up the WebSocket and clears the reconnect timer', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    const { unmount } = renderWithQuery(queryClient)

    capturedWs!.onopen!()
    capturedWs!.onclose!()

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(capturedWs!.onopen).toBeNull()
    expect(capturedWs!.onmessage).toBeNull()
    expect(capturedWs!.onclose).toBeNull()

    clearTimeoutSpy.mockRestore()
  })

  it('handles invalid JSON in onmessage without throwing', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    renderWithQuery(queryClient)

    capturedWs!.onopen!()
    expect(() => {
      capturedWs!.onmessage!({ data: 'not-valid-json' } as MessageEvent)
    }).not.toThrow()
  })

  it('uses default WebSocket URL when VITE_WS_URL is not set', () => {
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_USE_MOCK', 'false')

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    renderWithQuery(queryClient)

    expect(capturedWs!.url).toBe('ws://localhost:5173')

    capturedWs!.onclose!()
    vi.unstubAllEnvs()
  })

  it('sets wsConnected to true when waitlist_update message arrives while connected', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    renderWithQuery(queryClient)

    capturedWs!.onopen!()
    expect(useAppStore.getState().wsConnected).toBe(true)

    capturedWs!.onmessage!({ data: JSON.stringify({ type: 'waitlist_update' }) } as MessageEvent)
    expect(useAppStore.getState().wsConnected).toBe(true)
  })

  it('ignores non-waitlist_update messages', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    renderWithQuery(queryClient)

    capturedWs!.onopen!()
    capturedWs!.onmessage!({ data: JSON.stringify({ type: 'other_event' }) } as MessageEvent)

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('skips reconnection when dead on close', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    const { unmount } = renderWithQuery(queryClient)

    capturedWs!.onopen!()
    const onCloseHandler = capturedWs!.onclose
    unmount()
    onCloseHandler!()

    const reconnectDelays = setTimeoutSpy.mock.calls
      .filter((call: any[]) => typeof call[1] === 'number' && call[1] >= 1000)

    expect(reconnectDelays).toHaveLength(0)

    setTimeoutSpy.mockRestore()
  })

  it('skips reconnection when dead on open', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    let capturedWs: MockWebSocket | null = null
    class CapturingMockWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url)
        capturedWs = this
      }
    }
    ;(globalThis as any).WebSocket = CapturingMockWebSocket

    const { unmount } = renderWithQuery(queryClient)

    capturedWs!.onopen!()
    const onOpenHandler = capturedWs!.onopen
    unmount()
    onOpenHandler!()

    expect(capturedWs!.closeCalls).toBeGreaterThan(0)
  })

  it('does not close a null WebSocket during cleanup in mock mode', () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    renderWithQuery(queryClient)
    // should not throw
    expect(() => cleanup()).not.toThrow()
  })
})
