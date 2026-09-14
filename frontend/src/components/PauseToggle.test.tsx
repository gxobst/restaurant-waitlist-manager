import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PauseToggle from './PauseToggle'

vi.mock('../services/index.ts', () => ({
  getWaitlistPaused: vi.fn(),
  setWaitlistPaused: vi.fn(),
}))

import { getWaitlistPaused, setWaitlistPaused } from '../services/index.ts'

const mockGetWaitlistPaused = vi.mocked(getWaitlistPaused)
const mockSetWaitlistPaused = vi.mocked(setWaitlistPaused)

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('PauseToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWaitlistPaused.mockResolvedValue(false)
    mockSetWaitlistPaused.mockResolvedValue(undefined)
  })

  it('renders Resume label when not paused', async () => {
    renderWithQuery(<PauseToggle />)
    expect(await screen.findByText('Resume')).toBeDefined()
  })

  it('renders Paused label when initially paused', async () => {
    mockGetWaitlistPaused.mockResolvedValue(true)
    renderWithQuery(<PauseToggle />)
    expect(await screen.findByText('Paused')).toBeDefined()
  })

  it('calls setWaitlistPaused with true when toggling to paused', async () => {
    const user = userEvent.setup()
    renderWithQuery(<PauseToggle />)
    const toggle = await screen.findByTestId('pause-toggle')
    await user.click(toggle)
    expect(mockSetWaitlistPaused).toHaveBeenCalledWith(true)
  })

  it('calls setWaitlistPaused with false when toggling to resumed', async () => {
    mockGetWaitlistPaused.mockResolvedValue(true)
    const user = userEvent.setup()
    renderWithQuery(<PauseToggle />)
    const toggle = await screen.findByTestId('pause-toggle')
    await user.click(toggle)
    expect(mockSetWaitlistPaused).toHaveBeenCalledWith(false)
  })
})
