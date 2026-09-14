import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Reports from './Reports'

let _isManagerValue = false

vi.mock('../services/index.ts', () => ({
  getDailyReport: vi.fn(),
}))

vi.mock('../store/appStore.ts', () => ({
  useAppStore: vi.fn((selector: (s: { isManager: boolean; setIsManager: (v: boolean) => void }) => unknown) =>
    selector({ isManager: _isManagerValue, setIsManager: vi.fn() })
  ),
}))

import type { DailyReportResponse } from '../types/index.ts'
import { getDailyReport } from '../services/index.ts'

const mockGetDailyReport = vi.mocked(getDailyReport)

interface RenderOptions {
  isManagerValue?: boolean
  reportData?: DailyReportResponse | null
}

function renderWithQuery(
  ui: React.ReactElement,
  { isManagerValue = false, reportData = null }: RenderOptions = {},
) {
  _isManagerValue = isManagerValue

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  if (reportData !== null) {
    queryClient.setQueryData(['dailyReport'], reportData)
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route path="/reports" element={ui} />
          <Route path="/" element={<div>HostView</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _isManagerValue = false
  })

  afterEach(() => {
    cleanup()
    _isManagerValue = false
  })

  it('redirects non-managers to the host view', async () => {
    renderWithQuery(<Reports />, { isManagerValue: false })
    await waitFor(() => {
      expect(screen.queryByText('Daily Report')).toBeNull()
    })
  })

  it('shows skeleton loader while data is being fetched', async () => {
    mockGetDailyReport.mockImplementation(() => new Promise(() => {}))
    renderWithQuery(<Reports />, { isManagerValue: true })
    expect(screen.getByTestId('skeleton-loader')).toBeDefined()
  })

  it('displays four stat cards with correct metrics when isManager is true', async () => {
    renderWithQuery(<Reports />, {
      isManagerValue: true,
      reportData: {
        date: '2026-01-15',
        total_parties: 12,
        average_wait_minutes: 23.5,
        no_show_rate: 0.08,
        seat_utilization: 0.75,
      },
    })
    expect(await screen.findByText('Total Parties')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText(/23\.5 min/)).toBeDefined()
    expect(screen.getByText('8%')).toBeDefined()
    expect(screen.getByText('75%')).toBeDefined()
  })

  it('renders zero values correctly when report returns zeros', async () => {
    renderWithQuery(<Reports />, {
      isManagerValue: true,
      reportData: {
        date: '2026-01-15',
        total_parties: 0,
        average_wait_minutes: 0,
        no_show_rate: 0,
        seat_utilization: 0,
      },
    })
    expect(await screen.findByText('Total Parties')).toBeDefined()
    expect(screen.getByText('0')).toBeDefined()
    expect(screen.getByText(/0 min/)).toBeDefined()
    const zeroPercentages = document.querySelectorAll('p.text-2xl.font-semibold')
    const pctValues = Array.from(zeroPercentages).map(el => el.textContent)
    expect(pctValues.filter(v => v === '0%').length).toBe(2)
  })

  it('renders a BarChart in the DOM', async () => {
    renderWithQuery(<Reports />, {
      isManagerValue: true,
      reportData: {
        date: '2026-01-15',
        total_parties: 12,
        average_wait_minutes: 23.5,
        no_show_rate: 0.08,
        seat_utilization: 0.75,
      },
    })
    await screen.findByText('Statistics Overview')
    const chartContainer = document.querySelector('.recharts-responsive-container')
    expect(chartContainer).toBeInTheDocument()
  })

  it('shows error panel with retry on network error', async () => {
    mockGetDailyReport.mockRejectedValue(new Error('Network failure'))
    renderWithQuery(<Reports />, { isManagerValue: true })
    expect(await screen.findByTestId('error-boundary')).toBeDefined()
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined()
    expect(screen.getByText('Unable to load report')).toBeDefined()
  })

  describe('export functionality', () => {
    it('triggers CSV download when Export CSV button is clicked', () => {
    renderWithQuery(<Reports />, {
      isManagerValue: true,
      reportData: {
        date: '2026-01-15',
        total_parties: 12,
        average_wait_minutes: 23.5,
        no_show_rate: 0.08,
        seat_utilization: 0.75,
      },
    })
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

    const csvBtn = screen.getByRole('button', { name: /export csv/i })
    fireEvent.click(csvBtn)

    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalled()

    revokeObjectURLSpy.mockRestore()
    createObjectURLSpy.mockRestore()
    })

    it('calls window.open when Export PDF button is clicked', () => {
    renderWithQuery(<Reports />, {
      isManagerValue: true,
      reportData: {
        date: '2026-01-15',
        total_parties: 12,
        average_wait_minutes: 23.5,
        no_show_rate: 0.08,
        seat_utilization: 0.75,
      },
    })
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write: vi.fn(), close: vi.fn() } } as any)

    const pdfBtn = screen.getByRole('button', { name: /export pdf/i })
    fireEvent.click(pdfBtn)

    expect(openSpy).toHaveBeenCalledWith('', '_blank')

    openSpy.mockRestore()
    })
  })
})
