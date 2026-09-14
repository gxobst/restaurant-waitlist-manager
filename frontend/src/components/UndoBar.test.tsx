import { render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import UndoBar from './UndoBar'
import { useAppStore } from '../store/appStore.ts'

vi.mock('../services/index.ts', () => ({
  undoAction: vi.fn(),
}))

import { undoAction } from '../services/index.ts'

const mockUndoAction = vi.mocked(undoAction)

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('UndoBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders empty when no toasts', () => {
    renderWithQuery(<UndoBar />)
    const bar = screen.getByTestId('undo-bar')
    expect(bar).toBeDefined()
    expect(bar.querySelectorAll('[data-testid^="toast-"]').length).toBe(0)
  })

  it('shows "Party notified" toast after notify action', () => {
    useAppStore.getState().addToast({
      message: 'Party notified',
      partyId: '1',
      actionType: 'notify',
    })

    renderWithQuery(<UndoBar />)
    const toast = screen.getByTestId('toast-notify')
    expect(toast.textContent).toContain('Party notified')
    expect(screen.getByText('Undo')).toBeDefined()
  })

  it('shows "Party seated" toast after seat action', () => {
    useAppStore.getState().addToast({
      message: 'Party seated',
      partyId: '2',
      actionType: 'seat',
    })

    renderWithQuery(<UndoBar />)
    const toast = screen.getByTestId('toast-seat')
    expect(toast.textContent).toContain('Party seated')
    expect(screen.getByText('Undo')).toBeDefined()
  })

  it('shows "Party canceled" toast after cancel action', () => {
    useAppStore.getState().addToast({
      message: 'Party canceled',
      partyId: '3',
      actionType: 'cancel',
    })

    renderWithQuery(<UndoBar />)
    const toast = screen.getByTestId('toast-cancel')
    expect(toast.textContent).toContain('Party canceled')
    expect(screen.getByText('Undo')).toBeDefined()
  })

  it('shows "Party marked urgent" toast after urgent action', () => {
    useAppStore.getState().addToast({
      message: 'Party marked urgent',
      partyId: '4',
      actionType: 'toggle_urgent',
    })

    renderWithQuery(<UndoBar />)
    const toast = screen.getByTestId('toast-toggle_urgent')
    expect(toast.textContent).toContain('Party marked urgent')
    expect(screen.getByText('Undo')).toBeDefined()
  })

  it('calls undoAction with correct partyId and removes toast when Undo is clicked', async () => {
    mockUndoAction.mockResolvedValue({} as never)

    useAppStore.getState().addToast({
      message: 'Party notified',
      partyId: '5',
      actionType: 'notify',
    })

    renderWithQuery(<UndoBar />)
    const undoBtn = screen.getByText('Undo')

    await act(async () => {
      undoBtn.click()
    })

    expect(mockUndoAction).toHaveBeenCalledWith('5')

    expect(screen.queryByTestId('toast-notify')).toBeNull()
  })

  it('auto-dismisses toast after 8 seconds', async () => {
    vi.useFakeTimers()

    useAppStore.getState().addToast({
      message: 'Party seated',
      partyId: '6',
      actionType: 'seat',
    })

    renderWithQuery(<UndoBar />)
    expect(screen.getByTestId('toast-seat')).toBeDefined()

    await act(async () => {
      vi.advanceTimersByTime(8000)
    })

    expect(screen.queryByTestId('toast-seat')).toBeNull()
  })

  it('does not auto-dismiss before 8 seconds', async () => {
    vi.useFakeTimers()

    useAppStore.getState().addToast({
      message: 'Party canceled',
      partyId: '7',
      actionType: 'cancel',
    })

    renderWithQuery(<UndoBar />)

    await act(async () => {
      vi.advanceTimersByTime(7999)
    })

    expect(screen.getByTestId('toast-cancel')).toBeDefined()
  })

  it('stacks multiple toasts vertically', () => {
    useAppStore.getState().addToast({
      message: 'Party notified',
      partyId: '10',
      actionType: 'notify',
    })
    useAppStore.getState().addToast({
      message: 'Party seated',
      partyId: '11',
      actionType: 'seat',
    })

    renderWithQuery(<UndoBar />)
    expect(screen.getByTestId('toast-notify')).toBeDefined()
    expect(screen.getByTestId('toast-seat')).toBeDefined()

    const bar = screen.getByTestId('undo-bar')
    const toasts = bar.querySelectorAll('[data-testid^="toast-"]')
    expect(toasts.length).toBe(2)
  })

  it('dismisses only the clicked toast when multiple are shown', async () => {
    mockUndoAction.mockResolvedValue({} as never)

    useAppStore.getState().addToast({
      message: 'Party notified',
      partyId: '20',
      actionType: 'notify',
    })
    useAppStore.getState().addToast({
      message: 'Party seated',
      partyId: '21',
      actionType: 'seat',
    })

    renderWithQuery(<UndoBar />)
    const undoButtons = screen.getAllByText('Undo')

    await act(async () => {
      undoButtons[0].click()
    })

    expect(mockUndoAction).toHaveBeenCalledWith('20')

    expect(screen.queryByTestId('toast-notify')).toBeNull()
    expect(screen.getByTestId('toast-seat')).toBeDefined()
  })
})
