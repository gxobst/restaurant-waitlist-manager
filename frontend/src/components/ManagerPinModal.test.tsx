import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ManagerPinModal from './ManagerPinModal'

vi.mock('../services/index.ts', () => ({
  verifyPin: vi.fn(),
}))

vi.mock('../store/appStore.ts', () => ({
  useAppStore: vi.fn((selector: (s: { setIsManager: (v: boolean) => void }) => () => void) =>
    selector({ setIsManager: vi.fn() })
  ),
}))

import { verifyPin } from '../services/index.ts'
import { useAppStore } from '../store/appStore.ts'

const mockVerifyPin = vi.mocked(verifyPin)
const mockSetIsManager = vi.fn()

function getMockUseAppStore() {
  return vi.mocked(useAppStore as unknown as ReturnType<typeof vi.fn>)
}

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

describe('ManagerPinModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetIsManager.mockReset()
    getMockUseAppStore().mockImplementation((selector: (s: { setIsManager: (v: boolean) => void }) => () => void) => {
      return selector({ setIsManager: mockSetIsManager })
    })
    mockVerifyPin.mockResolvedValue({ valid: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when isOpen is false', () => {
    const { container } = renderWithQuery(
      <ManagerPinModal isOpen={false} onClose={onClose} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the modal with PIN input and submit button when isOpen is true', () => {
    renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByLabelText('4-digit PIN')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined()
  })

  it('calls verifyPin, sets isManager=true, and closes on correct PIN', async () => {
    mockVerifyPin.mockResolvedValue({ valid: true })
    renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    const input = screen.getByLabelText('4-digit PIN')
    fireEvent.change(input, { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => {
      expect(mockVerifyPin).toHaveBeenCalledWith({ pin: '1234' })
      expect(mockSetIsManager).toHaveBeenCalledWith(true)
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('displays "Invalid PIN" error on incorrect PIN', async () => {
    mockVerifyPin.mockResolvedValue({ valid: false })
    renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    const input = screen.getByLabelText('4-digit PIN')
    fireEvent.change(input, { target: { value: '0000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => {
      expect(screen.getByText('Invalid PIN')).toBeDefined()
    })
  })

  it('applies shake animation class on incorrect PIN', async () => {
    mockVerifyPin.mockResolvedValue({ valid: false })
    renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    const input = screen.getByLabelText('4-digit PIN')
    fireEvent.change(input, { target: { value: '0000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => {
      expect(input).toHaveClass('shake')
    })
  })

  it('disables input and button after 5 consecutive incorrect attempts', async () => {
    mockVerifyPin.mockResolvedValue({ valid: false })
    renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    const input = screen.getByLabelText('4-digit PIN')
    const submitBtn = screen.getByRole('button', { name: 'Submit' })

    for (let i = 0; i < 5; i++) {
      fireEvent.change(input, { target: { value: '0000' } })
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(mockVerifyPin).toHaveBeenCalledTimes(i + 1)
      })
    }

    await waitFor(() => {
      expect(input).toBeDisabled()
      expect(submitBtn).toBeDisabled()
    })
  })

  it('shows countdown timer and disables inputs while locked out', async () => {
    mockVerifyPin.mockResolvedValue({ valid: false })
    renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    const input = screen.getByLabelText('4-digit PIN')
    const submitBtn = screen.getByRole('button', { name: 'Submit' })

    for (let i = 0; i < 5; i++) {
      fireEvent.change(input, { target: { value: '0000' } })
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(mockVerifyPin).toHaveBeenCalledTimes(i + 1)
      })
    }

    await waitFor(() => {
      expect(screen.getByText(/Try again in 30s/)).toBeDefined()
      expect(input).toBeDisabled()
      expect(submitBtn).toBeDisabled()
    })
  })

  it('resets state when modal is closed and reopened', async () => {
    mockVerifyPin.mockResolvedValue({ valid: false })
    const { rerender } = renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    const input = screen.getByLabelText('4-digit PIN')
    const submitBtn = screen.getByRole('button', { name: 'Submit' })

    for (let i = 0; i < 5; i++) {
      fireEvent.change(input, { target: { value: '0000' } })
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(mockVerifyPin).toHaveBeenCalledTimes(i + 1)
      })
    }

    await waitFor(() => {
      expect(input).toBeDisabled()
    })

    rerender(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })}>
        <ManagerPinModal isOpen={false} onClose={onClose} />
      </QueryClientProvider>
    )
    rerender(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })}>
        <ManagerPinModal isOpen={true} onClose={onClose} />
      </QueryClientProvider>
    )

    const newInput = screen.getByLabelText('4-digit PIN')
    expect(newInput).not.toBeDisabled()
    expect(screen.queryByText(/Try again in/)).toBeNull()
  })

  it('closes modal when Escape is pressed', async () => {
    renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined()
    })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes modal when backdrop is clicked', async () => {
    renderWithQuery(
      <ManagerPinModal isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined()
    })
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })
})
