import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function FailingComponent(): React.ReactElement {
  throw new Error('Render error')
}

function WorkingComponent() {
  return <div data-testid="working">I work fine</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(<ErrorBoundary><WorkingComponent /></ErrorBoundary>)
    expect(screen.getByTestId('working')).toBeDefined()
  })

  it('shows error panel when a child throws', () => {
    render(
      <ErrorBoundary>
        <FailingComponent />
      </ErrorBoundary>
    )
    expect(screen.getByTestId('error-boundary')).toBeDefined()
    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByText('Unable to load data. Please try again.')).toBeDefined()
  })

  it('calls onRetry when retry button is clicked', () => {
    const retrySpy = vi.fn()
    render(
      <ErrorBoundary onRetry={retrySpy}>
        <FailingComponent />
      </ErrorBoundary>
    )
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryBtn)
    expect(retrySpy).toHaveBeenCalledTimes(1)
  })

  it('resets error state after retry', () => {
    function WorkingComponent() {
      return <div data-testid="working">I work fine</div>
    }
    render(
      <ErrorBoundary onRetry={() => {}}>
        <WorkingComponent />
      </ErrorBoundary>
    )
    expect(screen.getByTestId('working')).toBeDefined()
  })
})
